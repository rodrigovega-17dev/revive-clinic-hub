-- Create user_sessions table for session management
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  device_info JSONB,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(session_token)
);

-- Create login_history table for tracking login attempts
CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create security_settings table for user security preferences
CREATE TABLE IF NOT EXISTS security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Two-factor authentication
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_method VARCHAR(20) DEFAULT 'email', -- 'email', 'sms', 'app'
  backup_codes TEXT[], -- Array of backup codes
  
  -- Password settings
  password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  require_password_change BOOLEAN DEFAULT false,
  
  -- Session settings
  max_concurrent_sessions INTEGER DEFAULT 5,
  session_timeout_minutes INTEGER DEFAULT 480, -- 8 hours
  
  -- Security preferences
  login_notifications BOOLEAN DEFAULT true,
  suspicious_activity_alerts BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one security setting record per user per clinic
  UNIQUE(user_id, clinic_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_clinic_id ON user_sessions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_clinic_id ON login_history(clinic_id);
CREATE INDEX IF NOT EXISTS idx_login_history_email ON login_history(email);
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON login_history(created_at);

CREATE INDEX IF NOT EXISTS idx_security_settings_user_id ON security_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_security_settings_clinic_id ON security_settings(clinic_id);

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_sessions
CREATE POLICY "Users can view their own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON user_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for login_history
CREATE POLICY "Users can view their own login history" ON login_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert login history" ON login_history
  FOR INSERT WITH CHECK (true);

-- Create RLS policies for security_settings
CREATE POLICY "Users can view their own security settings" ON security_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own security settings" ON security_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own security settings" ON security_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own security settings" ON security_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically create security settings when a user is created
CREATE OR REPLACE FUNCTION create_security_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the clinic_id from the user's profile
  INSERT INTO security_settings (user_id, clinic_id)
  SELECT NEW.id, p.clinic_id
  FROM profiles p
  WHERE p.id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create security settings
CREATE TRIGGER create_security_settings_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_security_settings();

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_security_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_security_settings_updated_at_trigger
  BEFORE UPDATE ON security_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_security_settings_updated_at();

-- Create function to log login attempts
CREATE OR REPLACE FUNCTION log_login_attempt(
  p_user_id UUID,
  p_email TEXT,
  p_success BOOLEAN,
  p_failure_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_clinic_id UUID;
BEGIN
  -- Get clinic_id from user's profile
  SELECT clinic_id INTO v_clinic_id
  FROM profiles
  WHERE id = p_user_id;
  
  -- Insert login attempt record
  INSERT INTO login_history (user_id, clinic_id, email, ip_address, user_agent, success, failure_reason)
  VALUES (
    p_user_id,
    COALESCE(v_clinic_id, (SELECT id FROM clinics LIMIT 1)),
    p_email,
    inet_client_addr(),
    current_setting('request.headers')::json->>'user-agent',
    p_success,
    p_failure_reason
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate backup codes
CREATE OR REPLACE FUNCTION generate_backup_codes()
RETURNS TEXT[] AS $$
DECLARE
  codes TEXT[] := ARRAY[]::TEXT[];
  i INTEGER;
BEGIN
  FOR i IN 1..10 LOOP
    codes := array_append(codes, 
      upper(substring(md5(random()::text) from 1 for 8))
    );
  END LOOP;
  
  RETURN codes;
END;
$$ LANGUAGE plpgsql; 