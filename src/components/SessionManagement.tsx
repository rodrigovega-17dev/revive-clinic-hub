import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Monitor, Smartphone, Tablet, Globe, LogOut, AlertTriangle, Loader2, Shield } from 'lucide-react';

interface SessionInfo {
  id: string;
  created_at: string;
  expires_at: string;
  user_agent: string;
  ip_address: string;
  is_current: boolean;
}

interface SessionManagementProps {
  sessionInfo: SessionInfo | null;
  onSignOutCurrent: () => Promise<{ data?: any; error?: any }>;
  onSignOutAllDevices: () => Promise<{ data?: any; error?: any }>;
  loading?: boolean;
}

export const SessionManagement: React.FC<SessionManagementProps> = ({
  sessionInfo,
  onSignOutCurrent,
  onSignOutAllDevices,
  loading = false,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [signingOut, setSigningOut] = useState(false);

  const getDeviceIcon = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="h-4 w-4" />;
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return <Tablet className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const getDeviceName = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari')) return 'Safari';
    if (ua.includes('edge')) return 'Edge';
    if (ua.includes('mobile')) return t('security.mobileDevice');
    return t('security.desktopDevice');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isSessionExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const handleSignOutCurrent = async () => {
    setSigningOut(true);
    
    try {
      const { error } = await onSignOutCurrent();
      
      if (error) {
        toast({
          title: t('notifications.error'),
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('notifications.success'),
          description: t('security.signedOutCurrent'),
        });
      }
    } catch (err) {
      toast({
        title: t('notifications.error'),
        description: t('security.failedToSignOut'),
        variant: 'destructive',
      });
    } finally {
      setSigningOut(false);
    }
  };

  const handleSignOutAllDevices = async () => {
    setSigningOut(true);
    
    try {
      const { error } = await onSignOutAllDevices();
      
      if (error) {
        toast({
          title: t('notifications.error'),
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('notifications.success'),
          description: t('security.signedOutAllDevices'),
        });
      }
    } catch (err) {
      toast({
        title: t('notifications.error'),
        description: t('security.failedToSignOutAll'),
        variant: 'destructive',
      });
    } finally {
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('security.currentSession')}
          </CardTitle>
          <CardDescription>
            {t('security.sessionInfo')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sessionInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('security.currentSession')}
          </CardTitle>
          <CardDescription>
            {t('security.sessionInfo')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t('security.noActiveSession')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t('security.currentSession')}
        </CardTitle>
        <CardDescription>
          {t('security.sessionInfo')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            {getDeviceIcon(sessionInfo.user_agent)}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {getDeviceName(sessionInfo.user_agent)}
                </span>
                <Badge variant="secondary">
                  {t('security.currentSession')}
                </Badge>
                {isSessionExpired(sessionInfo.expires_at) && (
                  <Badge variant="destructive">
                    {t('security.expired')}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="mr-3">{sessionInfo.ip_address}</span>
                <span>
                  {t('security.sessionStarted')}: {formatDate(sessionInfo.created_at)}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                <span>
                  {t('security.expiresAt')}: {formatDate(sessionInfo.expires_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t space-y-3">
          <Button
            variant="outline"
            onClick={handleSignOutCurrent}
            disabled={signingOut}
            className="w-full"
          >
            {signingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <LogOut className="mr-2 h-4 w-4" />
            {t('security.signOutCurrentDevice')}
          </Button>
          
          <Button
            variant="destructive"
            onClick={handleSignOutAllDevices}
            disabled={signingOut}
            className="w-full"
          >
            {signingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <LogOut className="mr-2 h-4 w-4" />
            {t('security.signOutAllDevices')}
          </Button>
          
          <p className="text-xs text-muted-foreground text-center">
            {t('security.signOutAllDevicesDescription')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}; 