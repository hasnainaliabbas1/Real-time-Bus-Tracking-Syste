import express from "express";
import cors from "cors";
import { setupVite, serveStatic, log } from "./vite.js";
import { initializeStorage } from "./mongo-storage.js";
import { registerRoutes } from "./mongo-routes.js";
import { setupAuth } from "./auth.js";
import { createServer } from 'http';
import { setupWebSocketServer } from './websocket.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

async function startServer() {
  try {
    // Initialize MongoDB storage
    const storage = await initializeStorage();
    
    // Set storage in global scope for access in auth and routes
    global.mongoStorage = storage;
    
    // Setup authentication
    await setupAuth(app);
    
    // Register routes
    await registerRoutes(app);

    // Create HTTP server
    const server = createServer(app);

    // Setup WebSocket server
    setupWebSocketServer(server);

    // Error handling middleware
    app.use((err, _req, res, _next) => {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = process.env.PORT || 5000;
    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
