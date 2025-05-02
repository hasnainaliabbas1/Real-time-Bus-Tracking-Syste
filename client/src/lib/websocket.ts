import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

type MessageHandler = (event: MessageEvent) => void;

export function useWebSocket() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const messageHandlers = useRef<Map<string, MessageHandler>>(new Map());

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user) return;

    try {
      // Instead of trying to compute the URL dynamically, 
      // use a direct path relative to the current page
      const wsUrl = `/ws`;
      console.log("Connecting to WebSocket at:", wsUrl);
      
      // Create WebSocket connection
      const socket = new WebSocket(
        (window.location.protocol === "https:" ? "wss://" : "ws://") + 
        window.location.host + 
        wsUrl
      );
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        // Authenticate the WebSocket connection
        // Get the appropriate ID based on whether we're using MongoDB or SQL
        const userId = typeof user.id === 'number' ? user.id : 
                      (user as any)._id ? (user as any)._id : user.id;
                      
        socket.send(
          JSON.stringify({
            type: "auth",
            userId: userId,
            role: user.role,
          })
        );
      };

      socket.onclose = () => {
        setIsConnected(false);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const handler = messageHandlers.current.get(data.type);
          if (handler) {
            handler(event);
          }
        } catch (error) {
          console.error("WebSocket message error:", error);
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      return () => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      };
    } catch (error) {
      console.error("Error setting up WebSocket:", error);
      return () => {}; // Return empty cleanup function on error
    }
  }, [user]);

  // Send a message through the WebSocket
  const sendMessage = (message: object) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.error("WebSocket is not connected");
    }
  };

  // Register a message handler
  const registerHandler = (type: string, handler: MessageHandler) => {
    messageHandlers.current.set(type, handler);

    return () => {
      messageHandlers.current.delete(type);
    };
  };

  return {
    isConnected,
    sendMessage,
    registerHandler,
  };
}

// Hook to send location updates for drivers
export function useLocationUpdater() {
  const { sendMessage, isConnected } = useWebSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (!isConnected || user?.role !== "driver") return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        sendMessage({
          type: "updateLocation",
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000, // 10 seconds
        timeout: 10000, // 10 seconds
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isConnected, user, sendMessage]);
}

// Hook to listen for bus location updates for passengers
export function useBusLocationUpdates() {
  const [busLocations, setBusLocations] = useState<any[]>([]);
  const { registerHandler, isConnected } = useWebSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (!isConnected || user?.role !== "passenger") return;

    const unregisterBusLocations = registerHandler("busLocations", (event) => {
      const data = JSON.parse(event.data);
      setBusLocations(data.data);
    });

    const unregisterBusLocationUpdate = registerHandler(
      "busLocationUpdate",
      (event) => {
        const data = JSON.parse(event.data);
        setBusLocations((prev) =>
          prev.map((bus) => {
            // Support both MongoDB _id and SQL id
            const busId = bus._id || bus.id;
            const dataBusId = data.data.busId;
            return busId === dataBusId
              ? { ...bus, currentLocation: data.data.location }
              : bus;
          })
        );
      }
    );

    return () => {
      unregisterBusLocations();
      unregisterBusLocationUpdate();
    };
  }, [isConnected, user, registerHandler]);

  return busLocations;
}

// Hook to get route and status updates for drivers
export function useDriverRouteUpdates() {
  const [driverRoute, setDriverRoute] = useState<any>(null);
  const { registerHandler, isConnected } = useWebSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (!isConnected || user?.role !== "driver") return;

    const unregister = registerHandler("busRoute", (event) => {
      const data = JSON.parse(event.data);
      setDriverRoute(data.data);
    });

    return () => {
      unregister();
    };
  }, [isConnected, user, registerHandler]);

  return driverRoute;
}

// Hook to listen for new incident reports for admins
export function useIncidentUpdates() {
  const [newIncident, setNewIncident] = useState<any | null>(null);
  const { registerHandler, isConnected } = useWebSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (!isConnected || user?.role !== "admin") return;

    const unregister = registerHandler("newIncident", (event) => {
      const data = JSON.parse(event.data);
      setNewIncident(data.data);
      
      // Clear the new incident after 5 seconds
      setTimeout(() => {
        setNewIncident(null);
      }, 5000);
    });

    return () => {
      unregister();
    };
  }, [isConnected, user, registerHandler]);

  return newIncident;
}
