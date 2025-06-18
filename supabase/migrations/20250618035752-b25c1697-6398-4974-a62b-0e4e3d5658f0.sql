
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
CREATE TYPE public.payment_method AS ENUM ('cash', 'card', 'transfer', 'insurance');
CREATE TYPE public.user_role AS ENUM ('admin', 'therapist', 'reception');
CREATE TYPE public.gender AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'reception',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Create therapists table
CREATE TABLE public.therapists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  license_number TEXT,
  specialties TEXT[],
  google_calendar_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create treatments table
CREATE TABLE public.treatments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price DECIMAL(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  gender gender,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  medical_notes TEXT,
  tags TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  treatment_id UUID NOT NULL REFERENCES public.treatments(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  google_calendar_event_id TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  products_provided TEXT[],
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shifts table for cash management
CREATE TABLE public.shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  opening_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  closing_amount DECIMAL(10,2),
  notes TEXT,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  method payment_method NOT NULL,
  description TEXT,
  received_by UUID REFERENCES public.profiles(id),
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default treatments
INSERT INTO public.treatments (name, description, duration_minutes, price) VALUES
('Dry Needling', 'Therapeutic technique using thin needles', 60, 80.00),
('Sports Massage', 'Deep tissue massage for athletes', 45, 65.00),
('Rehabilitation', 'Post-injury rehabilitation therapy', 90, 120.00),
('Manual Therapy', 'Hands-on treatment techniques', 60, 75.00),
('Stretching Session', 'Guided stretching and mobility work', 30, 40.00);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Create security definer function to check if user is therapist
CREATE OR REPLACE FUNCTION public.get_user_therapist_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT t.id FROM public.therapists t 
  JOIN public.profiles p ON t.user_id = p.id 
  WHERE p.id = auth.uid();
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_user_role() = 'admin');

CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (public.get_user_role() = 'admin');

-- RLS Policies for therapists
CREATE POLICY "Therapists can view their own record" ON public.therapists
  FOR SELECT USING (user_id = auth.uid() OR public.get_user_role() = 'admin');

CREATE POLICY "Admins can manage all therapists" ON public.therapists
  FOR ALL USING (public.get_user_role() = 'admin');

-- RLS Policies for treatments (readable by all authenticated users)
CREATE POLICY "Authenticated users can view treatments" ON public.treatments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage treatments" ON public.treatments
  FOR ALL USING (public.get_user_role() = 'admin');

-- RLS Policies for clients
CREATE POLICY "Admins and reception can view all clients" ON public.clients
  FOR SELECT USING (public.get_user_role() IN ('admin', 'reception'));

CREATE POLICY "Therapists can view their assigned clients" ON public.clients
  FOR SELECT USING (
    public.get_user_role() = 'therapist' AND 
    id IN (
      SELECT DISTINCT client_id FROM public.appointments 
      WHERE therapist_id = public.get_user_therapist_id()
    )
  );

CREATE POLICY "Admins and reception can manage clients" ON public.clients
  FOR ALL USING (public.get_user_role() IN ('admin', 'reception'));

-- RLS Policies for appointments
CREATE POLICY "Users can view relevant appointments" ON public.appointments
  FOR SELECT USING (
    public.get_user_role() = 'admin' OR
    public.get_user_role() = 'reception' OR
    (public.get_user_role() = 'therapist' AND therapist_id = public.get_user_therapist_id())
  );

CREATE POLICY "Admins and reception can manage appointments" ON public.appointments
  FOR ALL USING (public.get_user_role() IN ('admin', 'reception'));

CREATE POLICY "Therapists can update their own appointments" ON public.appointments
  FOR UPDATE USING (
    public.get_user_role() = 'therapist' AND 
    therapist_id = public.get_user_therapist_id()
  );

-- RLS Policies for suppliers
CREATE POLICY "Authenticated users can view suppliers" ON public.suppliers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage suppliers" ON public.suppliers
  FOR ALL USING (public.get_user_role() = 'admin');

-- RLS Policies for shifts
CREATE POLICY "Users can view their own shifts" ON public.shifts
  FOR SELECT USING (
    user_id = auth.uid() OR 
    public.get_user_role() = 'admin'
  );

CREATE POLICY "Users can manage their own shifts" ON public.shifts
  FOR ALL USING (
    user_id = auth.uid() OR 
    public.get_user_role() = 'admin'
  );

-- RLS Policies for payments
CREATE POLICY "Admins can view all payments" ON public.payments
  FOR SELECT USING (public.get_user_role() = 'admin');

CREATE POLICY "Users can view payments they received" ON public.payments
  FOR SELECT USING (
    received_by = auth.uid() OR 
    public.get_user_role() = 'admin'
  );

CREATE POLICY "Authenticated users can create payments" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can manage all payments" ON public.payments
  FOR ALL USING (public.get_user_role() = 'admin');

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_therapists_updated_at BEFORE UPDATE ON public.therapists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_treatments_updated_at BEFORE UPDATE ON public.treatments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
