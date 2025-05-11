import express from "express";
import cors from "cors";
import { initializeStorage } from "./mongo-storage";
import { registerRoutes, seedInitialData } from "./mongo-routes";
import { setupAuth } from "./auth";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(cors());
app.use(express.json());

// Error handling middleware
app.use((err, _req, res, _next) => {
  log(`Error: ${err.message}`, "error");
  res.status(500).json({ error: err.message });
});

// Initialize MongoDB and start the server
async function start() {
  try {
    // Initialize MongoDB storage
    const storage = await initializeStorage();
    
    // Set storage in global scope
    global.mongoStorage = storage;
    
    // Setup authentication with the initialized storage
    setupAuth(app);
    
    // Seed initial data including RouteStop connections FIRST
    console.log('Starting data seeding process...');
    await seedInitialData();
    console.log('Data seeding completed');
    
    // Register routes
    const server = await registerRoutes(app);
    
    // Setup Vite for development
    await setupVite(app, server);
    
    // Fallback to static file serving for production builds
    serveStatic(app);
    
    // Start the server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      log(`serving on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();