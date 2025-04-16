/**
 * Server with integrated templates
 * This version includes the improved templates router
 */

const { integrateTemplatePatch } = require("./apply-template-patch");
const express = require("express");
const { registerRoutes } = require("./routes");
const { setupVite, serveStatic } = require("./vite");
const { createServer } = require("http");
const path = require("path");
const uploadRouter = require("./routes/upload");
const newsRouter = require("./routes/news");
const { startScheduler } = require("./lib/scheduler");
const { Server } = require("socket.io");
const { setupWebSockets } = require("./lib/websockets");
const cors = require("cors");
const { setupAuth } = require("./auth");
const { integrateFixedPortalHandler } = require("./routes/stripe-portal");
const { integrateTemplatesRouter } = require("./integrate-templates");
const { configDotenv } = require("dotenv");

configDotenv();

// Function to get formatted time
const getFormattedTime = () => {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

// Get port from environment variable or default to 5000
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;
const HOST = "0.0.0.0";

const app = express();


// Validate required environment variables
const requiredEnvVars = ["NEWS_API_KEY", "OPENAI_API_KEY"];
const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName],
);
if (missingEnvVars.length > 0) {
  console.error(
    `${getFormattedTime()} [express] Missing required environment variables: ${missingEnvVars.join(", ")}`,
  );
  process.exit(1);
}

// Middleware setup
app.use(
  cors({
    origin: "*", // Allow all origins in development
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use((req, res, next) => {
  if (req.originalUrl === "/api/credits/webhook") {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.urlencoded({ extended: false }));

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Register routes
app.use("/api/upload", uploadRouter);
app.use("/api/news", newsRouter);

let server = null;

const cleanup = () => {
  if (server) {
    console.log(`${getFormattedTime()} [express] Cleaning up server...`);
    server.close(() => {
      console.log(`${getFormattedTime()} [express] Server closed`);
      process.exit(0);
    });
  }
};

// Handle cleanup for various signals
process.on("SIGTERM", cleanup);
process.on("SIGINT", cleanup);
process.on("SIGHUP", cleanup);

const startServer = async (retryCount = 0, currentPort = PORT) => {
  try {
    if (server) {
      await new Promise((resolve) => {
        server.close(() => resolve());
      });
    }

    // Setup authentication
    const { requireAuth } = setupAuth(app);

    // Register main routes
    registerRoutes(app);
    
    // IMPORTANT: Use our new templates router instead of the old patch
    // Apply template saving patch (keeping for backwards compatibility)
    // integrateTemplatePatch(app);
    
    // Integrate new templates router
    integrateTemplatesRouter(app);
    
    // Integrate fixed Stripe portal handler
    integrateFixedPortalHandler(app);
    
    server = createServer(app);
    const io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });
    setupWebSockets(io);

    // Global error handler
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error(`${getFormattedTime()} [express] Error:`, err);
      res.status(status).json({ message });
    });

    // Setup development environment
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server with retry mechanism
    await new Promise((resolve, reject) => {
      const onError = (err) => {
        server.close();
        if (err.code === "EADDRINUSE") {
          console.error(
            `${getFormattedTime()} [express] Port ${currentPort} is already in use`,
          );
          if (retryCount < 3) {
            setTimeout(() => {
              startServer(retryCount + 1, currentPort)
                .then(resolve)
                .catch(reject);
            }, 1000);
          } else {
            reject(
              new Error(`Unable to start server after ${retryCount} retries`),
            );
          }
        } else {
          reject(err);
        }
      };

      server.once("error", onError);

      server.listen(currentPort, HOST, () => {
        console.log(
          `${getFormattedTime()} [express] Server started successfully on ${HOST}:${currentPort}`,
        );
        startScheduler();
        console.log(
          `${getFormattedTime()} [scheduler] Newsletter scheduler started`,
        );
        // Remove error handler once successfully started
        server.removeListener("error", onError);
        resolve();
      });
    });
  } catch (error) {
    console.error(
      `${getFormattedTime()} [express] Fatal error during startup:`,
      error,
    );
    process.exit(1);
  }
};

// Add unhandled rejection handler
process.on("unhandledRejection", (reason, promise) => {
  console.error(
    `${getFormattedTime()} [express] Unhandled Rejection at:`,
    promise,
    "reason:",
    reason,
  );
});

// Add uncaught exception handler
process.on("uncaughtException", (error) => {
  console.error(`${getFormattedTime()} [express] Uncaught Exception:`, error);
  process.exit(1);
});

// Kill any existing process on port 5000 if running
startServer();

module.exports = { app, startServer };
