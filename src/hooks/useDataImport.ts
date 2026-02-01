import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/** Simple CSV parser: first row = headers, subsequent rows = data. Handles quoted fields. */
export function parseCsvToObjects(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const parseRow = (row: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const c = row[i];
      if (c === '"') {
        if (inQuotes && row[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((c === ',' && !inQuotes) || c === '\n') {
        result.push(current.trim());
        current = '';
      } else {
        current += c;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((h, j) => {
      obj[h] = values[j] ?? '';
    });
    rows.push(obj);
  }

  return rows;
}

export type ImportMode = 'clients_only' | 'clients_and_appointments';

export interface ImportResult {
  clientsCreated: number;
  clientsSkipped: number;
  appointmentsCreated: number;
  errors: string[];
}

/** Hook for CSV data import (clients, clients + appointments). */
export function useDataImport() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);

  const importClients = async (
    clinicId: string,
    rows: Record<string, string>[]
  ): Promise<{ created: number; skipped: number; errors: string[] }> => {
    const errors: string[] = [];
    let created = 0;
    let skipped = 0;

    const normalizeKey = (key: string) => key.toLowerCase().replace(/\s+/g, '_');
    const get = (row: Record<string, string>, keys: string[]) => {
      for (const k of keys) {
        const val = row[normalizeKey(k)] ?? row[k];
        if (val) return val.trim();
      }
      return '';
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const firstName = get(row, ['first_name', 'nombre']);
      const lastName = get(row, ['last_name', 'apellido']);
      const email = get(row, ['email', 'correo']);

      if (!firstName || !lastName) {
        errors.push(`Fila ${i + 2}: Nombre y apellido requeridos.`);
        continue;
      }

      // Check if client exists by email (if provided)
      if (email) {
        const { data: existing } = await supabase
          .from('clients')
          .select('id')
          .eq('clinic_id', clinicId)
          .eq('email', email)
          .maybeSingle();
        if (existing) {
          skipped++;
          continue;
        }
      }

      const { error } = await supabase.from('clients').insert({
        clinic_id: clinicId,
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        phone: get(row, ['phone', 'telefono']) || null,
        birth_date: get(row, ['birth_date', 'fecha_nacimiento']) || null,
        rfc: get(row, ['rfc']) || null,
        address: get(row, ['address', 'direccion']) || null,
        is_active: true,
        archived: false,
      });

      if (error) {
        errors.push(`Fila ${i + 2}: ${error.message}`);
      } else {
        created++;
      }
    }

    return { created, skipped, errors };
  };

  const importAppointments = async (
    clinicId: string,
    rows: Record<string, string>[],
    clientEmailToId: Map<string, string>
  ): Promise<{ created: number; errors: string[] }> => {
    const errors: string[] = [];
    let created = 0;

    const normalizeKey = (key: string) => key.toLowerCase().replace(/\s+/g, '_');
    const get = (row: Record<string, string>, keys: string[]) => {
      for (const k of keys) {
        const val = row[normalizeKey(k)] ?? row[k];
        if (val) return val.trim();
      }
      return '';
    };

    const { data: therapists } = await supabase
      .from('therapists')
      .select('id, first_name, last_name')
      .eq('clinic_id', clinicId)
      .eq('is_active', true);
    const therapistMap = new Map<string, string>();
    therapists?.forEach((t) => {
      const key = `${(t.first_name ?? '').trim().toLowerCase()}|${(t.last_name ?? '').trim().toLowerCase()}`;
      therapistMap.set(key, t.id);
    });

    const { data: treatments } = await supabase
      .from('treatments')
      .select('id, name')
      .eq('clinic_id', clinicId)
      .eq('is_active', true);
    const treatmentMap = new Map<string, string>();
    treatments?.forEach((t) => {
      treatmentMap.set(t.name.trim().toLowerCase(), t.id);
    });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const clientEmail = get(row, ['client_email', 'client_email', 'email', 'correo']);
      const therapistFirstName = get(row, ['therapist_first_name', 'therapist_first_name', 'terapeuta_nombre']);
      const therapistLastName = get(row, ['therapist_last_name', 'therapist_last_name', 'terapeuta_apellido']);
      const treatmentName = get(row, ['treatment_name', 'treatment_name', 'tratamiento']);
      const startTime = get(row, ['start_time', 'start_time', 'fecha_inicio', 'inicio']);
      const endTime = get(row, ['end_time', 'end_time', 'fecha_fin', 'fin']);
      const status = get(row, ['status', 'status', 'estado']) || 'scheduled';

      const validStatuses = ['scheduled', 'completed', 'cancelled', 'no_show'];
      const finalStatus = validStatuses.includes(status) ? status : 'scheduled';

      const clientId = clientEmail ? clientEmailToId.get(clientEmail.toLowerCase()) : null;
      if (!clientId) {
        errors.push(`Fila ${i + 2}: Cliente no encontrado (email: ${clientEmail || 'vacío'}).`);
        continue;
      }

      const therapistKey = `${therapistFirstName.toLowerCase()}|${therapistLastName.toLowerCase()}`;
      const therapistId = therapistMap.get(therapistKey);
      if (!therapistId) {
        errors.push(`Fila ${i + 2}: Terapeuta no encontrado (${therapistFirstName} ${therapistLastName}).`);
        continue;
      }

      const treatmentId = treatmentName
        ? treatmentMap.get(treatmentName.toLowerCase()) ?? null
        : null;

      let startDate: Date;
      let endDate: Date;
      try {
        startDate = new Date(startTime);
        endDate = endTime ? new Date(endTime) : new Date(startDate.getTime() + 60 * 60 * 1000);
        if (isNaN(startDate.getTime())) throw new Error('Invalid start time');
      } catch {
        errors.push(`Fila ${i + 2}: Fecha/hora inválida (start: ${startTime}).`);
        continue;
      }

      const { error } = await supabase.from('appointments').insert({
        clinic_id: clinicId,
        client_id: clientId,
        therapist_id: therapistId,
        treatment_id: treatmentId,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: finalStatus,
      });

      if (error) {
        errors.push(`Fila ${i + 2}: ${error.message}`);
      } else {
        created++;
      }
    }

    return { created, errors };
  };

  const runImport = async (
    clinicId: string,
    file: File,
    mode: ImportMode
  ): Promise<ImportResult> => {
    setIsImporting(true);
    const result: ImportResult = { clientsCreated: 0, clientsSkipped: 0, appointmentsCreated: 0, errors: [] };

    try {
      const text = await file.text();
      const rows = parseCsvToObjects(text);
      if (rows.length === 0) {
        result.errors.push(t('settings.importEmptyCsv', 'El archivo CSV está vacío o no tiene filas de datos.'));
        return result;
      }

      const clientEmailToId = new Map<string, string>();

      if (mode === 'clients_only' || mode === 'clients_and_appointments') {
        const clientResult = await importClients(clinicId, rows);
        result.clientsCreated = clientResult.created;
        result.clientsSkipped = clientResult.skipped;
        result.errors.push(...clientResult.errors);

        const normalizeKey = (key: string) => key.toLowerCase().replace(/\s+/g, '_');
        const get = (row: Record<string, string>, keys: string[]) => {
          for (const k of keys) {
            const val = row[normalizeKey(k)] ?? row[k];
            if (val) return val.trim();
          }
          return '';
        };

        const { data: clients } = await supabase
          .from('clients')
          .select('id, email')
          .eq('clinic_id', clinicId);
        clients?.forEach((c) => {
          if (c.email) clientEmailToId.set(c.email.toLowerCase(), c.id);
        });
      }

      if (mode === 'clients_and_appointments') {
        const aptResult = await importAppointments(clinicId, rows, clientEmailToId);
        result.appointmentsCreated = aptResult.created;
        result.errors.push(...aptResult.errors);
      }

      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });

      return result;
    } finally {
      setIsImporting(false);
    }
  };

  return { runImport, isImporting };
}
