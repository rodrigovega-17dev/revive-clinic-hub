
import { useState } from "react";
import { Plus, Search, MoreHorizontal, Edit, Trash2, User, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useClients } from "@/hooks/useClients";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import ClientForm from "@/components/ClientForm";

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const { data: clients, isLoading } = useClients();

  const filteredClients = clients?.filter(client =>
    `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm)
  ) || [];

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Skeleton className="h-10 w-48 mb-3" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="hover-lift">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
            <div className="flex justify-between items-center">
              <div>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-10 w-64" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-4 p-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeClients = clients?.filter(client => client.is_active).length || 0;
  const recentClients = clients?.filter(client => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(client.created_at) > weekAgo;
  }).length || 0;

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Clients</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Manage your client database and contact information
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} size="lg" className="shadow-lg">
          <Plus className="mr-2 h-5 w-5" />
          Add Client
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="hover-lift bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-500 rounded-full">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">Total Clients</p>
                <p className="text-3xl font-bold text-blue-900">{clients?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover-lift bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-500 rounded-full">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Active Clients</p>
                <p className="text-3xl font-bold text-green-900">{activeClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover-lift bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-500 rounded-full">
                <Phone className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-700">New This Week</p>
                <p className="text-3xl font-bold text-purple-900">{recentClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl text-foreground">Client Directory</CardTitle>
              <CardDescription className="text-base mt-1">
                {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredClients.length === 0 ? (
            <div className="text-center py-16">
              <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {clients?.length === 0 ? 'No clients yet' : 'No clients found'}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {clients?.length === 0 
                  ? 'Get started by adding your first client to the system.' 
                  : 'Try adjusting your search criteria to find the client you\'re looking for.'
                }
              </p>
              {clients?.length === 0 && (
                <Button onClick={() => setShowForm(true)} size="lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Client
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold text-foreground">Name</TableHead>
                    <TableHead className="font-semibold text-foreground">Contact</TableHead>
                    <TableHead className="font-semibold text-foreground">Age</TableHead>
                    <TableHead className="font-semibold text-foreground">Gender</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                    <TableHead className="font-semibold text-foreground">Added</TableHead>
                    <TableHead className="w-[70px] font-semibold text-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client, index) => (
                    <TableRow key={client.id} className={index % 2 === 0 ? 'bg-muted/20' : 'bg-background'}>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {client.first_name.charAt(0)}{client.last_name.charAt(0)}
                          </div>
                          <span>{client.first_name} {client.last_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {client.email && (
                            <div className="text-sm font-medium text-foreground flex items-center">
                              <Mail className="h-3 w-3 mr-2 text-muted-foreground" />
                              {client.email}
                            </div>
                          )}
                          {client.phone && (
                            <div className="text-sm text-muted-foreground flex items-center">
                              <Phone className="h-3 w-3 mr-2" />
                              {client.phone}
                            </div>
                          )}
                          {!client.email && !client.phone && (
                            <span className="text-sm text-muted-foreground">No contact info</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {client.birth_date 
                          ? new Date().getFullYear() - new Date(client.birth_date).getFullYear()
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="capitalize text-foreground">
                        {client.gender || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={client.is_active ? "default" : "secondary"}
                          className={client.is_active ? "bg-green-100 text-green-800 border-green-200" : ""}
                        >
                          {client.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {format(new Date(client.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-foreground">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="border-2">
                            <DropdownMenuItem className="text-foreground">
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Form Modal */}
      <ClientForm 
        open={showForm} 
        onClose={() => setShowForm(false)} 
      />
    </div>
  );
};

export default Clients;
