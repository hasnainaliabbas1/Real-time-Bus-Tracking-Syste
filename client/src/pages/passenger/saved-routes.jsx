import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Star, Route, Loader2, MapPin, Clock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function SavedRoutes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [deletingRouteId, setDeletingRouteId] = useState(null);

  // Fetch saved routes
  const { data: savedRoutes = [], isLoading: isLoadingSavedRoutes } = useQuery({
    queryKey: ["/api/saved-routes"],
  });

  // Fetch all routes for the "Add new" functionality
  const { data: allRoutes = [], isLoading: isLoadingRoutes } = useQuery({
    queryKey: ["/api/routes"],
  });

  // Remove saved route mutation
  const removeRouteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await apiRequest("DELETE", `/api/saved-routes/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-routes"] });
      toast({
        title: "Route removed",
        description: "The route has been removed from your saved routes.",
      });
      setDeletingRouteId(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to remove route",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Save new route mutation
  const saveRouteMutation = useMutation({
    mutationFn: async (routeId) => {
      // Find route to get its name
      const route = allRoutes?.find((r) => r.id === routeId || r._id === routeId);
      
      // Use the MongoDB _id when available, otherwise use the SQL id
      const actualRouteId = route?._id || route?.id || routeId;
      
      console.log("Saving route with ID:", actualRouteId, "Route object:", route);
      
      const res = await apiRequest("POST", "/api/saved-routes", { 
        routeId: actualRouteId, 
        name: route?.name || "Saved Route"
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-routes"] });
      toast({
        title: "Route saved",
        description: "The route has been added to your saved routes.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to save route",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter out already saved routes
  const availableRoutes = allRoutes?.filter((route) => 
    !savedRoutes?.some((savedRoute) => {
      const routeId = route.id || route._id;
      const savedRouteId = savedRoute.routeId || savedRoute.route?.id || savedRoute.route?._id;
      return routeId === savedRouteId;
    })
  );

  const handleRemoveRoute = (id) => {
    setDeletingRouteId(id);
  };

  const confirmRemoveRoute = () => {
    if (deletingRouteId) {
      removeRouteMutation.mutate(deletingRouteId);
    }
  };

  const handleSaveRoute = (routeId) => {
    saveRouteMutation.mutate(routeId);
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
              <h1 className="ml-2 text-xl font-semibold text-gray-900">Saved Routes</h1>
            </div>
            <div className="text-sm text-gray-500">
              Welcome, {user?.fullName || user?.username}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">Your Favorite Routes</h2>
        </div>

        {isLoadingSavedRoutes ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : savedRoutes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedRoutes.map((savedRoute) => (
              <Card key={savedRoute.id || savedRoute._id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between">
                    <CardTitle className="flex items-center">
                      <Route className="h-5 w-5 mr-2 text-primary" />
                      {savedRoute.route?.name || "Unknown Route"}
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleRemoveRoute(savedRoute.id || savedRoute._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription>
                    {savedRoute.route?.description || "No description available"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {savedRoute.route?.routeStops?.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-gray-500">Starting Point</p>
                          <p className="text-sm font-medium">
                            {savedRoute.route.routeStops[0]?.stop.name || "Unknown"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-red-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-gray-500">End Point</p>
                          <p className="text-sm font-medium">
                            {savedRoute.route.routeStops[savedRoute.route.routeStops.length - 1]?.stop.name || "Unknown"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-gray-500">Total Stops</p>
                          <p className="text-sm font-medium">
                            {savedRoute.route.routeStops.length} stops
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No stops information available</p>
                  )}
                </CardContent>
                <CardFooter>
                  <Link href="/">
                    <Button variant="outline" className="w-full">
                      View on Map
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}

            {/* Add new saved route card */}
            <Card className="border-dashed border-2 border-gray-300 bg-gray-50">
              <CardContent className="p-6 flex flex-col items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Add New Route</h3>
                    <p className="text-sm text-gray-500 mt-1">Save a new route to your favorites</p>
                  </div>
                  
                  {isLoadingRoutes ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
                  ) : availableRoutes?.length > 0 ? (
                    <div className="w-full max-h-[150px] overflow-y-auto space-y-2 p-2 border rounded-md bg-white">
                      {availableRoutes.map((route) => (
                        <div 
                          key={route.id || route._id} 
                          className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"
                        >
                          <span className="text-sm font-medium">{route.name}</span>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="h-7 w-7 rounded-full p-0"
                            onClick={() => handleSaveRoute(route.id || route._id)}
                            disabled={saveRouteMutation.isPending}
                          >
                            <Star className="h-4 w-4 text-primary" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No available routes to save</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Star className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No saved routes</h3>
            <p className="mt-1 text-sm text-gray-500">You haven't saved any routes yet.</p>
            <div className="mt-6">
              {isLoadingRoutes ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
              ) : allRoutes?.length > 0 ? (
                <div className="max-w-md mx-auto space-y-2">
                  <p className="text-sm font-medium text-gray-900 mb-2">Available Routes:</p>
                  {allRoutes.slice(0, 3).map((route) => (
                    <div 
                      key={route.id || route._id} 
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <span>{route.name}</span>
                      <Button 
                        size="sm" 
                        onClick={() => handleSaveRoute(route.id || route._id)}
                        disabled={saveRouteMutation.isPending}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  ))}
                  {allRoutes.length > 3 && (
                    <p className="text-sm text-gray-500 text-center mt-2">And {allRoutes.length - 3} more routes available</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No routes available to save</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={deletingRouteId !== null} 
        onOpenChange={() => setDeletingRouteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove saved route?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the route from your saved routes. You can always add it back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRemoveRoute}
              disabled={removeRouteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {removeRouteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
