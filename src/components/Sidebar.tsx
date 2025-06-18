
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Calendar,
  Users,
  User,
  DollarSign,
  Package,
  BarChart3,
  Settings,
  Menu,
  ChevronLeft,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Appointments", href: "/appointments", icon: Calendar },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Therapists", href: "/therapists", icon: User },
  { name: "Treatments", href: "/treatments", icon: Activity },
  { name: "Suppliers", href: "/suppliers", icon: Package },
  { name: "Finance", href: "/finance", icon: DollarSign },
  { name: "Settings", href: "/settings", icon: Settings },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-white border-r border-border transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Revive Clinic</h1>
              <p className="text-xs text-muted-foreground">Physiotherapy CRM</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="hover:bg-accent hover:text-accent-foreground"
        >
          {collapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Button
              key={item.name}
              variant={isActive ? "default" : "ghost"}
              className={cn(
                "w-full justify-start transition-all duration-200",
                collapsed ? "px-2" : "px-3",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
              onClick={() => navigate(item.href)}
            >
              <item.icon className={cn("w-5 h-5", collapsed ? "" : "mr-3")} />
              {!collapsed && <span className="text-sm font-medium">{item.name}</span>}
            </Button>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Dr. Admin</p>
              <p className="text-xs text-muted-foreground">Administrator</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
