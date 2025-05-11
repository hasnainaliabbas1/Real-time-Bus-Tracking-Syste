import { pgTable, primaryKey } from "drizzle-orm/pg-core";
import { serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core/columns";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// Define location type and use it in the schema
type LocationType = {
  lat: number;
  lng: number;
};

// Type guard to validate location data
export const isValidLocation = (location: unknown): location is LocationType => {
  if (typeof location !== 'object' || !location) return false;
  const loc = location as any;
  return typeof loc.lat === 'number' && typeof loc.lng === 'number';
};

// User related tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["passenger", "driver", "admin"] }).notNull().default("passenger"),
  fullName: text("full_name"),
  phone: text("phone"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users, {
  username: (schema) => schema.min(3, "Username must be at least 3 characters"),
  password: (schema) => schema.min(6, "Password must be at least 6 characters"),
  email: (schema) => schema.email("Must provide a valid email"),
  role: (schema) => schema.refine(val => ["passenger", "driver", "admin"].includes(val), "Invalid role"),
});

// Bus related tables
export const buses = pgTable("buses", {
  id: serial("id").primaryKey(),
  busNumber: text("bus_number").notNull().unique(),
  capacity: integer("capacity").notNull(),
  status: text("status", { enum: ["active", "inactive", "maintenance"] }).notNull().default("inactive"),
  currentLocation: jsonb("current_location"),
  driverId: integer("driver_id").references(() => users.id),
  routeId: integer("route_id").references(() => routes.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const insertBusSchema = createInsertSchema(buses, {
  busNumber: (schema) => schema.min(2, "Bus number must be at least 2 characters"),
  capacity: (schema) => schema.min(1, "Capacity must be at least 1"),
});

// Route related tables
export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRouteSchema = createInsertSchema(routes, {
  name: (schema) => schema.min(3, "Route name must be at least 3 characters"),
});

export const stops = pgTable("stops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: jsonb("location"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const insertStopSchema = createInsertSchema(stops, {
  name: (schema) => schema.min(3, "Stop name must be at least 3 characters"),
});

export const routeStops = pgTable("route_stops", {
  routeId: integer("route_id").notNull().references(() => routes.id),
  stopId: integer("stop_id").notNull().references(() => stops.id),
  order: integer("order").notNull(),
  scheduledArrival: text("scheduled_arrival"),
  scheduledDeparture: text("scheduled_departure"),
}, (t) => ({
  pk: primaryKey({ columns: [t.routeId, t.stopId] }),
}));

// Ticket related tables
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  routeId: integer("route_id").references(() => routes.id).notNull(),
  fromStopId: integer("from_stop_id").references(() => stops.id).notNull(),
  toStopId: integer("to_stop_id").references(() => stops.id).notNull(),
  departureTime: timestamp("departure_time").notNull(),
  status: text("status", { enum: ["active", "used", "expired", "cancelled"] }).notNull().default("active"),
  qrCode: text("qr_code").notNull(),
  price: integer("price").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTicketSchema = createInsertSchema(tickets);

// Subscription related tables
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(), // in days
  price: integer("price").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans);

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  planId: integer("plan_id").references(() => subscriptionPlans.id).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status", { enum: ["active", "expired", "cancelled"] }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions);

// Incident related tables
export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
  busId: integer("bus_id").references(() => buses.id).notNull(),
  reportedBy: integer("reported_by").references(() => users.id).notNull(),
  incidentType: text("incident_type", { enum: ["delay", "breakdown", "accident", "other"] }).notNull(),
  description: text("description").notNull(),
  location: jsonb("location"),
  status: text("status", { enum: ["reported", "in_progress", "resolved"] }).notNull().default("reported"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { mode: "date" }),
});

export const insertIncidentSchema = createInsertSchema(incidents);

// Saved routes for passengers
export const savedRoutes = pgTable("saved_routes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  routeId: integer("route_id").references(() => routes.id).notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSavedRouteSchema = createInsertSchema(savedRoutes);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  buses: many(buses),
  tickets: many(tickets),
  subscriptions: many(subscriptions),
  incidents: many(incidents),
  savedRoutes: many(savedRoutes),
}));

export const busesRelations = relations(buses, ({ one, many }) => ({
  driver: one(users, { fields: [buses.driverId], references: [users.id] }),
  route: one(routes, { fields: [buses.routeId], references: [routes.id] }),
  incidents: many(incidents),
}));

export const routesRelations = relations(routes, ({ many }) => ({
  buses: many(buses),
  routeStops: many(routeStops),
  tickets: many(tickets),
  savedRoutes: many(savedRoutes),
}));

export const stopsRelations = relations(stops, ({ many }) => ({
  routeStops: many(routeStops),
  fromTickets: many(tickets, { relationName: "fromStop" }),
  toTickets: many(tickets, { relationName: "toStop" }),
}));

export const routeStopsRelations = relations(routeStops, ({ one }) => ({
  route: one(routes, { fields: [routeStops.routeId], references: [routes.id] }),
  stop: one(stops, { fields: [routeStops.stopId], references: [stops.id] }),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  user: one(users, { fields: [tickets.userId], references: [users.id] }),
  route: one(routes, { fields: [tickets.routeId], references: [routes.id] }),
  fromStop: one(stops, { fields: [tickets.fromStopId], references: [stops.id], relationName: "fromStop" }),
  toStop: one(stops, { fields: [tickets.toStopId], references: [stops.id], relationName: "toStop" }),
}));

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
  plan: one(subscriptionPlans, { fields: [subscriptions.planId], references: [subscriptionPlans.id] }),
}));

export const incidentsRelations = relations(incidents, ({ one }) => ({
  bus: one(buses, { fields: [incidents.busId], references: [buses.id] }),
  reporter: one(users, { fields: [incidents.reportedBy], references: [users.id] }),
}));

export const savedRoutesRelations = relations(savedRoutes, ({ one }) => ({
  user: one(users, { fields: [savedRoutes.userId], references: [users.id] }),
  route: one(routes, { fields: [savedRoutes.routeId], references: [routes.id] }),
})); 