
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { useUpcomingAppointments } from "@/hooks/useAppointments";
import { Skeleton } from "@/components/ui/skeleton";

const UpcomingAppointments = () => {
  const { data: appointments, isLoading } = useUpcomingAppointments();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
          <CardDescription>Next scheduled sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="ml-auto">
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!appointments || appointments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
          <CardDescription>Next scheduled sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No upcoming appointments</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Appointments</CardTitle>
        <CardDescription>Next scheduled sessions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="flex items-center space-x-4 p-4 rounded-lg border">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {appointment.clients?.first_name} {appointment.clients?.last_name}
                </p>
                <p className="text-sm text-gray-500">
                  {appointment.treatments?.name}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {format(new Date(appointment.start_time), 'MMM d, h:mm a')}
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <Badge variant={appointment.status === 'scheduled' ? 'default' : 'secondary'}>
                  {appointment.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default UpcomingAppointments;
