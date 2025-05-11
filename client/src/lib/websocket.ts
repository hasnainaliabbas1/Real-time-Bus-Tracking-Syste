import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth.js";

interface User {
  id?: number;
  _id?: string;
  role: string;
}

interface Location {
  lat: number;
  lng: number;
}

interface Bus {
  id?: number;
  _id?: string;
  currentLocation?: Location;
  [key: string]: any;
}

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

// Function to get WebSocket URL
function getWebSocketURL(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = process.env.NODE_ENV === 'development' ? '5000' : window.location.port;
  return `${protocol}//${host}:${port}`;
}

export function useWebSocket() {
  const { user } = useAuth() as { user: User | null };
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const messageHandlers = useRef(new Map<string, (event: MessageEvent) => void>());
  const reconnectTimeoutRef = useRef<number>();
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  const connect = () => {
    try {
      if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
        console.error('Max reconnection attempts reached');
        return;
      }

      const wsUrl = getWebSocketURL();
      console.log("Connecting to WebSocket at:", wsUrl);
      
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        reconnectAttempts.current = 0;

        if (user) {
          const userId = typeof user.id === 'number' ? user.id : 
                        (user._id ? user._id : user.id);
                        
          socket.send(
            JSON.stringify({
              type: "auth",
              userId,
              role: user.role
            })
          );
        }
      };

      socket.onclose = (event) => {
        console.log("WebSocket disconnected", event.code, event.reason);
        setIsConnected(false);

        // Attempt to reconnect after a delay that increases with each attempt
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
        reconnectAttempts.current++;
        
        reconnectTimeoutRef.current = window.setTimeout(() => {
          if (user) connect();
        }, delay);
      };

      socket.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received message:", data);
          
          const handler = messageHandlers.current.get(data.type);
          if (handler) {
            handler(event);
          }
        } catch (error) {
          console.error("WebSocket message error:", error);
        }
      };

      socket.onerror = (error: Event) => {
        console.error("WebSocket error:", error);
      };
    } catch (error) {
      console.error("Error setting up WebSocket:", error);
      // Attempt to reconnect after a delay
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
      reconnectAttempts.current++;
      
      reconnectTimeoutRef.current = window.setTimeout(() => {
        if (user) connect();
      }, delay);
    }
  };

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user) return;

    connect();

    return () => {
      reconnectAttempts.current = MAX_RECONNECT_ATTEMPTS; // Prevent reconnection on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
    };
  }, [user]);

  // Send a message through the WebSocket
  const sendMessage = (message: WebSocketMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.error("WebSocket is not connected");
    }
  };

  // Register a message handler
  const registerHandler = (type: string, handler: (event: MessageEvent) => void) => {
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
  const { user } = useAuth() as { user: User | null };

  useEffect(() => {
    if (!isConnected || user?.role !== "driver") return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        sendMessage({
          type: "updateLocation",
          location,
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
  const [busLocations, setBusLocations] = useState<Bus[]>([]);
  const { registerHandler, isConnected } = useWebSocket();
  const { user } = useAuth() as { user: User | null };

  useEffect(() => {
    if (!isConnected || user?.role !== "passenger") return;

    const unregisterBusLocations = registerHandler("busLocations", (event) => {
      const data = JSON.parse(event.data);
      console.log("Received bus locations:", data.data);
      setBusLocations(data.data || []);
    });

    const unregisterBusLocationUpdate = registerHandler(
      "busLocationUpdate",
      (event) => {
        const data = JSON.parse(event.data);
        setBusLocations((prev: Bus[]) =>
          prev.map((bus) => {
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
  const { user } = useAuth() as { user: User | null };

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
  const [newIncident, setNewIncident] = useState<any>(null);
  const { registerHandler, isConnected } = useWebSocket();
  const { user } = useAuth() as { user: User | null };

  useEffect(() => {
    if (!isConnected || user?.role !== "admin") return;

    const unregister = registerHandler("newIncident", (event) => {
      const data = JSON.parse(event.data);
      setNewIncident(data.data);
    });

    return () => {
      unregister();
    };
  }, [isConnected, user, registerHandler]);

  return newIncident;
}
