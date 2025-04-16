import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";
import path from "path";
import uploadRouter from "./routes/upload";
import newsRouter from "./routes/news";

import textEnhancementRouter from "./routes/text-enhancement";

import { startScheduler } from "./lib/scheduler";
import { Server } from "socket.io";
import { setupWebSockets } from "./lib/websockets";
import cors from "cors";
import { setupAuth } from "./auth";
import { integrateFixedPortalHandler } from "./routes/stripe-portal";
// Import both template handlers for compatibility
import { integrateTemplatePatch } from "./apply-template-patch";
import { configDotenv } from "dotenv";

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
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Keep-Alive"],
    credentials: true,
    maxAge: 86400, // Cache preflight requests for 24 hours
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

// Security headers
app.use((req, res, next) => {
  // Prevent clickjacking attacks
  res.setHeader("X-Frame-Options", "DENY");
  // Additional security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  // Only allow content from our own domain
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
  );
  next();
});

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Register routes
app.use("/api/upload", uploadRouter);
app.use("/api/news", newsRouter);

app.use("/api", textEnhancementRouter);

// Add ping endpoints to keep the server alive
app.get("/api/ping", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Handle root keep-alive requests
app.use((req, res, next) => {
  // Check if this is a keep-alive request
  if (req.query.keepAlive === "true") {
    console.log(
      `[keep-alive] Request received from ${req.ip} at ${new Date().toISOString()}`,
    );

    // Return a tiny transparent GIF image
    const transparentGif = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64",
    );
    res.setHeader("Content-Type", "image/gif");
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    res.status(200).send(transparentGif);
    return;
  }

  next();
});

let server: any = null;

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
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }

    // Setup authentication
    const { requireAuth } = setupAuth(app);

    // Register main routes
    registerRoutes(app);
    // Apply template saving patch
    integrateTemplatePatch(app);
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
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
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
    await new Promise<void>((resolve, reject) => {
      const onError = (err: any) => {
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
        console.info(
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
