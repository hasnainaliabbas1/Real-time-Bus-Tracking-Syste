import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { 
  User, Bus, Route, Stop, RouteStop, Ticket, 
  SubscriptionPlan, Subscription, Incident, SavedRoute,
  convertToPlainObject
} from "../db/mongo";
import { nanoid } from "nanoid";
import { hashPassword } from "./auth";

// Make the MongoDB storage instance accessible
const getStorage = () => (global as any).mongoStorage;

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server setup for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const connectedClients: Map<string, { ws: WebSocket, role: string, userId: string }> = new Map();

  wss.on('connection', (ws) => {
    const clientId = nanoid();
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'auth' && data.userId && data.role) {
          connectedClients.set(clientId, { 
            ws, 
            role: data.role, 
            userId: data.userId 
          });
          
          // Send initial data based on role
          if (data.role === 'passenger') {
            const activeBuses = await Bus.find({ status: 'active' })
              .populate({
                path: 'routeId',
                populate: {
                  path: 'routeStops',
                  populate: {
                    path: 'stopId'
                  }
                }
              });
            
            ws.send(JSON.stringify({
              type: 'busLocations',
              data: convertToPlainObject(activeBuses)
            }));
          } else if (data.role === 'driver') {
            const driverBus = await Bus.findOne({ driverId: data.userId })
              .populate({
                path: 'routeId',
                populate: {
                  path: 'routeStops',
                  populate: {
                    path: 'stopId'
                  },
                  options: { sort: { order: 1 } }
                }
              });
            
            if (driverBus) {
              ws.send(JSON.stringify({
                type: 'busRoute',
                data: convertToPlainObject(driverBus)
              }));
            }
          }
        } else if (data.type === 'updateLocation' && data.location) {
          const client = connectedClients.get(clientId);
          if (client?.role === 'driver') {
            // Update driver's bus location
            const driverBus = await Bus.findOne({ driverId: client.userId });
            
            if (driverBus) {
              driverBus.currentLocation = data.location;
              await driverBus.save();
              
              // Broadcast to passengers
              connectedClients.forEach((client, _) => {
                if (client.role === 'passenger' && client.ws.readyState === WebSocket.OPEN) {
                  client.ws.send(JSON.stringify({
                    type: 'busLocationUpdate',
                    data: {
                      busId: driverBus._id,
                      location: data.location
                    }
                  }));
                }
              });
            }
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      connectedClients.delete(clientId);
    });
  });

  // ===========================
  // Users routes
  // ===========================
  app.get("/api/users", async (req, res) => {
    try {
      const users = await User.find({});
      res.json(convertToPlainObject(users));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // ===========================
  // Bus management routes
  // ===========================
  app.get("/api/buses", async (req, res) => {
    try {
      const allBuses = await Bus.find({})
        .populate('driverId')
        .populate('routeId')
        .sort('-createdAt');
      
      res.json(convertToPlainObject(allBuses));
    } catch (error) {
      console.error("Error fetching buses:", error);
      res.status(500).json({ message: "Failed to fetch buses" });
    }
  });

  app.get("/api/buses/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const bus = await Bus.findById(id)
        .populate('driverId')
        .populate({
          path: 'routeId',
          populate: {
            path: 'routeStops',
            populate: {
              path: 'stopId'
            },
            options: { sort: { order: 1 } }
          }
        });
      
      if (!bus) {
        return res.status(404).json({ message: "Bus not found" });
      }
      
      res.json(convertToPlainObject(bus));
    } catch (error) {
      console.error("Error fetching bus:", error);
      res.status(500).json({ message: "Failed to fetch bus" });
    }
  });

  app.post("/api/buses", async (req, res) => {
    try {
      const newBus = new Bus(req.body);
      await newBus.save();
      res.status(201).json(convertToPlainObject(newBus));
    } catch (error) {
      console.error("Error creating bus:", error);
      res.status(500).json({ message: "Failed to create bus" });
    }
  });

  app.put("/api/buses/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updatedBus = await Bus.findByIdAndUpdate(id, req.body, { new: true });
      
      if (!updatedBus) {
        return res.status(404).json({ message: "Bus not found" });
      }
      
      res.json(convertToPlainObject(updatedBus));
    } catch (error) {
      console.error("Error updating bus:", error);
      res.status(500).json({ message: "Failed to update bus" });
    }
  });

  app.delete("/api/buses/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deletedBus = await Bus.findByIdAndDelete(id);
      
      if (!deletedBus) {
        return res.status(404).json({ message: "Bus not found" });
      }
      
      res.json({ message: "Bus deleted successfully" });
    } catch (error) {
      console.error("Error deleting bus:", error);
      res.status(500).json({ message: "Failed to delete bus" });
    }
  });

  // ===========================
  // Route management routes
  // ===========================
  app.get("/api/routes", async (req, res) => {
    try {
      const allRoutes = await Route.find({}).sort('-createdAt');
      
      // Find route stops for each route
      const routesWithStops = await Promise.all(
        allRoutes.map(async (route) => {
          const routeObj = route.toObject();
          const routeStops = await RouteStop.find({ routeId: route._id })
            .populate('stopId')
            .sort('order');
            
          return {
            ...routeObj,
            routeStops: convertToPlainObject(routeStops)
          };
        })
      );
      
      res.json(routesWithStops);
    } catch (error) {
      console.error("Error fetching routes:", error);
      res.status(500).json({ message: "Failed to fetch routes" });
    }
  });

  app.get("/api/routes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const route = await Route.findById(id);
      
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      // Find route stops
      const routeStops = await RouteStop.find({ routeId: id })
        .populate('stopId')
        .sort('order');
        
      // Find buses on this route
      const buses = await Bus.find({ routeId: id });
      
      const routeData = {
        ...convertToPlainObject(route),
        routeStops: convertToPlainObject(routeStops),
        buses: convertToPlainObject(buses)
      };
      
      res.json(routeData);
    } catch (error) {
      console.error("Error fetching route:", error);
      res.status(500).json({ message: "Failed to fetch route" });
    }
  });

  app.post("/api/routes", async (req, res) => {
    try {
      const { name, description, status, stops: routeStopsList } = req.body;
      
      // Create route
      const newRoute = new Route({ name, description, status });
      await newRoute.save();
      
      // Add stops if provided
      if (routeStopsList && Array.isArray(routeStopsList) && routeStopsList.length > 0) {
        const routeStopsData = routeStopsList.map((stop, index) => ({
          routeId: newRoute._id,
          stopId: stop.stopId,
          order: index,
          scheduledArrival: stop.scheduledArrival,
          scheduledDeparture: stop.scheduledDeparture,
        }));
        
        await RouteStop.insertMany(routeStopsData);
      }
      
      // Get the route with stops for response
      const routeStops = await RouteStop.find({ routeId: newRoute._id })
        .populate('stopId')
        .sort('order');
        
      const routeData = {
        ...convertToPlainObject(newRoute),
        routeStops: convertToPlainObject(routeStops)
      };
      
      res.status(201).json(routeData);
    } catch (error) {
      console.error("Error creating route:", error);
      res.status(500).json({ message: "Failed to create route" });
    }
  });

  app.put("/api/routes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, status, stops: routeStopsList } = req.body;
      
      // Update route
      const updatedRoute = await Route.findByIdAndUpdate(
        id, 
        { name, description, status },
        { new: true }
      );
      
      if (!updatedRoute) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      // Update stops if provided
      if (routeStopsList && Array.isArray(routeStopsList)) {
        // Delete existing route stops
        await RouteStop.deleteMany({ routeId: id });
        
        // Add new route stops
        if (routeStopsList.length > 0) {
          const routeStopsData = routeStopsList.map((stop, index) => ({
            routeId: id,
            stopId: stop.stopId,
            order: index,
            scheduledArrival: stop.scheduledArrival,
            scheduledDeparture: stop.scheduledDeparture,
          }));
          
          await RouteStop.insertMany(routeStopsData);
        }
      }
      
      // Get the updated route with stops for response
      const routeStops = await RouteStop.find({ routeId: id })
        .populate('stopId')
        .sort('order');
        
      const routeData = {
        ...convertToPlainObject(updatedRoute),
        routeStops: convertToPlainObject(routeStops)
      };
      
      res.json(routeData);
    } catch (error) {
      console.error("Error updating route:", error);
      res.status(500).json({ message: "Failed to update route" });
    }
  });

  app.delete("/api/routes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // First check if there are any buses assigned to this route
      const busesOnRoute = await Bus.countDocuments({ routeId: id });
      if (busesOnRoute > 0) {
        return res.status(400).json({ 
          message: "Cannot delete route - there are buses assigned to it. Reassign or remove buses first." 
        });
      }
      
      // Delete route stops first
      await RouteStop.deleteMany({ routeId: id });
      
      // Delete the route
      const deletedRoute = await Route.findByIdAndDelete(id);
      
      if (!deletedRoute) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      res.json({ message: "Route deleted successfully" });
    } catch (error) {
      console.error("Error deleting route:", error);
      res.status(500).json({ message: "Failed to delete route" });
    }
  });

  // ===========================
  // Stop management routes
  // ===========================
  app.get("/api/stops", async (req, res) => {
    try {
      const stops = await Stop.find({}).sort('-createdAt');
      res.json(convertToPlainObject(stops));
    } catch (error) {
      console.error("Error fetching stops:", error);
      res.status(500).json({ message: "Failed to fetch stops" });
    }
  });

  app.post("/api/stops", async (req, res) => {
    try {
      const newStop = new Stop(req.body);
      await newStop.save();
      res.status(201).json(convertToPlainObject(newStop));
    } catch (error) {
      console.error("Error creating stop:", error);
      res.status(500).json({ message: "Failed to create stop" });
    }
  });

  // ===========================
  // Ticket routes
  // ===========================
  app.get("/api/tickets", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Get user's tickets
      const tickets = await Ticket.find({ userId: req.user._id })
        .populate('routeId')
        .populate('fromStopId')
        .populate('toStopId')
        .sort('-createdAt');
        
      res.json(convertToPlainObject(tickets));
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  app.post("/api/tickets", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Create a QR code string (in a real app, this would be a more secure token)
      const qrCode = `ticket-${nanoid()}`;
      
      // Create new ticket
      const newTicket = new Ticket({
        ...req.body,
        userId: req.user._id,
        qrCode
      });
      
      await newTicket.save();
      
      // Populate related data for response
      await newTicket.populate('routeId');
      await newTicket.populate('fromStopId');
      await newTicket.populate('toStopId');
      
      res.status(201).json(convertToPlainObject(newTicket));
    } catch (error) {
      console.error("Error creating ticket:", error);
      res.status(500).json({ message: "Failed to create ticket" });
    }
  });

  // ===========================
  // Subscription plan routes
  // ===========================
  app.get("/api/subscription-plans", async (req, res) => {
    try {
      const plans = await SubscriptionPlan.find({}).sort('price');
      res.json(convertToPlainObject(plans));
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // ===========================
  // User subscriptions routes
  // ===========================
  app.get("/api/subscriptions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const subscriptions = await Subscription.find({ userId: req.user._id })
        .populate('planId')
        .sort('-startDate');
        
      res.json(convertToPlainObject(subscriptions));
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  app.post("/api/subscriptions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Create new subscription
      const newSubscription = new Subscription({
        ...req.body,
        userId: req.user._id
      });
      
      await newSubscription.save();
      await newSubscription.populate('planId');
      
      res.status(201).json(convertToPlainObject(newSubscription));
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  // ===========================
  // Saved routes
  // ===========================
  app.get("/api/saved-routes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const savedRoutes = await SavedRoute.find({ userId: req.user._id })
        .populate('routeId')
        .sort('-createdAt');
        
      res.json(convertToPlainObject(savedRoutes));
    } catch (error) {
      console.error("Error fetching saved routes:", error);
      res.status(500).json({ message: "Failed to fetch saved routes" });
    }
  });

  app.post("/api/saved-routes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Extract routeId from request body
      const { routeId } = req.body;
      
      // Find the route to ensure it exists and to get its details
      const route = await Route.findById(routeId);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      // Create new saved route with explicitly set routeId
      const newSavedRoute = new SavedRoute({
        userId: req.user._id,
        routeId: route._id, // Explicitly set routeId
        name: req.body.name || route.name || "Saved Route" // Ensure name is provided
      });
      
      await newSavedRoute.save();
      await newSavedRoute.populate('routeId');
      
      res.status(201).json(convertToPlainObject(newSavedRoute));
    } catch (error) {
      console.error("Error saving route:", error);
      res.status(500).json({ message: "Failed to save route" });
    }
  });

  app.delete("/api/saved-routes/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { id } = req.params;
      
      // Ensure the saved route belongs to the current user
      const savedRoute = await SavedRoute.findOne({ 
        _id: id, 
        userId: req.user._id 
      });
      
      if (!savedRoute) {
        return res.status(404).json({ message: "Saved route not found" });
      }
      
      await SavedRoute.findByIdAndDelete(id);
      res.json({ message: "Saved route deleted successfully" });
    } catch (error) {
      console.error("Error deleting saved route:", error);
      res.status(500).json({ message: "Failed to delete saved route" });
    }
  });

  // ===========================
  // Incident reporting
  // ===========================
  app.get("/api/incidents", async (req, res) => {
    try {
      const incidents = await Incident.find({})
        .populate('busId')
        .populate('reportedBy')
        .sort('-createdAt');
        
      res.json(convertToPlainObject(incidents));
    } catch (error) {
      console.error("Error fetching incidents:", error);
      res.status(500).json({ message: "Failed to fetch incidents" });
    }
  });

  app.post("/api/incidents", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Create new incident
      const newIncident = new Incident({
        ...req.body,
        reportedBy: req.user._id
      });
      
      await newIncident.save();
      
      // Populate for response
      await newIncident.populate('busId');
      await newIncident.populate('reportedBy');
      
      const incidentData = convertToPlainObject(newIncident);
      
      // Notify admin users via WebSocket
      connectedClients.forEach((client, _) => {
        if (client.role === 'admin' && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({
            type: 'newIncident',
            data: incidentData
          }));
        }
      });
      
      res.status(201).json(incidentData);
    } catch (error) {
      console.error("Error creating incident:", error);
      res.status(500).json({ message: "Failed to create incident" });
    }
  });

  app.put("/api/incidents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      // Update resolved_at if status is 'resolved'
      const updateData = { status };
      if (status === 'resolved') {
        updateData.resolvedAt = new Date();
      }
      
      const updatedIncident = await Incident.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      )
      .populate('busId')
      .populate('reportedBy');
      
      if (!updatedIncident) {
        return res.status(404).json({ message: "Incident not found" });
      }
      
      res.json(convertToPlainObject(updatedIncident));
    } catch (error) {
      console.error("Error updating incident:", error);
      res.status(500).json({ message: "Failed to update incident" });
    }
  });

  // ===========================
  // Analytics routes
  // ===========================
  app.get("/api/analytics", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Get counts
      const [activeDrivers, activeBuses, delayedIncidents, activeTickets] = await Promise.all([
        User.countDocuments({ role: 'driver' }),
        Bus.countDocuments({ status: 'active' }),
        Incident.countDocuments({ 
          incidentType: 'delay',
          status: { $in: ['reported', 'in_progress'] }
        }),
        Ticket.countDocuments({ status: 'active' })
      ]);
      
      // Generate passenger counts for last 7 days
      const today = new Date();
      const passengerCounts = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);
        
        // Random count for demonstration (in a real app, this would query ticket data)
        const count = Math.floor(Math.random() * 150) + 50;
        
        passengerCounts.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count
        });
      }
      
      // On-time performance (simulated)
      const onTimePerformance = {
        onTime: 85,
        delayed: 15
      };
      
      // Subscription trends (simulated)
      const subscriptionTrends = [
        { name: 'Daily Pass', count: 120 },
        { name: 'Weekly Pass', count: 75 },
        { name: 'Monthly Pass', count: 45 }
      ];
      
      const analyticsData = {
        counts: {
          activeDrivers,
          activeBuses,
          delayedBuses: delayedIncidents,
          activeTickets
        },
        passengerCounts,
        onTimePerformance,
        subscriptionTrends
      };
      
      res.json(analyticsData);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  return httpServer;
}

// Function to seed initial MongoDB data if needed
export async function seedInitialData() {
  try {
    // Check if admin user exists
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      // Create admin user
      const adminUser = new User({
        username: 'admin',
        password: await hashPassword('admin123'),
        email: 'admin@bustrack.com',
        role: 'admin',
        fullName: 'Admin User',
        phone: '123-456-7890'
      });
      await adminUser.save();
      console.log('Admin user created');
      
      // Create sample driver user
      const driverUser = new User({
        username: 'driver1',
        password: await hashPassword('driver123'),
        email: 'driver1@bustrack.com',
        role: 'driver',
        fullName: 'John Driver',
        phone: '123-456-7891'
      });
      await driverUser.save();
      console.log('Driver user created');
      
      // Create sample passenger user
      const passengerUser = new User({
        username: 'passenger',
        password: await hashPassword('passenger123'),
        email: 'passenger@bustrack.com',
        role: 'passenger',
        fullName: 'Sam Passenger',
        phone: '123-456-7893'
      });
      await passengerUser.save();
      console.log('Passenger user created');
    }
  } catch (error) {
    console.error('Error seeding initial data:', error);
  }
}