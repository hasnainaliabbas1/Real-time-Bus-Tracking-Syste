import React from "react"
import { cn } from "@/lib/utils"
import { Check, Clock, MapPin } from "lucide-react";

const RouteTimeline = ({ className, ...props }) => {
  return (
    <div className={cn("flex flex-col space-y-4", className)} {...props} />
  )
}

const RouteTimelineItem = ({ className, ...props }) => {
  return (
    <div className={cn("flex items-center space-x-4", className)} {...props} />
  )
}

const RouteTimelineItemIndicator = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "h-2 w-2 rounded-full bg-primary ring-2 ring-primary ring-offset-2",
        className
      )}
      {...props}
    />
  )
}

const RouteTimelineItemContent = ({ className, stop, ...props }) => {
  if (stop) {
    return (
      <div className={cn("flex-1", className)} {...props}>
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
    );
  }

  return (
    <div className={cn("flex-1", className)} {...props} />
  );
}

export {
  RouteTimeline,
  RouteTimelineItem,
  RouteTimelineItemIndicator,
  RouteTimelineItemContent,
}
