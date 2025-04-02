import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import session from "express-session";
import passport from "passport";
import cors from "cors";
import { configurePassport } from "./auth";
import type { User } from "@shared/schema";
import { setupUserData } from "./setup-user-data";
import { storage } from "./storage";

const app = express();

// Trust the first proxy in production environments
// Critical for proper session handling with secure cookies
app.set('trust proxy', 1);

// Configure CORS for cross-origin requests
app.use(cors({
  origin: true, // Allow requests from any origin
  credentials: true, // Allow cookies to be sent with requests
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Setup express-session with session store from storage
// In production, the SESSION_SECRET should be set to a secure random value
const sessionOptions = {
  store: storage.sessionStore,
  secret: process.env.SESSION_SECRET || 'travelpack-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const // Allow cookies to be sent on regular link navigation
  }
};
app.use(session(sessionOptions));

// Setup passport authentication
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

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

async function runMigrations() {
  try {
    log("Running database migrations...", "migrations");
    // Create postgres connection for migrations
    const migrationClient = postgres(process.env.DATABASE_URL || "", { max: 1 });
    const db = drizzle(migrationClient);
    
    await migrate(db, { migrationsFolder: "migrations" });
    log("Database migrations completed successfully", "migrations");
    
    // Close the migration client
    await migrationClient.end();
  } catch (error) {
    log(`Error running migrations: ${error}`, "migrations");
    console.error("Error running migrations:", error);
    // Continue execution even if migrations fail
  }
}

(async () => {
  // Run migrations and setup when in production, skip for development
  if (process.env.NODE_ENV === 'production') {
    log("Running migrations for production deployment", "setup");
    await runMigrations();
    log("Migrations completed successfully", "setup");
  } else {
    log("Skipping migrations and user setup for faster development startup", "setup");
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
