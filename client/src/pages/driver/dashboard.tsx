import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useDriverRouteUpdates, useLocationUpdater, useWebSocket } from "@/lib/websocket";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  PlayCircle, MapPin, Users, AlertTriangle, QrCode, Loader2, 
  BellRing, CheckCircle2, Clock, LogOut 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RouteTimeline } from "@/components/ui/route-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function DriverDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const { isConnected, sendMessage } = useWebSocket();
  const driverRoute = useDriverRouteUpdates();
  const [shiftStatus, setShiftStatus] = useState('offline');
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [passengerCount, setPassengerCount] = useState(0);
  const [isReportingDelay, setIsReportingDelay] = useState(false);

  // Initialize location updater
  useLocationUpdater();

  // Fetch driver's bus
  const { data: driverBus, isLoading } = useQuery({
    queryKey: ["/api/buses"],
    select: (data) => {
      console.log("USER ID:", user?._id || user?.id);
      console.log("ALL BUSES:", data);
      return data?.find((bus) => {
        // MongoDB stores the reference as driverId, and we need to match with user's _id
        const userId = user?._id || user?.id;
        // Check several possible field patterns due to MongoDB structure
        return (
          (bus.driverId && bus.driverId.toString() === userId?.toString()) || 
          (bus.driver && (bus.driver._id?.toString() === userId?.toString() || bus.driver.id?.toString() === userId?.toString()))
        );
      });
    }
  });

  // Start/End shift mutation
  const updateBusStatusMutation = useMutation({
    mutationFn: async (status) => {
      if (!driverBus) return;
      
      // Get the bus ID, supporting both MongoDB _id and SQL id
      const busId = driverBus._id || driverBus.id;
      
      const res = await apiRequest("PUT", `/api/buses/${busId}`, {
        ...driverBus,
        status,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/buses"] });
      setShiftStatus(data.status);
      
      if (data.status === 'active') {
        toast({
          title: "Shift started",
          description: "You are now active and visible to passengers.",
        });
      } else {
        toast({
          title: "Shift ended",
          description: "You are now offline.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Status update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Report incident (delay) mutation
  const reportIncidentMutation = useMutation({
    mutationFn: async () => {
      if (!driverBus) return;
      
      // Use the appropriate ID field for MongoDB
      const busId = driverBus._id || driverBus.id;
      
      const res = await apiRequest("POST", "/api/incidents", {
        busId: busId,
        incidentType: "delay",
        description: "Bus delayed due to traffic",
        location: driverBus.currentLocation,
        status: "reported",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Delay reported",
        description: "The delay has been reported successfully.",
      });
      setIsReportingDelay(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to report delay",
        description: error.message,
        variant: "destructive",
      });
      setIsReportingDelay(false);
    },
  });

  // Update passenger count mutation
  const updatePassengerCountMutation = useMutation({
    mutationFn: async (count) => {
      // In a real implementation, this would update the passenger count in the database
      return { count };
    },
    onSuccess: (data) => {
      setPassengerCount(data.count);
      toast({
        title: "Passenger count updated",
        description: `Passenger count updated to ${data.count}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update passenger count",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mark arrived at stop
  const markArrivedAtStopMutation = useMutation({
    mutationFn: async () => {
      // In a real implementation, this would update the bus's current stop in the database
      return { currentStopIndex: currentStopIndex + 1 };
    },
    onSuccess: (data) => {
      setCurrentStopIndex(data.currentStopIndex);
      
      // Send a WebSocket message to notify passengers
      if (isConnected && driverBus) {
        // Use the appropriate ID field for MongoDB
        const busId = driverBus._id || driverBus.id;
        
        sendMessage({
          type: "stopUpdate",
          busId: busId,
          currentStop: data.currentStopIndex,
        });
      }
      
      toast({
        title: "Arrived at stop",
        description: "Current stop updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update stop",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize bus status from fetched data
  useEffect(() => {
    if (driverBus && !isLoading) {
      setShiftStatus(driverBus.status === 'active' ? 'active' : 'offline');
    }
  }, [driverBus, isLoading]);

  // Prepare stops array for RouteTimeline component
  const stops = driverRoute?.route?.routeStops?.map((routeStop, index) => ({
    id: routeStop.stop.id,
    name: routeStop.stop.name,
    scheduledTime: routeStop.scheduledArrival,
    status: index < currentStopIndex 
      ? 'completed' 
      : index === currentStopIndex 
        ? 'current' 
        : 'upcoming',
  })) || [];

  const handleStartShift = () => {
    updateBusStatusMutation.mutate('active');
  };

  const handleEndShift = () => {
    updateBusStatusMutation.mutate('inactive');
  };

  const handleArrivedAtStop = () => {
    markArrivedAtStopMutation.mutate();
  };

  const handleUpdatePassengerCount = (increment) => {
    const newCount = increment 
      ? passengerCount + 1 
      : Math.max(0, passengerCount - 1);
    
    updatePassengerCountMutation.mutate(newCount);
  };

  const handleReportDelay = () => {
    setIsReportingDelay(true);
    reportIncidentMutation.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-primary text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">BusTrack Driver</h1>
            <div className="flex items-center space-x-4">
              <span className={`px-2 py-1 rounded-full text-xs font-medium 
                ${shiftStatus === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}>
                {shiftStatus === 'active' ? 'Online' : 'Offline'}
              </span>
              <button 
                className="h-8 w-8 rounded-full bg-primary-foreground flex items-center justify-center text-primary"
                onClick={() => logoutMutation.mutate()}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-sm font-medium">Driver: {user?.fullName || user?.username}</p>
            <p className="text-sm opacity-75">Bus #: {driverBus?.busNumber || "Not assigned"}</p>
          </div>
        </div>
      </header>

      {/* Main Driver Content */}
      <main className="flex-grow px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !driverBus ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No bus assigned</h3>
            <p className="mt-1 text-sm text-gray-500">
              You don't have a bus assigned to you. Please contact your supervisor.
            </p>
          </div>
        ) : (
          <>
            {/* Driver Map */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden h-64 mb-4">
              <div id="driver-map" className="w-full h-full relative">
                {/* This would be replaced with an actual map component */}
                <div className="absolute inset-0 bg-blue-50 flex items-center justify-center">
                  {isConnected ? (
                    <p className="text-gray-500 flex items-center">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                      Connected: Your live location is being tracked
                    </p>
                  ) : (
                    <p className="text-gray-500 flex items-center">
                      <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
                      Not connected: Your location is not being tracked
                    </p>
                  )}
                </div>
                {driverRoute?.route?.routeStops?.length > 0 && (
                  <div className="absolute bottom-2 left-2 right-2 bg-white bg-opacity-90 p-2 rounded-md text-xs">
                    <p className="font-medium">{driverRoute.route.name}</p>
                    <p className="text-gray-500">
                      {stops[currentStopIndex]?.name} → {stops[currentStopIndex + 1]?.name || "Final Stop"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Route Information */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                Current Route: {driverRoute?.route?.name || driverBus.route?.name || "No route assigned"}
              </h2>

              {stops.length > 0 ? (
                <RouteTimeline stops={stops} />
              ) : (
                <p className="text-gray-500">No stops information available</p>
              )}
            </div>

            {/* Driver Action Buttons */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {shiftStatus === 'offline' ? (
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md px-4 py-4 text-center font-medium text-sm sm:text-base flex flex-col items-center"
                  onClick={handleStartShift}
                  disabled={updateBusStatusMutation.isPending}
                >
                  {updateBusStatusMutation.isPending ? (
                    <Loader2 className="h-6 w-6 animate-spin mb-1" />
                  ) : (
                    <PlayCircle className="h-6 w-6 mb-1" />
                  )}
                  <span>Start Shift</span>
                </Button>
              ) : (
                <Button 
                  variant="destructive"
                  className="rounded-lg shadow-md px-4 py-4 text-center font-medium text-sm sm:text-base flex flex-col items-center"
                  onClick={handleEndShift}
                  disabled={updateBusStatusMutation.isPending}
                >
                  {updateBusStatusMutation.isPending ? (
                    <Loader2 className="h-6 w-6 animate-spin mb-1" />
                  ) : (
                    <Clock className="h-6 w-6 mb-1" />
                  )}
                  <span>End Shift</span>
                </Button>
              )}

              <Button 
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-md px-4 py-4 text-center font-medium text-sm sm:text-base flex flex-col items-center"
                onClick={handleArrivedAtStop}
                disabled={markArrivedAtStopMutation.isPending || shiftStatus === 'offline' || currentStopIndex >= stops.length - 1}
              >
                {markArrivedAtStopMutation.isPending ? (
                  <Loader2 className="h-6 w-6 animate-spin mb-1" />
                ) : (
                  <MapPin className="h-6 w-6 mb-1" />
                )}
                <span>Arrived at Stop</span>
              </Button>

              <Button 
                className="bg-primary text-white rounded-lg shadow-md px-4 py-4 text-center font-medium text-sm sm:text-base flex flex-col items-center"
                disabled={shiftStatus === 'offline'}
              >
                <div className="relative">
                  <Users className="h-6 w-6 mb-1" />
                  <div className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-white text-primary font-bold text-xs flex items-center justify-center">
                    {passengerCount}
                  </div>
                </div>
                <div className="flex space-x-2 mt-1">
                  <button 
                    className="h-5 w-5 rounded bg-white text-primary flex items-center justify-center"
                    onClick={() => handleUpdatePassengerCount(false)}
                    disabled={passengerCount <= 0}
                  >
                    -
                  </button>
                  <button 
                    className="h-5 w-5 rounded bg-white text-primary flex items-center justify-center"
                    onClick={() => handleUpdatePassengerCount(true)}
                  >
                    +
                  </button>
                </div>
              </Button>

              <Button 
                variant="destructive"
                className="rounded-lg shadow-md px-4 py-4 text-center font-medium text-sm sm:text-base flex flex-col items-center"
                onClick={handleReportDelay}
                disabled={reportIncidentMutation.isPending || shiftStatus === 'offline' || isReportingDelay}
              >
                {reportIncidentMutation.isPending ? (
                  <Loader2 className="h-6 w-6 animate-spin mb-1" />
                ) : (
                  <AlertTriangle className="h-6 w-6 mb-1" />
                )}
                <span>Report Delay</span>
              </Button>
            </div>

            {/* QR Scanner Button */}
            <Link href="/driver/scanner">
              <Button 
                variant="default"
                className="flex items-center justify-center w-full bg-gray-800 text-white rounded-lg shadow-md px-4 py-3 text-center font-medium"
                disabled={shiftStatus === 'offline'}
              >
                <QrCode className="h-5 w-5 mr-2" />
                <span>Scan Passenger Ticket</span>
              </Button>
            </Link>

            {/* Notifications */}
            {(updateBusStatusMutation.isSuccess || markArrivedAtStopMutation.isSuccess || reportIncidentMutation.isSuccess) && (
              <Card className="mt-4 border-green-300 bg-green-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center text-green-800">
                    <BellRing className="h-4 w-4 mr-2" />
                    Notification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-green-800">
                    {updateBusStatusMutation.isSuccess && "Shift status updated successfully."}
                    {markArrivedAtStopMutation.isSuccess && "Current stop updated successfully."}
                    {reportIncidentMutation.isSuccess && "Delay reported successfully."}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
