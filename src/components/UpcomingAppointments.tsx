import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User } from "lucide-react";
import { useUpcomingAppointments } from "@/hooks/useAppointments";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { useClinicSettings } from "@/hooks/useClinic";

interface UpcomingAppointmentsProps {
  onAppointmentClick?: (appointment: any) => void;
}

const UpcomingAppointments = ({ onAppointmentClick }: UpcomingAppointmentsProps) => {
  const { t } = useTranslation();
  const { timezone } = useClinicSettings();
  const { data: appointments, isLoading } = useUpcomingAppointments();

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return t('appointments.scheduled');
      case 'completed': return t('appointments.completed');
      case 'cancelled': return t('appointments.cancelled');
      case 'no_show': return t('appointments.noShow');
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no_show': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.upcomingAppointmentsTitle')}</CardTitle>
          <CardDescription>{t('dashboard.nextScheduledSessions')}</CardDescription>
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
          <CardTitle>{t('dashboard.upcomingAppointmentsTitle')}</CardTitle>
          <CardDescription>{t('dashboard.nextScheduledSessions')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{t('dashboard.noUpcomingAppointments')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('dashboard.upcomingAppointmentsTitle')}</CardTitle>
        <CardDescription>{t('dashboard.nextScheduledSessions')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              role={onAppointmentClick ? 'button' : undefined}
              tabIndex={onAppointmentClick ? 0 : undefined}
              onClick={onAppointmentClick ? () => onAppointmentClick(appointment) : undefined}
              onKeyDown={
                onAppointmentClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onAppointmentClick(appointment);
                      }
                    }
                  : undefined
              }
              className={`flex items-center space-x-4 p-4 rounded-lg border ${onAppointmentClick ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
            >
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {appointment.clients?.first_name} {appointment.clients?.last_name}
                </p>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>{appointment.treatments?.name}</span>
                  <span>•</span>
                  <span>Dr. {appointment.therapists?.first_name} {appointment.therapists?.last_name}</span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                      timeZone: timezone,
                    }).format(new Date(appointment.start_time))}
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <Badge className={getStatusColor(appointment.status)}>
                  {getStatusText(appointment.status)}
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
