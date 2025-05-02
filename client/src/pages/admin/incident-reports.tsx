import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useIncidentUpdates } from "@/lib/websocket";
import { 
  Gauge, 
  Users, 
  Bus, 
  Route as RouteIcon, 
  Calendar, 
  AlertTriangle, 
  BarChart, 
  Phone,
  CheckCircle,
  Filter,
  MapPin,
  MessageCircle,
  Clock,
  CircleAlert,
  Wrench,
  Car,
  AlertOctagon,
  LogOut,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function IncidentReports() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const newIncident = useIncidentUpdates();
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [isResolutionDialogOpen, setIsResolutionDialogOpen] = useState(false);
  const [resolutionNote, setResolutionNote] = useState<string>("");

  // Fetch incidents
  const { data: incidents, isLoading: isLoadingIncidents } = useQuery({
    queryKey: ["/api/incidents"],
  });

  // Update incident status mutation
  const updateIncidentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PUT", `/api/incidents/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      setIsResolutionDialogOpen(false);
      setSelectedIncident(null);
      setResolutionNote("");
      
      toast({
        title: "Incident updated",
        description: "The incident status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update incident",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Apply filters
  const filteredIncidents = incidents?.filter((incident: any) => 
    (statusFilter === "all" || incident.status === statusFilter) &&
    (typeFilter === "all" || incident.incidentType === typeFilter)
  );

  // Group incidents by status for the dashboard view
  const reportedIncidents = incidents?.filter((i: any) => i.status === "reported") || [];
  const inProgressIncidents = incidents?.filter((i: any) => i.status === "in_progress") || [];
  const resolvedIncidents = incidents?.filter((i: any) => i.status === "resolved") || [];

  // Incident type icon mapping
  const getIncidentTypeIcon = (type: string) => {
    switch (type) {
      case "delay":
        return <Clock className="h-5 w-5 text-amber-500" />;
      case "breakdown":
        return <Wrench className="h-5 w-5 text-orange-600" />;
      case "accident":
        return <Car className="h-5 w-5 text-red-600" />;
      default:
        return <AlertOctagon className="h-5 w-5 text-gray-600" />;
    }
  };

  // Incident status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "reported":
        return <Badge variant="destructive">Reported</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">In Progress</Badge>;
      case "resolved":
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Resolved</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Status action button
  const getStatusActionButton = (incident: any) => {
    switch (incident.status) {
      case "reported":
        return (
          <Button 
            size="sm" 
            className="bg-amber-500 hover:bg-amber-600"
            onClick={() => handleUpdateStatus(incident, "in_progress")}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Mark In Progress
          </Button>
        );
      case "in_progress":
        return (
          <Button 
            size="sm" 
            className="bg-green-600 hover:bg-green-700"
            onClick={() => {
              setSelectedIncident(incident);
              setIsResolutionDialogOpen(true);
            }}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Resolve
          </Button>
        );
      case "resolved":
        return (
          <Button 
            size="sm" 
            variant="outline" 
            disabled
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Resolved
          </Button>
        );
      default:
        return null;
    }
  };

  const handleUpdateStatus = (incident: any, status: string) => {
    if (status === "resolved") {
      // For resolved status, we'll open the resolution dialog
      setSelectedIncident(incident);
      setIsResolutionDialogOpen(true);
    } else {
      // For other status updates, we'll update directly
      updateIncidentMutation.mutate({
        id: incident.id,
        status,
      });
    }
  };

  const handleResolveIncident = () => {
    if (selectedIncident) {
      updateIncidentMutation.mutate({
        id: selectedIncident.id,
        status: "resolved",
      });
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="bg-sidebar w-64 flex-shrink-0 hidden md:block">
        <div className="p-4 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-sidebar-foreground">BusTrack Admin</h1>
        </div>
        <nav className="mt-5 px-2">
          <Link href="/admin">
            <a className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground">
              <Gauge className="mr-3 h-5 w-5" />
              Dashboard
            </a>
          </Link>
          <Link href="/admin/buses">
            <a className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground mt-2">
              <Bus className="mr-3 h-5 w-5" />
              Buses
            </a>
          </Link>
          <Link href="/admin/schedule">
            <a className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground mt-2">
              <Calendar className="mr-3 h-5 w-5" />
              Schedule
            </a>
          </Link>
          <Link href="/admin/incidents">
            <a className="group flex items-center px-2 py-2 text-base font-medium rounded-md bg-sidebar-accent text-sidebar-accent-foreground mt-2">
              <AlertTriangle className="mr-3 h-5 w-5" />
              Incidents
            </a>
          </Link>
          <Link href="/admin/analytics">
            <a className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground mt-2">
              <BarChart className="mr-3 h-5 w-5" />
              Analytics
            </a>
          </Link>
          <Separator className="my-4 bg-sidebar-border" />
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </Button>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="bg-white shadow">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Incident Reports & SOS Alerts</h2>
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-4">
                {user?.fullName || user?.username}
              </span>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-gray-100 p-6">
          {/* New Incident Alert */}
          {newIncident && (
            <Alert variant="destructive" className="mb-6 animate-pulse">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>New Incident Reported</AlertTitle>
              <AlertDescription>
                {newIncident.incidentType === 'delay' ? 'Delay' : 
                newIncident.incidentType === 'breakdown' ? 'Breakdown' : 
                newIncident.incidentType === 'accident' ? 'Accident' : 'Other'} - 
                Bus #{newIncident.bus?.busNumber} - {newIncident.description}
              </AlertDescription>
            </Alert>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Reported Incidents */}
            <Card className="border-l-4 border-red-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <CircleAlert className="h-5 w-5 mr-2 text-red-500" />
                  Reported
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {isLoadingIncidents ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    reportedIncidents.length
                  )}
                </div>
                <p className="text-sm text-gray-500">Incidents waiting for attention</p>
              </CardContent>
            </Card>

            {/* In Progress Incidents */}
            <Card className="border-l-4 border-amber-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-amber-500" />
                  In Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {isLoadingIncidents ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    inProgressIncidents.length
                  )}
                </div>
                <p className="text-sm text-gray-500">Incidents being addressed</p>
              </CardContent>
            </Card>

            {/* Resolved Incidents */}
            <Card className="border-l-4 border-green-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  Resolved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {isLoadingIncidents ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    resolvedIncidents.length
                  )}
                </div>
                <p className="text-sm text-gray-500">Incidents successfully resolved</p>
              </CardContent>
            </Card>
          </div>

          {/* Incidents List */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle>Incident Reports</CardTitle>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 mr-2 text-gray-500" />
                    <Select 
                      value={statusFilter} 
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="reported">Reported</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 mr-2 text-gray-500" />
                    <Select 
                      value={typeFilter} 
                      onValueChange={setTypeFilter}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="delay">Delay</SelectItem>
                        <SelectItem value="breakdown">Breakdown</SelectItem>
                        <SelectItem value="accident">Accident</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border-t">
                {isLoadingIncidents ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : filteredIncidents?.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No incidents match your filters
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredIncidents?.map((incident: any) => (
                      <div key={incident.id} className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              {getIncidentTypeIcon(incident.incidentType)}
                              <h3 className="text-lg font-medium ml-2">
                                {incident.incidentType.charAt(0).toUpperCase() + incident.incidentType.slice(1)}
                              </h3>
                              <div className="ml-3">
                                {getStatusBadge(incident.status)}
                              </div>
                            </div>
                            <p className="text-gray-700 mb-2">{incident.description}</p>
                            <div className="flex flex-col sm:flex-row gap-4 text-sm text-gray-500">
                              <div className="flex items-center">
                                <Bus className="h-4 w-4 mr-1" />
                                <span>Bus #{incident.bus?.busNumber || 'Unknown'}</span>
                              </div>
                              <div className="flex items-center">
                                <Users className="h-4 w-4 mr-1" />
                                <span>Reported by: {incident.reporter?.username || 'Unknown'}</span>
                              </div>
                              {incident.location && (
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  <span>
                                    Location: {incident.location.lat.toFixed(4)}, {incident.location.lng.toFixed(4)}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                <span>
                                  {incident.createdAt ? format(new Date(incident.createdAt), 'MMM dd, yyyy - HH:mm') : 'Unknown time'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 mt-3 sm:mt-0">
                            {incident.status !== "resolved" && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                              >
                                <Phone className="h-4 w-4 mr-2" />
                                Call Driver
                              </Button>
                            )}
                            {getStatusActionButton(incident)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Resolution Dialog */}
      <Dialog open={isResolutionDialogOpen} onOpenChange={setIsResolutionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Incident</DialogTitle>
            <DialogDescription>
              Add resolution details before marking this incident as resolved.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Incident Details</h4>
              <div className="bg-gray-50 p-3 rounded-md text-sm">
                <p><span className="font-medium">Type:</span> {selectedIncident?.incidentType}</p>
                <p><span className="font-medium">Description:</span> {selectedIncident?.description}</p>
                <p>
                  <span className="font-medium">Reported on:</span> {selectedIncident?.createdAt ? format(new Date(selectedIncident.createdAt), 'MMM dd, yyyy - HH:mm') : 'Unknown'}
                </p>
              </div>
            </div>
            
            <div>
              <label htmlFor="resolution-note" className="text-sm font-medium">Resolution Note</label>
              <Textarea 
                id="resolution-note"
                placeholder="Add details about how the incident was resolved..."
                className="mt-1"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsResolutionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700" 
              onClick={handleResolveIncident}
              disabled={updateIncidentMutation.isPending}
            >
              {updateIncidentMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Mark as Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
