import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, User, Phone, Mail, Edit, MapPin, DollarSign, Eye, FileText, Archive, ArchiveRestore } from 'lucide-react';
import { useClients, useUpdateClient } from '@/hooks/useClients';
import { useAllClientBalances } from '@/hooks/useClientBalance';
import ClientForm from '@/components/ClientForm';
import EditClientForm from '@/components/EditClientForm';
import ClientDetails from '@/components/ClientDetails';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInYears } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';
import { formatCurrency, getBalanceColorClass, getBalanceSign } from '@/lib/utils';
import { useClinicSettings } from '@/hooks/useClinic';
import { hasCfdiData } from '@/lib/cfdi-catalogs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ClientSearchSelect from '@/components/ClientSearchSelect';
import { formatPersonName } from '@/lib/names';

type Client = Tables<'clients'>;

const Clients = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [includeArchived, setIncludeArchived] = useState(false);
  const { data: clients, isLoading } = useClients({ includeArchived });
  const updateClient = useUpdateClient();
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchValue, setClientSearchValue] = useState('all');
  const { data: clientBalances } = useAllClientBalances();
  const [searchParams] = useSearchParams();
  const { currency } = useClinicSettings();

  // Clinic-aware currency formatting
  const formatCurrencyWithClinic = (value: number) => {
    return formatCurrency(value, 2, currency);
  };

  // Enhanced search function for clients
  const filteredClients = useMemo(() => {
    if (!clients || !searchTerm.trim()) return clients || [];

    const searchTerms = searchTerm.toLowerCase().trim().split(/\s+/);
    
    return clients.filter(client => {
      const searchableText = [
        client.first_name,
        client.last_name,
        client.email,
        client.phone,
        client.address,
        client.emergency_contact_name,
        client.emergency_contact_phone,
        ...(client.tags || [])
      ].filter(Boolean).join(' ').toLowerCase();

      return searchTerms.every(term => 
        searchableText.includes(term) ||
        searchableText.split(/\s+/).some(word => word.startsWith(term))
      );
    });
  }, [clients, searchTerm]);

  // Create a map of client balances for quick lookup
  const balanceMap = useMemo(() => {
    const map = new Map();
    clientBalances?.forEach(balance => {
      map.set(balance.clientId, balance);
    });
    return map;
  }, [clientBalances]);

  const getAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    return differenceInYears(new Date(), new Date(birthDate));
  };

  const handleArchive = async (id: string, archive: boolean) => {
    try {
      await updateClient.mutateAsync({ id, archived: archive });
      toast({ title: t('common.success'), description: archive ? t('clients.archivedSuccess') : t('clients.unarchivedSuccess') });
    } catch (e) {
      toast({ title: t('common.error'), description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleClientSearchSelect = (value: string) => {
    setClientSearchValue(value);
    if (value === 'all') {
      setSearchTerm('');
      return;
    }

    const selected = clients?.find((client) => client.id === value);
    setSearchTerm(formatPersonName(selected?.first_name, selected?.last_name));
  };

  // Check URL parameters to auto-open form
  useEffect(() => {
    if (searchParams.get('showForm') === 'true') {
      setShowForm(true);
      // Clean up the URL parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('showForm');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('clients.title')}</h1>
            <p className="text-muted-foreground">{t('clients.manageClients')}</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('clients.newClient')}
          </Button>
        </div>
        
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('clients.title')}</h1>
          <p className="text-muted-foreground">{t('clients.manageClients')}</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('clients.newClient')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('clients.totalClients')}</p>
                <p className="text-2xl font-bold text-foreground">{clients?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-purple-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('clients.withEmail')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {clients?.filter(c => c.email).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-amber-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('cfdi.fiscalData')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {clients?.filter((c) => hasCfdiData(c)).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-yellow-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('clients.balance')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {(() => {
                    const totalBalance = clientBalances?.reduce((sum, balance) => sum + balance.balance, 0) || 0;
                    return (
                      <span className={getBalanceColorClass(totalBalance)}>
                        {getBalanceSign(totalBalance)}{formatCurrencyWithClinic(totalBalance)}
                      </span>
                    );
                  })()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Include archived */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="w-full max-w-md">
          <ClientSearchSelect
            value={clientSearchValue}
            onValueChange={handleClientSearchSelect}
            clients={clients || []}
            allowNone
            noneValue="all"
            noneLabel={t('common.all')}
            placeholder={t('clients.searchClients')}
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="include-archived-clients" checked={includeArchived} onCheckedChange={setIncludeArchived} />
          <Label htmlFor="include-archived-clients" className="text-sm text-muted-foreground">{t('common.showArchived')}</Label>
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredClients.length} {t('common.of')} {clients?.length || 0} {t('clients.title').toLowerCase()}
        </div>
      </div>

      {/* Clients Table */}
      {filteredClients.length > 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">{t('common.name')}</TableHead>
                  <TableHead className="text-foreground">{t('clients.contact')}</TableHead>
                  <TableHead className="text-foreground">{t('clients.age')}</TableHead>
                  <TableHead className="text-foreground">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help underline decoration-dotted decoration-muted-foreground">
                          {t('clients.charge')}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{t('clients.chargeTooltip')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-foreground">{t('common.status')}</TableHead>
                  <TableHead className="text-foreground">{t('clients.balance')}</TableHead>
                  <TableHead className="text-foreground">{t('cfdi.fiscalData')}</TableHead>
                  <TableHead className="text-right text-foreground">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-muted/50 border-border">
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {client.first_name} {client.last_name}
                      </div>
                      {client.address && (
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {client.address.length > 30 ? `${client.address.substring(0, 30)}...` : client.address}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {client.email && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Mail className="h-3 w-3 mr-1" />
                            {client.email}
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Phone className="h-3 w-3 mr-1" />
                            {client.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.birth_date ? (
                        <div className="text-sm text-foreground">
                          {getAge(client.birth_date)} {t('clients.years')}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.charge_amount ? (
                        <div className="text-sm font-medium text-foreground">
                          {formatCurrencyWithClinic(client.charge_amount)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {client.archived && (
                          <Badge variant="outline">{t('common.archived')}</Badge>
                        )}
                        <Badge variant={client.is_active ? 'default' : 'secondary'}>
                          {client.is_active ? t('common.active') : t('common.inactive')}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const balance = balanceMap.get(client.id);
                        if (balance) {
                          return (
                            <div className="text-sm font-medium">
                              <span className={getBalanceColorClass(balance.balance)}>
                                {getBalanceSign(balance.balance)}{formatCurrencyWithClinic(balance.balance)}
                              </span>
                            </div>
                          );
                        }
                        return <span className="text-muted-foreground">{formatCurrencyWithClinic(0)}</span>;
                      })()}
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1">
                            {hasCfdiData(client) ? (
                              <Badge variant="secondary" className="gap-1">
                                <FileText className="h-3 w-3" />
                                {t('cfdi.fiscalDataComplete')}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">{t('cfdi.fiscalDataMissing')}</span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {hasCfdiData(client) ? t('cfdi.fiscalDataComplete') : t('cfdi.fiscalDataMissing')}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedClient(client)}>
                          <Eye className="h-4 w-4 mr-1" />
                          {t('common.details')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingClient(client)}>
                          <Edit className="h-4 w-4 mr-1" />
                          {t('common.edit')}
                        </Button>
                        {client.archived ? (
                          <Button variant="ghost" size="sm" onClick={() => handleArchive(client.id, false)}>
                            <ArchiveRestore className="h-4 w-4 mr-1" />
                            {t('common.unarchive')}
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => handleArchive(client.id, true)}>
                            <Archive className="h-4 w-4 mr-1" />
                            {t('common.archive')}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="text-center py-12">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchTerm ? t('clients.noClients') : t('clients.noClientsYet')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? t('clients.tryAdjustingSearch')
                : t('clients.getStartedAdding')
              }
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('clients.newClient')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Client Form Modal */}
      {showForm && (
        <ClientForm 
          open={showForm} 
          onClose={() => setShowForm(false)} 
        />
      )}

      {/* Edit Client Form Modal */}
      {editingClient && (
        <EditClientForm 
          open={!!editingClient} 
          onClose={() => setEditingClient(null)}
          client={editingClient}
        />
      )}

      {/* Client Details Modal */}
      {selectedClient && (
        <ClientDetails
          client={selectedClient}
          open={!!selectedClient}
          onClose={() => setSelectedClient(null)}
          onEdit={(c) => {
            setSelectedClient(null);
            setEditingClient(c);
          }}
        />
      )}
    </div>
  );
};

export default Clients;
