
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, DollarSign, Activity } from "lucide-react";

const stats = [
  {
    title: "Today's Appointments",
    value: "12",
    change: "+2 from yesterday",
    icon: Calendar,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    title: "Active Clients",
    value: "248",
    change: "+18 this month",
    icon: Users,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    title: "Today's Revenue",
    value: "$2,340",
    change: "+12% from yesterday",
    icon: DollarSign,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
  {
    title: "Treatments Completed",
    value: "89",
    change: "+5% this week",
    icon: Activity,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
];

export const DashboardStats = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
      {stats.map((stat) => (
        <Card key={stat.title} className="hover-lift fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
