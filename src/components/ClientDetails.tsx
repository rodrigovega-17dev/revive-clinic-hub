import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Phone, Mail, MapPin, DollarSign, CheckCircle, AlertCircle, History, FileText, Upload, MessageCircle } from 'lucide-react';
import { useClientBalance } from '@/hooks/useClientBalance';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useClinicSettings } from '@/hooks/useClinic';
import { hasCfdiData } from '@/lib/cfdi-catalogs';
import { getCfdiFileUrl } from '@/hooks/useCfdiFileUrl';
import { CfdiUploadModal } from '@/components/CfdiUploadModal';
import { DocumentSection } from '@/components/DocumentSection';
import { openWhatsApp } from '@/lib/whatsapp';

type Client = Tables<'clients'>;

interface ClientDetailsProps {
  client: Client;
  open: boolean;
  onClose: () => void;
  onEdit?: (client: Client) => void;
}

export default function ClientDetails({ client, open, onClose, onEdit }: ClientDetailsProps) {
  const { t } = useTranslation();
  const { clinicId } = useAuth();
  const { data: balance, isLoading: balanceLoading } = useClientBalance(client.id);
  const { currency, timezone } = useClinicSettings();
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isAppointmentDetailsOpen, setIsAppointmentDetailsOpen] = useState(false);
  const [showCfdiUploadModal, setShowCfdiUploadModal] = useState(false);
  
  const { data: paymentHistory } = useQuery({
    queryKey: ['client-payments', client.id, clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          description,
          payment_date,
          method,
          appointment_id,
          invoice_state
        `)
        .eq('client_id', client.id)
        .eq('clinic_id', clinicId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!client.id && !!clinicId,
  });

  const { data: pendingAppointments } = useQuery({
    queryKey: ['client-pending-appointments', client.id, clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          payment_amount,
          payment_status,
          status,
          treatments (name),
          therapists (first_name, last_name, calendar_color_id, email)
        `)
        .eq('client_id', client.id)
        .eq('clinic_id', clinicId)
        .eq('status', 'completed')
        .or('payment_status.is.null,payment_status.eq.pending')
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!client.id && !!clinicId,
  });

  /** All appointments for client (any status) for Appointments History tab */
  const { data: appointmentsHistory } = useQuery({
    queryKey: ['client-appointments-history', client.id, clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          payment_amount,
          payment_status,
          status,
          treatments (name),
          therapists (first_name, last_name, calendar_color_id, email)
        `)
        .eq('client_id', client.id)
        .eq('clinic_id', clinicId)
        .order('start_time', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!client.id && !!clinicId,
  });

  /** CFDI invoices linked to this client via payments */
  const { data: cfdiInvoicePayments } = useQuery({
    queryKey: ['client-cfdi-invoices', client.id, clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await supabase
        .from('cfdi_invoice_payments')
        .select('cfdi_invoice_id, cfdi_invoices(*), payments!inner(client_id)')
        .eq('payments.client_id', client.id);
      if (error) throw error;
      return data as { cfdi_invoice_id: string; cfdi_invoices: Tables<'cfdi_invoices'> | null; payments: { client_id: string } }[];
    },
    enabled: !!client.id && !!clinicId,
  });

  const clientCfdiInvoices = useMemo(() => {
    const rows = cfdiInvoicePayments ?? [];
    const seen = new Set<string>();
    const list: Tables<'cfdi_invoices'>[] = [];
    for (const r of rows) {
      const inv = r.cfdi_invoices;
      if (inv && !seen.has(inv.id)) {
        seen.add(inv.id);
        list.push(inv);
      }
    }
    return list.sort((a, b) => {
      const da = new Date(a.emitted_at || a.created_at).getTime();
      const db = new Date(b.emitted_at || b.created_at).getTime();
      return db - da;
    });
  }, [cfdiInvoicePayments]);

  const nonInvoicedPaymentIds = useMemo(() => {
    const payments = paymentHistory ?? [];
    return payments
      .filter((p) => (p as { invoice_state?: string }).invoice_state === 'non_invoiced')
      .map((p) => p.id);
  }, [paymentHistory]);

  const pendingPaymentsAmount = pendingAppointments?.reduce((sum, appointment) => {
    return sum + Number(appointment.payment_amount || 0);
  }, 0) || 0;

  const getAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'paid': return t('appointments.paid');
      case 'pending': return t('appointments.pending');
      case 'overdue': return t('appointments.overdue');
      default: return t('appointments.pending');
    }
  };

  const getAppointmentStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return t('appointments.confirmed');
      case 'in_progress': return t('appointments.inProgress');
      case 'completed': return t('appointments.completed');
      case 'cancelled': return t('appointments.cancelled');
      case 'no_show': return t('appointments.noShow');
      default: return t('appointments.statusScheduled');
    }
  };

  /** Status badge colors for appointments (matches AppointmentTable / other sections) */
  const getAppointmentStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-primary/10 text-primary border-primary/20';
      case 'confirmed': return 'bg-teal-500/10 text-teal-600 border-teal-500/20 dark:text-teal-400';
      case 'in_progress': return 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400';
      case 'completed': return 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'no_show': return 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  /** Payment status badge colors (matches AppointmentTable) */
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400';
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400';
      case 'overdue': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getCfdiTypeText = (type: string) => {
    switch (type) {
      case 'ingreso': return t('cfdi.typeIngreso');
      case 'egreso': return t('cfdi.typeEgreso');
      case 'pago': return t('cfdi.typePago');
      default: return type;
    }
  };

  const getCfdiStatusText = (status: string) => {
    switch (status) {
      case 'draft': return t('cfdi.statusDraft');
      case 'issued': return t('cfdi.statusIssued');
      case 'canceled': return t('cfdi.statusCanceled');
      default: return status;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash': return t('finance.cash');
      case 'card': return t('finance.card');
      case 'transfer': return t('finance.transfer');
      case 'insurance': return t('finance.insurance');
      case 'balance': return t('finance.balance');
      default: return method;
    }
  };

  // Clinic-aware currency formatting
  const formatCurrencyWithClinic = (value: number) => {
    return formatCurrency(value, 2, currency);
  };

  const formatClinicDate = (value: string | Date, options: Intl.DateTimeFormatOptions) => {
    const date = typeof value === 'string' ? new Date(value) : value;
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      ...options,
    }).format(date);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            {t('clients.clientDetails')}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          {/* Tabs: Overview, Appointments, CFDI, Documents */}
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">{t('clients.overview')}</TabsTrigger>
            <TabsTrigger value="appointments">{t('clients.appointmentsHistory')}</TabsTrigger>
            <TabsTrigger value="cfdi">{t('clients.cfdiInvoices')}</TabsTrigger>
            <TabsTrigger value="documents">{t('documents.tabTitle', 'Documentos')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('clients.personalInformation')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-lg">
                    {client.first_name} {client.last_name}
                  </h3>
                  <p className="text-muted-foreground">
                    {getAge(client.birth_date) ? `${getAge(client.birth_date)} ${t('clients.yearsOld')}` : t('clients.ageNotSpecified')}
                  </p>
                </div>
                <div className="space-y-2">
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{client.phone}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950/50"
                        onClick={() => openWhatsApp(client.phone!, t('whatsapp.messageGreeting', { name: `${client.first_name || ''} ${client.last_name || ''}`.trim() || t('common.name') }))}
                        title={t('whatsapp.send')}
                        aria-label={t('whatsapp.send')}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{client.address}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="border-t pt-4 flex items-center justify-between gap-2">
                <div>
                  <h4 className="font-medium mb-1">{t('cfdi.fiscalData')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {hasCfdiData(client) ? t('cfdi.fiscalDataComplete') : t('cfdi.fiscalDataMissing')}
                  </p>
                </div>
                {onEdit && (
                  <Button variant="outline" size="sm" onClick={() => onEdit(client)}>
                    {t('common.edit')}
                  </Button>
                )}
              </div>

              {client.emergency_contact_name && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">{t('clients.emergencyContact')}</h4>
                  <p>{client.emergency_contact_name}</p>
                  {client.emergency_contact_phone && (
                    <p className="text-muted-foreground">{client.emergency_contact_phone}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {t('clients.financialSummary')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                </div>
              ) : balance ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">{t('clients.totalPayments')}</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrencyWithClinic(balance.totalPayments)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">{t('clients.pendingPayments')}</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrencyWithClinic(pendingPaymentsAmount)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">{t('clients.currentBalance')}</p>
                    <p className={`text-2xl font-bold ${balance.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {balance.balance >= 0 ? '+' : ''}{formatCurrencyWithClinic(balance.balance)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{t('clients.balanceDescription')}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">{t('clients.noFinancialData')}</p>
              )}
            </CardContent>
          </Card>

          {/* Pending Payments */}
          {pendingAppointments && pendingAppointments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  {t('clients.pendingPaymentsTitle')} ({pendingAppointments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('clients.date')}</TableHead>
                      <TableHead>{t('clients.treatment')}</TableHead>
                      <TableHead>{t('clients.therapist')}</TableHead>
                      <TableHead>{t('clients.amount')}</TableHead>
                      <TableHead>{t('clients.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingAppointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          {formatClinicDate(appointment.start_time, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>
                          {appointment.treatments?.name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {appointment.therapists ? 
                            `${appointment.therapists.first_name} ${appointment.therapists.last_name}` : 
                            'N/A'
                          }
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrencyWithClinic(appointment.payment_amount || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {getPaymentStatusText(appointment.payment_status || 'pending')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Payment History */}
          {paymentHistory && paymentHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  {t('clients.paymentHistoryTitle')} ({paymentHistory.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('clients.date')}</TableHead>
                      <TableHead>{t('clients.description')}</TableHead>
                      <TableHead>{t('clients.method')}</TableHead>
                      <TableHead>{t('clients.amount')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {formatClinicDate(payment.payment_date, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>
                          {payment.description || t('clients.payment')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {getPaymentMethodText(payment.method)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {formatCurrencyWithClinic(payment.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              {t('clients.close')}
            </Button>
          </div>
          </TabsContent>

          <TabsContent value="appointments" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  {t('clients.appointmentsHistory')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!appointmentsHistory?.length ? (
                  <p className="text-muted-foreground py-4">{t('clients.noAppointments')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('clients.date')}</TableHead>
                        <TableHead>{t('clients.treatment')}</TableHead>
                        <TableHead>{t('clients.therapist')}</TableHead>
                        <TableHead>{t('clients.amount')}</TableHead>
                        <TableHead>{t('clients.status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointmentsHistory.map((apt) => (
                        <TableRow key={apt.id}>
                          <TableCell>{formatClinicDate(apt.start_time, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}</TableCell>
                          <TableCell>{apt.treatments?.name ?? 'N/A'}</TableCell>
                          <TableCell>
                            {apt.therapists
                              ? `${apt.therapists.first_name} ${apt.therapists.last_name}`
                              : 'N/A'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrencyWithClinic(apt.payment_amount ?? 0)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge className={`${getAppointmentStatusColor(apt.status)} border`}>
                                {getAppointmentStatusText(apt.status)}
                              </Badge>
                              {apt.status === 'completed' && (
                                <Badge className={`${getPaymentStatusColor(apt.payment_status ?? 'pending')} border`}>
                                  {getPaymentStatusText(apt.payment_status ?? 'pending')}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={onClose}>
                {t('clients.close')}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="cfdi" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('clients.cfdiInvoices')}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!clinicId || !nonInvoicedPaymentIds.length}
                  onClick={() => setShowCfdiUploadModal(true)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t('cfdi.uploadCfdi')}
                </Button>
              </CardHeader>
              <CardContent>
                {!clientCfdiInvoices.length ? (
                  <p className="text-muted-foreground py-4">{t('clients.noCfdiInvoices')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('clients.cfdiType')}</TableHead>
                        <TableHead>{t('clients.cfdiFolio')}</TableHead>
                        <TableHead>{t('clients.cfdiDate')}</TableHead>
                        <TableHead>{t('clients.cfdiAmount')}</TableHead>
                        <TableHead>{t('clients.cfdiStatus')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientCfdiInvoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell><Badge variant="outline">{getCfdiTypeText(inv.type)}</Badge></TableCell>
                          <TableCell className="font-mono text-sm">{inv.folio || inv.uuid || '-'}</TableCell>
                          <TableCell>
                            {inv.emitted_at
                              ? format(new Date(inv.emitted_at), 'MMM d, yyyy')
                              : format(new Date(inv.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="font-medium">{formatCurrencyWithClinic(Number(inv.total))}</TableCell>
                          <TableCell><Badge variant="secondary">{getCfdiStatusText(inv.status)}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {inv.pdf_url && (
                                inv.source === 'uploaded' ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                      const u = await getCfdiFileUrl(inv, 'pdf');
                                      if (u) window.open(u, '_blank');
                                    }}
                                  >
                                    {t('common.download')} PDF
                                  </Button>
                                ) : (
                                  <Button variant="ghost" size="sm" asChild>
                                    <a href={inv.pdf_url!} target="_blank" rel="noopener noreferrer">{t('common.download')} PDF</a>
                                  </Button>
                                )
                              )}
                              {inv.xml_url && (
                                inv.source === 'uploaded' ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                      const u = await getCfdiFileUrl(inv, 'xml');
                                      if (u) window.open(u, '_blank');
                                    }}
                                  >
                                    XML
                                  </Button>
                                ) : (
                                  <Button variant="ghost" size="sm" asChild>
                                    <a href={inv.xml_url!} target="_blank" rel="noopener noreferrer">XML</a>
                                  </Button>
                                )
                              )}
                              {!inv.pdf_url && !inv.xml_url && <span className="text-muted-foreground">—</span>}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={onClose}>
                {t('clients.close')}
              </Button>
            </div>
          </TabsContent>

          {/* Documents tab: client-level + appointment-attached documents */}
          <TabsContent value="documents" className="mt-4 space-y-4">
            <DocumentSection
              context="client"
              clientId={client.id}
              clientPhone={client.phone}
              clientName={`${client.first_name || ''} ${client.last_name || ''}`.trim()}
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={onClose}>
                {t('clients.close')}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
    {clinicId && (
      <CfdiUploadModal
        open={showCfdiUploadModal}
        onClose={() => setShowCfdiUploadModal(false)}
        onSuccess={() => {}}
        clinicId={clinicId}
        mode="individual"
        paymentIds={nonInvoicedPaymentIds}
      />
    )}
    </>
  );
} 