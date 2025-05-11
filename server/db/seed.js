import { db } from "./index";
import { hashPassword } from "../server/auth";
import { 
  users, insertUserSchema,
  routes, insertRouteSchema,
  stops, insertStopSchema,
  routeStops,
  buses, insertBusSchema,
  subscriptionPlans, insertSubscriptionPlanSchema
} from "@shared/schema";

async function seed() {
  try {
    console.log("Starting to seed database...");

    // Seed users
    const existingUsers = await db.query.users.findMany();
    if (existingUsers.length === 0) {
      console.log("Seeding users...");
      
      const adminUser = insertUserSchema.parse({
        username: "admin",
        password: hashPassword("admin123"),
        email: "admin@bustrack.com",
        role: "admin",
        fullName: "Admin User",
        phone: "123-456-7890"
      });

      const driverUser = insertUserSchema.parse({
        username: "driver1",
        password: hashPassword("driver123"),
        email: "driver1@bustrack.com",
        role: "driver",
        fullName: "John Driver",
        phone: "123-456-7891"
      });

      const driverUser2 = insertUserSchema.parse({
        username: "driver2",
        password: hashPassword("driver123"),
        email: "driver2@bustrack.com",
        role: "driver",
        fullName: "Jane Driver",
        phone: "123-456-7892"
      });

      const passengerUser = insertUserSchema.parse({
        username: "passenger",
        password: hashPassword("passenger123"),
        email: "passenger@bustrack.com",
        role: "passenger",
        fullName: "Sam Passenger",
        phone: "123-456-7893"
      });

      await db.insert(users).values([adminUser, driverUser, driverUser2, passengerUser]);
      console.log("Users seeded successfully");
    } else {
      console.log(`Found ${existingUsers.length} existing users, skipping user seed`);
    }

    // Seed stops
    const existingStops = await db.query.stops.findMany();
    if (existingStops.length === 0) {
      console.log("Seeding stops...");
      
      const stopData = [
        {
          name: "Downtown Terminal",
          location: JSON.stringify({ lat: 37.7749, lng: -122.4194 })
        },
        {
          name: "University Campus",
          location: JSON.stringify({ lat: 37.7755, lng: -122.4143 })
        },
        {
          name: "Shopping District",
          location: JSON.stringify({ lat: 37.7834, lng: -122.4071 })
        },
        {
          name: "Hillside Residences",
          location: JSON.stringify({ lat: 37.7699, lng: -122.4304 })
        },
        {
          name: "Tech Park",
          location: JSON.stringify({ lat: 37.7827, lng: -122.4382 })
        },
        {
          name: "Hospital Center",
          location: JSON.stringify({ lat: 37.7634, lng: -122.4577 })
        }
      ];

      const validatedStops = stopData.map(stop => insertStopSchema.parse(stop));
      await db.insert(stops).values(validatedStops);
      console.log("Stops seeded successfully");
    } else {
      console.log(`Found ${existingStops.length} existing stops, skipping stop seed`);
    }

    // Seed routes
    const existingRoutes = await db.query.routes.findMany();
    if (existingRoutes.length === 0) {
      console.log("Seeding routes...");
      
      const routeData = [
        {
          name: "Downtown Express",
          description: "Express service connecting downtown to major hubs",
          status: "active"
        },
        {
          name: "University Line",
          description: "Route servicing university campus and surrounding areas",
          status: "active"
        },
        {
          name: "Hospital Shuttle",
          description: "Direct service to Hospital Center with limited stops",
          status: "active"
        }
      ];

      const validatedRoutes = routeData.map(route => insertRouteSchema.parse(route));
      await db.insert(routes).values(validatedRoutes);
      console.log("Routes seeded successfully");
    } else {
      console.log(`Found ${existingRoutes.length} existing routes, skipping route seed`);
    }

    // Seed route stops
    const existingRouteStops = await db.query.routeStops.findMany();
    if (existingRouteStops.length === 0) {
      console.log("Seeding route stops...");
      
      // Get IDs for reference
      const allRoutes = await db.query.routes.findMany();
      const allStops = await db.query.stops.findMany();

      if (allRoutes.length > 0 && allStops.length >= 6) {
        const routeStopData = [
          // Route 1 stops
          {
            routeId: allRoutes[0].id,
            stopId: allStops[0].id,
            order: 1,
            scheduledArrival: "08:00",
            scheduledDeparture: "08:10"
          },
          {
            routeId: allRoutes[0].id,
            stopId: allStops[2].id,
            order: 2,
            scheduledArrival: "08:25",
            scheduledDeparture: "08:30"
          },
          {
            routeId: allRoutes[0].id,
            stopId: allStops[4].id,
            order: 3,
            scheduledArrival: "08:45",
            scheduledDeparture: "08:50"
          },
          // Route 2 stops
          {
            routeId: allRoutes[1].id,
            stopId: allStops[0].id,
            order: 1,
            scheduledArrival: "09:00",
            scheduledDeparture: "09:10"
          },
          {
            routeId: allRoutes[1].id,
            stopId: allStops[1].id,
            order: 2,
            scheduledArrival: "09:20",
            scheduledDeparture: "09:25"
          },
          {
            routeId: allRoutes[1].id,
            stopId: allStops[3].id,
            order: 3,
            scheduledArrival: "09:40",
            scheduledDeparture: "09:45"
          },
          // Route 3 stops
          {
            routeId: allRoutes[2].id,
            stopId: allStops[0].id,
            order: 1,
            scheduledArrival: "10:00",
            scheduledDeparture: "10:10"
          },
          {
            routeId: allRoutes[2].id,
            stopId: allStops[5].id,
            order: 2,
            scheduledArrival: "10:30",
            scheduledDeparture: "10:40"
          }
        ];

        await db.insert(routeStops).values(routeStopData);
        console.log("Route stops seeded successfully");
      } else {
        console.log("Not enough routes or stops to create route stops");
      }
    } else {
      console.log(`Found ${existingRouteStops.length} existing route stops, skipping route stops seed`);
    }

    // Seed buses
    const existingBuses = await db.query.buses.findMany();
    if (existingBuses.length === 0) {
      console.log("Seeding buses...");
      
      // Get driver IDs for reference
      const drivers = await db.query.users.findMany({
        where: (users, { eq }) => eq(users.role, "driver")
      });

      // Get route IDs for reference
      const allRoutes = await db.query.routes.findMany();

      if (drivers.length > 0 && allRoutes.length > 0) {
        const busData = [
          {
            busNumber: "B101",
            capacity: 40,
            status: "active",
            currentLocation: JSON.stringify({ lat: 37.7749, lng: -122.4194 }),
            driverId: drivers[0].id,
            routeId: allRoutes[0].id
          },
          {
            busNumber: "B102",
            capacity: 35,
            status: "active",
            currentLocation: JSON.stringify({ lat: 37.7755, lng: -122.4143 }),
            driverId: drivers.length > 1 ? drivers[1].id : drivers[0].id,
            routeId: allRoutes[1].id
          },
          {
            busNumber: "B103",
            capacity: 30,
            status: "inactive",
            currentLocation,
            driverId,
            routeId
          }
        ];

        const validatedBuses = busData.map(bus => insertBusSchema.parse(bus));
        await db.insert(buses).values(validatedBuses);
        console.log("Buses seeded successfully");
      } else {
        console.log("Not enough drivers or routes to create buses");
      }
    } else {
      console.log(`Found ${existingBuses.length} existing buses, skipping bus seed`);
    }

    // Seed subscription plans
    const existingPlans = await db.query.subscriptionPlans.findMany();
    if (existingPlans.length === 0) {
      console.log("Seeding subscription plans...");
      
      const planData = [
        {
          name: "Daily Pass",
          description: "Unlimited rides for 24 hours",
          duration: 1,
          price: 599 // $5.99
        },
        {
          name: "Weekly Pass",
          description: "Unlimited rides for 7 days",
          duration: 7,
          price: 2999 // $29.99
        },
        {
          name: "Monthly Pass",
          description: "Unlimited rides for 30 days with priority boarding",
          duration: 30,
          price: 9999 // $99.99
        }
      ];

      const validatedPlans = planData.map(plan => insertSubscriptionPlanSchema.parse(plan));
      await db.insert(subscriptionPlans).values(validatedPlans);
      console.log("Subscription plans seeded successfully");
    } else {
      console.log(`Found ${existingPlans.length} existing subscription plans, skipping plan seed`);
    }

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
