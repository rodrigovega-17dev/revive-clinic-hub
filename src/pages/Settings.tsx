import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks/useLanguage';
import { useClinic, useUpdateClinic } from '@/hooks/useClinic';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useSecurity } from '@/hooks/useSecurity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, Globe, Bell, Shield, Building2, Palette, Database, Zap, Loader2, AlertTriangle, CreditCard, FileText, Pencil, Plus, Download, Upload } from 'lucide-react';
import ClinicGoogleCalendarConnect from '@/components/ClinicGoogleCalendarConnect';
import ClinicFacturapiConnect from '@/components/ClinicFacturapiConnect';
import { PasswordChangeDialog } from '@/components/PasswordChangeDialog';
import { SessionManagement } from '@/components/SessionManagement';
import { Badge } from '@/components/ui/badge';
import SubscriptionManagement from '@/components/SubscriptionManagement';
import { useTreatments } from '@/hooks/useTreatments';
import EditTreatmentTaxForm from '@/components/EditTreatmentTaxForm';
import AddTreatmentForm from '@/components/AddTreatmentForm';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';
import { SignatureManager } from '@/components/SignatureManager';
import { DataImportDialog } from '@/components/DataImportDialog';
import { useAuth } from '@/hooks/useAuth';
import { useDataExport } from '@/hooks/useDataExport';
import { supabase } from '@/integrations/supabase/client';

