-- Remove custom session management tables since we're using Supabase's built-in session management

-- Drop user_sessions table and related objects
DROP TABLE IF EXISTS user_sessions CASCADE;

-- Drop login_history table and related objects  
DROP TABLE IF EXISTS login_history CASCADE;

-- Drop functions that are no longer needed
DROP FUNCTION IF EXISTS log_login_attempt(UUID, TEXT, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS generate_backup_codes();

-- Keep security_settings table as it's still useful for user security preferences
-- Keep the backup codes function as it's still used for 2FA
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