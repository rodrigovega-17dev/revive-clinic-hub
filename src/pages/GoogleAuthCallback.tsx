import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useClinicGoogleCalendar } from '@/hooks/useClinicGoogleCalendar';

const GoogleAuthCallback: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleAuthCallback } = useClinicGoogleCalendar();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setErrorMessage(error);
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMessage(t('googleCalendar.noAuthCode'));
      return;
    }

    const authenticate = async () => {
      try {
        await handleAuthCallback(code);
        setStatus('success');
        // Redirect to settings after 2 seconds
        setTimeout(() => {
          navigate('/settings');
        }, 2000);
      } catch (error) {
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Authentication failed');
      }
    };

    authenticate();
  }, [searchParams, handleAuthCallback, navigate]);

  const handleRetry = () => {
    window.location.href = '/settings';
  };

  const handleGoToSettings = () => {
    navigate('/settings');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            {status === 'loading' && (
              <>
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <h2 className="text-xl font-semibold">{t('googleCalendar.oauthRedirect')}</h2>
                <p className="text-muted-foreground">
                  {t('googleCalendar.completingConnection')}
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
                <h2 className="text-xl font-semibold text-green-600">
                  {t('googleCalendar.connectedSuccessfully')}
                </h2>
                <p className="text-muted-foreground">
                  {t('googleCalendar.redirectingSettings')}
                </p>
                <Button onClick={handleGoToSettings} className="mt-4">
                  {t('googleCalendar.goToSettings')}
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="h-12 w-12 mx-auto text-red-500" />
                <h2 className="text-xl font-semibold text-red-600">
                  {t('googleCalendar.connectionFailed')}
                </h2>
                <p className="text-muted-foreground">
                  {errorMessage}
                </p>
                <div className="flex space-x-2 mt-4">
                  <Button onClick={handleRetry} variant="outline">
                    {t('googleCalendar.tryAgain')}
                  </Button>
                  <Button onClick={handleGoToSettings}>
                    {t('googleCalendar.goToSettings')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleAuthCallback; 