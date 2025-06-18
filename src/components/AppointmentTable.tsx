
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { User, Eye } from 'lucide-react';

interface AppointmentTableProps {
  groupedAppointments: Record<string, { therapist: any; appointments: any[] }>;
  onAppointmentClick: (appointment: any) => void;
}

const AppointmentTable = ({ groupedAppointments, onAppointmentClick }: AppointmentTableProps) => {
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

  return (
    <div className="space-y-6">
      {Object.entries(groupedAppointments).map(([therapistId, { therapist, appointments }]) => (
        <Card key={therapistId}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              {therapist?.first_name} {therapist?.last_name}
              <Badge variant="secondary" className="ml-auto">
                {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                       (new Date(appointment.end_time).getTime() - new Date(appointment.start_time).getTime()) / 60000} min
                    </TableCell>
                    <TableCell>
                      ${appointment.payment_amount || 0}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(appointment.status)}>
                        {appointment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPaymentStatusColor(appointment.payment_status)}>
                        {appointment.payment_status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAppointmentClick(appointment)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
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
