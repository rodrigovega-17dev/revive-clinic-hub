# Design Document

## Overview

This design document outlines the technical approach for implementing critical system improvements to Cliniker Hub. The improvements focus on four key areas: database schema optimization, internationalization completeness, authentication UX enhancements, and subscription flow performance optimization.

## Architecture

### Database Schema Cleanup Strategy

**Current State Analysis:**
- The system has 50+ migration files with potential redundancy
- Current schema shows a well-structured database with proper relationships
- Some migrations appear to be fixes for previous migrations (e.g., `fix_rls_policies.sql`)

**Consolidation Approach:**
1. **Schema Snapshot**: Create a comprehensive snapshot of the current production schema
2. **Migration Consolidation**: Reduce migrations to 3 essential files:
   - `001_initial_schema.sql` - Core tables and relationships
   - `002_subscription_system.sql` - Subscription and billing features  
   - `003_current_state.sql` - Latest schema state with all optimizations
3. **Data Preservation**: Ensure all existing data and functionality is maintained

### Internationalization Architecture

**Current State Analysis:**
- English translations: ~985 lines with comprehensive coverage
- Spanish translations: ~880 lines with some gaps
- Translation keys are well-structured with nested namespaces

**Completion Strategy:**
1. **Key Scanning**: Automated detection of hardcoded strings in React components
2. **Gap Analysis**: Compare English and Spanish translation files
3. **Fallback System**: Implement robust fallback mechanism for missing translations
4. **Validation**: Automated testing to ensure 100% translation coverage

### Authentication UX Enhancement Architecture

**Current Implementation Analysis:**
- Password visibility toggle exists in `PasswordChangeDialog.tsx` using Eye/EyeOff icons
- Auth component lacks password visibility controls
- No password reset functionality implemented

**Enhancement Design:**
1. **Password Visibility Component**: Reusable component with Eye/EyeOff toggle
2. **Password Reset Flow**: Complete email-based password reset using Supabase Auth
3. **Consistent UX**: Apply same patterns across login, signup, and password change

### Subscription Performance Architecture

**Current Implementation Analysis:**
- `SubscriptionPlans` component shows loading skeleton during data fetch
- Multiple API calls for subscription data, plans, and billing cycles
- No caching mechanism implemented

**Optimization Strategy:**
1. **Data Caching**: Implement React Query caching for subscription plans
2. **Optimized Queries**: Reduce database queries with proper indexing
3. **Loading States**: Improve loading experience with better skeleton screens
4. **Error Handling**: Graceful fallbacks for network issues

## Components and Interfaces

### Database Schema Components

```sql
-- Consolidated migration structure
migrations/
├── 001_initial_schema.sql      -- Core tables, types, functions
├── 002_subscription_system.sql -- Subscription features
└── 003_current_state.sql       -- Final optimizations
```

**Key Database Optimizations:**
- Maintain existing indexes for performance
- Preserve all RLS policies for security
- Keep subscription-related indexes for fast plan loading

### Translation System Components

```typescript
// Translation validation interface
interface TranslationValidation {
  missingKeys: string[];
  extraKeys: string[];
  coverage: number;
}

// Enhanced translation hook
interface UseTranslationEnhanced {
  t: (key: string, options?: any) => string;
  language: 'en' | 'es';
  coverage: TranslationValidation;
}
```

**Translation File Structure:**
```json
{
  "auth": {
    "showPassword": "Show password",
    "hidePassword": "Hide password", 
    "resetPassword": "Reset Password",
    "resetPasswordDescription": "Enter your email to receive reset instructions",
    "resetEmailSent": "Reset email sent successfully",
    "resetPasswordTitle": "Reset Your Password"
  }
}
```

### Authentication Components

```typescript
// Password input with visibility toggle
interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
}

// Password reset component
interface PasswordResetProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}
```

**Component Structure:**
```
src/components/auth/
├── PasswordInput.tsx           -- Reusable password input with toggle
├── PasswordResetForm.tsx       -- Password reset request form
├── PasswordResetConfirm.tsx    -- New password confirmation form
└── AuthLayout.tsx              -- Consistent auth page layout
```

### Subscription Performance Components

```typescript
// Cached subscription data
interface CachedSubscriptionData {
  plans: SubscriptionPlan[];
  userSubscription: UserSubscription | null;
  billingCycles: BillingCycle[];
  lastFetched: Date;
}

// Optimized subscription hook
interface UseSubscriptionOptimized {
  plans: SubscriptionPlan[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

## Data Models

### Migration Consolidation Model

```sql
-- Core schema elements to preserve
CREATE TYPE user_role AS ENUM ('admin', 'therapist', 'reception');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');

-- Essential tables with optimized indexes
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  clinic_id UUID REFERENCES clinics(id),
  -- ... other fields
);

-- Subscription performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_plans_active_sorted 
ON subscription_plans (is_active, sort_order) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clinic_subscription_status 
ON clinics (subscription_status, trial_ends_at);
```

### Translation Data Model

```typescript
// Translation key structure
interface TranslationKey {
  key: string;
  namespace: string;
  defaultValue: string;
  context?: string;
}

