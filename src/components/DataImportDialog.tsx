import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Upload, FileSpreadsheet } from 'lucide-react';
import { useDataImport, parseCsvToObjects, type ImportMode } from '@/hooks/useDataImport';
import { useToast } from '@/hooks/use-toast';

interface DataImportDialogProps {
  open: boolean;
  onClose: () => void;
  clinicId: string;
}

/**
 * Dialog for importing clients and appointments from CSV.
 * File picker, preview table, import mode selector, and import trigger.
 */
export const DataImportDialog: React.FC<DataImportDialogProps> = ({
  open,
  onClose,
  clinicId,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { runImport, isImporting } = useDataImport();

  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [mode, setMode] = useState<ImportMode>('clients_only');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith('.csv')) {
      toast({
        title: t('common.error'),
        description: t('settings.importCsvOnly', 'Solo se permiten archivos CSV.'),
        variant: 'destructive',
      });
      return;
    }
    setFile(f);
    f.text().then((text) => {
      const rows = parseCsvToObjects(text);
      setParsedRows(rows);
    });
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: t('common.error'),
        description: t('settings.importSelectFile', 'Selecciona un archivo CSV.'),
        variant: 'destructive',
      });
      return;
    }

    const result = await runImport(clinicId, file, mode);

    const msg: string[] = [];
    if (result.clientsCreated > 0) msg.push(`${result.clientsCreated} clientes creados`);
    if (result.clientsSkipped > 0) msg.push(`${result.clientsSkipped} omitidos (duplicados)`);
    if (result.appointmentsCreated > 0) msg.push(`${result.appointmentsCreated} citas creadas`);
    if (result.errors.length > 0) msg.push(`${result.errors.length} errores`);

    if (result.errors.length > 0) {
      toast({
        title: t('settings.importCompletedWithErrors', 'Importación completada con errores'),
        description: result.errors.slice(0, 3).join('; ') + (result.errors.length > 3 ? '...' : ''),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('common.success'),
        description: msg.join('. ') || t('settings.importCompleted', 'Importación completada.'),
      });
      onClose();
      setFile(null);
      setParsedRows([]);
    }
  };

  const previewRows = parsedRows.slice(0, 10);
  const columns = parsedRows.length > 0 ? Object.keys(parsedRows[0]) : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('settings.importData')}</DialogTitle>
          <DialogDescription>
            {t('settings.importDataDesc', 'Importa pacientes y citas desde un archivo CSV.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('settings.importSelectFile', 'Seleccionar archivo CSV')}</Label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="import-csv-input"
              />
              <Label
                htmlFor="import-csv-input"
                className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-muted/50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {file ? file.name : t('settings.importChooseFile', 'Elegir archivo')}
              </Label>
            </div>
          </div>

          {parsedRows.length > 0 && (
            <>
              <div className="space-y-2">
                <Label>{t('settings.importMode', 'Modo de importación')}</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as ImportMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clients_only">
                      {t('settings.importClientsOnly', 'Solo pacientes')}
                    </SelectItem>
                    <SelectItem value="clients_and_appointments">
                      {t('settings.importClientsAndAppointments', 'Pacientes y citas')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('settings.importPreview', 'Vista previa')} ({parsedRows.length} filas)</Label>
                <ScrollArea className="h-[200px] rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((col) => (
                          <TableHead key={col} className="text-xs">
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row, i) => (
                        <TableRow key={i}>
                          {columns.map((col) => (
                            <TableCell key={col} className="text-xs max-w-[120px] truncate">
                              {row[col] ?? ''}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </>
          )}

          <p className="text-xs text-muted-foreground">
            {t('settings.importCsvFormat', 'Pacientes: first_name, last_name, email, phone. Citas: client_email, therapist_first_name, therapist_last_name, treatment_name, start_time, end_time, status.')}
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={isImporting}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleImport} disabled={!file || isImporting}>
              {isImporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {t('settings.importButton', 'Importar')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
