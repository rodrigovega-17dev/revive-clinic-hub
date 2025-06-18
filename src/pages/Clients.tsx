
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, User, Calendar, Phone, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Mock data - this will be replaced with real data from Supabase
const mockClients = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    phone: "+1 (555) 123-4567",
    age: 32,
    gender: "Female",
    tags: ["Sports Injury", "Regular"],
    lastVisit: "2024-06-15",
    totalAppointments: 12,
  },
  {
    id: 2,
    name: "Mike Chen",
    email: "mike.chen@email.com",
    phone: "+1 (555) 234-5678",
    age: 28,
    gender: "Male",
    tags: ["Rehabilitation", "New"],
    lastVisit: "2024-06-14",
    totalAppointments: 3,
  },
  {
    id: 3,
    name: "Lisa Anderson",
    email: "lisa.anderson@email.com",
    phone: "+1 (555) 345-6789",
    age: 45,
    gender: "Female",
    tags: ["Chronic Pain", "Regular"],
    lastVisit: "2024-06-12",
    totalAppointments: 25,
  },
];

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const filteredClients = mockClients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Clients</h1>
          <p className="text-muted-foreground">Manage your clinic's client database</p>
        </div>
        <Button onClick={() => navigate("/clients/new")} className="hover-lift">
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="fade-in">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search clients by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <Card key={client.id} className="hover-lift fade-in cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{client.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{client.age} years, {client.gender}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 mr-2" />
                  {client.email}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 mr-2" />
                  {client.phone}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4 mr-2" />
                  Last visit: {new Date(client.lastVisit).toLocaleDateString()}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {client.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              
              <div className="pt-4 border-t border-border">
                <p className="text-sm font-medium text-foreground">
                  {client.totalAppointments} total appointments
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <Card className="fade-in">
          <CardContent className="text-center py-12">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No clients found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first client"}
            </p>
            <Button onClick={() => navigate("/clients/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Clients;
