import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { db } from "@db";
import { 
  buses, routes, stops, routeStops, tickets, 
  subscriptionPlans, subscriptions, incidents, savedRoutes,
  insertBusSchema, insertRouteSchema, insertStopSchema,
  insertTicketSchema, insertSubscriptionPlanSchema, 
  insertSubscriptionSchema, insertIncidentSchema, insertSavedRouteSchema
} from "@shared/schema";
import { eq, and, desc, or } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  setupAuth(app);

  const httpServer = createServer(app);

  // WebSocket server setup for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const connectedClients: Map<string, { ws: WebSocket, role: string, userId: number }> = new Map();

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
            const activeBuses = await db.query.buses.findMany({
              where: eq(buses.status, 'active'),
              with: {
                route: {
                  with: {
                    routeStops: {
                      with: {
                        stop: true,
                      },
                    },
                  },
                },
              },
            });
            
            ws.send(JSON.stringify({
              type: 'busLocations',
              data: activeBuses
            }));
          } else if (data.role === 'driver') {
            const driverBus = await db.query.buses.findFirst({
              where: eq(buses.driverId, data.userId),
              with: {
                route: {
                  with: {
                    routeStops: {
                      with: {
                        stop: true,
                      },
                      orderBy: (fields, operators) => operators.asc(fields.order),
                    },
                  },
                },
              },
            });
            
            if (driverBus) {
              ws.send(JSON.stringify({
                type: 'busRoute',
                data: driverBus
              }));
            }
          }
        } else if (data.type === 'updateLocation' && data.location) {
          const client = connectedClients.get(clientId);
          if (client?.role === 'driver') {
            // Update driver's bus location
            const driverBus = await db.query.buses.findFirst({
              where: eq(buses.driverId, client.userId),
            });
            
            if (driverBus) {
              await db.update(buses)
                .set({ currentLocation: data.location })
                .where(eq(buses.id, driverBus.id));
              
              // Broadcast to passengers
              for (const [, client] of connectedClients) {
                if (client.role === 'passenger' && client.ws.readyState === WebSocket.OPEN) {
                  client.ws.send(JSON.stringify({
                    type: 'busLocationUpdate',
                    data: {
                      busId: driverBus.id,
                      location: data.location
                    }
                  }));
                }
              }
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
  // Bus management routes
  // ===========================
  // Get all buses with their routes and drivers
  app.get("/api/buses", async (req, res) => {
    try {
      const allBuses = await db.query.buses.findMany({
        with: {
          driver: true,
          route: true,
        },
        orderBy: desc(buses.createdAt),
      });
      res.json(allBuses);
    } catch (error) {
      console.error("Error fetching buses:", error);
      res.status(500).json({ message: "Failed to fetch buses" });
    }
  });

  // Get a specific bus by id
  app.get("/api/buses/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const bus = await db.query.buses.findFirst({
        where: eq(buses.id, parseInt(id)),
        with: {
          driver: true,
          route: {
            with: {
              routeStops: {
                with: {
                  stop: true,
                },
                orderBy: (fields, operators) => operators.asc(fields.order),
              },
            },
          },
        },
      });
      
      if (!bus) {
        return res.status(404).json({ message: "Bus not found" });
      }
      
      res.json(bus);
    } catch (error) {
      console.error("Error fetching bus:", error);
      res.status(500).json({ message: "Failed to fetch bus" });
    }
  });

  // Create a new bus
  app.post("/api/buses", async (req, res) => {
    try {
      const validatedData = insertBusSchema.parse(req.body);
      const [newBus] = await db.insert(buses).values(validatedData).returning();
      res.status(201).json(newBus);
    } catch (error) {
      console.error("Error creating bus:", error);
      res.status(500).json({ message: "Failed to create bus" });
    }
  });

  // Update a bus
  app.put("/api/buses/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertBusSchema.parse(req.body);
      const [updatedBus] = await db.update(buses)
        .set(validatedData)
        .where(eq(buses.id, parseInt(id)))
        .returning();
      
      if (!updatedBus) {
        return res.status(404).json({ message: "Bus not found" });
      }
      
      res.json(updatedBus);
    } catch (error) {
      console.error("Error updating bus:", error);
      res.status(500).json({ message: "Failed to update bus" });
    }
  });

  // Delete a bus
  app.delete("/api/buses/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [deletedBus] = await db.delete(buses)
        .where(eq(buses.id, parseInt(id)))
        .returning();
      
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
  // Get all routes with their stops
  app.get("/api/routes", async (req, res) => {
    try {
      const allRoutes = await db.query.routes.findMany({
        with: {
          routeStops: {
            with: {
              stop: true,
            },
            orderBy: (fields, operators) => operators.asc(fields.order),
          },
        },
        orderBy: desc(routes.createdAt),
      });
      res.json(allRoutes);
    } catch (error) {
      console.error("Error fetching routes:", error);
      res.status(500).json({ message: "Failed to fetch routes" });
    }
  });

  // Get a specific route by id
  app.get("/api/routes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const route = await db.query.routes.findFirst({
        where: eq(routes.id, parseInt(id)),
        with: {
          routeStops: {
            with: {
              stop: true,
            },
            orderBy: (fields, operators) => operators.asc(fields.order),
          },
          buses: true,
        },
      });
      
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      res.json(route);
    } catch (error) {
      console.error("Error fetching route:", error);
      res.status(500).json({ message: "Failed to fetch route" });
    }
  });

  // Create a new route with stops
  app.post("/api/routes", async (req, res) => {
    try {
      const { name, description, status, stops: routeStopsList } = req.body;
      
      const validatedRouteData = insertRouteSchema.parse({ name, description, status });
      const [newRoute] = await db.insert(routes).values(validatedRouteData).returning();
      
      // Add stops if provided
      if (routeStopsList && Array.isArray(routeStopsList) && routeStopsList.length > 0) {
        const routeStopsData = routeStopsList.map((stop, index) => ({
          routeId: newRoute.id,
          stopId: stop.stopId,
          order: index,
          scheduledArrival: stop.scheduledArrival,
          scheduledDeparture: stop.scheduledDeparture,
        }));
        
        await db.insert(routeStops).values(routeStopsData);
      }
      
      const createdRoute = await db.query.routes.findFirst({
        where: eq(routes.id, newRoute.id),
        with: {
          routeStops: {
            with: {
              stop: true,
            },
            orderBy: (fields, operators) => operators.asc(fields.order),
          },
        },
      });
      
      res.status(201).json(createdRoute);
    } catch (error) {
      console.error("Error creating route:", error);
      res.status(500).json({ message: "Failed to create route" });
    }
  });

  // Update a route and its stops
  app.put("/api/routes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, status, stops: routeStopsList } = req.body;
      
      const validatedRouteData = insertRouteSchema.parse({ name, description, status });
      const [updatedRoute] = await db.update(routes)
        .set(validatedRouteData)
        .where(eq(routes.id, parseInt(id)))
        .returning();
      
      if (!updatedRoute) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      // Update stops if provided
      if (routeStopsList && Array.isArray(routeStopsList)) {
        // Delete existing route stops
        await db.delete(routeStops)
          .where(eq(routeStops.routeId, updatedRoute.id));
        
        // Add new route stops
        if (routeStopsList.length > 0) {
          const routeStopsData = routeStopsList.map((stop, index) => ({
            routeId: updatedRoute.id,
            stopId: stop.stopId,
            order: index,
            scheduledArrival: stop.scheduledArrival,
            scheduledDeparture: stop.scheduledDeparture,
          }));
          
          await db.insert(routeStops).values(routeStopsData);
        }
      }
      
      const refreshedRoute = await db.query.routes.findFirst({
        where: eq(routes.id, updatedRoute.id),
        with: {
          routeStops: {
            with: {
              stop: true,
            },
            orderBy: (fields, operators) => operators.asc(fields.order),
          },
        },
      });
      
      res.json(refreshedRoute);
    } catch (error) {
      console.error("Error updating route:", error);
      res.status(500).json({ message: "Failed to update route" });
    }
  });

  // Delete a route and its stops
  app.delete("/api/routes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Delete route stops first
      await db.delete(routeStops)
        .where(eq(routeStops.routeId, parseInt(id)));
      
      // Delete the route
      const [deletedRoute] = await db.delete(routes)
        .where(eq(routes.id, parseInt(id)))
        .returning();
      
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
  // Stops management
  // ===========================
  // Get all stops
  app.get("/api/stops", async (req, res) => {
    try {
      const allStops = await db.query.stops.findMany({
        orderBy: desc(stops.createdAt),
      });
      res.json(allStops);
    } catch (error) {
      console.error("Error fetching stops:", error);
      res.status(500).json({ message: "Failed to fetch stops" });
    }
  });

  // Get a specific stop by id
  app.get("/api/stops/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const stop = await db.query.stops.findFirst({
        where: eq(stops.id, parseInt(id)),
      });
      
      if (!stop) {
        return res.status(404).json({ message: "Stop not found" });
      }
      
      res.json(stop);
    } catch (error) {
      console.error("Error fetching stop:", error);
      res.status(500).json({ message: "Failed to fetch stop" });
    }
  });

  // Create a new stop
  app.post("/api/stops", async (req, res) => {
    try {
      const validatedData = insertStopSchema.parse(req.body);
      const [newStop] = await db.insert(stops).values(validatedData).returning();
      res.status(201).json(newStop);
    } catch (error) {
      console.error("Error creating stop:", error);
      res.status(500).json({ message: "Failed to create stop" });
    }
  });

  // Update a stop
  app.put("/api/stops/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertStopSchema.parse(req.body);
      const [updatedStop] = await db.update(stops)
        .set(validatedData)
        .where(eq(stops.id, parseInt(id)))
        .returning();
      
      if (!updatedStop) {
        return res.status(404).json({ message: "Stop not found" });
      }
      
      res.json(updatedStop);
    } catch (error) {
      console.error("Error updating stop:", error);
      res.status(500).json({ message: "Failed to update stop" });
    }
  });

  // Delete a stop
  app.delete("/api/stops/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if stop is used in any route
      const routeStop = await db.query.routeStops.findFirst({
        where: eq(routeStops.stopId, parseInt(id)),
      });
      
      if (routeStop) {
        return res.status(400).json({ message: "Stop is used in a route and cannot be deleted" });
      }
      
      const [deletedStop] = await db.delete(stops)
        .where(eq(stops.id, parseInt(id)))
        .returning();
      
      if (!deletedStop) {
        return res.status(404).json({ message: "Stop not found" });
      }
      
      res.json({ message: "Stop deleted successfully" });
    } catch (error) {
      console.error("Error deleting stop:", error);
      res.status(500).json({ message: "Failed to delete stop" });
    }
  });

  // ===========================
  // Ticket management
  // ===========================
  // Get all tickets for the current user
  app.get("/api/tickets", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const userTickets = await db.query.tickets.findMany({
        where: eq(tickets.userId, req.user.id),
        with: {
          route: true,
          fromStop: true,
          toStop: true,
        },
        orderBy: desc(tickets.createdAt),
      });
      
      res.json(userTickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  // Get a specific ticket by id
  app.get("/api/tickets/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { id } = req.params;
      const ticket = await db.query.tickets.findFirst({
        where: and(
          eq(tickets.id, parseInt(id)),
          // If admin, allow access to any ticket. Otherwise, only allow access to user's own tickets
          req.user.role === 'admin' ? undefined : eq(tickets.userId, req.user.id)
        ),
        with: {
          route: true,
          fromStop: true,
          toStop: true,
        },
      });
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      res.json(ticket);
    } catch (error) {
      console.error("Error fetching ticket:", error);
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });

  // Book a new ticket
  app.post("/api/tickets", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const ticketData = {
        ...req.body,
        userId: req.user.id,
        qrCode: `TICKET-${nanoid(10)}`,
      };
      
      const validatedData = insertTicketSchema.parse(ticketData);
      const [newTicket] = await db.insert(tickets).values(validatedData).returning();
      
      const ticketWithDetails = await db.query.tickets.findFirst({
        where: eq(tickets.id, newTicket.id),
        with: {
          route: true,
          fromStop: true,
          toStop: true,
        },
      });
      
      res.status(201).json(ticketWithDetails);
    } catch (error) {
      console.error("Error booking ticket:", error);
      res.status(500).json({ message: "Failed to book ticket" });
    }
  });

  // Validate a ticket (for drivers)
  app.post("/api/tickets/validate", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'driver') {
      return res.status(403).json({ message: "Permission denied" });
    }

    try {
      const { qrCode } = req.body;
      
      if (!qrCode) {
        return res.status(400).json({ message: "QR code is required" });
      }
      
      const ticket = await db.query.tickets.findFirst({
        where: eq(tickets.qrCode, qrCode),
        with: {
          route: true,
          fromStop: true,
          toStop: true,
          user: true,
        },
      });
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found", valid: false });
      }
      
      const isValid = ticket.status === 'active';
      
      // Mark the ticket as used if it's valid
      if (isValid) {
        await db.update(tickets)
          .set({ status: 'used' })
          .where(eq(tickets.id, ticket.id));
          
        ticket.status = 'used';
      }
      
      res.json({
        valid: isValid,
        ticket: {
          ...ticket,
          user: {
            id: ticket.user.id,
            username: ticket.user.username,
            fullName: ticket.user.fullName,
          },
        },
      });
    } catch (error) {
      console.error("Error validating ticket:", error);
      res.status(500).json({ message: "Failed to validate ticket" });
    }
  });

  // ===========================
  // Subscription plans management
  // ===========================
  // Get all subscription plans
  app.get("/api/subscription-plans", async (req, res) => {
    try {
      const plans = await db.query.subscriptionPlans.findMany({
        orderBy: (fields, operators) => operators.asc(fields.price),
      });
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Get a specific subscription plan
  app.get("/api/subscription-plans/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const plan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.id, parseInt(id)),
      });
      
      if (!plan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }
      
      res.json(plan);
    } catch (error) {
      console.error("Error fetching subscription plan:", error);
      res.status(500).json({ message: "Failed to fetch subscription plan" });
    }
  });

  // Create a new subscription plan (admin only)
  app.post("/api/subscription-plans", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).json({ message: "Permission denied" });
    }

    try {
      const validatedData = insertSubscriptionPlanSchema.parse(req.body);
      const [newPlan] = await db.insert(subscriptionPlans).values(validatedData).returning();
      res.status(201).json(newPlan);
    } catch (error) {
      console.error("Error creating subscription plan:", error);
      res.status(500).json({ message: "Failed to create subscription plan" });
    }
  });

  // Update a subscription plan (admin only)
  app.put("/api/subscription-plans/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).json({ message: "Permission denied" });
    }

    try {
      const { id } = req.params;
      const validatedData = insertSubscriptionPlanSchema.parse(req.body);
      const [updatedPlan] = await db.update(subscriptionPlans)
        .set(validatedData)
        .where(eq(subscriptionPlans.id, parseInt(id)))
        .returning();
      
      if (!updatedPlan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }
      
      res.json(updatedPlan);
    } catch (error) {
      console.error("Error updating subscription plan:", error);
      res.status(500).json({ message: "Failed to update subscription plan" });
    }
  });

  // Delete a subscription plan (admin only)
  app.delete("/api/subscription-plans/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).json({ message: "Permission denied" });
    }

    try {
      const { id } = req.params;
      
      // Check if the plan is used by any subscription
      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.planId, parseInt(id)),
      });
      
      if (subscription) {
        return res.status(400).json({ message: "Subscription plan is in use and cannot be deleted" });
      }
      
      const [deletedPlan] = await db.delete(subscriptionPlans)
        .where(eq(subscriptionPlans.id, parseInt(id)))
        .returning();
      
      if (!deletedPlan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }
      
      res.json({ message: "Subscription plan deleted successfully" });
    } catch (error) {
      console.error("Error deleting subscription plan:", error);
      res.status(500).json({ message: "Failed to delete subscription plan" });
    }
  });

  // ===========================
  // User subscriptions management
  // ===========================
  // Get all subscriptions for the current user
  app.get("/api/subscriptions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const userSubscriptions = await db.query.subscriptions.findMany({
        where: eq(subscriptions.userId, req.user.id),
        with: {
          plan: true,
        },
        orderBy: desc(subscriptions.createdAt),
      });
      
      res.json(userSubscriptions);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  // Subscribe to a plan
  app.post("/api/subscriptions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { planId } = req.body;
      
      // Get the subscription plan
      const plan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.id, planId),
      });
      
      if (!plan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }
      
      // Calculate start and end dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.duration);
      
      const subscriptionData = {
        userId: req.user.id,
        planId,
        startDate,
        endDate,
        status: 'active',
      };
      
      const validatedData = insertSubscriptionSchema.parse(subscriptionData);
      const [newSubscription] = await db.insert(subscriptions).values(validatedData).returning();
      
      const subscriptionWithDetails = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.id, newSubscription.id),
        with: {
          plan: true,
        },
      });
      
      res.status(201).json(subscriptionWithDetails);
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  // Cancel a subscription
  app.post("/api/subscriptions/:id/cancel", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { id } = req.params;
      
      // Check if the subscription belongs to the user
      const subscription = await db.query.subscriptions.findFirst({
        where: and(
          eq(subscriptions.id, parseInt(id)),
          eq(subscriptions.userId, req.user.id)
        ),
      });
      
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      
      // Cancel the subscription
      const [updatedSubscription] = await db.update(subscriptions)
        .set({ status: 'cancelled' })
        .where(eq(subscriptions.id, parseInt(id)))
        .returning();
      
      res.json(updatedSubscription);
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // ===========================
  // Incident reporting
  // ===========================
  // Get all incidents (admin or specific driver)
  app.get("/api/incidents", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      let query;
      
      if (req.user.role === 'admin') {
        // Admins can see all incidents
        query = db.query.incidents.findMany({
          with: {
            bus: true,
            reporter: true,
          },
          orderBy: desc(incidents.createdAt),
        });
      } else if (req.user.role === 'driver') {
        // Drivers can see incidents for their assigned bus
        const driverBus = await db.query.buses.findFirst({
          where: eq(buses.driverId, req.user.id),
        });
        
        if (!driverBus) {
          return res.json([]);
        }
        
        query = db.query.incidents.findMany({
          where: eq(incidents.busId, driverBus.id),
          with: {
            bus: true,
            reporter: true,
          },
          orderBy: desc(incidents.createdAt),
        });
      } else {
        // Passengers can see incidents they reported
        query = db.query.incidents.findMany({
          where: eq(incidents.reportedBy, req.user.id),
          with: {
            bus: true,
          },
          orderBy: desc(incidents.createdAt),
        });
      }
      
      const incidentsList = await query;
      res.json(incidentsList);
    } catch (error) {
      console.error("Error fetching incidents:", error);
      res.status(500).json({ message: "Failed to fetch incidents" });
    }
  });

  // Report an incident
  app.post("/api/incidents", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const incidentData = {
        ...req.body,
        reportedBy: req.user.id,
      };
      
      const validatedData = insertIncidentSchema.parse(incidentData);
      const [newIncident] = await db.insert(incidents).values(validatedData).returning();
      
      const incidentWithDetails = await db.query.incidents.findFirst({
        where: eq(incidents.id, newIncident.id),
        with: {
          bus: true,
          reporter: true,
        },
      });
      
      // Notify admin users via WebSocket
      for (const [, client] of connectedClients) {
        if (client.role === 'admin' && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({
            type: 'newIncident',
            data: incidentWithDetails
          }));
        }
      }
      
      res.status(201).json(incidentWithDetails);
    } catch (error) {
      console.error("Error reporting incident:", error);
      res.status(500).json({ message: "Failed to report incident" });
    }
  });

  // Update incident status (admin only)
  app.put("/api/incidents/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).json({ message: "Permission denied" });
    }

    try {
      const { id } = req.params;
      const { status } = req.body;
      
      // Validate status
      if (!['reported', 'in_progress', 'resolved'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // Get the existing incident
      const incident = await db.query.incidents.findFirst({
        where: eq(incidents.id, parseInt(id)),
      });
      
      if (!incident) {
        return res.status(404).json({ message: "Incident not found" });
      }
      
      // Update the incident
      const updateData: any = { status };
      
      // If status is resolved, set resolvedAt
      if (status === 'resolved') {
        updateData.resolvedAt = new Date();
      }
      
      const [updatedIncident] = await db.update(incidents)
        .set(updateData)
        .where(eq(incidents.id, parseInt(id)))
        .returning();
      
      const incidentWithDetails = await db.query.incidents.findFirst({
        where: eq(incidents.id, updatedIncident.id),
        with: {
          bus: true,
          reporter: true,
        },
      });
      
      res.json(incidentWithDetails);
    } catch (error) {
      console.error("Error updating incident:", error);
      res.status(500).json({ message: "Failed to update incident" });
    }
  });

  // ===========================
  // Saved routes for passengers
  // ===========================
  // Get saved routes for the current user
  app.get("/api/saved-routes", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'passenger') {
      return res.status(403).json({ message: "Permission denied" });
    }

    try {
      const userSavedRoutes = await db.query.savedRoutes.findMany({
        where: eq(savedRoutes.userId, req.user.id),
        with: {
          route: {
            with: {
              routeStops: {
                with: {
                  stop: true,
                },
                orderBy: (fields, operators) => operators.asc(fields.order),
              },
            },
          },
        },
        orderBy: desc(savedRoutes.createdAt),
      });
      
      res.json(userSavedRoutes);
    } catch (error) {
      console.error("Error fetching saved routes:", error);
      res.status(500).json({ message: "Failed to fetch saved routes" });
    }
  });

  // Save a route
  app.post("/api/saved-routes", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'passenger') {
      return res.status(403).json({ message: "Permission denied" });
    }

    try {
      const savedRouteData = {
        ...req.body,
        userId: req.user.id,
      };
      
      // Check if route exists
      const route = await db.query.routes.findFirst({
        where: eq(routes.id, savedRouteData.routeId),
      });
      
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      // Check if already saved
      const existingSavedRoute = await db.query.savedRoutes.findFirst({
        where: and(
          eq(savedRoutes.userId, req.user.id),
          eq(savedRoutes.routeId, savedRouteData.routeId)
        ),
      });
      
      if (existingSavedRoute) {
        return res.status(400).json({ message: "Route already saved" });
      }
      
      const validatedData = insertSavedRouteSchema.parse(savedRouteData);
      const [newSavedRoute] = await db.insert(savedRoutes).values(validatedData).returning();
      
      const savedRouteWithDetails = await db.query.savedRoutes.findFirst({
        where: eq(savedRoutes.id, newSavedRoute.id),
        with: {
          route: {
            with: {
              routeStops: {
                with: {
                  stop: true,
                },
                orderBy: (fields, operators) => operators.asc(fields.order),
              },
            },
          },
        },
      });
      
      res.status(201).json(savedRouteWithDetails);
    } catch (error) {
      console.error("Error saving route:", error);
      res.status(500).json({ message: "Failed to save route" });
    }
  });

  // Delete a saved route
  app.delete("/api/saved-routes/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'passenger') {
      return res.status(403).json({ message: "Permission denied" });
    }

    try {
      const { id } = req.params;
      
      // Check if the saved route belongs to the user
      const savedRoute = await db.query.savedRoutes.findFirst({
        where: and(
          eq(savedRoutes.id, parseInt(id)),
          eq(savedRoutes.userId, req.user.id)
        ),
      });
      
      if (!savedRoute) {
        return res.status(404).json({ message: "Saved route not found" });
      }
      
      const [deletedSavedRoute] = await db.delete(savedRoutes)
        .where(eq(savedRoutes.id, parseInt(id)))
        .returning();
      
      res.json({ message: "Saved route removed successfully" });
    } catch (error) {
      console.error("Error deleting saved route:", error);
      res.status(500).json({ message: "Failed to delete saved route" });
    }
  });

  // ===========================
  // Analytics for admins
  // ===========================
  app.get("/api/analytics", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).json({ message: "Permission denied" });
    }

    try {
      // Get counts
      const [activeDrivers, activeBuses, delayedBuses, activeTickets] = await Promise.all([
        db.query.users.findMany({
          where: eq(users.role, 'driver'),
          columns: { id: true },
        }),
        db.query.buses.findMany({
          where: eq(buses.status, 'active'),
          columns: { id: true },
        }),
        db.query.incidents.findMany({
          where: and(
            eq(incidents.incidentType, 'delay'),
            or(
              eq(incidents.status, 'reported'),
              eq(incidents.status, 'in_progress')
            )
          ),
          columns: { id: true },
        }),
        db.query.tickets.findMany({
          where: eq(tickets.status, 'active'),
          columns: { id: true },
        }),
      ]);

      // Get ticket counts per day (last 7 days)
      const pastDays = 7;
      const currentDate = new Date();
      const dateRanges = Array.from({ length: pastDays }, (_, i) => {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      });

      // Note: This is a simplified analytics implementation.
      // In a production system, you would probably want to use more sophisticated
      // queries and aggregate data over time periods.

      const analyticsData = {
        counts: {
          activeDrivers: activeDrivers.length,
          activeBuses: activeBuses.length,
          delayedBuses: delayedBuses.length,
          activeTickets: activeTickets.length,
        },
        // For demo purposes, generate some random data for the charts
        passengerCounts: dateRanges.map(date => ({
          date,
          count: Math.floor(Math.random() * 200) + 50
        })),
        onTimePerformance: {
          onTime: Math.floor(Math.random() * 80) + 20,
          delayed: Math.floor(Math.random() * 20),
        },
        subscriptionTrends: [
          { name: 'Daily Pass', count: Math.floor(Math.random() * 100) + 50 },
          { name: 'Weekly Pass', count: Math.floor(Math.random() * 80) + 20 },
          { name: 'Monthly Pass', count: Math.floor(Math.random() * 60) + 10 },
        ],
      };

      res.json(analyticsData);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  return httpServer;
}