const Settings = (): JSX.Element => {
  const { t } = useTranslation();
  const { currentLanguage, switchLanguage, availableLanguages } = useLanguage();
  const { toast } = useToast();

  // Clinic data
  const { data: clinic, isLoading: clinicLoading } = useClinic();
  const updateClinicMutation = useUpdateClinic();

  // User preferences
  const { 
    data: preferences, 
    loading: preferencesLoading, 
    updatePreferences, 
    updatePreference 
  } = useUserPreferences();

  // Security
  const { 
    securitySettings, 
    sessionInfo,
    loading: securityLoading, 
    changePassword, 
    signOutCurrentDevice, 
    signOutFromAllDevices,
    toggleTwoFactor 
  } = useSecurity();

  // Form state for clinic information
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [clinicEmail, setClinicEmail] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('UTC');
  
  // Form state for user preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [appointmentReminders, setAppointmentReminders] = useState(true);
  const [paymentReminders, setPaymentReminders] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [defaultDashboardView, setDefaultDashboardView] = useState<'overview' | 'appointments' | 'finance'>('overview');
  const [showQuickStats, setShowQuickStats] = useState(true);
  const [showRecentActivity, setShowRecentActivity] = useState(true);
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>('week');
  const [showPastAppointments, setShowPastAppointments] = useState(false);

  // Form state for security settings
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Treatment tax (CFDI) editor
  const [editingTreatment, setEditingTreatment] = useState<Tables<'treatments'> | null>(null);
  const [showAddTreatment, setShowAddTreatment] = useState(false);
  const { data: treatments } = useTreatments();
  const [twoFactorMethod, setTwoFactorMethod] = useState<'email' | 'sms' | 'app'>('email');
  const [loginNotifications, setLoginNotifications] = useState(true);
  const [suspiciousActivityAlerts, setSuspiciousActivityAlerts] = useState(true);
  
  // Signature management
  const { user, clinicId: authClinicId } = useAuth();
  const { exportClientsToCsv, exportAppointmentsToCsv, exportPaymentsToCsv, isExporting } = useDataExport();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showSignatureManager, setShowSignatureManager] = useState(false);
  const [currentUserSignature, setCurrentUserSignature] = useState<string | null>(null);

  // Load current user signature from profile
  useEffect(() => {
    const fetchUserSignature = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('signature_image_url')
        .eq('id', user.id)
        .single();
      if (!error && data) {
        setCurrentUserSignature(data.signature_image_url);
      }
    };
    fetchUserSignature();
  }, [user?.id]);

  // Load clinic data into form when available
  useEffect(() => {
    if (clinic) {
      setClinicName(clinic.name || '');
      setClinicAddress(clinic.address || '');
      setClinicPhone(clinic.phone || '');
      setClinicEmail(clinic.email || '');
      setCurrency(clinic.currency || 'USD');
      setTimezone(clinic.timezone || 'UTC');
    }
  }, [clinic]);

  // Load user preferences into form when available
  useEffect(() => {
    if (preferences) {
      setEmailNotifications(preferences.email_notifications);
      setPushNotifications(preferences.push_notifications);
      setAppointmentReminders(preferences.appointment_reminders);
      setPaymentReminders(preferences.payment_reminders);
      setTheme(preferences.theme as 'light' | 'dark' | 'system');
      setDefaultDashboardView(preferences.default_dashboard_view as 'overview' | 'appointments' | 'finance');
      setShowQuickStats(preferences.show_quick_stats);
      setShowRecentActivity(preferences.show_recent_activity);
      setCalendarView(preferences.calendar_view as 'day' | 'week' | 'month');
      setShowPastAppointments(preferences.show_past_appointments);
    }
  }, [preferences]);

  // Load security settings into form when available
  useEffect(() => {
    if (securitySettings) {
      setTwoFactorEnabled(securitySettings.two_factor_enabled);
      setTwoFactorMethod(securitySettings.two_factor_method as 'email' | 'sms' | 'app');
      setLoginNotifications(securitySettings.login_notifications);
      setSuspiciousActivityAlerts(securitySettings.suspicious_activity_alerts);
    }
  }, [securitySettings]);

  // Save clinic settings (currency, timezone)
  const handleSaveClinicSettings = async () => {
    if (!clinic) return;

    try {
      await updateClinicMutation.mutateAsync({
        name: clinicName,
        address: clinicAddress,
        phone: clinicPhone,
        email: clinicEmail,
        currency,
        timezone,
      });

      toast({
        title: t('notifications.success'),
        description: t('settings.settingsSaved'),
      });
    } catch (error) {
      console.error('Error saving clinic settings:', error);
      toast({
        title: t('notifications.error'),
        description: t('settings.failedToSaveSettings'),
        variant: 'destructive',
      });
    }
  };

  // Save general settings (both user preferences and clinic settings)
  const handleSaveGeneralSettings = async () => {
    try {
      // Save user preferences
      await updatePreferences({
        theme,
        default_dashboard_view: defaultDashboardView,
        show_quick_stats: showQuickStats,
        show_recent_activity: showRecentActivity,
        calendar_view: calendarView,
        show_past_appointments: showPastAppointments,
      });

      // Save clinic settings (all fields)
      if (clinic) {
        await updateClinicMutation.mutateAsync({
          name: clinicName,
          address: clinicAddress,
          phone: clinicPhone,
          email: clinicEmail,
          currency,
          timezone,
        });
      }

      toast({
        title: t('notifications.success'),
        description: t('settings.settingsSaved'),
      });
    } catch (error) {
      console.error('Error saving general settings:', error);
      toast({
        title: t('notifications.error'),
        description: t('settings.failedToSaveSettings'),
        variant: 'destructive',
      });
    }
  };

  // Save notification settings (placeholder for now)
  const handleSaveNotificationSettings = async () => {
    try {
      await updatePreferences({
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        appointment_reminders: appointmentReminders,
        payment_reminders: paymentReminders,
      });

    toast({
      title: t('notifications.success'),
      description: t('settings.settingsSaved'),
    });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast({
        title: t('notifications.error'),
        description: t('settings.failedToSaveSettings'),
        variant: 'destructive',
      });
    }
  };

  if (clinicLoading || preferencesLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="h-6 w-6" />
          <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <SettingsIcon className="h-6 w-6" />
        <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            {t('settings.general')}
          </TabsTrigger>
          <TabsTrigger value="clinic" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {t('settings.clinic')}
          </TabsTrigger>
          {/* <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {t('settings.notifications')}
          </TabsTrigger> */}
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t('settings.security')}
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            {t('settings.integrations')}
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            {t('settings.subscription')}
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            {t('settings.dataExport')}
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                {t('settings.general')}
              </CardTitle>
              <CardDescription>
                {t('settings.configureGeneral')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language">{t('settings.language')}</Label>
                <Select value={currentLanguage} onValueChange={(value) => switchLanguage(value as 'en' | 'es')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLanguages.map((language) => (
                      <SelectItem key={language.code} value={language.code}>
                        <span className="mr-2">{language.flag}</span>
                        {language.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">{t('settings.currency')}</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="MXN">MXN ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">{t('settings.timezone')}</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">{t('settings.timezoneUTC')}</SelectItem>
                    <SelectItem value="America/New_York">{t('settings.timezoneEastern')}</SelectItem>
                    <SelectItem value="America/Chicago">{t('settings.timezoneCentral')}</SelectItem>
                    <SelectItem value="America/Denver">{t('settings.timezoneMountain')}</SelectItem>
                    <SelectItem value="America/Los_Angeles">{t('settings.timezonePacific')}</SelectItem>
                    <SelectItem value="America/Mexico_City">{t('settings.timezoneMexicoCity')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme">{t('settings.theme')}</Label>
                <Select value={theme} onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{t('settings.lightTheme')}</SelectItem>
                    <SelectItem value="dark">{t('settings.darkTheme')}</SelectItem>
                    <SelectItem value="system">{t('settings.systemTheme')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* <div className="space-y-2">
                <Label htmlFor="defaultDashboardView">{t('settings.defaultDashboardView')}</Label>
                <Select value={defaultDashboardView} onValueChange={(value) => setDefaultDashboardView(value as 'overview' | 'appointments' | 'finance')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overview">{t('settings.overview')}</SelectItem>
                    <SelectItem value="appointments">{t('settings.appointments')}</SelectItem>
                    <SelectItem value="finance">{t('settings.finance')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="calendarView">{t('settings.calendarView')}</Label>
                <Select value={calendarView} onValueChange={(value) => setCalendarView(value as 'day' | 'week' | 'month')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">{t('settings.day')}</SelectItem>
                    <SelectItem value="week">{t('settings.week')}</SelectItem>
                    <SelectItem value="month">{t('settings.month')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.showQuickStats')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.showQuickStatsDesc')}
                  </p>
                </div>
                <Switch
                  checked={showQuickStats}
                  onCheckedChange={setShowQuickStats}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.showRecentActivity')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.showRecentActivityDesc')}
                  </p>
                </div>
                <Switch
                  checked={showRecentActivity}
                  onCheckedChange={setShowRecentActivity}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.showPastAppointments')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.showPastAppointmentsDesc')}
                  </p>
                </div>
                <Switch
                  checked={showPastAppointments}
                  onCheckedChange={setShowPastAppointments}
                />
              </div> */}

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveGeneralSettings}
                  disabled={updateClinicMutation.isPending}
                >
                  {updateClinicMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('settings.saveSettings')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clinic Information Tab */}
        <TabsContent value="clinic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t('settings.clinic')}
              </CardTitle>
              <CardDescription>
                {t('settings.configureClinic')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clinicName">{t('settings.clinicName')}</Label>
                  <Input
                    id="clinicName"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    placeholder={t('settings.enterClinicName')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clinicEmail">{t('settings.clinicEmail')}</Label>
                  <Input
                    id="clinicEmail"
                    type="email"
                    value={clinicEmail}
                    onChange={(e) => setClinicEmail(e.target.value)}
                    placeholder={t('settings.enterClinicEmail')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clinicPhone">{t('settings.clinicPhone')}</Label>
                  <Input
                    id="clinicPhone"
                    value={clinicPhone}
                    onChange={(e) => setClinicPhone(e.target.value)}
                    placeholder={t('settings.enterClinicPhone')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clinicAddress">{t('settings.clinicAddress')}</Label>
                  <Input
                    id="clinicAddress"
                    value={clinicAddress}
                    onChange={(e) => setClinicAddress(e.target.value)}
                    placeholder={t('settings.enterClinicAddress')}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveClinicSettings}
                  disabled={updateClinicMutation.isPending}
                >
                  {updateClinicMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('settings.saveSettings')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* My Signature - in Clinic section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {t('settings.signature', 'My Signature')}
              </CardTitle>
              <CardDescription>
                {t('settings.signatureDescription', 'Add your signature for documents you sign.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentUserSignature ? (
                <div className="flex items-center gap-4">
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <img
                      src={currentUserSignature}
                      alt="Signature"
                      className="max-w-[200px] max-h-[80px]"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowSignatureManager(true)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    {t('settings.editSignature', 'Edit Signature')}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowSignatureManager(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('settings.addSignature', 'Add Signature')}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('settings.clinicTreatments')}
                </CardTitle>
                <CardDescription>
                  {t('settings.treatmentTaxCodesDesc')}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowAddTreatment(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('settings.addTreatment')}
              </Button>
            </CardHeader>
            <CardContent>
              {!treatments?.length ? (
                <p className="text-muted-foreground text-sm">{t('common.noResults')}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.name')}</TableHead>
                      <TableHead>{t('common.price')}</TableHead>
                      <TableHead>{t('settings.treatmentDurationMinutes')}</TableHead>
                      <TableHead>{t('settings.satProductCode')}</TableHead>
                      <TableHead>{t('settings.satUnitCode')}</TableHead>
                      <TableHead>{t('settings.vatExempt')}</TableHead>
                      <TableHead className="w-[80px]">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {treatments.map((tr) => (
                      <TableRow key={tr.id}>
                        <TableCell className="font-medium">{tr.name}</TableCell>
                        <TableCell>{formatCurrency(tr.price ?? 0, 2, clinic?.currency ?? 'USD')}</TableCell>
                        <TableCell>{tr.duration_minutes}</TableCell>
                        <TableCell className="font-mono text-sm">{tr.sat_product_service_code ?? '—'}</TableCell>
                        <TableCell className="font-mono text-sm">{tr.sat_unit_code ?? '—'}</TableCell>
                        <TableCell>
                          {tr.vat_exempt ? <Badge variant="secondary">{t('common.yes')}</Badge> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => setEditingTreatment(tr)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <AddTreatmentForm open={showAddTreatment} onClose={() => setShowAddTreatment(false)} />
          <EditTreatmentTaxForm
            open={!!editingTreatment}
            onClose={() => setEditingTreatment(null)}
            treatment={editingTreatment}
          />
        </TabsContent>

        {/* Notifications Settings Tab */}
        {/* <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t('settings.notifications')}
              </CardTitle>
              <CardDescription>
                {t('settings.configureNotifications')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.pushNotifications')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.pushNotificationsDesc')}
                  </p>
                </div>
                <Switch
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.emailNotifications')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.emailNotificationsDesc')}
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.appointmentReminders')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.appointmentRemindersDesc')}
                  </p>
                </div>
                <Switch
                  checked={appointmentReminders}
                  onCheckedChange={setAppointmentReminders}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.paymentReminders')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.paymentRemindersDesc')}
                  </p>
                </div>
                <Switch
                  checked={paymentReminders}
                  onCheckedChange={setPaymentReminders}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveNotificationSettings}
                  disabled={updateClinicMutation.isPending}
                >
                  {updateClinicMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('settings.saveSettings')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent> */}

        {/* Security Settings Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t('settings.security')}
              </CardTitle>
              <CardDescription>
                {t('settings.securityPrivacy')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Password Change */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">{t('security.passwordSecurity')}</h3>
                <PasswordChangeDialog onPasswordChange={changePassword} />
              </div>

              <Separator />

              {/* Two-Factor Authentication */}
              {/* <div className="space-y-4">
                <h3 className="text-lg font-medium">{t('security.twoFactorAuthentication')}</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('security.enableTwoFactor')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('security.twoFactorDescription')}
                    </p>
                  </div>
                  <Switch
                    checked={twoFactorEnabled}
                    onCheckedChange={(enabled) => {
                      setTwoFactorEnabled(enabled);
                      toggleTwoFactor(enabled, twoFactorMethod);
                    }}
                  />
                </div>

                {twoFactorEnabled && (
                  <div className="space-y-2">
                    <Label>{t('security.twoFactorMethod')}</Label>
                    <Select value={twoFactorMethod} onValueChange={(value) => setTwoFactorMethod(value as 'email' | 'sms' | 'app')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">{t('security.email')}</SelectItem>
                        <SelectItem value="sms">{t('security.sms')}</SelectItem>
                        <SelectItem value="app">{t('security.authenticatorApp')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Separator /> */}

              {/* Security Notifications */}
              {/* <div className="space-y-4">
                <h3 className="text-lg font-medium">{t('security.securityNotifications')}</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('security.loginNotifications')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('security.loginNotificationsDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={loginNotifications}
                    onCheckedChange={setLoginNotifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('security.suspiciousActivityAlerts')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('security.suspiciousActivityAlertsDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={suspiciousActivityAlerts}
                    onCheckedChange={setSuspiciousActivityAlerts}
                  />
                </div>
              </div>

              <Separator /> */}

              {/* Session Management */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">{t('security.sessionManagement')}</h3>
                <SessionManagement
                  sessionInfo={sessionInfo}
                  onSignOutCurrent={signOutCurrentDevice}
                  onSignOutAllDevices={signOutFromAllDevices}
                  loading={securityLoading}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t('settings.googleCalendar')}
              </CardTitle>
              <CardDescription>
                {t('googleCalendar.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ClinicGoogleCalendarConnect />
            </CardContent>
          </Card>
          <ClinicFacturapiConnect />
        </TabsContent>

        {/* Data & Export Tab */}
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                {t('settings.dataExport')}
              </CardTitle>
              <CardDescription>
                {t('settings.manageData')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground mb-2">
                {t('settings.exportDataDesc', 'Export clinic data as CSV files.')}
              </p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!authClinicId || !!isExporting}
                  onClick={() => authClinicId && exportClientsToCsv(authClinicId)}
                >
                  {isExporting === 'clients' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {t('settings.exportClients', 'Clientes (CSV)')}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!authClinicId || !!isExporting}
                  onClick={() => authClinicId && exportAppointmentsToCsv(authClinicId)}
                >
                  {isExporting === 'appointments' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {t('settings.exportAppointments', 'Citas (CSV)')}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!authClinicId || !!isExporting}
                  onClick={() => authClinicId && exportPaymentsToCsv(authClinicId)}
                >
                  {isExporting === 'payments' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {t('settings.exportPayments', 'Pagos (CSV)')}
                </Button>
              </div>
              <Separator />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowImportDialog(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                {t('settings.importData')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t('settings.subscription')}
              </CardTitle>
              <CardDescription>
                {t('settings.manageSubscription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SubscriptionManagement />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Data Import Dialog */}
      {authClinicId && (
        <DataImportDialog
          open={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          clinicId={authClinicId}
        />
      )}

      {/* Signature Manager Modal */}
      {user && authClinicId && (
        <SignatureManager
          open={showSignatureManager}
          onClose={() => setShowSignatureManager(false)}
          entityType="user"
          entityId={user.id}
          clinicId={authClinicId}
          currentSignatureUrl={currentUserSignature}
          onSave={(url) => setCurrentUserSignature(url)}
        />
      )}
    </div>
  );
};

export default Settings; 