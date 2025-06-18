
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, User, Phone, Mail, Calendar, Edit, MapPin, Heart } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import ClientForm from '@/components/ClientForm';
import EditClientForm from '@/components/EditClientForm';
import SearchInput from '@/components/SearchInput';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInYears } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type Client = Tables<'clients'>;

const Clients = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { data: clients, isLoading } = useClients();

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

  const getAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    return differenceInYears(new Date(), new Date(birthDate));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clients</h1>
            <p className="text-muted-foreground">Manage client profiles and contact information</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
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
          <h1 className="text-3xl font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground">Manage client profiles and contact information</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
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
                <p className="text-sm font-medium text-muted-foreground">Active Clients</p>
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
                <p className="text-sm font-medium text-muted-foreground">With Email</p>
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
                <p className="text-sm font-medium text-muted-foreground">Emergency Contact</p>
                <p className="text-2xl font-bold text-foreground">
                  {clients?.filter(c => c.emergency_contact_name).length || 0}
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
          placeholder="Search clients by name, email, phone, or address..."
          className="max-w-md"
        />
        <div className="text-sm text-muted-foreground">
          {filteredClients.length} of {clients?.length || 0} clients
        </div>
      </div>

      {/* Clients Table */}
      {filteredClients.length > 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">Name</TableHead>
                  <TableHead className="text-foreground">Contact</TableHead>
                  <TableHead className="text-foreground">Age</TableHead>
                  <TableHead className="text-foreground">Emergency Contact</TableHead>
                  <TableHead className="text-foreground">Charge</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-right text-foreground">Actions</TableHead>
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
                          {getAge(client.birth_date)} years
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
                          ${client.charge_amount}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.is_active ? 'default' : 'secondary'}>
                        {client.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setEditingClient(client)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
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
              {searchTerm ? 'No clients found' : 'No clients yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms or add a new client.'
                : 'Get started by adding your first client.'
              }
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
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
    </div>
  );
};

export default Clients;
