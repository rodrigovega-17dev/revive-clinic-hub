
import { DashboardStats } from "@/components/DashboardStats";
import { UpcomingAppointments } from "@/components/UpcomingAppointments";
import { QuickActions } from "@/components/QuickActions";

const Dashboard = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="fade-in">
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening at your clinic today.</p>
      </div>

      {/* Stats */}
      <DashboardStats />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <UpcomingAppointments />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
