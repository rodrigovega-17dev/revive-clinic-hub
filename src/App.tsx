import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Appointments from "./pages/Appointments";
import Clients from "./pages/Clients";
import Therapists from "./pages/Therapists";
import Finance from "./pages/Finance";
import Payroll from "./pages/Payroll";
import { FinancePinGate } from "./components/FinancePinGate";
import Settings from "./pages/Settings";
import Subscription from "./pages/Subscription";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";
import GoogleAuthCallback from "./pages/GoogleAuthCallback";
import PasswordResetConfirm from "./components/auth/PasswordResetConfirm";
import TranslationDebugger from "./components/TranslationDebugger";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale-while-revalidate strategy
      staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh
      cacheTime: 10 * 60 * 1000, // 10 minutes - keep in cache
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as any).status;
          if (status >= 400 && status < 500) return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      refetchOnWindowFocus: false, // Prevent unnecessary refetches
      refetchOnReconnect: true, // Refetch when connection is restored
    },
    mutations: {
      retry: 1, // Retry mutations once
    },
  },
});

const App = () => {
  const { t, i18n } = useTranslation();

  // Sync document lang with app language so native date/time inputs and screen readers use it
  useEffect(() => {
    const lang = i18n.language?.startsWith('es') ? 'es' : 'en';
    document.documentElement.lang = lang;
  }, [i18n.language]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <TranslationDebugger />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/reset-password" element={<PasswordResetConfirm />} />
              <Route path="/" element={<Landing />} />
              <Route path="/app" element={<ProtectedRoute><Layout><Index /></Layout></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
              <Route path="/appointments" element={<ProtectedRoute><Layout><Appointments /></Layout></ProtectedRoute>} />
              <Route path="/clients" element={<ProtectedRoute><Layout><Clients /></Layout></ProtectedRoute>} />
              <Route path="/therapists" element={<ProtectedRoute><Layout><FinancePinGate><Therapists /></FinancePinGate></Layout></ProtectedRoute>} />
              <Route path="/finance" element={<ProtectedRoute><Layout><FinancePinGate><Finance /></FinancePinGate></Layout></ProtectedRoute>} />
              <Route path="/payroll" element={<ProtectedRoute><Layout><FinancePinGate><Payroll /></FinancePinGate></Layout></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
              <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Layout><ComingSoon title={t('comingSoon.reportsTitle')} description={t('comingSoon.reportsDescription')} /></Layout></ProtectedRoute>} />
              <Route path="/google-auth-callback" element={<GoogleAuthCallback />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
