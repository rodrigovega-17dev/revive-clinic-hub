import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { User, Eye, Edit, Trash2, Calendar, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useClinicSettings } from '@/hooks/useClinic';

// Google Calendar default colors
const GOOGLE_CALENDAR_COLORS = [
  { id: '1', name: 'Lavender', background: '#7986cb', foreground: '#ffffff' },
  { id: '2', name: 'Sage', background: '#33b679', foreground: '#ffffff' },
  { id: '3', name: 'Grape', background: '#8e63ce', foreground: '#ffffff' },
  { id: '4', name: 'Flamingo', background: '#e67c73', foreground: '#ffffff' },
  { id: '5', name: 'Banana', background: '#f6c026', foreground: '#000000' },
  { id: '6', name: 'Tangerine', background: '#f4791f', foreground: '#ffffff' },
  { id: '7', name: 'Peacock', background: '#039be5', foreground: '#ffffff' },
  { id: '8', name: 'Graphite', background: '#616161', foreground: '#ffffff' },
  { id: '9', name: 'Blueberry', background: '#3f51b5', foreground: '#ffffff' },
  { id: '10', name: 'Basil', background: '#0b8043', foreground: '#ffffff' },
  { id: '11', name: 'Tomato', background: '#d60000', foreground: '#ffffff' },
];

// Utility function to get therapist color
const getTherapistColor = (colorId?: string) => {
  return GOOGLE_CALENDAR_COLORS.find(color => color.id === colorId) || GOOGLE_CALENDAR_COLORS[0];
};

interface AppointmentTableProps {
  groupedAppointments: Record<string, { therapist: any; appointments: any[] }>;
  onAppointmentClick: (appointment: any) => void;
}

const AppointmentTable = ({ groupedAppointments, onAppointmentClick }: AppointmentTableProps) => {
  const { t } = useTranslation();
  const { currency, timezone } = useClinicSettings();
  
  // Clinic-aware currency formatting
  const formatCurrencyWithClinic = (value: number) => {
    return formatCurrency(value, 2, currency);
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-primary/10 text-primary border-primary/20';
      case 'confirmed': return 'bg-teal-500/10 text-teal-600 border-teal-500/20 dark:text-teal-400';
      case 'in_progress': return 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400';
      case 'waiting_checkout': return 'bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400';
      case 'completed': return 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'no_show': return 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400';
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400';
      case 'overdue': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return t('appointments.scheduled');
      case 'confirmed': return t('appointments.confirmed');
      case 'in_progress': return t('appointments.inProgress');
      case 'waiting_checkout': return t('appointments.waitingCheckout');
      case 'completed': return t('appointments.completed');
      case 'cancelled': return t('appointments.cancelled');
      case 'no_show': return t('appointments.noShow');
      default: return status;
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'paid': return t('appointments.paid');
      case 'pending': return t('appointments.pending');
      case 'overdue': return t('appointments.overdue');
      default: return t('appointments.pending');
    }
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedAppointments).map(([therapistId, { therapist, appointments }]) => (
        <Card key={therapistId}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full border border-border"
                  style={{ backgroundColor: getTherapistColor(therapist?.calendar_color_id).background }}
                />
                {therapist?.first_name} {therapist?.last_name}
              </div>
              <Badge variant="secondary" className="ml-auto">
                {appointments.length} {appointments.length !== 1 ? t('appointments.appointments') : t('appointments.appointment')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('appointments.time')}</TableHead>
                  <TableHead>{t('appointments.client')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('appointments.duration')}</TableHead>
                  <TableHead>{t('appointments.amount')}</TableHead>
                  <TableHead>{t('appointments.status')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('appointments.payment')}</TableHead>
                  <TableHead className="text-right">{t('appointments.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => (
                  <TableRow key={appointment.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium whitespace-nowrap">
                      {new Intl.DateTimeFormat('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                        timeZone: timezone,
                      }).format(new Date(appointment.start_time))}{' '}
                      -{' '}
                      {new Intl.DateTimeFormat('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                        timeZone: timezone,
                      }).format(new Date(appointment.end_time))}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {appointment.clients?.first_name} {appointment.clients?.last_name}
                        </div>
                        {appointment.clients?.phone && (
                          <div className="text-sm text-muted-foreground hidden md:block">
                            {appointment.clients.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {appointment.treatments?.duration_minutes ||
                       (new Date(appointment.end_time).getTime() - new Date(appointment.start_time).getTime()) / 60000} {t('appointments.min')}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground whitespace-nowrap">
                        {formatCurrencyWithClinic(appointment.payment_amount || 0)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(appointment.status)} border whitespace-nowrap`}>
                        {getStatusText(appointment.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge className={`${getPaymentStatusColor(appointment.payment_status)} border`}>
                        {getPaymentStatusText(appointment.payment_status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAppointmentClick(appointment)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">{t('appointments.view')}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AppointmentTable;
