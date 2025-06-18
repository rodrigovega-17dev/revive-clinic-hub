
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
        "flex flex-col h-screen bg-gray-900 border-r border-gray-700 transition-all duration-300 ease-in-out shadow-lg",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Revive Clinic</h1>
              <p className="text-xs text-gray-400 font-medium">Physiotherapy CRM</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="hover:bg-gray-700 text-gray-300 hover:text-white"
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
              variant="ghost"
              className={cn(
                "w-full justify-start transition-all duration-200 text-sm font-medium",
                collapsed ? "px-2" : "px-3",
                isActive
                  ? "bg-blue-600 text-white shadow-sm border-l-4 border-blue-400 font-semibold"
                  : "hover:bg-gray-700 text-gray-300 hover:text-white hover:shadow-sm"
              )}
              onClick={() => navigate(item.href)}
            >
              <item.icon className={cn("w-5 h-5", collapsed ? "" : "mr-3", isActive ? "text-white" : "")} />
              {!collapsed && <span>{item.name}</span>}
            </Button>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-700 bg-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-slate-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Dr. Admin</p>
              <p className="text-xs text-gray-400">Administrator</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