// Translation coverage report
interface CoverageReport {
  totalKeys: number;
  translatedKeys: number;
  missingKeys: string[];
  language: 'en' | 'es';
  coverage: number;
}
```

### Authentication Data Model

```typescript
// Password reset request
interface PasswordResetRequest {
  email: string;
  redirectTo?: string;
}

// Password reset confirmation
interface PasswordResetConfirm {
  token: string;
  newPassword: string;
  confirmPassword: string;
}
```

## Error Handling

### Database Migration Error Handling

```sql
-- Safe migration with rollback capability
BEGIN;
  -- Migration operations with error checking
  DO $$ 
  BEGIN
    -- Check if migration is safe to apply
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'migration_backup') THEN
      RAISE EXCEPTION 'Migration backup not found';
    END IF;
  END $$;
COMMIT;
```

### Translation Error Handling

```typescript
// Fallback translation system
const useTranslationWithFallback = (key: string, options?: any) => {
  const { t, i18n } = useTranslation();
  
  try {
    const translation = t(key, options);
    // Check if translation actually exists (not just returning the key)
    if (translation === key && !key.includes('.')) {
      console.warn(`Missing translation for key: ${key}`);
      return key.split('.').pop() || key; // Return last part of key as fallback
    }
    return translation;
  } catch (error) {
    console.error(`Translation error for key ${key}:`, error);
    return key;
  }
};
```

### Authentication Error Handling

```typescript
// Password reset error handling
const handlePasswordReset = async (email: string) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    
    if (error) {
      if (error.message.includes('rate limit')) {
        throw new Error('Too many reset attempts. Please wait before trying again.');
      }
      throw error;
    }
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
};
```

### Subscription Performance Error Handling

```typescript
// Subscription loading with retry logic
const useSubscriptionWithRetry = () => {
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  
  const query = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: fetchSubscriptionPlans,
    retry: (failureCount, error) => {
      if (failureCount < maxRetries) {
        setRetryCount(failureCount + 1);
        return true;
      }
      return false;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
  
  return { ...query, retryCount };
};
```

## Testing Strategy

### Database Testing

```sql
-- Migration testing queries
-- Verify schema integrity
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Verify RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public';

-- Performance testing
EXPLAIN ANALYZE SELECT * FROM subscription_plans WHERE is_active = true ORDER BY sort_order;
```

### Translation Testing

```typescript
// Automated translation coverage testing
describe('Translation Coverage', () => {
  test('should have 100% English coverage', () => {
    const coverage = getTranslationCoverage('en');
    expect(coverage.coverage).toBe(100);
  });
  
  test('should have 100% Spanish coverage', () => {
    const coverage = getTranslationCoverage('es');
    expect(coverage.coverage).toBe(100);
  });
  
  test('should not have hardcoded strings in components', () => {
    const hardcodedStrings = scanForHardcodedStrings();
    expect(hardcodedStrings).toHaveLength(0);
  });
});
```

### Authentication Testing

```typescript
// Password visibility and reset testing
describe('Authentication UX', () => {
  test('should toggle password visibility', () => {
    render(<PasswordInput value="" onChange={() => {}} />);
    const toggleButton = screen.getByRole('button', { name: /show password/i });
    fireEvent.click(toggleButton);
    expect(screen.getByDisplayValue('')).toHaveAttribute('type', 'text');
  });
  
  test('should handle password reset flow', async () => {
    const mockResetPassword = jest.fn();
    render(<PasswordResetForm onReset={mockResetPassword} />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));
    
    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('test@example.com');
    });
  });
});
```

### Performance Testing

```typescript
// Subscription loading performance testing
describe('Subscription Performance', () => {
  test('should load subscription plans within 2 seconds', async () => {
    const startTime = Date.now();
    render(<SubscriptionPlans />);
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    }, { timeout: 2000 });
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000);
  });
  
  test('should cache subscription data', () => {
    const { rerender } = render(<SubscriptionPlans />);
    rerender(<SubscriptionPlans />);
    
    // Verify that data is served from cache on second render
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
});
```

## Implementation Phases

### Phase 1: Database Schema Cleanup
1. Create schema backup and analysis scripts
2. Generate consolidated migration files
3. Test migration on development environment
4. Validate data integrity and performance

### Phase 2: Translation Completion
1. Scan codebase for hardcoded strings
2. Generate missing translation keys
3. Complete Spanish translations
4. Implement fallback system
5. Add automated coverage testing

### Phase 3: Authentication UX Enhancement
1. Create reusable PasswordInput component
2. Implement password reset flow
3. Update Auth component with new features
4. Add comprehensive testing

### Phase 4: Subscription Performance Optimization
1. Implement React Query caching
2. Optimize database queries and indexes
3. Improve loading states and error handling
4. Performance testing and monitoring

Each phase will be implemented incrementally with thorough testing to ensure system stability and user experience improvements.