
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Clock, User } from "lucide-react";

const appointments = [
  {
    id: 1,
    time: "09:00 AM",
    client: "Sarah Johnson",
    therapist: "Dr. Emma Wilson",
    treatment: "Dry Needling",
    status: "confirmed",
    duration: "60 min",
  },
  {
    id: 2,
    time: "10:30 AM",
    client: "Mike Chen",
    therapist: "Dr. James Rodriguez",
    treatment: "Sports Massage",
    status: "confirmed",
    duration: "45 min",
  },
  {
    id: 3,
    time: "02:00 PM",
    client: "Lisa Anderson",
    therapist: "Dr. Emma Wilson",
    treatment: "Rehabilitation",
    status: "pending",
    duration: "90 min",
  },
  {
    id: 4,
    time: "03:30 PM",
    client: "David Thompson",
    therapist: "Dr. Sarah Martinez",
    treatment: "Manual Therapy",
    status: "confirmed",
    duration: "60 min",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "confirmed":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const UpcomingAppointments = () => {
  return (
    <Card className="fade-in">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-primary" />
          <span>Today's Appointments</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-center min-w-0">
                <div className="flex items-center text-sm font-medium text-foreground">
                  <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                  {appointment.time}
                </div>
                <span className="text-xs text-muted-foreground">{appointment.duration}</span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <Avatar className="w-8 h-8 bg-primary/10">
                    <User className="w-4 h-4 text-primary" />
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{appointment.client}</p>
                    <p className="text-xs text-muted-foreground">{appointment.therapist}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{appointment.treatment}</p>
                <Badge
                  variant="secondary"
                  className={`text-xs ${getStatusColor(appointment.status)}`}
                >
                  {appointment.status}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
