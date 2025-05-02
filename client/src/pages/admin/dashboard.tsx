import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useIncidentUpdates } from "@/lib/websocket";
import {
  Gauge,
  Users,
  Bus,
  Route,
  Calendar,
  AlertTriangle,
  BarChart,
  Settings,
  Clock,
  Ticket,
  User,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminDashboard() {
  const { user, logoutMutation } = useAuth();
  const newIncident = useIncidentUpdates();

  // Fetch analytics data
  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["/api/analytics"],
  });

  const handleLogout = () => {
    logoutMutation.mutate();
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
            <a className="group flex items-center px-2 py-2 text-base font-medium rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
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
            onClick={handleLogout}
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
            <h2 className="text-xl font-semibold text-gray-800">Dashboard Overview</h2>
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-4">
                {user?.fullName || user?.username}
              </span>
              <button className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                <span className="sr-only">View notifications</span>
                <AlertTriangle className="h-5 w-5" />
              </button>
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

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Active Buses */}
            <Card className="overflow-hidden shadow">
              <CardContent className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-primary rounded-md p-3">
                    <Bus className="text-white text-xl" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Buses</dt>
                      <dd>
                        {isLoadingAnalytics ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <div className="text-lg font-medium text-gray-900">{analytics?.counts.activeBuses || 0}</div>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="bg-gray-50 -mx-5 mt-5 px-5 py-3">
                  <div className="text-sm">
                    <Link href="/admin/buses">
                      <a className="font-medium text-primary hover:text-primary-dark">View all</a>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delayed Buses */}
            <Card className="overflow-hidden shadow">
              <CardContent className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-accent rounded-md p-3">
                    <Clock className="text-white text-xl" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Delayed Buses</dt>
                      <dd>
                        {isLoadingAnalytics ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <div className="text-lg font-medium text-gray-900">{analytics?.counts.delayedBuses || 0}</div>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="bg-gray-50 -mx-5 mt-5 px-5 py-3">
                  <div className="text-sm">
                    <Link href="/admin/incidents">
                      <a className="font-medium text-primary hover:text-primary-dark">View all</a>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tickets Sold Today */}
            <Card className="overflow-hidden shadow">
              <CardContent className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-secondary rounded-md p-3">
                    <Ticket className="text-white text-xl" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Tickets</dt>
                      <dd>
                        {isLoadingAnalytics ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <div className="text-lg font-medium text-gray-900">{analytics?.counts.activeTickets || 0}</div>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="bg-gray-50 -mx-5 mt-5 px-5 py-3">
                  <div className="text-sm">
                    <Link href="/admin/analytics">
                      <a className="font-medium text-primary hover:text-primary-dark">View details</a>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Drivers */}
            <Card className="overflow-hidden shadow">
              <CardContent className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                    <User className="text-white text-xl" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Drivers</dt>
                      <dd>
                        {isLoadingAnalytics ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <div className="text-lg font-medium text-gray-900">{analytics?.counts.activeDrivers || 0}</div>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="bg-gray-50 -mx-5 mt-5 px-5 py-3">
                  <div className="text-sm">
                    <Link href="/admin/buses">
                      <a className="font-medium text-primary hover:text-primary-dark">View all</a>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fleet Map */}
          <Card className="overflow-hidden shadow mb-6">
            <CardContent className="p-5">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Real-time Fleet Map</h3>
              <div className="h-96 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                <div className="text-center">
                  <Bus className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">
                    Google Maps would be integrated here to show real-time fleet locations
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Incidents & Quick Status Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Incidents */}
            <Card className="overflow-hidden shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Recent Incidents</h3>
                  <Link href="/admin/incidents">
                    <Button size="sm">View All</Button>
                  </Link>
                </div>

                {isLoadingAnalytics ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="flow-root">
                    <ul role="list" className="-mb-8">
                      <li>
                        <div className="relative pb-8">
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center ring-8 ring-white">
                                <AlertTriangle className="text-white text-sm" />
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-900">Bus #624 delayed due to traffic congestion</p>
                                <p className="text-xs text-gray-500">Route 87 - Hillside to Shopping District</p>
                              </div>
                              <div className="text-right text-xs whitespace-nowrap text-gray-500">
                                <time>20 minutes ago</time>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>

                      <li>
                        <div className="relative pb-8">
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-yellow-500 flex items-center justify-center ring-8 ring-white">
                                <Settings className="text-white text-sm" />
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-900">Bus #835 reports minor technical issue</p>
                                <p className="text-xs text-gray-500">Route 15 - Maintenance team notified</p>
                              </div>
                              <div className="text-right text-xs whitespace-nowrap text-gray-500">
                                <time>1 hour ago</time>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>

                      <li>
                        <div className="relative">
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white">
                                <User className="text-white text-sm" />
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-900">Route 42 resumed normal operation</p>
                                <p className="text-xs text-gray-500">Previous delay resolved</p>
                              </div>
                              <div className="text-right text-xs whitespace-nowrap text-gray-500">
                                <time>3 hours ago</time>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Status */}
            <Card className="overflow-hidden shadow">
              <CardContent className="p-5">
                <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>

                <div className="space-y-4">
                  {/* Route Status */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Route className="text-primary text-lg mr-3" />
                      <div>
                        <h4 className="text-sm font-medium">All Routes</h4>
                        <p className="text-xs text-gray-500">15 active routes</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Operational
                    </span>
                  </div>

                  {/* Driver Status */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Users className="text-primary text-lg mr-3" />
                      <div>
                        <h4 className="text-sm font-medium">Driver Availability</h4>
                        <p className="text-xs text-gray-500">38/45 drivers active</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Good
                    </span>
                  </div>

                  {/* System Status */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Gauge className="text-primary text-lg mr-3" />
                      <div>
                        <h4 className="text-sm font-medium">System Performance</h4>
                        <p className="text-xs text-gray-500">All systems operational</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Normal
                    </span>
                  </div>

                  {/* Maintenance */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Settings className="text-primary text-lg mr-3" />
                      <div>
                        <h4 className="text-sm font-medium">Maintenance Schedule</h4>
                        <p className="text-xs text-gray-500">3 buses scheduled for maintenance</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Scheduled
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
