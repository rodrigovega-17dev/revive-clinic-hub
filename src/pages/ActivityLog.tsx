import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { CalendarDays, User, DollarSign, ClipboardList, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivityLog, ActivityLogEntry } from '@/hooks/useActivityLog';
import { useLanguage } from '@/hooks/useLanguage';
import { useClients } from '@/hooks/useClients';
import { useTherapists } from '@/hooks/useTherapists';
import ClientSearchSelect from '@/components/ClientSearchSelect';
import { formatPersonName } from '@/lib/names';
import { Label } from '@/components/ui/label';

const ACTION_ICONS: Record<string, React.ElementType> = {
  appointment: CalendarDays,
  client: User,
  payment: DollarSign,
};

const getActionIcon = (entityType: string) => {
  return ACTION_ICONS[entityType] || ClipboardList;
};

const getActionColor = (actionType: string): string => {
  if (actionType.includes('reverted')) return 'text-orange-600';
  if (actionType.includes('deleted') || actionType.includes('cancelled')) return 'text-red-500';
  if (actionType.includes('payment')) return 'text-green-600';
  if (actionType.includes('created')) return 'text-blue-600';
  if (actionType.includes('rescheduled')) return 'text-amber-600';
  return 'text-muted-foreground';
};

const ActivityLogPage = () => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const locale = currentLanguage === 'es' ? es : enUS;
  const [page, setPage] = useState(0);
  const [entityFilter, setEntityFilter] = useState('all');
  const [clientFilterId, setClientFilterId] = useState('all');
  const [therapistFilterId, setTherapistFilterId] = useState('all');
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const { data: clients = [] } = useClients();
  const { data: therapists = [] } = useTherapists();

  const selectedClientName = useMemo(() => {
    if (clientFilterId === 'all') return undefined;
    const client = clients.find((item) => item.id === clientFilterId);
    return formatPersonName(client?.first_name, client?.last_name);
  }, [clientFilterId, clients]);

  const selectedTherapistName = useMemo(() => {
    if (therapistFilterId === 'all') return undefined;
    const therapist = therapists.find((item) => item.id === therapistFilterId);
    return formatPersonName(therapist?.first_name, therapist?.last_name);
  }, [therapistFilterId, therapists]);

  const { data, isLoading } = useActivityLog(
    page,
    entityFilter,
    selectedClientName,
    selectedTherapistName
  );

  // Accumulate entries for infinite scroll
  const allEntries = page === 0 ? (data?.data ?? []) : [...entries, ...(data?.data ?? [])];
  const totalCount = data?.count ?? 0;
  const hasMore = allEntries.length < totalCount;

  const handleFilterChange = (value: string) => {
    setEntityFilter(value);
    setPage(0);
    setEntries([]);
  };

  const handleClientFilterChange = (value: string) => {
    setClientFilterId(value);
    setPage(0);
    setEntries([]);
  };

  const handleTherapistFilterChange = (value: string) => {
    setTherapistFilterId(value);
    setPage(0);
    setEntries([]);
  };

  const handleLoadMore = () => {
    setEntries(allEntries);
    setPage(p => p + 1);
  };

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">{t('activityLog.title')}</h1>
        <p className="text-muted-foreground">{t('activityLog.subtitle')}</p>
      </div>

      <Tabs value={entityFilter} onValueChange={handleFilterChange}>
        <TabsList>
          <TabsTrigger value="all">{t('activityLog.all')}</TabsTrigger>
          <TabsTrigger value="appointment">{t('activityLog.appointments')}</TabsTrigger>
          <TabsTrigger value="client">{t('activityLog.clients')}</TabsTrigger>
          <TabsTrigger value="payment">{t('activityLog.payments')}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm text-foreground">{t('appointments.client')}</Label>
          <ClientSearchSelect
            value={clientFilterId}
            onValueChange={handleClientFilterChange}
            clients={clients}
            allowNone
            noneValue="all"
            noneLabel={t('activityLog.allClients')}
            placeholder={t('common.selectClient')}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-foreground">{t('appointments.therapist')}</Label>
          <ClientSearchSelect
            value={therapistFilterId}
            onValueChange={handleTherapistFilterChange}
            clients={therapists}
            allowNone
            noneValue="all"
            noneLabel={t('activityLog.allTherapists')}
            placeholder={t('common.selectTherapist')}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('activityLog.title')}</CardTitle>
          <CardDescription>{totalCount} {t('common.total').toLowerCase()}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && page === 0 ? (
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : allEntries.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>{t('activityLog.noActivity')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {allEntries.map((entry, idx) => {
                const Icon = getActionIcon(entry.entity_type);
                const colorClass = getActionColor(entry.action_type);
                return (
                  <div
                    key={entry.id}
                    className={`flex items-start gap-3 py-3 ${idx < allEntries.length - 1 ? 'border-b border-border' : ''}`}
                  >
                    <div className={`h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground leading-snug">{entry.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.user_email && (
                          <span>{t('activityLog.by')} {entry.user_email} · </span>
                        )}
                        {formatTime(entry.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {hasMore && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoading}
              >
                <ChevronDown className="h-4 w-4 mr-2" />
                {t('activityLog.loadMore')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLogPage;
