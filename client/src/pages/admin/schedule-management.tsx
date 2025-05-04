import { useState, useEffect } from "react";
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
  Clock,
  ArrowRight,
  CheckSquare,
  X,
  LogOut,
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
import { Separator } from "@/components/ui/separator";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

// Schedule form schema
const scheduleFormSchema = z.object({
  busId: z.string().min(1, "Bus is required"),
  routeId: z.string().min(1, "Route is required"),
  scheduledDeparture: z.string().min(1, "Departure time is required"),
});

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

// Helper function to map days of the week
const getDayName = (date: Date) => {
  return format(date, 'EEEE');
};

// Helper function to get timeline hours
const getTimelineHours = () => {
  const hours = [];
  for (let i = 5; i <= 23; i++) {
    hours.push(`${i}:00`);
  }
  return hours;
};

export default function ScheduleManagement() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);

  // Create a date for visualization (default to current week)
  const today = new Date();
  const dayOffset = today.getDay() - 1; // 0 is Sunday, 1 is Monday, etc.
  
  // Calculate dates for the week
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset + i);
    return {
      date,
      day: getDayName(date),
      formattedDate: format(date, 'MMM dd'),
    };
  });

  // Fetch buses
  const { data: buses, isLoading: isLoadingBuses } = useQuery({
    queryKey: ["/api/buses"],
    select: (data) => {
      console.log("Buses data:", data);
      // Ensure data is an array before filtering
      if (!data || !Array.isArray(data)) {
        console.log("Buses data is not an array:", data);
        return [];
      }
      return data.filter((bus: any) => bus.status === "active");
    }
  });

  // Fetch routes
  const { data: routes, isLoading: isLoadingRoutes } = useQuery({
    queryKey: ["/api/routes"],
    select: (data) => {
      console.log("Routes data:", data);
      // Ensure data is an array before filtering
      if (!data || !Array.isArray(data)) {
        console.log("Routes data is not an array:", data);
        return [];
      }
      return data.filter((route: any) => route.status === "active");
    }
  });

  // For demonstration purposes, we'll create some mock schedules
  // In a real application, this would come from the API
  const [schedules, setSchedules] = useState<any[]>([]);

  useEffect(() => {
    // Mock data
    if (buses && routes) {
      console.log("Creating mock schedules with buses and routes:", { buses, routes });
      const mockSchedules = [];
      
      for (let i = 0; i < 10; i++) {
        const bus = buses[Math.floor(Math.random() * buses.length)];
        const route = routes[Math.floor(Math.random() * routes.length)];
        const hour = Math.floor(Math.random() * 12) + 8; // 8 AM to 8 PM
        
        // Make sure we have valid IDs from MongoDB
        const busId = bus?._id || bus?.id;
        const routeId = route?._id || route?.id;
        
        // Only create schedule if we have valid data
        if (bus && route && busId && routeId) {
          mockSchedules.push({
            id: i + 1,
            busId: busId,
            bus: bus,
            routeId: routeId,
            route: route,
            day: weekDates[Math.floor(Math.random() * 7)].day,
            scheduledDeparture: `${hour}:${Math.floor(Math.random() * 6) * 10 || '00'}`,
          });
        }
      }
      
      console.log("Created mock schedules:", mockSchedules);
      setSchedules(mockSchedules);
    }
  }, [buses, routes]);

  // Schedule form
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      busId: "",
      routeId: "",
      scheduledDeparture: "",
    },
  });

  // Filter schedules for selected day
  const daySchedules = schedules.filter(schedule => 
    schedule.day === selectedDay && 
    (!selectedRoute || schedule.routeId === selectedRoute)
  );

  // Create a grid timeline for visualization
  const timelineHours = getTimelineHours();

  // Add schedule mutation (mock for demonstration)
  const addScheduleMutation = useMutation({
    mutationFn: async (values: ScheduleFormValues) => {
      // In a real application, this would call the API
      // Here we'll just update the local state
      return values;
    },
    onSuccess: (data) => {
      console.log("Schedule added successfully, finding related objects:", data);
      
      // Find the bus by either _id or id, handling string or number formats
      const busObj = buses?.find((b: any) => {
        const busId = b._id || b.id;
        return busId && busId.toString() === data.busId.toString();
      });
      
      // Find the route by either _id or id, handling string or number formats
      const routeObj = routes?.find((r: any) => {
        const routeId = r._id || r.id;
        return routeId && routeId.toString() === data.routeId.toString();
      });
      
      console.log("Found related objects:", { busObj, routeObj });
      
      const newSchedule = {
        id: schedules.length + 1,
        busId: data.busId,
        bus: busObj,
        routeId: data.routeId,
        route: routeObj,
        day: selectedDay,
        scheduledDeparture: data.scheduledDeparture,
      };
      
      setSchedules([...schedules, newSchedule]);
      setIsAddingSchedule(false);
      
      toast({
        title: "Schedule added",
        description: "The schedule has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add schedule",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddSchedule = (values: ScheduleFormValues) => {
    addScheduleMutation.mutate(values);
  };

  const handleDeleteSchedule = (id: number) => {
    // Filter out the deleted schedule
    setSchedules(schedules.filter(schedule => schedule.id !== id));
    
    toast({
      title: "Schedule deleted",
      description: "The schedule has been deleted successfully.",
    });
  };

  const getSchedulePositionStyle = (departureTime: string) => {
    const [hour, minute] = departureTime.split(':').map(Number);
    const startHour = 5; // Timeline starts at 5 AM
    const hourWidth = 100; // Each hour is 100px wide
    
    const position = (hour - startHour) * hourWidth + (minute / 60) * hourWidth;
    return {
      left: `${position}px`,
    };
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
            <a className="group flex items-center px-2 py-2 text-base font-medium rounded-md bg-sidebar-accent text-sidebar-accent-foreground mt-2">
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
            <h2 className="text-xl font-semibold text-gray-800">Schedule Management</h2>
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-4">
                {user?.fullName || user?.username}
              </span>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-gray-100 p-6">
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Day Selection Card */}
            <Card>
              <CardHeader>
                <CardTitle>Day Selection</CardTitle>
                <CardDescription>Choose a day to view and edit schedules</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex gap-1 flex-wrap">
                  {weekDates.map((day) => (
                    <Button 
                      key={day.day}
                      variant={selectedDay === day.day ? "default" : "outline"} 
                      size="sm"
                      className="flex-grow"
                      onClick={() => setSelectedDay(day.day)}
                    >
                      <div className="text-center">
                        <div className="text-xs">{day.day.substring(0, 3)}</div>
                        <div className="text-xs text-muted-foreground">{day.formattedDate}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Route Filter Card */}
            <Card>
              <CardHeader>
                <CardTitle>Route Filter</CardTitle>
                <CardDescription>Filter schedules by route</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <Select 
                  value={selectedRoute ? selectedRoute.toString() : "all"} 
                  onValueChange={(value) => setSelectedRoute(value === "all" ? null : parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a route" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Routes</SelectItem>
                    {isLoadingRoutes ? (
                      <SelectItem value="loading" disabled>
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </SelectItem>
                    ) : routes?.map((route: any) => {
                      // Use _id for MongoDB, or fall back to id if needed
                      const routeId = route._id || route.id;
                      return (
                        <SelectItem key={routeId} value={routeId && routeId.toString()}>
                          {route.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Add Schedule Card */}
            <Card>
              <CardHeader>
                <CardTitle>Add Schedule</CardTitle>
                <CardDescription>Schedule a new bus for the selected day</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <Dialog open={isAddingSchedule} onOpenChange={setIsAddingSchedule}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Schedule
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Schedule</DialogTitle>
                      <DialogDescription>
                        Schedule a bus for {selectedDay}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleAddSchedule)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="busId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bus</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a bus" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingBuses ? (
                                    <SelectItem value="loading" disabled>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    </SelectItem>
                                  ) : buses?.map((bus: any) => {
                                    // Use _id for MongoDB, or fall back to id if needed
                                    const busId = bus._id || bus.id;
                                    return (
                                      <SelectItem key={busId} value={busId && busId.toString()}>
                                        {bus.busNumber}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="routeId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Route</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a route" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingRoutes ? (
                                    <SelectItem value="loading" disabled>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    </SelectItem>
                                  ) : routes?.map((route: any) => {
                                    // Use _id for MongoDB, or fall back to id if needed
                                    const routeId = route._id || route.id;
                                    return (
                                      <SelectItem key={routeId} value={routeId && routeId.toString()}>
                                        {route.name}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="scheduledDeparture"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Departure Time</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormDescription>
                                Enter time in 24-hour format (HH:MM)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={addScheduleMutation.isPending}>
                            {addScheduleMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Add Schedule
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>

          {/* Schedule Timeline */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Schedule Timeline - {selectedDay}</CardTitle>
              <CardDescription>
                Visual representation of bus schedules for {selectedDay}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="overflow-x-auto">
                <div className="min-w-[1200px]">
                  {/* Timeline header */}
                  <div className="flex border-b border-gray-200 pb-2">
                    <div className="w-40 font-medium">Route</div>
                    <div className="flex-1 flex">
                      {timelineHours.map((hour) => (
                        <div key={hour} className="w-[100px] text-center text-sm text-gray-500">
                          {hour}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Loading state */}
                  {isLoadingRoutes || isLoadingBuses ? (
                    <div className="flex justify-center items-center h-40">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : null}
                  
                  {/* No routes */}
                  {!isLoadingRoutes && !isLoadingBuses && (!routes || routes.length === 0) ? (
                    <div className="text-center py-8 text-gray-500">
                      No routes available
                    </div>
                  ) : null}
                  
                  {/* No schedules */}
                  {!isLoadingRoutes && !isLoadingBuses && routes && routes.length > 0 && daySchedules.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No schedules for {selectedDay}
                    </div>
                  ) : null}
                  
                  {/* Schedules timeline */}
                  {!isLoadingRoutes && !isLoadingBuses && daySchedules.length > 0 ? (
                    <div>
                      {/* Group and display schedules */}
                      {Object.values(daySchedules.reduce((acc: any, schedule) => {
                        // Use either _id or id for the route ID
                        const routeId = schedule.routeId?.toString() || '';
                        
                        if (!acc[routeId]) {
                          acc[routeId] = {
                            route: schedule.route,
                            schedules: []
                          };
                        }
                        acc[routeId].schedules.push(schedule);
                        return acc;
                      }, {})).map((groupedSchedule: any) => {
                        // Get route ID safely
                        const routeId = (groupedSchedule.route?._id || groupedSchedule.route?.id || 'unknown').toString();
                        
                        return (
                          <div key={routeId} className="flex py-4 border-b border-gray-100">
                            <div className="w-40 font-medium truncate">{groupedSchedule.route?.name || 'Unknown Route'}</div>
                            <div className="flex-1 relative" style={{ height: '40px' }}>
                              {groupedSchedule.schedules.map((schedule: any) => {
                                // Get schedule ID safely
                                const scheduleId = schedule.id || 'unknown';
                                
                                return (
                                  <div
                                    key={scheduleId}
                                    className="absolute top-0 h-10 bg-primary text-white px-2 py-1 rounded flex items-center min-w-[80px]"
                                    style={getSchedulePositionStyle(schedule.scheduledDeparture)}
                                  >
                                    <div className="truncate text-xs">
                                      {schedule.bus?.busNumber || 'Unknown Bus'} - {schedule.scheduledDeparture}
                                    </div>
                                    <button 
                                      className="ml-1 text-white hover:text-red-200"
                                      onClick={() => handleDeleteSchedule(scheduleId)}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule List */}
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Departures</CardTitle>
              <CardDescription>
                List view of all scheduled departures for {selectedDay}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {isLoadingRoutes || isLoadingBuses ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : daySchedules.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No schedules for {selectedDay}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Display scheduled departures */}
                  {daySchedules
                    .sort((a, b) => a.scheduledDeparture.localeCompare(b.scheduledDeparture))
                    .map((schedule) => {
                      const scheduleId = schedule.id || 'unknown';
                      return (
                        <div key={scheduleId} className="border rounded-lg p-4 flex flex-col">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-sm font-medium">{schedule.scheduledDeparture}</div>
                              <div className="text-xs text-gray-500">{selectedDay}</div>
                            </div>
                            <button 
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteSchedule(scheduleId)}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="mt-2">
                            <div className="font-medium">{schedule.route?.name || 'Unknown Route'}</div>
                            <div className="text-sm text-gray-600">Bus: {schedule.bus?.busNumber || 'Unknown Bus'}</div>
                          </div>
                          {schedule.route?.routeStops && schedule.route.routeStops.length > 0 && (
                            <div className="mt-2 text-xs text-gray-500 flex items-center">
                              <div>{schedule.route.routeStops[0].stop?.name || 'Unknown Stop'}</div>
                              <ArrowRight className="h-3 w-3 mx-1" />
                              <div>{schedule.route.routeStops[schedule.route.routeStops.length - 1].stop?.name || 'Unknown Stop'}</div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
