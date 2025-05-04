import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { QrCode, Wallet, AlertCircle, Loader2, ArrowLeft, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

// Form schema
const ticketFormSchema = z.object({
  routeId: z.string().min(1, "Route is required"),
  fromStopId: z.string().min(1, "Departure stop is required"),
  toStopId: z.string().min(1, "Arrival stop is required"),
  departureTime: z.string().min(1, "Departure time is required"),
  price: z.number().min(1, "Price is required"),
  // Add travel date field
  travelDate: z.string().min(1, "Travel date is required"),
});

// JavaScript version - no TypeScript interfaces or type definitions needed

// Define the form values structure
const ticketFormDefaults = {
  routeId: "",
  fromStopId: "",
  toStopId: "",
  departureTime: new Date().toISOString().slice(0, 16),
  travelDate: new Date().toISOString().slice(0, 10), // YYYY-MM-DD format
  price: 5,
};

export default function TicketBooking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedRoute, setSelectedRoute] = useState("");
  const [showQRCode, setShowQRCode] = useState(false);
  const [newTicket, setNewTicket] = useState(null);
  const [currentTab, setCurrentTab] = useState("book");

  // Fetch routes
  const { data: routes, isLoading: isLoadingRoutes } = useQuery({
    queryKey: ["/api/routes"],
  });

  // Fetch tickets
  const { data: tickets, isLoading: isLoadingTickets } = useQuery({
    queryKey: ["/api/tickets"],
  });

  // Fetch stops for selected route
  const { 
    data: routeDetails, 
    isLoading: isLoadingRouteDetails 
  } = useQuery({
    queryKey: ["/api/routes", selectedRoute],
    enabled: !!selectedRoute
  });
  
  // Log route data for debugging
  useEffect(() => {
    if (routeDetails) {
      console.log("Route details loaded:", routeDetails);
      console.log("Route stops:", routeDetails.routeStops);
    }
  }, [routeDetails]);

  // Book ticket mutation
  const bookTicketMutation = useMutation({
    mutationFn: async (ticketData) => {
      const res = await apiRequest("POST", "/api/tickets", ticketData);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      setNewTicket(data);
      setShowQRCode(true);
      toast({
        title: "Ticket booked successfully",
        description: "Your ticket has been booked.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to book ticket",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize form with non-empty strings for select fields
  const form = useForm({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: ticketFormDefaults,
  });

  const onRouteChange = (routeId) => {
    // Set the selected route directly as a string (MongoDB ID)
    setSelectedRoute(routeId);
    form.setValue("routeId", routeId);
    form.setValue("fromStopId", "");
    form.setValue("toStopId", "");
    form.setValue("departureTime", "");
    // Set a default price based on the route
    form.setValue("price", Math.floor(Math.random() * 10) + 5);
  };

  const onSubmit = (data) => {
    // Convert departureTime and travelDate to Date objects, but keep IDs as strings for MongoDB
    const ticketData = {
      ...data,
      routeId: data.routeId, // Keep as string for MongoDB ID
      fromStopId: data.fromStopId, // Keep as string for MongoDB ID
      toStopId: data.toStopId, // Keep as string for MongoDB ID
      departureTime: new Date(data.departureTime),
      travelDate: new Date(data.travelDate), // Add travel date
      status: "active",
    };

    bookTicketMutation.mutate(ticketData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="ml-2 text-xl font-semibold text-gray-900">Ticket Booking</h1>
            </div>
            <div className="text-sm text-gray-500">
              Welcome, {user?.fullName || user?.username}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue="book" value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="book">Book Ticket</TabsTrigger>
            <TabsTrigger value="my-tickets">My Tickets</TabsTrigger>
          </TabsList>

          {/* Book Ticket Tab */}
          <TabsContent value="book">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Book a New Ticket</CardTitle>
                  <CardDescription>
                    Select your route, stops, and time to book a ticket.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="routeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Route</FormLabel>
                            <Select 
                              onValueChange={(value) => onRouteChange(value)} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a route" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingRoutes ? (
                                  <div className="flex items-center justify-center py-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  </div>
                                ) : routes?.length > 0 ? (
                                  routes.map((route) => (
                                    <SelectItem 
                                      key={route._id || route.id} 
                                      value={(route._id || route.id).toString()}
                                    >
                                      {route.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="no_routes" disabled>
                                    No routes available
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="fromStopId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>From</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                                disabled={!selectedRoute}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select departure stop" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingRouteDetails ? (
                                    <div className="flex items-center justify-center py-2">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    </div>
                                  ) : routeDetails?.routeStops?.length > 0 ? (
                                    routeDetails.routeStops.map((routeStop) => (
                                      <SelectItem 
                                        key={routeStop.stop._id || routeStop.stop.id} 
                                        value={(routeStop.stop._id || routeStop.stop.id).toString()}
                                      >
                                        {routeStop.stop.name}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="no_stops" disabled>
                                      No stops available
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="toStopId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>To</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                                disabled={!selectedRoute || !form.watch("fromStopId")}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select arrival stop" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingRouteDetails ? (
                                    <div className="flex items-center justify-center py-2">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    </div>
                                  ) : routeDetails?.routeStops?.length > 0 ? (
                                    routeDetails.routeStops
                                      .filter((routeStop) => 
                                        (routeStop.stop._id || routeStop.stop.id).toString() !== form.watch("fromStopId")
                                      )
                                      .map((routeStop) => (
                                        <SelectItem 
                                          key={routeStop.stop._id || routeStop.stop.id} 
                                          value={(routeStop.stop._id || routeStop.stop.id).toString()}
                                        >
                                          {routeStop.stop.name}
                                        </SelectItem>
                                      ))
                                  ) : (
                                    <SelectItem value="no_stops" disabled>
                                      No stops available
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="travelDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Travel Date</FormLabel>
                              <FormControl>
                                <input
                                  type="date"
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  {...field}
                                  disabled={!selectedRoute || !form.watch("fromStopId") || !form.watch("toStopId")}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      
                        <FormField
                          control={form.control}
                          name="departureTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Departure Time</FormLabel>
                              <FormControl>
                                <input
                                  type="datetime-local"
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  {...field}
                                  disabled={!selectedRoute || !form.watch("fromStopId") || !form.watch("toStopId")}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price</FormLabel>
                            <FormControl>
                              <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                                <span>$</span>
                                <input
                                  type="number"
                                  className="w-full bg-transparent border-0 outline-none focus:outline-none pl-1"
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                  value={field.value}
                                  disabled
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={bookTicketMutation.isPending || !selectedRoute}
                      >
                        {bookTicketMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing
                          </>
                        ) : (
                          <>
                            <Wallet className="mr-2 h-4 w-4" />
                            Book Ticket
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>
                    Secure payment options for your tickets
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center p-4 border rounded-md">
                    <div className="h-10 w-10 flex items-center justify-center bg-blue-500 text-white rounded-full mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                        <line x1="1" y1="10" x2="23" y2="10"></line>
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Credit/Debit Card</p>
                      <p className="text-sm text-gray-500">Visa, Mastercard, Amex</p>
                    </div>
                  </div>

                  <div className="flex items-center p-4 border rounded-md">
                    <div className="h-10 w-10 flex items-center justify-center bg-blue-600 text-white rounded-full mr-3">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" fill="#fff"/>
                        <path d="M15.75 13.5h-3v3a.75.75 0 01-1.5 0v-3h-3a.75.75 0 010-1.5h3V9a.75.75 0 011.5 0v3h3a.75.75 0 010 1.5z" fill="#0070BA"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">PayPal</p>
                      <p className="text-sm text-gray-500">Fast and secure</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-md mt-4">
                    <h4 className="font-medium mb-2">Notes:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li className="flex items-start">
                        <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-amber-500" />
                        Tickets are non-refundable 30 minutes before departure.
                      </li>
                      <li className="flex items-start">
                        <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-amber-500" />
                        You can cancel your booking up to 24 hours in advance.
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* My Tickets Tab */}
          <TabsContent value="my-tickets">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold tracking-tight">My Tickets</h2>
              
              {isLoadingTickets ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : tickets?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tickets.map((ticket) => (
                    <Card key={ticket._id || ticket.id} className={ticket.status === 'active' ? 'border-green-400' : 'border-gray-200'}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{(ticket.route?.name || ticket.routeId?.name) || 'Unknown Route'}</CardTitle>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium 
                            ${ticket.status === 'active' ? 'bg-green-100 text-green-800' : 
                              ticket.status === 'used' ? 'bg-gray-100 text-gray-600' : 
                              'bg-red-100 text-red-800'}`}>
                            {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                          </div>
                        </div>
                        <CardDescription>
                          Ticket #{ticket._id || ticket.id}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <Calendar className="h-4 w-4 text-primary" />
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-gray-500">Date</p>
                              <p className="text-sm font-medium">
                                {ticket.travelDate ? format(new Date(ticket.travelDate), 'MMM d, yyyy') : (ticket.departureTime ? format(new Date(ticket.departureTime), 'MMM d, yyyy') : 'Unknown')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <Clock className="h-4 w-4 text-primary" />
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-gray-500">Time</p>
                              <p className="text-sm font-medium">
                                {ticket.departureTime ? format(new Date(ticket.departureTime), 'h:mm a') : 'Unknown'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start pt-2">
                            <div className="flex flex-col items-center">
                              <div className="h-3 w-3 rounded-full bg-green-500"></div>
                              <div className="h-10 w-0.5 bg-gray-300"></div>
                              <div className="h-3 w-3 rounded-full bg-red-500"></div>
                            </div>
                            <div className="ml-3 space-y-2">
                              <div>
                                <p className="text-sm font-medium">{(ticket.fromStop?.name || ticket.fromStopId?.name) || 'Unknown'}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium">{(ticket.toStop?.name || ticket.toStopId?.name) || 'Unknown'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          onClick={() => {
                            setNewTicket(ticket);
                            setShowQRCode(true);
                          }}
                          disabled={ticket.status !== 'active'}
                        >
                          <QrCode className="mr-2 h-4 w-4" />
                          View Ticket QR
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <QrCode className="mx-auto h-12 w-12 text-gray-300" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No tickets found</h3>
                  <p className="mt-1 text-sm text-gray-500">You haven't booked any tickets yet.</p>
                  <div className="mt-6">
                    <Button onClick={() => setCurrentTab("book")}>
                      Book Your First Ticket
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* QR Code Dialog */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your Ticket</DialogTitle>
            <DialogDescription>
              Show this QR code to the driver when boarding the bus.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center pt-4">
            <div className="bg-white p-4 rounded-md border mb-4">
              {/* SVG QR Code */}
              {newTicket && (
                <svg
                  className="h-48 w-48"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="100" height="100" fill="white" />
                  <rect x="10" y="10" width="80" height="80" fill="white" stroke="black" strokeWidth="1" />
                  <text
                    x="50"
                    y="50"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="8"
                    fill="black"
                  >
                    {newTicket.qrCode}
                  </text>
                  <g transform="translate(20, 20)">
                    {/* QR code pattern - simplified for demo */}
                    <rect x="0" y="0" width="10" height="10" fill="black" />
                    <rect x="20" y="0" width="10" height="10" fill="black" />
                    <rect x="40" y="0" width="10" height="10" fill="black" />
                    <rect x="0" y="20" width="10" height="10" fill="black" />
                    <rect x="40" y="20" width="10" height="10" fill="black" />
                    <rect x="0" y="40" width="10" height="10" fill="black" />
                    <rect x="20" y="40" width="10" height="10" fill="black" />
                    <rect x="40" y="40" width="10" height="10" fill="black" />
                  </g>
                </svg>
              )}
            </div>
            <div className="text-center">
              <h3 className="font-medium text-gray-900">{(newTicket?.route?.name || newTicket?.routeId?.name) || "Unknown Route"}</h3>
              <p className="text-sm text-gray-500">
                {(newTicket?.fromStop?.name || newTicket?.fromStopId?.name) || "Unknown"} to {(newTicket?.toStop?.name || newTicket?.toStopId?.name) || "Unknown"}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {newTicket?.travelDate ? format(new Date(newTicket.travelDate), 'MMM d, yyyy') : (newTicket?.departureTime ? format(new Date(newTicket.departureTime), 'MMM d, yyyy') : "Unknown date")} - {newTicket?.departureTime ? format(new Date(newTicket.departureTime), 'h:mm a') : "Unknown time"}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
