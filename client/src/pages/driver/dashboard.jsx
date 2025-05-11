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
        const userId = user?._id || user?.id;
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
      
      const busId = driverBus._id || driverBus.id;
      
      const res = await apiRequest("POST", "/api/incidents", {
        busId,
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
      
      if (isConnected && driverBus) {
        const busId = driverBus._id || driverBus.id;
        
        sendMessage({
          type: "stopUpdate",
          busId,
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
              <Button 
                variant="ghost"
                size="icon"
                onClick={() => logoutMutation.mutate()}
              >
                <LogOut className="h-4 w-4" />
              </Button>
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
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : !driverBus ? (
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-gray-700">No Bus Assigned</h2>
            <p className="text-gray-500 mt-2">Please contact your administrator to be assigned a bus.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Shift Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shiftStatus === 'offline' ? (
                    <Button 
                      className="w-full"
                      onClick={handleStartShift}
                      disabled={updateBusStatusMutation.isPending}
                    >
                      {updateBusStatusMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <PlayCircle className="h-4 w-4 mr-2" />
                      )}
                      Start Shift
                    </Button>
                  ) : (
                    <Button 
                      className="w-full"
                      variant="destructive"
                      onClick={handleEndShift}
                      disabled={updateBusStatusMutation.isPending}
                    >
                      {updateBusStatusMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Clock className="h-4 w-4 mr-2" />
                      )}
                      End Shift
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Route Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Route Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <RouteTimeline stops={stops} />
                {stops.length > 0 && currentStopIndex < stops.length && (
                  <Button 
                    className="w-full mt-4"
                    onClick={handleArrivedAtStop}
                    disabled={markArrivedAtStopMutation.isPending}
                  >
                    {markArrivedAtStopMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <MapPin className="h-4 w-4 mr-2" />
                    )}
                    Mark Arrived at Stop
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Passenger Count */}
            <Card>
              <CardHeader>
                <CardTitle>Passenger Count</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => handleUpdatePassengerCount(false)}
                    disabled={passengerCount === 0 || updatePassengerCountMutation.isPending}
                  >
                    -
                  </Button>
                  <span className="text-2xl font-bold">{passengerCount}</span>
                  <Button
                    variant="outline"
                    onClick={() => handleUpdatePassengerCount(true)}
                    disabled={updatePassengerCountMutation.isPending}
                  >
                    +
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button 
                    className="w-full"
                    variant="outline"
                    onClick={handleReportDelay}
                    disabled={isReportingDelay || reportIncidentMutation.isPending}
                  >
                    {reportIncidentMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 mr-2" />
                    )}
                    Report Delay
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
