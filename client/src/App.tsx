import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";

// Auth Pages
import AuthPage from "@/pages/auth-page";

// Passenger Pages
import PassengerDashboard from "@/pages/passenger/dashboard";
import TicketBooking from "@/pages/passenger/ticket-booking";
import SubscriptionPlans from "@/pages/passenger/subscription-plans";
import SavedRoutes from "@/pages/passenger/saved-routes";
import HowItWorks from "@/pages/passenger/how-it-works";

// Driver Pages
import DriverDashboard from "@/pages/driver/dashboard";
import QrScanner from "@/pages/driver/qr-scanner";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import BusManagement from "@/pages/admin/bus-management";
import ScheduleManagement from "@/pages/admin/schedule-management";
import IncidentReports from "@/pages/admin/incident-reports";
import Analytics from "@/pages/admin/analytics";

function Router() {
  return (
    <Switch>
      {/* Auth Routes */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Passenger Routes */}
      <ProtectedRoute path="/" roles={["passenger"]} component={PassengerDashboard} />
      <ProtectedRoute path="/passenger/tickets" roles={["passenger"]} component={TicketBooking} />
      <ProtectedRoute path="/passenger/subscriptions" roles={["passenger"]} component={SubscriptionPlans} />
      <ProtectedRoute path="/passenger/saved-routes" roles={["passenger"]} component={SavedRoutes} />
      <ProtectedRoute path="/passenger/how-it-works" roles={["passenger"]} component={HowItWorks} />
      
      {/* Driver Routes */}
      <ProtectedRoute path="/driver" roles={["driver"]} component={DriverDashboard} />
      <ProtectedRoute path="/driver/scanner" roles={["driver"]} component={QrScanner} />
      
      {/* Admin Routes */}
      <ProtectedRoute path="/admin" roles={["admin"]} component={AdminDashboard} />
      <ProtectedRoute path="/admin/buses" roles={["admin"]} component={BusManagement} />
      <ProtectedRoute path="/admin/schedule" roles={["admin"]} component={ScheduleManagement} />
      <ProtectedRoute path="/admin/incidents" roles={["admin"]} component={IncidentReports} />
      <ProtectedRoute path="/admin/analytics" roles={["admin"]} component={Analytics} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
