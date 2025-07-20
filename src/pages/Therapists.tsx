import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, User, Phone, Mail, Calendar, Edit, Award, DollarSign, Palette, AlertTriangle } from 'lucide-react';
import { useTherapists } from '@/hooks/useTherapists';
import { useSubscriptionLimits, useCanAddTherapist } from '@/hooks/useSubscription';
import TherapistForm from '@/components/TherapistForm';
import EditTherapistForm from '@/components/EditTherapistForm';
import SearchInput from '@/components/SearchInput';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// Google Calendar default colors for display
const GOOGLE_CALENDAR_COLORS = [
  { id: '1', name: 'Lavender', background: '#7986cb' },
  { id: '2', name: 'Sage', background: '#33b679' },
  { id: '3', name: 'Grape', background: '#8e63ce' },
  { id: '4', name: 'Flamingo', background: '#e67c73' },
  { id: '5', name: 'Banana', background: '#f6c026' },
  { id: '6', name: 'Tangerine', background: '#f4791f' },
  { id: '7', name: 'Peacock', background: '#039be5' },
  { id: '8', name: 'Graphite', background: '#616161' },
  { id: '9', name: 'Blueberry', background: '#3f51b5' },
  { id: '10', name: 'Basil', background: '#0b8043' },
  { id: '11', name: 'Tomato', background: '#d60000' },
];

const Therapists = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: therapists, isLoading } = useTherapists();
  const subscriptionLimits = useSubscriptionLimits();
  const canAddTherapist = useCanAddTherapist();
  const [showForm, setShowForm] = useState(false);
  const [editingTherapist, setEditingTherapist] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleAddTherapist = () => {
    if (!canAddTherapist) {
      toast({
        title: t('subscription.limitReached'),
        description: t('subscription.therapistLimitReached', { 
          current: subscriptionLimits?.currentTherapists || 0,
          max: subscriptionLimits?.maxTherapists || 3,
          plan: subscriptionLimits?.planName || 'Trial'
        }),
        variant: 'destructive',
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/subscription'}
          >
            {t('subscription.upgrade')}
          </Button>
        ),
      });
      return;
    }
    setShowForm(true);
  };

  const filteredTherapists = useMemo(() => {
    if (!therapists) return [];
    
    return therapists.filter(therapist => {
      const fullName = `${therapist.first_name || ''} ${therapist.last_name || ''}`.toLowerCase();
      const license = (therapist.license_number || '').toLowerCase();
      const specialties = (therapist.specialties || []).join(' ').toLowerCase();

      return fullName.includes(searchTerm.toLowerCase()) ||
             license.includes(searchTerm.toLowerCase()) ||
             specialties.includes(searchTerm.toLowerCase());
    });
  }, [therapists, searchTerm]);

  const getCalendarColor = (colorId: string) => {
    return GOOGLE_CALENDAR_COLORS.find(color => color.id === colorId) || GOOGLE_CALENDAR_COLORS[0];
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('therapists.title')}</h1>
            <p className="text-muted-foreground">{t('therapists.description')}</p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        
        <Card>
          <CardContent className="p-0">
            <div className="space-y-4 p-6">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeTherapists = therapists?.filter(t => t.is_active) || [];
  const totalTherapists = therapists?.length || 0;
  const averageCommission = activeTherapists.length > 0 
    ? activeTherapists.reduce((sum, t) => sum + (t.commission_percentage || 0), 0) / activeTherapists.length 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('therapists.title')}</h1>
          <p className="text-muted-foreground">{t('therapists.description')}</p>
        </div>
        <Button onClick={handleAddTherapist}>
          <Plus className="h-4 w-4 mr-2" />
          {t('therapists.addTherapist')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('therapists.totalTherapists')}</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTherapists}</div>
            <p className="text-xs text-muted-foreground">
              {activeTherapists.length} {t('common.active')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('therapists.averageCommission')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageCommission.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {t('therapists.perAppointment')}
                </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('therapists.licensedTherapists')}</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                  {therapists?.filter(t => t.license_number).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('therapists.withLicense')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('therapists.calendarIntegration')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {therapists?.filter(t => t.calendar_color_id && t.calendar_color_id !== '1').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('therapists.withCustomColors')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <SearchInput
          placeholder={t('therapists.searchTherapists')}
          value={searchTerm}
          onChange={setSearchTerm}
        />
      </div>

      {/* Therapists Table */}
      {filteredTherapists.length > 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">{t('common.name')}</TableHead>
                  <TableHead className="text-foreground">{t('common.email')}</TableHead>
                  <TableHead className="text-foreground">{t('common.license')}</TableHead>
                  <TableHead className="text-foreground">{t('therapists.calendarColor')}</TableHead>
                  <TableHead className="text-foreground">{t('common.status')}</TableHead>
                  <TableHead className="text-foreground">{t('common.joined')}</TableHead>
                  <TableHead className="text-right text-foreground">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTherapists.map((therapist) => {
                  const calendarColor = getCalendarColor(therapist.calendar_color_id || '1');
                  return (
                  <TableRow key={therapist.id} className="hover:bg-muted/50 border-border">
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {therapist.first_name} {therapist.last_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {therapist.email ? (
                        <span className="text-sm text-foreground">{therapist.email}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
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
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-4 h-4 rounded-full border border-border"
                            style={{ backgroundColor: calendarColor.background }}
                          />
                          <span className="text-sm text-muted-foreground">
                            {calendarColor.name}
                          </span>
                        </div>
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
                  );
                })}
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
            <Button onClick={handleAddTherapist}>
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
          therapist={editingTherapist}
          open={!!editingTherapist} 
          onClose={() => setEditingTherapist(null)}
        />
      )}
    </div>
  );
};

export default Therapists;
