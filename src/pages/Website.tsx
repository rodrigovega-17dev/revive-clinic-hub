import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, ExternalLink, Globe, Loader2, Rocket, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useClinic } from '@/hooks/useClinic';
import {
  SLUG_RE, slugify, useBookingRequests, useClinicSite, useSaveClinicSite, useWebsiteCatalog, type BookingSettings,
} from '@/hooks/useWebsite';
import { defaultSiteContent } from '@/site/defaults';
import { DEFAULT_THEME_KEY } from '@/site/themes';
import type { PublicSiteData, SiteContent, ThemeOverrides } from '@/site/types';
import SitePreview from '@/components/website/SitePreview';
import RequestsTab from '@/components/website/RequestsTab';
import DesignTab from '@/components/website/DesignTab';
import ContentTab from '@/components/website/ContentTab';
import CatalogTab from '@/components/website/CatalogTab';

interface Draft {
  slug: string;
  isEnabled: boolean;
  themeKey: string;
  overrides: ThemeOverrides;
  content: SiteContent;
  booking: BookingSettings;
}

const DEFAULT_BOOKING: BookingSettings = { enabled: true, min_notice_hours: 12, horizon_days: 30 };

const Website = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: clinic } = useClinic();
  const { data: site, isLoading } = useClinicSite();
  const { data: catalog } = useWebsiteCatalog();
  const { data: requests = [] } = useBookingRequests();
  const save = useSaveClinicSite();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState('requests');

  useEffect(() => {
    if (!site || dirty) return;
    setDraft({
      slug: site.slug,
      isEnabled: site.is_enabled,
      themeKey: site.theme_key,
      overrides: site.theme_overrides ?? {},
      content: site.content?.sections ? site.content : defaultSiteContent(clinic?.name ?? ''),
      booking: { ...DEFAULT_BOOKING, ...(site.booking_settings ?? {}) },
    });
  }, [site, clinic?.name, dirty]);

  const patch = (p: Partial<Draft>) => { setDraft((d) => (d ? { ...d, ...p } : d)); setDirty(true); };

  const previewData: PublicSiteData | null = useMemo(() => {
    if (!draft || !clinic) return null;
    return {
      slug: draft.slug,
      theme_key: draft.themeKey,
      theme_overrides: draft.overrides,
      content: draft.content,
      booking: { enabled: draft.booking.enabled, horizon_days: draft.booking.horizon_days },
      clinic: {
        name: clinic.name, logo_url: clinic.logo_url, phone: clinic.phone, email: clinic.email, address: clinic.address,
        timezone: clinic.timezone || 'America/Mexico_City', currency: clinic.currency || 'MXN',
      },
      treatments: (catalog?.treatments ?? [])
        .filter((x) => x.is_active !== false && x.show_on_site)
        .map((x) => ({ id: x.id, name: x.name, description: x.public_description ?? x.description, duration_minutes: x.duration_minutes, price: x.price, bookable: x.bookable_online })),
      therapists: (catalog?.therapists ?? [])
        .filter((x) => !x.archived && x.is_active !== false && x.show_on_site)
        .map((x) => ({ id: x.id, first_name: x.first_name, last_name: x.last_name, specialties: x.specialties, bio: x.public_bio, photo_url: x.photo_url })),
      hours: catalog?.hours ?? [],
    };
  }, [draft, clinic, catalog]);

  const publicUrl = draft ? `${window.location.origin}/s/${draft.slug}` : '';
  const pendingCount = requests.filter((r) => r.booking_status === 'pending').length;

  const createSite = async () => {
    if (!clinic) return;
    const base = slugify(clinic.slug || clinic.name);
    for (const candidate of [base, `${base}-${Math.random().toString(36).slice(2, 6)}`]) {
      try {
        await save.mutateAsync({
          slug: candidate, is_enabled: false, theme_key: DEFAULT_THEME_KEY, theme_overrides: {},
          content: defaultSiteContent(clinic.name), booking_settings: DEFAULT_BOOKING,
        });
        setTab('design');
        return;
      } catch (e) {
        if (!String((e as { message?: string }).message).includes('duplicate')) {
          toast({ title: t('website.saveError'), description: String((e as Error).message), variant: 'destructive' });
          return;
        }
      }
    }
  };

  const persist = async (publish: boolean) => {
    if (!draft) return;
    if (!SLUG_RE.test(draft.slug)) { toast({ title: t('website.settings.slugInvalid'), variant: 'destructive' }); setTab('settings'); return; }
    try {
      await save.mutateAsync({
        slug: draft.slug, is_enabled: publish ? true : draft.isEnabled, theme_key: draft.themeKey, theme_overrides: draft.overrides,
        content: draft.content, booking_settings: draft.booking, publish,
      });
      setDirty(false);
      toast({ title: publish ? t('website.published') : t('website.saved'), description: publish ? publicUrl : undefined });
    } catch (e) {
      const msg = String((e as Error).message);
      toast({ title: msg.includes('duplicate') ? t('website.settings.slugTaken') : t('website.saveError'), description: msg, variant: 'destructive' });
    }
  };

  const copyUrl = async () => {
    try { await navigator.clipboard.writeText(publicUrl); toast({ title: t('website.copied') }); } catch { /* ignore */ }
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">{t('common.loading')}</div>;

  if (!site)
    return (
      <div className="p-4 md:p-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />{t('website.onboarding.title')}</CardTitle>
            <CardDescription>{t('website.onboarding.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>{t('website.onboarding.point1')}</li>
              <li>{t('website.onboarding.point2')}</li>
              <li>{t('website.onboarding.point3')}</li>
            </ul>
            <Button onClick={createSite} disabled={save.isPending || !clinic}>
              {save.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Rocket className="h-4 w-4 mr-2" />}
              {t('website.onboarding.create')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );

  if (!draft || !previewData) return <div className="p-6 text-muted-foreground">{t('common.loading')}</div>;

  const showPreview = tab === 'design' || tab === 'content' || tab === 'catalog';

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2">{t('website.title')}
            {site.published_at
              ? <Badge variant={draft.isEnabled ? 'default' : 'secondary'}>{draft.isEnabled ? t('website.status.live') : t('website.status.offline')}</Badge>
              : <Badge variant="outline">{t('website.status.draft')}</Badge>}
            {dirty && <Badge variant="outline">{t('website.status.unsaved')}</Badge>}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="truncate font-mono">{publicUrl}</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copyUrl} aria-label={t('website.copyUrl')}><Copy className="h-3.5 w-3.5" /></Button>
            {site.published_at && <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">{t('website.open')}<ExternalLink className="h-3.5 w-3.5" /></a>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => persist(false)} disabled={save.isPending || !dirty}><Save className="h-4 w-4 mr-2" />{t('website.saveDraft')}</Button>
          <Button onClick={() => persist(true)} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Rocket className="h-4 w-4 mr-2" />}{t('website.publish')}
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="requests">{t('website.tabs.requests')}{pendingCount > 0 && <Badge className="ml-2 h-5 px-1.5">{pendingCount}</Badge>}</TabsTrigger>
          <TabsTrigger value="design">{t('website.tabs.design')}</TabsTrigger>
          <TabsTrigger value="content">{t('website.tabs.content')}</TabsTrigger>
          <TabsTrigger value="catalog">{t('website.tabs.catalog')}</TabsTrigger>
          <TabsTrigger value="settings">{t('website.tabs.settings')}</TabsTrigger>
        </TabsList>

        <div className={showPreview ? 'grid gap-6 xl:grid-cols-[minmax(360px,440px)_1fr] mt-4' : 'mt-4'}>
          <div className="min-w-0">
            <TabsContent value="requests" className="mt-0"><RequestsTab therapists={catalog?.therapists ?? []} /></TabsContent>
            <TabsContent value="design" className="mt-0">
              <DesignTab themeKey={draft.themeKey} overrides={draft.overrides} onChange={(themeKey, overrides) => patch({ themeKey, overrides })} />
            </TabsContent>
            <TabsContent value="content" className="mt-0"><ContentTab content={draft.content} onChange={(content) => patch({ content })} /></TabsContent>
            <TabsContent value="catalog" className="mt-0"><CatalogTab treatments={catalog?.treatments ?? []} therapists={catalog?.therapists ?? []} /></TabsContent>
            <TabsContent value="settings" className="mt-0">
              <div className="max-w-2xl space-y-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">{t('website.settings.siteTitle')}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <label className="flex items-center justify-between gap-4">
                      <span><span className="font-medium block">{t('website.settings.enabled')}</span><span className="text-sm text-muted-foreground">{t('website.settings.enabledHelp')}</span></span>
                      <Switch checked={draft.isEnabled} onCheckedChange={(v) => patch({ isEnabled: v })} />
                    </label>
                    <div className="space-y-1">
                      <Label htmlFor="site-slug">{t('website.settings.slug')}</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">{window.location.host}/s/</span>
                        <Input id="site-slug" value={draft.slug} onChange={(e) => patch({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} />
                      </div>
                      {!SLUG_RE.test(draft.slug) && <p className="text-sm text-destructive">{t('website.settings.slugInvalid')}</p>}
                      <p className="text-xs text-muted-foreground">{t('website.settings.slugHelp')}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">{t('website.settings.bookingTitle')}</CardTitle><CardDescription>{t('website.settings.bookingHelp')}</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    <label className="flex items-center justify-between gap-4">
                      <span className="font-medium">{t('website.settings.bookingEnabled')}</span>
                      <Switch checked={draft.booking.enabled} onCheckedChange={(v) => patch({ booking: { ...draft.booking, enabled: v } })} />
                    </label>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="min-notice">{t('website.settings.minNotice')}</Label>
                        <Input id="min-notice" type="number" min={0} max={168} value={draft.booking.min_notice_hours} onChange={(e) => patch({ booking: { ...draft.booking, min_notice_hours: Math.max(0, Number(e.target.value) || 0) } })} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="horizon">{t('website.settings.horizon')}</Label>
                        <Input id="horizon" type="number" min={1} max={90} value={draft.booking.horizon_days} onChange={(e) => patch({ booking: { ...draft.booking, horizon_days: Math.min(90, Math.max(1, Number(e.target.value) || 1)) } })} />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{t('website.settings.scheduleHint')}</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>
          {showPreview && <div className="min-w-0 xl:sticky xl:top-4 self-start"><SitePreview site={previewData} /></div>}
        </div>
      </Tabs>
    </div>
  );
};

export default Website;
