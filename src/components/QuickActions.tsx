
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Users, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: "New Appointment",
      description: "Schedule a new client appointment",
      icon: Calendar,
      color: "bg-blue-500 hover:bg-blue-600",
      onClick: () => navigate("/appointments/new"),
    },
    {
      title: "Add Client",
      description: "Register a new client",
      icon: Users,
      color: "bg-green-500 hover:bg-green-600",
      onClick: () => navigate("/clients/new"),
    },
    {
      title: "Record Payment",
      description: "Log a new payment",
      icon: DollarSign,
      color: "bg-yellow-500 hover:bg-yellow-600",
      onClick: () => navigate("/finance/new"),
    },
  ];

  return (
    <Card className="fade-in">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Plus className="w-5 h-5 text-primary" />
          <span>Quick Actions</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action) => (
          <Button
            key={action.title}
            onClick={action.onClick}
            className={`w-full justify-start text-left p-4 h-auto ${action.color} text-white hover-lift`}
          >
            <action.icon className="w-5 h-5 mr-3" />
            <div>
              <div className="font-medium">{action.title}</div>
              <div className="text-sm opacity-90">{action.description}</div>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};
