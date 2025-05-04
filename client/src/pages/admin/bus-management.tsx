import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { 
  Gauge, 
  Users, 
  Bus, 
  Route as RouteIcon, 
  Calendar, 
  AlertTriangle, 
  BarChart, 
  Plus, 
  Pencil, 
  Trash2,
  LogOut,
  Search,
  FileEdit,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent,
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  buses, 
  insertBusSchema,
  routes, 
  users,
  insertRouteSchema 
} from "@shared/schema";

// Bus form schema
const busFormSchema = z.object({
  busNumber: z.string().min(2, "Bus number must be at least 2 characters"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  status: z.enum(["active", "inactive", "maintenance"]),
  driverId: z.string().optional(),
  routeId: z.string().optional(),
});

// Bus form values

// Route form schema
const routeFormSchema = z.object({
  name: z.string().min(3, "Route name must be at least 3 characters"),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

// Route form values

export default function BusManagement() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("buses");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingBus, setEditingBus] = useState(null);
  const [editingRoute, setEditingRoute] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);

  // Fetch buses data
  const { data: busesData, isLoading: isLoadingBuses } = useQuery({
    queryKey: ["/api/buses"],
  });

  // Fetch routes data
  const { data: routesData, isLoading: isLoadingRoutes } = useQuery({
    queryKey: ["/api/routes"],
  });

  // Fetch drivers
  const { data: drivers, isLoading: isLoadingDrivers } = useQuery({
    queryKey: ["/api/users"],
    select: (data) => data?.filter((user) => user.role === "driver"),
  });

  // Create/Update bus mutation
  const busFormMutation = useMutation({
    mutationFn: async (values) => {
      // Make sure we're sending valid driver and route IDs to MongoDB
      const busData = {
        ...values,
        driverId: values.driverId && values.driverId !== "none" ? values.driverId : null,
        routeId: values.routeId && values.routeId !== "none" ? values.routeId : null,
      };
      
      console.log("Bus data to be sent:", busData);
      
      let res;
      if (editingBus) {
        res = await apiRequest("PUT", `/api/buses/${editingBus._id || editingBus.id}`, busData);
      } else {
        res = await apiRequest("POST", "/api/buses", busData);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buses"] });
      setEditingBus(null);
      toast({
        title: `Bus ${editingBus ? "updated" : "created"} successfully`,
        description: `The bus has been ${editingBus ? "updated" : "created"} successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: `Failed to ${editingBus ? "update" : "create"} bus`,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create/Update route mutation
  const routeFormMutation = useMutation({
    mutationFn: async (values) => {
      let res;
      if (editingRoute) {
        res = await apiRequest("PUT", `/api/routes/${editingRoute._id || editingRoute.id}`, values);
      } else {
        res = await apiRequest("POST", "/api/routes", values);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      setEditingRoute(null);
      toast({
        title: `Route ${editingRoute ? "updated" : "created"} successfully`,
        description: `The route has been ${editingRoute ? "updated" : "created"} successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: `Failed to ${editingRoute ? "update" : "create"} route`,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ id, type }: { id: number | string; type: 'bus' | 'route' }) => {
      const res = await apiRequest("DELETE", `/api/${type === 'bus' ? 'buses' : 'routes'}/${id}`);
      return { id, type };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: [data.type === 'bus' ? "/api/buses" : "/api/routes"] 
      });
      setDeletingItem(null);
      setIsDeleteDialogOpen(false);
      toast({
        title: `${data.type === 'bus' ? 'Bus' : 'Route'} deleted successfully`,
        description: `The ${data.type === 'bus' ? 'bus' : 'route'} has been deleted successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: `Failed to delete ${deletingItem?.type}`,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize bus form
  const busForm = useForm<BusFormValues>({
    resolver: zodResolver(busFormSchema),
    defaultValues: {
      busNumber: "",
      capacity: 30,
      status: "inactive",
      driverId: "none",
      routeId: "none",
    },
  });

  // Initialize route form
  const routeForm = useForm<RouteFormValues>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "active",
    },
  });

  // Filter buses based on search term
  const filteredBuses = busesData?.filter((bus: any) => 
    bus.busNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (bus.driver?.username && bus.driver?.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (bus.route?.name && bus.route?.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Filter routes based on search term
  const filteredRoutes = routesData?.filter((route: any) => 
    route.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (route.description && route.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleEditBus = (bus: any) => {
    setEditingBus(bus);
    busForm.reset({
      busNumber: bus.busNumber,
      capacity: bus.capacity,
      status: bus.status,
      driverId: bus.driverId ? bus.driverId.toString() : 
                bus.driver?._id ? bus.driver._id.toString() : "none",
      routeId: bus.routeId ? bus.routeId.toString() : 
               bus.route?._id ? bus.route._id.toString() : "none",
    });
  };

  const handleNewBus = () => {
    setEditingBus(null);
    busForm.reset({
      busNumber: "",
      capacity: 30,
      status: "inactive",
      driverId: "none",
      routeId: "none",
    });
  };

  const handleEditRoute = (route: any) => {
    setEditingRoute(route);
    routeForm.reset({
      name: route.name,
      description: route.description || "",
      status: route.status,
    });
  };

  const handleNewRoute = () => {
    setEditingRoute(null);
    routeForm.reset({
      name: "",
      description: "",
      status: "active",
    });
  };

  const handleDeleteItem = (id: number | string, type: 'bus' | 'route') => {
    setDeletingItem({ id, type });
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingItem) {
      deleteMutation.mutate(deletingItem);
    }
  };

  const handleBusSubmit = (values: BusFormValues) => {
    busFormMutation.mutate(values);
  };

  const handleRouteSubmit = (values: RouteFormValues) => {
    routeFormMutation.mutate(values);
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
            <a className="group flex items-center px-2 py-2 text-base font-medium rounded-md bg-sidebar-accent text-sidebar-accent-foreground mt-2">
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
            <a className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground mt-2">
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
            <h2 className="text-xl font-semibold text-gray-800">Bus & Route Management</h2>
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-4">
                {user?.fullName || user?.username}
              </span>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-gray-100 p-6">
          <Tabs defaultValue="buses" value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-between items-center mb-6">
              <TabsList>
                <TabsTrigger value="buses">Buses</TabsTrigger>
                <TabsTrigger value="routes">Routes</TabsTrigger>
              </TabsList>
              <div className="flex space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    placeholder="Search..." 
                    className="pl-9 w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button onClick={activeTab === "buses" ? handleNewBus : handleNewRoute}>
                      <Plus className="h-4 w-4 mr-2" />
                      New {activeTab === "buses" ? "Bus" : "Route"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {activeTab === "buses" 
                          ? (editingBus ? "Edit Bus" : "Add New Bus") 
                          : (editingRoute ? "Edit Route" : "Add New Route")}
                      </DialogTitle>
                      <DialogDescription>
                        {activeTab === "buses" 
                          ? "Enter bus details below" 
                          : "Enter route details below"}
                      </DialogDescription>
                    </DialogHeader>
                    
                    {activeTab === "buses" ? (
                      <Form {...busForm}>
                        <form onSubmit={busForm.handleSubmit(handleBusSubmit)} className="space-y-4">
                          <FormField
                            control={busForm.control}
                            name="busNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bus Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g. B123" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={busForm.control}
                            name="capacity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Capacity</FormLabel>
                                <FormControl>
                                  <Input type="number" min="1" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={busForm.control}
                            name="status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                    <SelectItem value="maintenance">Maintenance</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={busForm.control}
                            name="driverId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Assigned Driver</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select driver" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {isLoadingDrivers ? (
                                      <SelectItem value="loading" disabled>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      </SelectItem>
                                    ) : drivers?.map((driver: any) => (
                                      <SelectItem key={driver._id || driver.id} value={(driver._id || driver.id).toString()}>
                                        {driver.username} {driver.fullName ? `(${driver.fullName})` : ''}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={busForm.control}
                            name="routeId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Assigned Route</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select route" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {isLoadingRoutes ? (
                                      <SelectItem value="loading" disabled>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      </SelectItem>
                                    ) : routesData?.map((route: any) => (
                                      <SelectItem key={route._id || route.id} value={(route._id || route.id).toString()}>
                                        {route.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <DialogFooter>
                            <Button type="submit" disabled={busFormMutation.isPending}>
                              {busFormMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : null}
                              {editingBus ? "Update" : "Create"} Bus
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    ) : (
                      <Form {...routeForm}>
                        <form onSubmit={routeForm.handleSubmit(handleRouteSubmit)} className="space-y-4">
                          <FormField
                            control={routeForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Route Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g. Downtown Express" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={routeForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Input placeholder="Route description" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={routeForm.control}
                            name="status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <DialogFooter>
                            <Button type="submit" disabled={routeFormMutation.isPending}>
                              {routeFormMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : null}
                              {editingRoute ? "Update" : "Create"} Route
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <TabsContent value="buses" className="mt-6">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bus #</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingBuses ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : filteredBuses?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center">
                            No buses found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredBuses?.map((bus: any) => (
                          <TableRow key={bus._id || bus.id}>
                            <TableCell className="font-medium">{bus.busNumber}</TableCell>
                            <TableCell>{bus.capacity}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium 
                                ${bus.status === 'active' ? 'bg-green-100 text-green-800' : 
                                bus.status === 'inactive' ? 'bg-gray-100 text-gray-800' : 
                                'bg-amber-100 text-amber-800'}`}>
                                {bus.status.charAt(0).toUpperCase() + bus.status.slice(1)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {bus.driver 
                                ? (bus.driver.fullName || bus.driver.username) 
                                : bus.driverId 
                                ? <span>Loading driver...</span>
                                : <span className="text-gray-400">Unassigned</span>}
                            </TableCell>
                            <TableCell>
                              {bus.route 
                                ? bus.route.name 
                                : bus.routeId
                                ? <span>Loading route...</span>
                                : <span className="text-gray-400">Unassigned</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <FileEdit className="h-4 w-4" />
                                    <span className="sr-only">Actions</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => {
                                        e.preventDefault();
                                        handleEditBus(bus);
                                      }}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                    </DialogTrigger>
                                  </Dialog>
                                  <DropdownMenuItem 
                                    className="text-red-600" 
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      handleDeleteItem(bus._id || bus.id, 'bus');
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="routes" className="mt-6">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Route Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Stops</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingRoutes ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : filteredRoutes?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">
                            No routes found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRoutes?.map((route: any) => (
                          <TableRow key={route._id || route.id}>
                            <TableCell className="font-medium">{route.name}</TableCell>
                            <TableCell>{route.description || <span className="text-gray-400">No description</span>}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium 
                                ${route.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {route.status.charAt(0).toUpperCase() + route.status.slice(1)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {route.routeStops?.length 
                                ? `${route.routeStops.length} stops` 
                                : <span className="text-gray-400">No stops</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <FileEdit className="h-4 w-4" />
                                    <span className="sr-only">Actions</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => {
                                        e.preventDefault();
                                        handleEditRoute(route);
                                      }}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                    </DialogTrigger>
                                  </Dialog>
                                  <DropdownMenuItem 
                                    className="text-red-600" 
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      handleDeleteItem(route._id || route.id, 'route');
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {deletingItem?.type}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
