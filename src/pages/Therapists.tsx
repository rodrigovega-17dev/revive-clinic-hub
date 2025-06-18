
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, User, Phone, Mail, Calendar } from 'lucide-react';
import { useTherapists } from '@/hooks/useTherapists';
import TherapistForm from '@/components/TherapistForm';
import { Skeleton } from '@/components/ui/skeleton';

const Therapists = () => {
  const [showForm, setShowForm] = useState(false);
  const { data: therapists, isLoading } = useTherapists();

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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Phone className="h-4 w-4 text-purple-400" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Licensed</p>
                <p className="text-2xl font-bold text-foreground">
                  {therapists?.filter(t => t.license_number).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Therapists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {therapists?.map((therapist) => (
          <Card key={therapist.id} className="hover:shadow-lg transition-shadow bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-foreground">
                  {therapist.first_name} {therapist.last_name}
                </CardTitle>
                <Badge variant={therapist.is_active ? 'default' : 'secondary'}>
                  {therapist.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <CardDescription className="text-muted-foreground">
                {therapist.license_number && (
                  <span className="text-sm">
                    License: {therapist.license_number}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {therapist.profiles?.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{therapist.profiles.email}</span>
                  </div>
                )}
                
                {therapist.profiles?.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{therapist.profiles.phone}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!therapists || therapists.length === 0) && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No therapists found</h3>
              <p className="text-muted-foreground mb-4">Get started by adding your first therapist.</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Therapist
              </Button>
            </div>
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
