import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function BusCard({ bus, onTrackClick }) {
  const [status, setStatus] = useState({ 
    type: "on-time", 
    label: "On Time" 
  });
  const [eta, setEta] = useState({ minutes: 0 });
  
  // Set random ETA and status for demo purposes
  useEffect(() => {
    // This would be replaced with real-time data in production
    const isDelayed = Math.random() > 0.7;
    const minutes = Math.floor(Math.random() * 15) + 2;
    const delayedBy = isDelayed ? Math.floor(Math.random() * 10) + 1 : 0;
    
    setEta({ 
      minutes,
      delayed: delayedBy
    });
    
    setStatus(isDelayed 
      ? { type: "delayed", label: "Delayed" }
      : { type: "on-time", label: "On Time" }
    );
    // Use either id or _id for the dependency
  }, [bus.id || bus._id]);
  
  // Find the current and next stop
  const currentStopIndex = bus.route?.routeStops?.findIndex(
    (stop) => stop.scheduledArrival && new Date(stop.scheduledArrival) > new Date()
  ) ?? -1;
  
  const currentStop = currentStopIndex > 0 
    ? bus.route?.routeStops?.[currentStopIndex - 1]?.stop.name
    : bus.route?.routeStops?.[0]?.stop.name;
    
  const nextStop = currentStopIndex >= 0
    ? bus.route?.routeStops?.[currentStopIndex]?.stop.name
    : "";

  return (
    <Card className="flex-shrink-0 shadow-lg w-80">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">{bus.route?.name || 'Unknown Route'}</h3>
          <span className={`px-2 py-1 ${
            status.type === "on-time" 
              ? "bg-green-100 text-secondary" 
              : "bg-yellow-100 text-accent"
          } text-xs font-medium rounded-full`}>
            {status.label}
          </span>
        </div>
        
        <div className="flex items-center mb-3">
          <div className="flex-shrink-0 h-10 w-10 bg-primary rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <path d="M8 6v6"></path>
              <path d="M15 6v6"></path>
              <path d="M2 12h19.6"></path>
              <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5c-.3-1.2-1.4-1.8-2.6-1.8H5c-1.2 0-2.3.6-2.6 1.8l-1.4 5c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1 .8 2.8.8 2.8h3"></path>
              <circle cx="7" cy="18" r="2"></circle>
              <circle cx="17" cy="18" r="2"></circle>
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-gray-500">
              {currentStop && nextStop 
                ? `${currentStop} to ${nextStop}` 
                : bus.route?.description || 'Unknown Route'
              }
            </p>
            <p className="text-sm font-medium">Bus #{bus.busNumber}</p>
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500">
                ETA at {nextStop || 'next stop'}
              </p>
              <p className="text-sm font-medium">
                {eta.minutes} min
                {eta.delayed && (
                  <span className="text-xs text-accent ml-1">
                    (+{eta.delayed} min)
                  </span>
                )}
              </p>
            </div>
            <Button 
              size="sm"
              onClick={() => onTrackClick?.(bus._id || bus.id)}
            >
              Track
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
