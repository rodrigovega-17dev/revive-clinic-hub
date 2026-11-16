import { useTranslation } from 'react-i18next';
import { ImagePlus, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  removeSiteImage, uploadSiteImage, useUpdateWebsiteTherapist, useUpdateWebsiteTreatment, type WebsiteTherapist, type WebsiteTreatment,
} from '@/hooks/useWebsite';

const fullName = (p: WebsiteTherapist) => [p.first_name, p.last_name].filter(Boolean).join(' ');

export const CatalogTab = ({ treatments, therapists }: { treatments: WebsiteTreatment[]; therapists: WebsiteTherapist[] }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { clinicId } = useAuth();
  const updTreatment = useUpdateWebsiteTreatment();
  const updTherapist = useUpdateWebsiteTherapist();
  const onErr = (e: unknown) => toast({ title: t('website.requests.error'), description: String((e as Error).message), variant: 'destructive' });

  const activeTreatments = treatments.filter((x) => x.is_active !== false);
  const activeTherapists = therapists.filter((x) => !x.archived && x.is_active !== false);
  const rotation = activeTherapists
    .filter((x) => x.bookable_online)
    .sort((a, b) => (a.last_online_assigned_at ?? '').localeCompare(b.last_online_assigned_at ?? ''));

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h3 className="font-semibold">{t('website.catalog.treatments')}</h3>
        <p className="text-sm text-muted-foreground">{t('website.catalog.treatmentsHelp')}</p>
        <div className="rounded-md border divide-y">
          <div className="hidden sm:grid grid-cols-[1fr_90px_90px] gap-3 px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
            <span>{t('website.catalog.name')}</span><span className="text-center">{t('website.catalog.show')}</span><span className="text-center">{t('website.catalog.bookable')}</span>
          </div>
          {activeTreatments.length === 0 && <p className="p-3 text-sm text-muted-foreground">{t('website.catalog.noTreatments')}</p>}
          {activeTreatments.map((tr) => (
            <div key={tr.id} className="grid sm:grid-cols-[1fr_90px_90px] gap-3 px-3 py-3 items-start">
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium">{tr.name}</span>
                  <span className="text-xs text-muted-foreground">{tr.duration_minutes ? `${tr.duration_minutes} min` : t('website.catalog.noDuration')}{tr.price != null ? ` · $${tr.price}` : ''}</span>
                </div>
                <Textarea
                  id={`tr-desc-${tr.id}`}
                  rows={2}
                  defaultValue={tr.public_description ?? tr.description ?? ''}
                  placeholder={t('website.catalog.publicDescription')}
                  onBlur={(e) => e.target.value !== (tr.public_description ?? tr.description ?? '') && updTreatment.mutate({ id: tr.id, public_description: e.target.value || null }, { onError: onErr })}
                />
              </div>
              <label className="flex sm:justify-center items-center gap-2 text-sm"><Switch checked={tr.show_on_site} onCheckedChange={(v) => updTreatment.mutate({ id: tr.id, show_on_site: v, ...(v ? {} : { bookable_online: false }) }, { onError: onErr })} /><span className="sm:hidden">{t('website.catalog.show')}</span></label>
              <label className="flex sm:justify-center items-center gap-2 text-sm"><Switch checked={tr.bookable_online} disabled={!tr.show_on_site} onCheckedChange={(v) => updTreatment.mutate({ id: tr.id, bookable_online: v }, { onError: onErr })} /><span className="sm:hidden">{t('website.catalog.bookable')}</span></label>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">{t('website.catalog.therapists')}</h3>
        <p className="text-sm text-muted-foreground">{t('website.catalog.therapistsHelp')}</p>
        <div className="rounded-md border divide-y">
          <div className="hidden sm:grid grid-cols-[1fr_90px_90px] gap-3 px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
            <span>{t('website.catalog.name')}</span><span className="text-center">{t('website.catalog.showTeam')}</span><span className="text-center">{t('website.catalog.roundRobin')}</span>
          </div>
          {activeTherapists.map((th) => (
            <div key={th.id} className="grid sm:grid-cols-[1fr_90px_90px] gap-3 px-3 py-3 items-start">
              <div className="flex gap-3 min-w-0">
                <div className="flex flex-col items-center gap-1 shrink-0">
                <label className="relative h-14 w-14 shrink-0 rounded-md bg-muted overflow-hidden cursor-pointer grid place-items-center" title={th.photo_url ? t('website.catalog.changePhoto') : t('website.catalog.photo')}>
                  {th.photo_url ? <img src={th.photo_url} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
                  <input
                    id={`th-photo-${th.id}`}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (!f || !clinicId) return;
                      try { updTherapist.mutate({ id: th.id, photo_url: await uploadSiteImage(clinicId, f) }, { onError: onErr }); } catch (err) { onErr(err); }
                    }}
                  />
                </label>
                {th.photo_url && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-destructive underline"
                    onClick={() => {
                      const url = th.photo_url!;
                      updTherapist.mutate({ id: th.id, photo_url: null }, {
                        onError: onErr,
                        onSuccess: () => { void removeSiteImage(url); },
                      });
                    }}
                  >
                    {t('website.catalog.removePhoto')}
                  </button>
                )}
                </div>
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{fullName(th)}</span>
                    {th.specialties?.length ? <span className="text-xs text-muted-foreground">{th.specialties.join(', ')}</span> : null}
                  </div>
                  <Textarea
                    id={`th-bio-${th.id}`}
                    rows={2}
                    defaultValue={th.public_bio ?? ''}
                    placeholder={t('website.catalog.bio')}
                    onBlur={(e) => e.target.value !== (th.public_bio ?? '') && updTherapist.mutate({ id: th.id, public_bio: e.target.value || null }, { onError: onErr })}
                  />
                </div>
              </div>
              <label className="flex sm:justify-center items-center gap-2 text-sm"><Switch checked={th.show_on_site} onCheckedChange={(v) => updTherapist.mutate({ id: th.id, show_on_site: v }, { onError: onErr })} /><span className="sm:hidden">{t('website.catalog.showTeam')}</span></label>
              <label className="flex sm:justify-center items-center gap-2 text-sm"><Switch checked={th.bookable_online} onCheckedChange={(v) => updTherapist.mutate({ id: th.id, bookable_online: v }, { onError: onErr })} /><span className="sm:hidden">{t('website.catalog.roundRobin')}</span></label>
            </div>
          ))}
        </div>
        {rotation.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t('website.catalog.rotationOrder')}</span>
            {rotation.map((th, i) => <Badge key={th.id} variant={i === 0 ? 'default' : 'outline'}>{i + 1}. {fullName(th)}</Badge>)}
          </div>
        )}
      </section>
    </div>
  );
};

export default CatalogTab;
