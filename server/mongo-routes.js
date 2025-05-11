import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth.js";
import { 
  User, Bus, Route, Stop, RouteStop, Ticket, 
  SubscriptionPlan, Subscription, Incident, SavedRoute,
  convertToPlainObject
} from "../db/mongo.js";
import { nanoid } from "nanoid";
import { hashPassword } from "./auth.js";

// Make the MongoDB storage instance accessible
const getStorage = () => global.mongoStorage;

async function registerRoutes(app) {
  const httpServer = createServer(app);

  // WebSocket server setup for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const connectedClients = new Map();

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
            // Find active buses
            const activeBuses = await Bus.find({ status: 'active' })
              .populate({
                path: 'driverId',
                select: 'username fullName email role'
              })
              .populate({
                path: 'routeId',
                select: 'name description status'
              });
            
            // Process the buses for consistency with frontend expectations
            const processedBuses = activeBuses.map(bus => {
              const busObj = bus.toObject();
              
              // Make sure each bus has a driver and route field
              if (busObj.driverId && typeof busObj.driverId === 'object') {
                busObj.driver = busObj.driverId;
              }
              
              if (busObj.routeId && typeof busObj.routeId === 'object') {
                busObj.route = busObj.routeId;
              }
              
              return busObj;
            });
            
            console.log("Sending active buses to passenger:", processedBuses);
            
            ws.send(JSON.stringify({
              type: 'busLocations',
              data: processedBuses
            }));
          } else if (data.role === 'driver') {
            const driverBus = await Bus.findOne({ driverId: data.userId })
              .populate({
                path: 'routeId',
                populate: {
                  path: 'stops',
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
              connectedClients.forEach((client) => {
                if (client.role === 'passenger' && client.ws.readyState === WebSocket.OPEN) {
                  client.ws.send(JSON.stringify({
                    type: 'busLocationUpdate',
                    data: driverBus.currentLocation
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
  // Development routes
  // ===========================

  // Reset database route (development only)
  app.post('/api/dev/reset', async (req, res) => {
    try {
      // Drop all collections
      await Promise.all([
        User.deleteMany({}),
        Bus.deleteMany({}),
        Route.deleteMany({}),
        Stop.deleteMany({}),
        RouteStop.deleteMany({}),
        Ticket.deleteMany({}),
        SubscriptionPlan.deleteMany({}),
        Subscription.deleteMany({}),
        Incident.deleteMany({}),
        SavedRoute.deleteMany({})
      ]);
      
      // Re-seed database
      await seedInitialData();
      
      res.json({ message: 'Database reset successful' });
    } catch (error) {
      console.error('Error resetting database:', error);
      res.status(500).json({ error: 'Failed to reset database' });
    }
  });

  // Get all users route (development only)
  app.get('/api/dev/users', async (req, res) => {
    try {
      const users = await User.find({});
      res.json(users);
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  });

  // Get all buses route (development only)
  app.get('/api/dev/buses', async (req, res) => {
    try {
      const buses = await Bus.find({});
      res.json(buses);
    } catch (error) {
      console.error('Error getting buses:', error);
      res.status(500).json({ error: 'Failed to get buses' });
    }
  });

  // Get all routes route (development only)
  app.get('/api/dev/routes', async (req, res) => {
    try {
      const routes = await Route.find({});
      res.json(routes);
    } catch (error) {
      console.error('Error getting routes:', error);
      res.status(500).json({ error: 'Failed to get routes' });
    }
  });

  // Get all stops route (development only)
  app.get('/api/dev/stops', async (req, res) => {
    try {
      const stops = await Stop.find({});
      res.json(stops);
    } catch (error) {
      console.error('Error getting stops:', error);
      res.status(500).json({ error: 'Failed to get stops' });
    }
  });

  // Get all route-stop connections route (development only)
  app.get('/api/dev/route-stops', async (req, res) => {
    try {
      const routeStops = await RouteStop.find({});
      res.json(routeStops);
    } catch (error) {
      console.error('Error getting route-stops:', error);
      res.status(500).json({ error: 'Failed to get route-stops' });
    }
  });

  // Get all tickets route (development only)
  app.get('/api/dev/tickets', async (req, res) => {
    try {
      const tickets = await Ticket.find({});
      res.json(tickets);
    } catch (error) {
      console.error('Error getting tickets:', error);
      res.status(500).json({ error: 'Failed to get tickets' });
    }
  });

  // Get all subscription plans route (development only)
  app.get('/api/dev/subscription-plans', async (req, res) => {
    try {
      const plans = await SubscriptionPlan.find({});
      res.json(plans);
    } catch (error) {
      console.error('Error getting subscription plans:', error);
      res.status(500).json({ error: 'Failed to get subscription plans' });
    }
  });

  // Get all subscriptions route (development only)
  app.get('/api/dev/subscriptions', async (req, res) => {
    try {
      const subscriptions = await Subscription.find({});
      res.json(subscriptions);
    } catch (error) {
      console.error('Error getting subscriptions:', error);
      res.status(500).json({ error: 'Failed to get subscriptions' });
    }
  });

  // Get all incidents route (development only)
  app.get('/api/dev/incidents', async (req, res) => {
    try {
      const incidents = await Incident.find({});
      res.json(incidents);
    } catch (error) {
      console.error('Error getting incidents:', error);
      res.status(500).json({ error: 'Failed to get incidents' });
    }
  });

  // Get all saved routes route (development only)
  app.get('/api/dev/saved-routes', async (req, res) => {
    try {
      const savedRoutes = await SavedRoute.find({});
      res.json(savedRoutes);
    } catch (error) {
      console.error('Error getting saved routes:', error);
      res.status(500).json({ error: 'Failed to get saved routes' });
    }
  });

  // Seed database route (development only)
  app.post('/api/dev/seed', async (req, res) => {
    try {
      await seedInitialData();
      res.json({ message: 'Database seeded successfully' });
    } catch (error) {
      console.error('Error seeding database:', error);
      res.status(500).json({ error: 'Failed to seed database' });
    }
  });

  // ===========================
  // Users routes
  // ===========================

  app.get('/api/users', async (req, res) => {
    try {
      const users = await User.find({});
      res.json(convertToPlainObject(users));
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // ===========================
  // Bus management routes
  // ===========================

  app.get('/api/buses', async (req, res) => {
    try {
      const allBuses = await Bus.find({})
        .populate({
          path: 'driverId',
          select: 'username fullName email role'
        })
        .populate({
          path: 'routeId',
          select: 'name description status'
        });

      res.json(convertToPlainObject(allBuses));
    } catch (error) {
      console.error('Error fetching buses:', error);
      res.status(500).json({ message: 'Failed to fetch buses' });
    }
  });

  // ===========================
  // Route management routes
  // ===========================

  app.get('/api/routes', async (req, res) => {
    try {
      const routes = await Route.find({});
      res.json(convertToPlainObject(routes));
    } catch (error) {
      console.error('Error fetching routes:', error);
      res.status(500).json({ message: 'Failed to fetch routes' });
    }
  });

  // ===========================
  // Stop management routes
  // ===========================

  app.get('/api/stops', async (req, res) => {
    try {
      const stops = await Stop.find({});
      res.json(convertToPlainObject(stops));
    } catch (error) {
      console.error('Error fetching stops:', error);
      res.status(500).json({ message: 'Failed to fetch stops' });
    }
  });

  // ===========================
  // Route-Stop management routes
  // ===========================

  app.get('/api/route-stops', async (req, res) => {
    try {
      const routeStops = await RouteStop.find({});
      res.json(convertToPlainObject(routeStops));
    } catch (error) {
      console.error('Error fetching route-stops:', error);
      res.status(500).json({ message: 'Failed to fetch route-stops' });
    }
  });

  // ===========================
  // Ticket management routes
  // ===========================

  app.get('/api/tickets', async (req, res) => {
    try {
      const tickets = await Ticket.find({});
      res.json(convertToPlainObject(tickets));
    } catch (error) {
      console.error('Error fetching tickets:', error);
      res.status(500).json({ message: 'Failed to fetch tickets' });
    }
  });

  // ===========================
  // Subscription management routes
  // ===========================

  app.get('/api/subscription-plans', async (req, res) => {
    try {
      const plans = await SubscriptionPlan.find({});
      res.json(convertToPlainObject(plans));
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      res.status(500).json({ message: 'Failed to fetch subscription plans' });
    }
  });

  app.get('/api/subscriptions', async (req, res) => {
    try {
      const subscriptions = await Subscription.find({});
      res.json(convertToPlainObject(subscriptions));
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      res.status(500).json({ message: 'Failed to fetch subscriptions' });
    }
  });

  // ===========================
  // Incident management routes
  // ===========================

  app.get('/api/incidents', async (req, res) => {
    try {
      const incidents = await Incident.find({});
      res.json(convertToPlainObject(incidents));
    } catch (error) {
      console.error('Error fetching incidents:', error);
      res.status(500).json({ message: 'Failed to fetch incidents' });
    }
  });

  // ===========================
  // Saved route management routes
  // ===========================

  app.get('/api/saved-routes', async (req, res) => {
    try {
      const savedRoutes = await SavedRoute.find({});
      res.json(convertToPlainObject(savedRoutes));
    } catch (error) {
      console.error('Error fetching saved routes:', error);
      res.status(500).json({ message: 'Failed to fetch saved routes' });
    }
  });

  return httpServer;

  // Reset database route (development only)
  app.post('/api/dev/reset', async (req, res) => {
    try {
      // Drop all collections
      await Promise.all([
        User.deleteMany({}),
        Bus.deleteMany({}),
        Route.deleteMany({}),
        Stop.deleteMany({}),
        RouteStop.deleteMany({}),
        Ticket.deleteMany({}),
        SubscriptionPlan.deleteMany({}),
        Subscription.deleteMany({}),
        Incident.deleteMany({}),
        SavedRoute.deleteMany({})
      ]);
      
      // Re-seed database
      await seedInitialData();
      
      res.json({ message: 'Database reset successful' });
    } catch (error) {
      console.error('Error resetting database:', error);
      res.status(500).json({ error: 'Failed to reset database' });
    }
  });

  // Get all users route (development only)
  app.get('/api/dev/users', async (req, res) => {
    try {
      const users = await User.find({});
      res.json(users);
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  });

  // Get all buses route (development only)
  app.get('/api/dev/buses', async (req, res) => {
    try {
      const buses = await Bus.find({});
      res.json(buses);
    } catch (error) {
      console.error('Error getting buses:', error);
      res.status(500).json({ error: 'Failed to get buses' });
    }
  });

  // Get all routes route (development only)
  app.get('/api/dev/routes', async (req, res) => {
    try {
      const routes = await Route.find({});
      res.json(routes);
    } catch (error) {
      console.error('Error getting routes:', error);
      res.status(500).json({ error: 'Failed to get routes' });
    }
  });

  // Get all stops route (development only)
  app.get('/api/dev/stops', async (req, res) => {
    try {
      const stops = await Stop.find({});
      res.json(stops);
    } catch (error) {
      console.error('Error getting stops:', error);
      res.status(500).json({ error: 'Failed to get stops' });
    }
  });

  // Get all route-stop connections route (development only)
  app.get('/api/dev/route-stops', async (req, res) => {
    try {
      const routeStops = await RouteStop.find({});
      res.json(routeStops);
    } catch (error) {
      console.error('Error getting route-stops:', error);
      res.status(500).json({ error: 'Failed to get route-stops' });
    }
  });

  // Get all tickets route (development only)
  app.get('/api/dev/tickets', async (req, res) => {
    try {
      const tickets = await Ticket.find({});
      res.json(tickets);
    } catch (error) {
      console.error('Error getting tickets:', error);
      res.status(500).json({ error: 'Failed to get tickets' });
    }
  });

  // Get all subscription plans route (development only)
  app.get('/api/dev/subscription-plans', async (req, res) => {
    try {
      const plans = await SubscriptionPlan.find({});
      res.json(plans);
    } catch (error) {
      console.error('Error getting subscription plans:', error);
      res.status(500).json({ error: 'Failed to get subscription plans' });
    }
  });

  // Get all subscriptions route (development only)
  app.get('/api/dev/subscriptions', async (req, res) => {
    try {
      const subscriptions = await Subscription.find({});
      res.json(subscriptions);
    } catch (error) {
      console.error('Error getting subscriptions:', error);
      res.status(500).json({ error: 'Failed to get subscriptions' });
    }
  });

  // Get all incidents route (development only)
  app.get('/api/dev/incidents', async (req, res) => {
    try {
      const incidents = await Incident.find({});
      res.json(incidents);
    } catch (error) {
      console.error('Error getting incidents:', error);
      res.status(500).json({ error: 'Failed to get incidents' });
    }
  });

  // Get all saved routes route (development only)
  app.get('/api/dev/saved-routes', async (req, res) => {
    try {
      const savedRoutes = await SavedRoute.find({});
      res.json(savedRoutes);
    } catch (error) {
      console.error('Error getting saved routes:', error);
      res.status(500).json({ error: 'Failed to get saved routes' });
    }
  });

  // Seed database route (development only)
  app.post('/api/dev/seed', async (req, res) => {
    try {
      const allBuses = await Bus.find({})
        .populate({
          path: 'driverId',
          select: 'username fullName email role' // Select only needed fields
        })
        .populate({
          path: 'routeId',
          select: 'name description status' // Select only needed fields
        })
        .sort('-createdAt');
      
      // Rename fields to match the frontend expectations
      const processedBuses = allBuses.map(bus => {
        const busObj = bus.toObject();
        
        // If bus has a populated driverId, set it as driver
        if (busObj.driverId && typeof busObj.driverId === 'object') {
          busObj.driver = busObj.driverId;
        }
        
        // If bus has a populated routeId, set it as route
        if (busObj.routeId && typeof busObj.routeId === 'object') {
          busObj.route = busObj.routeId;
        }
        
        return busObj;
      });
      
      res.json(convertToPlainObject(processedBuses));
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
            path: 'stops',
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
      
      // Populate the driver and route to return the same format as GET /api/buses
      const populatedBus = await Bus.findById(newBus._id)
        .populate({
          path: 'driverId',
          select: 'username fullName email role'
        })
        .populate({
          path: 'routeId',
          select: 'name description status'
        });
      
      if (!populatedBus) {
        return res.status(201).json(convertToPlainObject(newBus));
      }
      
      // Apply the same processing as in the GET endpoint
      const busObj = populatedBus.toObject();
      
      if (busObj.driverId && typeof busObj.driverId === 'object') {
        busObj.driver = busObj.driverId;
      }
      
      if (busObj.routeId && typeof busObj.routeId === 'object') {
        busObj.route = busObj.routeId;
      }
      
      res.status(201).json(convertToPlainObject(busObj));
    } catch (error) {
      console.error("Error creating bus:", error);
      res.status(500).json({ message: "Failed to create bus" });
    }
  });

  app.put("/api/buses/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Update the bus document
      const updatedBus = await Bus.findByIdAndUpdate(id, req.body, { new: true });
      
      if (!updatedBus) {
        return res.status(404).json({ message: "Bus not found" });
      }
      
      // Populate the driver and route information, same as GET and POST
      const populatedBus = await Bus.findById(updatedBus._id)
        .populate({
          path: 'driverId',
          select: 'username fullName email role'
        })
        .populate({
          path: 'routeId',
          select: 'name description status'
        });
      
      if (!populatedBus) {
        return res.json(convertToPlainObject(updatedBus));
      }
      
      // Apply the same field mapping to maintain consistency
      const busObj = populatedBus.toObject();
      
      if (busObj.driverId && typeof busObj.driverId === 'object') {
        busObj.driver = busObj.driverId;
      }
      
      if (busObj.routeId && typeof busObj.routeId === 'object') {
        busObj.route = busObj.routeId;
      }
      
      res.json(convertToPlainObject(busObj));
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
            
          // Format route stops for frontend consumption
          const formattedRouteStops = routeStops.map(rs => {
            const stopData = rs.stopId;
            return {
              order: rs.order,
              scheduledArrival: rs.scheduledArrival,
              scheduledDeparture: rs.scheduledDeparture,
              stop
            };
          });
            
          return {
            ...routeObj,
            routeStops
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
      const routeStops = await RouteStop.find({ routeId })
        .populate('stopId')
        .sort('order');
        
      // Find buses on this route
      const buses = await Bus.find({ routeId });
      
      // Format route stops for frontend consumption
      const formattedRouteStops = routeStops.map(rs => {
        const stopData = rs.stopId;
        return {
          order: rs.order,
          scheduledArrival: rs.scheduledArrival,
          scheduledDeparture: rs.scheduledDeparture,
          stop
        };
      });
      
      const routeData = {
        ...convertToPlainObject(route),
        routeStops,
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
      const { name, description, status, stops } = req.body;
      
      // Create route
      const newRoute = new Route({ name, description, status });
      await newRoute.save();
      
      // Add stops if provided
      if (routeStopsList && Array.isArray(routeStopsList) && routeStopsList.length > 0) {
        const routeStopsData = routeStopsList.map((stop, index) => ({
          routeId: newRoute._id,
          stopId: stop.stopId,
          order,
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
      const { name, description, status, stops } = req.body;
      
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
        await RouteStop.deleteMany({ routeId });
        
        // Add new route stops
        if (routeStopsList.length > 0) {
          const routeStopsData = routeStopsList.map((stop, index) => ({
            routeId,
            stopId: stop.stopId,
            order,
            scheduledArrival: stop.scheduledArrival,
            scheduledDeparture: stop.scheduledDeparture,
          }));
          
          await RouteStop.insertMany(routeStopsData);
        }
      }
      
      // Get the updated route with stops for response
      const routeStops = await RouteStop.find({ routeId })
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
      const busesOnRoute = await Bus.countDocuments({ routeId });
      if (busesOnRoute > 0) {
        return res.status(400).json({ 
          message: "Cannot delete route - there are buses assigned to it. Reassign or remove buses first." 
        });
      }
      
      // Delete route stops first
      await RouteStop.deleteMany({ routeId });
      
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
        _id, 
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
            data
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
  // Special route to create additional stops and connections
  // ===========================
  app.post("/api/create-stops", async (req, res) => {
    try {
      // Remove authentication check so we can seed data more easily
      // This is normally not recommended for production environments
      
      // Get all routes
      const routes = await Route.find({});
      
      // Counter for created items
      let createdStops = 0;
      let createdRouteStops = 0;
      
      for (const route of routes) {
        // Create additional stops for each route
        const routeId = route._id;
        
        // Create stops with more realistic names - expanded to 12 stops
        const stopNames = [
          "Main Bus Terminal",
          "Downtown Center",
          "University Campus",
          "Shopping Mall",
          "Hospital",
          "Train Station",
          "City Park",
          "Business District",
          "Residential Area",
          "Sports Stadium",
          "Convention Center",
          "Airport"
        ];
        
        // Generate random coordinates around a center point
        const centerLat = 34.0522;
        const centerLng = -118.2437;
        
        for (let i = 0; i < stopNames.length; i++) {
          // Add some variation to coordinates
          const lat = centerLat + (Math.random() - 0.5) * 0.1;
          const lng = centerLng + (Math.random() - 0.5) * 0.1;
          
          // Check if the stop already exists
          let stop = await Stop.findOne({ name: stopNames[i] });
          
          // If stop doesn't exist, create it
          if (!stop) {
            stop = new Stop({
              name: stopNames[i],
              location,
              description: `${stopNames[i]} for ${route.name}`
            });
            await stop.save();
            console.log(`Created stop: ${stop.name}`);
            createdStops++;
          }
          
          // Check if RouteStop connection already exists
          const existingRouteStop = await RouteStop.findOne({
            routeId,
            stopId: stop._id
          });
          
          // If connection doesn't exist, create it
          if (!existingRouteStop) {
            const routeStop = new RouteStop({
              routeId,
              stopId: stop._id,
              order,
              scheduledArrival: `0${7 + i}:${i * 10}`,
              scheduledDeparture: `0${7 + i}:${i * 10 + 5}`
            });
            
            await routeStop.save();
            console.log(`Created RouteStop connection for stop: ${stop.name} on route: ${route.name}`);
            createdRouteStops++;
          }
        }
      }
      
      res.json({ 
        message: "Stops created and connected successfully", 
        stats
      });
    } catch (error) {
      console.error("Error creating stops:", error);
      res.status(500).json({ message: "Failed to create stops" });
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
          status
        }),
        Ticket.countDocuments({ status: 'active' })
      ]);
      
      // Get passenger counts for last 7 days from ticket data
      const today = new Date();
      const passengerCounts = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);
        
        // Query actual ticket count for this day
        const count = await Ticket.countDocuments({
          createdAt
        });
        
        passengerCounts.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count
        });
      }
      
      // Get on-time performance from incident data
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      const totalIncidents = await Incident.countDocuments({
        createdAt
      });
      
      const delayIncidents = await Incident.countDocuments({
        createdAt,
        incidentType: 'delay'
      });
      
      // Total active bus routes
      const totalBusRoutes = await Route.countDocuments({ status: 'active' });
      
      // Calculate percentage (avoid division by zero)
      const potentialTrips = totalBusRoutes * 7; // 7 days of service
      const delayedPercentage = potentialTrips > 0 ? Math.min(100, Math.round((delayIncidents / potentialTrips) * 100)) : 0;
      const onTimePercentage = 100 - delayedPercentage;
      
      const onTimePerformance = {
        onTime,
        delayed
      };
      
      // Get subscription trends from actual subscription data
      const subscriptionPlans = await SubscriptionPlan.find({});
      const subscriptionTrends = [];
      
      for (const plan of subscriptionPlans) {
        const count = await Subscription.countDocuments({
          planId: plan._id,
          status: 'active'
        });
        
        subscriptionTrends.push({
          name: plan.name,
          count
        });
      }
      
      // If no subscription plans exist yet, provide empty array
      if (subscriptionTrends.length === 0) {
        // Get count of tickets by travel date - group them as another metric
        const today = new Date();
        const dailyTickets = await Ticket.countDocuments({
          travelDate
        });
        
        // Add alternative data if no subscriptions
        subscriptionTrends.push(
          { name: 'Single Tickets', count: dailyTickets || 0 }
        );
      }
      
      const analyticsData = {
        counts,
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
async function seedInitialData() {
  try {
    // Check if admin user exists
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      // Create admin user
      const adminUser = new User({
        username: 'admin',
        password: await hashPassword('admin123'),
        email: 'admin@example.com',
        fullName: 'System Administrator',
        role: 'admin'
      });
      await adminUser.save();
      console.log('Admin user created');
      
      // Create passenger user
      const passengerUser = new User({
        username: 'passenger',
        password: await hashPassword('pass123'),
        email: 'passenger@example.com',
        fullName: 'Test Passenger',
        role: 'passenger'
      });
      await passengerUser.save();
      console.log('Passenger user created');
    }

    // Create a test passenger user if it doesn't exist
    const passengerExists = await User.findOne({ role: 'passenger' });
    if (!passengerExists) {
      // Create passenger user
      const passengerUser = new User({
        username: 'passenger',
        password: await hashPassword('pass123'),
        email: 'passenger@example.com',
        fullName: 'Test Passenger',
        role: 'passenger'
      });
      await passengerUser.save();
      console.log('Passenger user created');
    }
    
    console.log('Creating stops and route connections...');
    
    // Check if we have any routes
    const routesCount = await Route.countDocuments();
    
    // If no routes, create at least one
    if (routesCount === 0) {
      const defaultRoute = new Route({
        name: 'City Center Express',
        description: 'Main city route covering major landmarks',
        status: 'active'
      });
      await defaultRoute.save();
      console.log('Created default route Center Express');
    }
    
    // Get all routes for processing
    const routes = await Route.find({});
    console.log(`Found ${routes.length} routes to process`);
    
    // Clear existing RouteStop connections if they're invalid 
    // (helps with fixing problematic stops)
    const existingStops = await Stop.find({});
    if (existingStops.length < 3) {
      // If we have very few stops, it might be a database issue, clear and recreate
      console.log('Not enough stops found. Clearing existing RouteStop connections...');
      await RouteStop.deleteMany({});
    }

    // Create standardized stops for all routes
    for (const route of routes) {
      console.log(`Processing route: ${route.name}...`);
      
      // Standard stop names with clear meaning - expanded to 12 stops
      const stopNames = [
        "Main Bus Terminal",
        "Downtown Center",
        "University Campus",
        "Shopping Mall",
        "Hospital",
        "Train Station",
        "City Park",
        "Business District",
        "Residential Area",
        "Sports Stadium",
        "Convention Center",
        "Airport"
      ];
      
      // Base coordinates (will be slightly varied for each stop)
      const centerLat = 34.0522;
      const centerLng = -118.2437;
      
      // Create or find stops and connect them to this route
      for (let i = 0; i < stopNames.length; i++) {
        const stopName = stopNames[i];
        
        // Add slight variation to coordinates to make them unique
        const lat = centerLat + (Math.random() - 0.5) * 0.1;
        const lng = centerLng + (Math.random() - 0.5) * 0.1;
        
        const location = { lat, lng };
        
        // Try to find existing stop first
        let stop = await Stop.findOne({ name: stopName });
        
        // If stop doesn't exist, create it
        if (!stop) {
          stop = new Stop({
            name: stopName,
            location,
            description: `${stopName} for ${route.name}`
          });
          await stop.save();
          console.log(`Created new stop: ${stopName}`);
        }
        
        // Check if stop is already connected to this route
        const existingConnection = await RouteStop.findOne({
          routeId: route._id,
          stopId: stop._id
        });
        
        // If not connected, create the connection
        if (!existingConnection) {
          const hour = 7 + i;
          const minute = i * 10;
          
          const routeStop = new RouteStop({
            routeId: route._id,
            stopId: stop._id,
            order: i,
            scheduledArrival: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
            scheduledDeparture: `${hour.toString().padStart(2, '0')}:${(minute + 5).toString().padStart(2, '0')}`
          });
          
          await routeStop.save();
          console.log(`Connected ${stopName} to route: ${route.name}`);
        } else {
          console.log(`Stop ${stopName} already connected to route: ${route.name}`);
        }
      }
    }
    
    console.log('Completed creating stops and route connections');
    
    // Verify route connections worked
    const finalStopCount = await Stop.countDocuments();
    const finalConnectionCount = await RouteStop.countDocuments();
    
    console.log(`Verification - Stops: ${finalStopCount}, RouteStop connections: ${finalConnectionCount}`);
    
    return true;
  } catch (error) {
    console.error('Error seeding initial data:', error);
    return false;
  }
}

export { registerRoutes, seedInitialData };