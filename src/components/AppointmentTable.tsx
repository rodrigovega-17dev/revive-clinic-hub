import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { User, Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

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
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no_show': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return t('appointments.scheduled');
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('appointments.time')}</TableHead>
                  <TableHead>{t('appointments.client')}</TableHead>
                  <TableHead>{t('appointments.duration')}</TableHead>
                  <TableHead>{t('appointments.amount')}</TableHead>
                  <TableHead>{t('appointments.status')}</TableHead>
                  <TableHead>{t('appointments.payment')}</TableHead>
                  <TableHead className="text-right">{t('appointments.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => (
                  <TableRow key={appointment.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {format(new Date(appointment.start_time), 'HH:mm')} - 
                      {format(new Date(appointment.end_time), 'HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {appointment.clients?.first_name} {appointment.clients?.last_name}
                        </div>
                        {appointment.clients?.phone && (
                          <div className="text-sm text-muted-foreground">
                            {appointment.clients.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {appointment.treatments?.duration_minutes || 
                       (new Date(appointment.end_time).getTime() - new Date(appointment.start_time).getTime()) / 60000} {t('appointments.min')}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(appointment.payment_amount || 0)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(appointment.status)}>
                        {getStatusText(appointment.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPaymentStatusColor(appointment.payment_status)}>
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
                        {t('appointments.view')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AppointmentTable;
