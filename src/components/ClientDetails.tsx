import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { User, Phone, Mail, MapPin, Calendar, DollarSign, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useClientBalance } from '@/hooks/useClientBalance';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInYears } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

type Client = Tables<'clients'>;

interface ClientDetailsProps {
  client: Client;
  open: boolean;
  onClose: () => void;
}

export default function ClientDetails({ client, open, onClose }: ClientDetailsProps) {
  const { t } = useTranslation();
  const { data: balance, isLoading: balanceLoading } = useClientBalance(client.id);
  
  const { data: paymentHistory } = useQuery({
    queryKey: ['client-payments', client.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          description,
          payment_date,
          method,
          appointment_id
        `)
        .eq('client_id', client.id)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!client.id,
  });

  const { data: pendingAppointments } = useQuery({
    queryKey: ['client-pending-appointments', client.id],
    queryFn: async () => {
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
          therapists (first_name, last_name)
        `)
        .eq('client_id', client.id)
        .eq('status', 'completed')
        .or('payment_status.is.null,payment_status.eq.pending')
        .order('start_time', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!client.id,
  });

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

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash': return t('finance.cash');
      case 'card': return t('finance.card');
      case 'transfer': return t('finance.transfer');
      case 'insurance': return t('finance.insurance');
      default: return method;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            {t('clients.clientDetails')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
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
                      {formatCurrency(balance.totalPayments)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">{t('clients.pendingPayments')}</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(balance.pendingPayments)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">{t('clients.currentBalance')}</p>
                    <p className={`text-2xl font-bold ${balance.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {balance.balance >= 0 ? '+' : ''}{formatCurrency(balance.balance)}
                    </p>
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
                          {format(new Date(appointment.start_time), 'MMM d, yyyy')}
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
                          {formatCurrency(appointment.payment_amount || 0)}
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
                          {format(new Date(payment.payment_date), 'MMM d, yyyy')}
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
                          {formatCurrency(payment.amount)}
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
        </div>
      </DialogContent>
    </Dialog>
  );
} 