import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, User, Phone, Mail, Calendar, Edit, Award, DollarSign } from 'lucide-react';
import { useTherapists } from '@/hooks/useTherapists';
import TherapistForm from '@/components/TherapistForm';
import EditTherapistForm from '@/components/EditTherapistForm';
import SearchInput from '@/components/SearchInput';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const Therapists = () => {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [editingTherapist, setEditingTherapist] = useState(null);
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
            <h1 className="text-3xl font-bold text-foreground">{t('therapists.title')}</h1>
            <p className="text-muted-foreground">{t('therapists.manageTherapists')}</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('therapists.addTherapist')}
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
          <h1 className="text-3xl font-bold text-foreground">{t('therapists.title')}</h1>
          <p className="text-muted-foreground">{t('therapists.manageTherapists')}</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('therapists.addTherapist')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('therapists.totalTherapists')}</p>
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
                <p className="text-sm font-medium text-muted-foreground">{t('therapists.activeToday')}</p>
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
                <p className="text-sm font-medium text-muted-foreground">{t('therapists.licensed')}</p>
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
                <p className="text-sm font-medium text-muted-foreground">{t('therapists.withContact')}</p>
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
          placeholder={t('therapists.searchTherapists')}
          className="max-w-md"
        />
        <div className="text-sm text-muted-foreground">
          {filteredTherapists.length} {t('common.of')} {therapists?.length || 0} {t('therapists.title').toLowerCase()}
        </div>
      </div>

      {/* Therapists Table */}
      {filteredTherapists.length > 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">{t('common.name')}</TableHead>
                  <TableHead className="text-foreground">{t('common.license')}</TableHead>
                  <TableHead className="text-foreground">{t('common.specialties')}</TableHead>
                  <TableHead className="text-foreground">{t('common.status')}</TableHead>
                  <TableHead className="text-foreground">{t('common.joined')}</TableHead>
                  <TableHead className="text-right text-foreground">{t('common.actions')}</TableHead>
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
                        {therapist.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(therapist.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setEditingTherapist(therapist)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        {t('common.edit')}
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
              {searchTerm ? t('therapists.noTherapistsSearch') : t('therapists.noTherapistsYet')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? t('therapists.tryAdjustingSearch')
                : t('therapists.getStartedAdding')
              }
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('therapists.addTherapist')}
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

      {/* Edit Therapist Form Modal */}
      {editingTherapist && (
        <EditTherapistForm 
          open={!!editingTherapist} 
          onClose={() => setEditingTherapist(null)}
          therapist={editingTherapist}
        />
      )}
    </div>
  );
};

export default Therapists;
