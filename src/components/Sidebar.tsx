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
  LogOut,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useClinic } from "@/hooks/useClinic";

const navigation = [
  { name: "navigation.dashboard", href: "/dashboard", icon: BarChart3 },
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
  const { profile, signOut } = useAuth();
  const { data: clinic } = useClinic();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate('/auth');
    }
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (!profile) return t('sidebar.fallbackUser');
    return `${profile.first_name} ${profile.last_name}`.trim() || profile.email;
  };

  // Get user role display
  const getUserRole = () => {
    if (!profile) return t('sidebar.fallbackUser');
    return profile.role.charAt(0).toUpperCase() + profile.role.slice(1);
  };

  // Get clinic display name
  const getClinicDisplayName = () => {
    return clinic?.name || t('sidebar.fallbackClinic');
  };

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
              <h1 className="text-lg font-bold text-sidebar-foreground">{getClinicDisplayName()}</h1>
              <p className="text-xs text-muted-foreground font-medium">{t('sidebar.subBrand')}</p>
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

      {/* Footer with User Info and Logout */}
      <div className="p-4 border-t border-sidebar-border bg-sidebar/50">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            {/* User Info */}
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="w-10 h-10 bg-gradient-to-br from-muted to-muted/80 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">
                  {getUserDisplayName()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getUserRole()}
                </p>
              </div>
            </div>
            
            {/* Logout Icon */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="hover:bg-red-500/10 hover:text-red-500 text-sidebar-foreground/70 hover:text-sidebar-foreground p-2"
              title={t('navigation.logout')}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          /* Collapsed state - just logout icon */
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full hover:bg-red-500/10 hover:text-red-500 text-sidebar-foreground/70 hover:text-sidebar-foreground"
            title={t('navigation.logout')}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
