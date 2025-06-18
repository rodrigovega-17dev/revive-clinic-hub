
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, User, Phone, Mail, Calendar, Edit, Award } from 'lucide-react';
import { useTherapists } from '@/hooks/useTherapists';
import TherapistForm from '@/components/TherapistForm';
import SearchInput from '@/components/SearchInput';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const Therapists = () => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { data: therapists, isLoading } = useTherapists();

  // Enhanced search function for therapists
  const filteredTherapists = useMemo(() => {
    if (!therapists || !searchTerm.trim()) return therapists || [];

    const searchTerms = searchTerm.toLowerCase().trim().split(/\s+/);
    
    return therapists.filter(therapist => {
      const searchableText = [
        therapist.first_name,
        therapist.last_name,
        therapist.profiles?.email,
        therapist.profiles?.phone,
        therapist.license_number,
        ...(therapist.specialties || [])
      ].filter(Boolean).join(' ').toLowerCase();

      return searchTerms.every(term => 
        searchableText.includes(term) ||
        searchableText.split(/\s+/).some(word => word.startsWith(term))
      );
    });
  }, [therapists, searchTerm]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Therapists</h1>
            <p className="text-muted-foreground">Manage therapist profiles and schedules</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Therapist
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
          <h1 className="text-3xl font-bold text-foreground">Therapists</h1>
          <p className="text-muted-foreground">Manage therapist profiles and schedules</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Therapist
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Therapists</p>
                <p className="text-2xl font-bold text-foreground">{therapists?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Today</p>
                <p className="text-2xl font-bold text-foreground">
                  {therapists?.filter(t => t.is_active).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Award className="h-4 w-4 text-purple-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Licensed</p>
                <p className="text-2xl font-bold text-foreground">
                  {therapists?.filter(t => t.license_number).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4 text-orange-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">With Contact</p>
                <p className="text-2xl font-bold text-foreground">
                  {therapists?.filter(t => t.profiles?.phone || t.profiles?.email).length || 0}
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
          placeholder="Search therapists by name, email, phone, license, or specialty..."
          className="max-w-md"
        />
        <div className="text-sm text-muted-foreground">
          {filteredTherapists.length} of {therapists?.length || 0} therapists
        </div>
      </div>

      {/* Therapists Table */}
      {filteredTherapists.length > 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">Name</TableHead>
                  <TableHead className="text-foreground">Contact</TableHead>
                  <TableHead className="text-foreground">License</TableHead>
                  <TableHead className="text-foreground">Specialties</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-foreground">Joined</TableHead>
                  <TableHead className="text-right text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTherapists.map((therapist) => (
                  <TableRow key={therapist.id} className="hover:bg-muted/50 border-border">
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {therapist.first_name} {therapist.last_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {therapist.profiles?.email && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Mail className="h-3 w-3 mr-1" />
                            {therapist.profiles.email}
                          </div>
                        )}
                        {therapist.profiles?.phone && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Phone className="h-3 w-3 mr-1" />
                            {therapist.profiles.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {therapist.license_number ? (
                        <div className="flex items-center text-sm text-foreground">
                          <Award className="h-3 w-3 mr-1" />
                          {therapist.license_number}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {therapist.specialties && therapist.specialties.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {therapist.specialties.slice(0, 2).map((specialty, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                          {therapist.specialties.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{therapist.specialties.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={therapist.is_active ? 'default' : 'secondary'}>
                        {therapist.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(therapist.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
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
              {searchTerm ? 'No therapists found' : 'No therapists yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms or add a new therapist.'
                : 'Get started by adding your first therapist.'
              }
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Therapist
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Therapist Form Modal */}
      {showForm && (
        <TherapistForm 
          open={showForm} 
          onClose={() => setShowForm(false)} 
        />
      )}
    </div>
  );
};

export default Therapists;
