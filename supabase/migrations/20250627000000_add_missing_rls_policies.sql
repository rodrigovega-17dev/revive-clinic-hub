-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_cash_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Clinics policies
CREATE POLICY "Users can view own clinic" ON public.clinics
  FOR SELECT USING (id = public.get_user_clinic_id());

CREATE POLICY "Clinic owners can update own clinic" ON public.clinics
  FOR UPDATE USING (id = public.get_user_clinic_id() AND public.is_clinic_owner());

-- Therapists policies
CREATE POLICY "Users can view clinic therapists" ON public.therapists
  FOR SELECT USING (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic owners can manage therapists" ON public.therapists
  FOR ALL USING (clinic_id = public.get_user_clinic_id() AND public.is_clinic_owner());

-- Treatments policies
CREATE POLICY "Users can view clinic treatments" ON public.treatments
  FOR SELECT USING (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic owners can manage treatments" ON public.treatments
  FOR ALL USING (clinic_id = public.get_user_clinic_id() AND public.is_clinic_owner());

-- Clients policies
CREATE POLICY "Users can view clinic clients" ON public.clients
  FOR SELECT USING (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic owners can manage clients" ON public.clients
  FOR ALL USING (clinic_id = public.get_user_clinic_id() AND public.is_clinic_owner());

-- Appointments policies
CREATE POLICY "Users can view clinic appointments" ON public.appointments
  FOR SELECT USING (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic owners can manage appointments" ON public.appointments
  FOR ALL USING (clinic_id = public.get_user_clinic_id() AND public.is_clinic_owner());

-- Suppliers policies
CREATE POLICY "Users can view clinic suppliers" ON public.suppliers
  FOR SELECT USING (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic owners can manage suppliers" ON public.suppliers
  FOR ALL USING (clinic_id = public.get_user_clinic_id() AND public.is_clinic_owner());

-- Expenses policies
CREATE POLICY "Users can view clinic expenses" ON public.expenses
  FOR SELECT USING (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic owners can manage expenses" ON public.expenses
  FOR ALL USING (clinic_id = public.get_user_clinic_id() AND public.is_clinic_owner());

-- Shifts policies
CREATE POLICY "Users can view clinic shifts" ON public.shifts
  FOR SELECT USING (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic owners can manage shifts" ON public.shifts
  FOR ALL USING (clinic_id = public.get_user_clinic_id() AND public.is_clinic_owner());

-- Payments policies
CREATE POLICY "Users can view clinic payments" ON public.payments
  FOR SELECT USING (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic owners can manage payments" ON public.payments
  FOR ALL USING (clinic_id = public.get_user_clinic_id() AND public.is_clinic_owner());

-- Sync logs policies
CREATE POLICY "Users can view clinic sync logs" ON public.sync_logs
  FOR SELECT USING (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic owners can manage sync logs" ON public.sync_logs
  FOR ALL USING (clinic_id = public.get_user_clinic_id() AND public.is_clinic_owner());

-- Daily cash summary policies
CREATE POLICY "Users can view clinic daily cash summary" ON public.daily_cash_summary
  FOR SELECT USING (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic owners can manage daily cash summary" ON public.daily_cash_summary
  FOR ALL USING (clinic_id = public.get_user_clinic_id() AND public.is_clinic_owner());

-- User preferences policies
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own preferences" ON public.user_preferences
  FOR ALL USING (user_id = auth.uid());

-- Security settings policies
CREATE POLICY "Users can view own security settings" ON public.security_settings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own security settings" ON public.security_settings
  FOR ALL USING (user_id = auth.uid());

-- Subscription plans policies (read-only for all authenticated users)
CREATE POLICY "Users can view subscription plans" ON public.subscription_plans
  FOR SELECT USING (auth.role() = 'authenticated');

-- Clinic subscriptions policies
CREATE POLICY "Users can view own clinic subscriptions" ON public.clinic_subscriptions
  FOR SELECT USING (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic owners can manage subscriptions" ON public.clinic_subscriptions
  FOR ALL USING (clinic_id = public.get_user_clinic_id() AND public.is_clinic_owner());

-- Subscription usage policies
CREATE POLICY "Users can view own clinic usage" ON public.subscription_usage
  FOR SELECT USING (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic owners can manage usage" ON public.subscription_usage
  FOR ALL USING (clinic_id = public.get_user_clinic_id() AND public.is_clinic_owner());

-- Subscription invoices policies
CREATE POLICY "Users can view own clinic invoices" ON public.subscription_invoices
  FOR SELECT USING (clinic_id = public.get_user_clinic_id());

CREATE POLICY "Clinic owners can manage invoices" ON public.subscription_invoices
  FOR ALL USING (clinic_id = public.get_user_clinic_id() AND public.is_clinic_owner()); 
 
 