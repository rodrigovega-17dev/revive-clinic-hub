import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, User, Phone, Mail, Calendar, Edit, MapPin, Heart, DollarSign, Eye, FileText } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useAllClientBalances } from '@/hooks/useClientBalance';
import ClientForm from '@/components/ClientForm';
import EditClientForm from '@/components/EditClientForm';
import ClientDetails from '@/components/ClientDetails';
import SearchInput from '@/components/SearchInput';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInYears } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';
import { formatCurrency } from '@/lib/utils';
import { useClinicSettings } from '@/hooks/useClinic';
import { hasCfdiData } from '@/lib/cfdi-catalogs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type Client = Tables<'clients'>;

const Clients = () => {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { data: clients, isLoading } = useClients();
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <Calendar className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('clients.activeClients')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {clients?.filter(c => c.is_active).length || 0}
                </p>
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
              <Heart className="h-4 w-4 text-red-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('clients.emergencyContact')}</p>
                <p className="text-2xl font-bold text-foreground">
                  {clients?.filter(c => c.emergency_contact_name).length || 0}
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
                    const isPositive = totalBalance >= 0;
                    return (
                      <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                        {isPositive ? '+' : ''}{formatCurrencyWithClinic(totalBalance)}
                      </span>
                    );
                  })()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={t('clients.searchClients')}
          className="max-w-md"
        />
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
                  <TableHead className="text-foreground">{t('clients.emergencyContact')}</TableHead>
                  <TableHead className="text-foreground">{t('clients.charge')}</TableHead>
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
                      {client.emergency_contact_name ? (
                        <div className="text-sm">
                          <div className="text-foreground">{client.emergency_contact_name}</div>
                          {client.emergency_contact_phone && (
                            <div className="text-muted-foreground">{client.emergency_contact_phone}</div>
                          )}
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
                      <Badge variant={client.is_active ? 'default' : 'secondary'}>
                        {client.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const balance = balanceMap.get(client.id);
                        if (balance) {
                          const isPositive = balance.balance >= 0;
                          return (
                            <div className="text-sm font-medium">
                              <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                                {isPositive ? '+' : ''}{formatCurrencyWithClinic(balance.balance)}
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
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedClient(client)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t('common.details')}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setEditingClient(client)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          {t('common.edit')}
                        </Button>
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
