import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useBusLocationUpdates } from "@/lib/websocket";
import { BusCard } from "@/components/ui/bus-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Map, Star, Ticket, CreditCard, Bell, Settings, Menu, LogOut } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function PassengerDashboard() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [searchValue, setSearchValue] = useState("");
  const [selectedBusId, setSelectedBusId] = useState<number | null>(null);
  const busLocations = useBusLocationUpdates();
  
  const { data, isLoading } = useQuery({
    queryKey: ["/api/routes"],
  });

  // This will be replaced with real Google Maps integration
  const mapRef = document.createElement("div");
  // Mock map initialization for demo purposes
  useEffect(() => {
    // In a real implementation, this would initialize the Google Maps with the buses
    console.log("Map would be initialized here with bus locations:", busLocations);
  }, [busLocations]);

  // Filter buses based on search
  const filteredBuses = busLocations?.filter(bus => 
    bus.route?.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    bus.busNumber.toLowerCase().includes(searchValue.toLowerCase())
  ) || [];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-primary">BusTrack</h1>
              </div>
            </div>
            <div className="flex items-center">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-4 py-4">
                    <Link href="/" className="flex items-center p-2 rounded-md bg-gray-100 text-primary">
                      <Map className="mr-3 h-5 w-5" />
                      <span>Live Map</span>
                    </Link>
                    <Link href="/passenger/saved-routes" className="flex items-center p-2 rounded-md text-gray-600 hover:bg-gray-50 hover:text-primary">
                      <Star className="mr-3 h-5 w-5" />
                      <span>Saved Routes</span>
                    </Link>
                    <Link href="/passenger/tickets" className="flex items-center p-2 rounded-md text-gray-600 hover:bg-gray-50 hover:text-primary">
                      <Ticket className="mr-3 h-5 w-5" />
                      <span>Book Tickets</span>
                    </Link>
                    <Link href="/passenger/subscriptions" className="flex items-center p-2 rounded-md text-gray-600 hover:bg-gray-50 hover:text-primary">
                      <CreditCard className="mr-3 h-5 w-5" />
                      <span>Subscriptions</span>
                    </Link>
                    <Link href="/passenger/how-it-works" className="flex items-center p-2 rounded-md text-gray-600 hover:bg-gray-50 hover:text-primary">
                      <Bell className="mr-3 h-5 w-5" />
                      <span>How It Works</span>
                    </Link>
                    <Link href="/passenger/settings" className="flex items-center p-2 rounded-md text-gray-600 hover:bg-gray-50 hover:text-primary">
                      <Settings className="mr-3 h-5 w-5" />
                      <span>Settings</span>
                    </Link>
                  </div>
                </SheetContent>
              </Sheet>
              <div className="ml-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                >
                  <span className="sr-only">Open user menu</span>
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white">
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-grow flex">
        {/* Sidebar - hidden on mobile */}
        <div className="hidden md md:flex-shrink-0">
          <div className="flex flex-col w-64">
            <div className="flex flex-col h-0 flex-1">
              <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                <nav className="mt-5 flex-1 px-2 space-y-1">
                  <Link href="/" className="bg-gray-100 text-primary group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                    <Map className="mr-3 h-6 w-6" />
                    Live Map
                  </Link>
                  <Link href="/passenger/saved-routes" className="text-gray-600 hover:bg-gray-50 hover:text-primary group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                    <Star className="mr-3 h-6 w-6" />
                    Saved Routes
                  </Link>
                  <Link href="/passenger/tickets" className="text-gray-600 hover:bg-gray-50 hover:text-primary group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                    <Ticket className="mr-3 h-6 w-6" />
                    Book Tickets
                  </Link>
                  <Link href="/passenger/subscriptions" className="text-gray-600 hover:bg-gray-50 hover:text-primary group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                    <CreditCard className="mr-3 h-6 w-6" />
                    Subscriptions
                  </Link>
                  <Link href="/passenger/how-it-works" className="text-gray-600 hover:bg-gray-50 hover:text-primary group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                    <Bell className="mr-3 h-6 w-6" />
                    How It Works
                  </Link>
                  <Link href="/passenger/settings" className="text-gray-600 hover:bg-gray-50 hover:text-primary group flex items-center px-2 py-2 text-sm font-medium rounded-md">
                    <Settings className="mr-3 h-6 w-6" />
                    Settings
                  </Link>
                  <Button 
                    variant="destructive" 
                    className="w-full mt-4"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 relative z-0 overflow-hidden focus:outline-none">
          {/* Map Search Controls */}
          <div className="absolute top-4 left-4 right-4 z-10">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center">
                <div className="flex-grow mr-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search for a route or location"
                      className="w-full pl-10"
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                    />
                  </div>
                </div>
                <Button>
                  <Search className="mr-2 h-4 w-4" />
                  Find
                </Button>
              </div>
              <div className="flex mt-3 space-x-2 overflow-x-auto pb-1">
                <Button variant="outline" size="sm" className="rounded-full text-xs">
                  Popular Routes
                </Button>
                <Button variant="outline" size="sm" className="rounded-full text-xs">
                  Nearby Stops
                </Button>
                <Button variant="outline" size="sm" className="rounded-full text-xs">
                  Direct Routes
                </Button>
              </div>
            </div>
          </div>

          {/* Map View */}
          <div className="absolute inset-0 bg-gray-200">
            {busLocations ? (
              <div id="map-container" className="w-full h-full">
                {/* Google Maps would be initialized here */}
                {/* For demo purposes, show a placeholder */}
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-gray-500">Map with {filteredBuses.length} buses</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* Floating Bus Info Cards */}
          <div className="absolute bottom-16 md:bottom-4 left-4 right-4 flex space-x-4 overflow-x-auto pb-3 px-0 md:px-3">
            {isLoadingRoutes ? (
              <div className="w-full flex justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredBuses.length > 0 ? (
              filteredBuses.map((bus) => (
                <BusCard
                  key={bus.id}
                  bus={bus}
                  onTrackClick={(busId) => setSelectedBusId(busId)}
                />
              ))
            ) : (
              <div className="flex-shrink-0 bg-white rounded-lg shadow-lg p-4 w-full">
                <p className="text-center text-gray-500">
                  {searchValue 
                    ? "No buses match your search" 
                    : "No active buses available"}
                </p>
              </div>
            )}
          </div>

          {/* Mobile Navigation Bar - Visible on small screens */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10 md:hidden">
            <div className="flex justify-around">
              <Link href="/" className="flex flex-col items-center p-2 text-primary">
                <Map className="text-xl" />
                <span className="text-xs">Map</span>
              </Link>
              <Link href="/passenger/saved-routes" className="flex flex-col items-center p-2 text-gray-500">
                <Star className="text-xl" />
                <span className="text-xs">Saved</span>
              </Link>
              <Link href="/passenger/tickets" className="flex flex-col items-center p-2 text-gray-500">
                <Ticket className="text-xl" />
                <span className="text-xs">Tickets</span>
              </Link>
              <Link href="/passenger/subscriptions" className="flex flex-col items-center p-2 text-gray-500">
                <CreditCard className="text-xl" />
                <span className="text-xs">Plans</span>
              </Link>
              <Link href="/passenger/settings" className="flex flex-col items-center p-2 text-gray-500">
                <Settings className="text-xl" />
                <span className="text-xs">Settings</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
