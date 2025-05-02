import { Check, Clock, MapPin } from "lucide-react";

type Stop = {
  id: number;
  name: string;
  scheduledTime?: string;
  status: "completed" | "current" | "upcoming";
};

type RouteTimelineProps = {
  stops: Stop[];
};

export function RouteTimeline({ stops }: RouteTimelineProps) {
  return (
    <div className="flex flex-col space-y-3">
      {stops.map((stop, index) => (
        <div key={stop.id} className="flex items-center route-timeline-item relative">
          <div 
            className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center
              ${stop.status === 'completed' 
                ? 'bg-primary' 
                : stop.status === 'current' 
                  ? 'bg-accent' 
                  : 'bg-gray-300'}`}
          >
            {stop.status === 'completed' ? (
              <Check className="h-4 w-4 text-white" />
            ) : stop.status === 'current' ? (
              <Clock className="h-4 w-4 text-white" />
            ) : (
              <MapPin className="h-4 w-4 text-white" />
            )}
          </div>
          <div 
            className={`ml-3 pl-3 py-2 border-l-2 
              ${stop.status === 'completed' 
                ? 'border-primary' 
                : stop.status === 'current' 
                  ? 'border-accent' 
                  : 'border-gray-300'}`}
          >
            <p className="text-sm font-medium">{stop.name}</p>
            <p className="text-xs text-gray-500">
              {stop.scheduledTime && `Scheduled: ${stop.scheduledTime} • `}
              {stop.status === 'completed' && (
                <span className="text-green-600">Completed</span>
              )}
              {stop.status === 'current' && (
                <span className="text-accent font-medium">Current Stop</span>
              )}
              {stop.status === 'upcoming' && (
                <span className="text-gray-500">Upcoming</span>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
