import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Phone, Mail, Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useClinicSettings } from '@/hooks/useClinic';
import {
  TherapistConflictError, useBookingRequests, useDecideBooking, useReassignBooking, type BookingRequest, type WebsiteTherapist,
} from '@/hooks/useWebsite';
import { getWhatsAppUrl } from '@/lib/whatsapp';

const name = (p?: { first_name?: string | null; last_name?: string | null } | null) =>
  [p?.first_name, p?.last_name].filter(Boolean).join(' ');

export const RequestsTab = ({ therapists }: { therapists: WebsiteTherapist[] }) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { data = [], isLoading } = useBookingRequests();
  const decide = useDecideBooking();
  const reassign = useReassignBooking();
  const { timezone } = useClinicSettings();
  const tz = timezone && timezone !== 'UTC' ? timezone : 'America/Mexico_City';
  const [view, setView] = useState<'pending' | 'history'>('pending');

  const pending = useMemo(() => data.filter((r) => r.booking_status === 'pending'), [data]);
  const history = useMemo(() => data.filter((r) => r.booking_status !== 'pending').reverse(), [data]);
  const rows = view === 'pending' ? pending : history;
  const activeTherapists = therapists.filter((th) => !th.archived && th.is_active !== false);

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language?.startsWith('es') ? 'es-MX' : 'en-US', {
      timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));

  const onDecide = async (r: BookingRequest, decision: 'approved' | 'rejected') => {
    try {
      await decide.mutateAsync({ id: r.id, decision });
      toast({ title: decision === 'approved' ? t('website.requests.approved') : t('website.requests.rejected') });
    } catch (e) {
      toast({ title: t('website.requests.error'), description: String((e as Error).message), variant: 'destructive' });
    }
  };

  const onReassign = async (r: BookingRequest, therapistId: string) => {
    try {
      await reassign.mutateAsync({ id: r.id, therapistId, start: r.start_time, end: r.end_time });
      toast({ title: t('website.requests.reassigned') });
    } catch (e) {
      toast({
        title: e instanceof TherapistConflictError ? t('website.requests.conflict') : t('website.requests.error'),
        variant: 'destructive',
      });
    }
  };

  const statusBadge = (r: BookingRequest) => {
    if (r.booking_status === 'approved') return <Badge className="bg-emerald-600 hover:bg-emerald-600">{t('website.requests.statusApproved')}</Badge>;
    if (r.booking_status === 'rejected') return <Badge variant="secondary">{t('website.requests.statusRejected')}</Badge>;
    return <Badge className="bg-amber-500 hover:bg-amber-500">{t('website.requests.statusPending')}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-2xl">{t('website.requests.help')}</p>
        <Tabs value={view} onValueChange={(v) => setView(v as 'pending' | 'history')}>
          <TabsList>
            <TabsTrigger value="pending">{t('website.requests.pending')} ({pending.length})</TabsTrigger>
            <TabsTrigger value="history">{t('website.requests.history')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}

      {!isLoading && rows.length === 0 && (
        <Card><CardContent className="py-12 flex flex-col items-center gap-2 text-center text-muted-foreground">
          <Inbox className="h-8 w-8" />
          <p>{view === 'pending' ? t('website.requests.emptyPending') : t('website.requests.emptyHistory')}</p>
        </CardContent></Card>
      )}

      <div className="grid gap-3">
        {rows.map((r) => {
          const contact = r.booking_contact ?? {};
          const phone = contact.phone || r.clients?.phone || '';
          const email = contact.email || r.clients?.email || '';
          const patient = name(contact.first_name ? contact : r.clients) || '—';
          const past = new Date(r.start_time) < new Date();
          return (
            <Card key={r.id}>
              <CardContent className="p-4 grid gap-3 md:grid-cols-[1.2fr_1fr_auto] md:items-center">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{patient}</span>
                    {statusBadge(r)}
                    {r.clients?.source === 'website' && <Badge variant="outline">{t('website.requests.newPatient')}</Badge>}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">{r.treatments?.name ?? '—'}</span>
                    <span className="text-muted-foreground"> · {fmt(r.start_time)}</span>
                    {past && r.booking_status === 'pending' && <span className="text-destructive"> · {t('website.requests.past')}</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {phone && (
                      <a className="inline-flex items-center gap-1 hover:underline" href={getWhatsAppUrl(phone, t('website.requests.waMessage', { name: contact.first_name || '', date: fmt(r.start_time) }))} target="_blank" rel="noreferrer">
                        <Phone className="h-3.5 w-3.5" />{phone}
                      </a>
                    )}
                    {email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{email}</span>}
                  </div>
                  {contact.notes && <p className="text-sm italic text-muted-foreground">“{contact.notes}”</p>}
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">{t('website.requests.therapist')}</span>
                  <Select
                    value={r.therapist_id}
                    onValueChange={(v) => v !== r.therapist_id && onReassign(r, v)}
                    disabled={r.booking_status === 'rejected' || reassign.isPending}
                  >
                    <SelectTrigger><SelectValue placeholder={name(r.therapists)} /></SelectTrigger>
                    <SelectContent>
                      {activeTherapists.map((th) => (
                        <SelectItem key={th.id} value={th.id}>{name(th)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {r.booking_status === 'pending' ? (
                  <div className="flex gap-2 md:justify-end">
                    <Button size="sm" variant="outline" onClick={() => onDecide(r, 'rejected')} disabled={decide.isPending}>
                      <X className="h-4 w-4 mr-1" />{t('website.requests.reject')}
                    </Button>
                    <Button size="sm" onClick={() => onDecide(r, 'approved')} disabled={decide.isPending}>
                      <Check className="h-4 w-4 mr-1" />{t('website.requests.approve')}
                    </Button>
                  </div>
                ) : <div />}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default RequestsTab;
