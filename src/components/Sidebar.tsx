import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LanguageSelector } from "./LanguageSelector";

const navigation = [
  { name: "navigation.dashboard", href: "/", icon: BarChart3 },
  { name: "navigation.appointments", href: "/appointments", icon: Calendar },
  { name: "navigation.clients", href: "/clients", icon: Users },
  { name: "navigation.therapists", href: "/therapists", icon: User },
  { name: "navigation.finance", href: "/finance", icon: DollarSign },
  { name: "navigation.payroll", href: "/payroll", icon: Calculator },
  { name: "navigation.settings", href: "/settings", icon: Settings },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out shadow-lg",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border bg-sidebar/50">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-sidebar-primary to-sidebar-primary/80 rounded-xl flex items-center justify-center shadow-md">
              <Activity className="w-6 h-6 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground">Revive Clinic</h1>
              <p className="text-xs text-muted-foreground font-medium">Physiotherapy CRM</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground"
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
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm border-l-4 border-sidebar-primary/60 font-semibold"
                  : "hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground hover:shadow-sm"
              )}
              onClick={() => navigate(item.href)}
            >
              <item.icon className={cn("w-5 h-5", collapsed ? "" : "mr-3", isActive ? "text-sidebar-primary-foreground" : "")} />
              {!collapsed && <span>{t(item.name)}</span>}
            </Button>
          );
        })}
      </nav>

      {/* Language Selector */}
      {!collapsed && (
        <div className="px-4 py-2 border-t border-sidebar-border">
          <LanguageSelector />
        </div>
      )}

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-sidebar-border bg-sidebar/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-muted to-muted/80 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground">Dr. Admin</p>
              <p className="text-xs text-muted-foreground">Administrator</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
