import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";


export function ProtectedRoute({
  path,
  component,
  roles = [],
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Check if the user has the required role to access this route
  if (roles.length > 0 && !roles.includes(user.role)) {
    // Redirect to appropriate dashboard based on user role
    let redirectTo = "/";
    if (user.role === "driver") redirectTo = "/driver";
    if (user.role === "admin") redirectTo = "/admin";
    
    return (
      <Route path={path}>
        <Redirect to={redirectTo} />
      </Route>
    );
  }

  return <Route path={path} component={component} />;
}
