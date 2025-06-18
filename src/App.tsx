
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route 
              path="/appointments" 
              element={<ComingSoon title="Appointments" description="Schedule and manage client appointments with calendar integration" />} 
            />
            <Route 
              path="/therapists" 
              element={<ComingSoon title="Therapists" description="Manage therapist profiles and schedules" />} 
            />
            <Route 
              path="/treatments" 
              element={<ComingSoon title="Treatments" description="Define and manage treatment types and protocols" />} 
            />
            <Route 
              path="/suppliers" 
              element={<ComingSoon title="Suppliers" description="Track clinic suppliers and inventory" />} 
            />
            <Route 
              path="/finance" 
              element={<ComingSoon title="Finance" description="Manage payments, cash cuts, and financial reporting" />} 
            />
            <Route 
              path="/settings" 
              element={<ComingSoon title="Settings" description="Configure clinic settings and user preferences" />} 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
