require("dotenv").config();

const path = require("path");
const http = require("http");
const next = require("next");

const createApp = require("./app");
const { initializeDatabase } = require("./config/db");
const initializeSocket = require("./config/socket");
const { recordErrorLog } = require("./services/errorLogService");
const {
  configureDispatchRuntime,
  resumePendingDispatches
} = require("./services/driverDispatchService");

const PORT = Number(process.env.PORT || 5000);
const projectRoot = path.resolve(__dirname, "..");
const isDevelopment = process.env.NODE_ENV !== "production";

function attachProcessErrorLogging() {
  process.on("unhandledRejection", (reason) => {
    const message =
      reason instanceof Error
        ? reason.message
        : `Unhandled rejection: ${String(reason)}`;

    console.error("Unhandled promise rejection:", reason);
    recordErrorLog({
      level: "error",
      source: "process",
      errorName: reason?.name || "UnhandledRejection",
      message,
      stackTrace: reason?.stack || null,
      metadata: {
        reason: String(reason)
      }
    }).catch(() => {});
  });

  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    recordErrorLog({
      level: "error",
      source: "process",
      errorName: error?.name || "UncaughtException",
      message: error?.message || "Uncaught exception",
      stackTrace: error?.stack || null
    })
      .catch(() => {})
      .finally(() => {
        process.exit(1);
      });
  });
}

async function startServer() {
  try {
    await initializeDatabase();

    const nextApp = next({
      dev: isDevelopment,
      dir: projectRoot
    });

    await nextApp.prepare();

    const handle = nextApp.getRequestHandler();
    const app = createApp(handle);
    const server = http.createServer(app);
    const io = initializeSocket(server);

    app.set("io", io);
    configureDispatchRuntime(io);
    await resumePendingDispatches(io);

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start the server:", error);
    await recordErrorLog({
      level: "error",
      source: "startup",
      errorName: error?.name || "StartupError",
      message: error?.message || "Failed to start the server",
      stackTrace: error?.stack || null
    }).catch(() => {});
    process.exit(1);
  }
}

attachProcessErrorLogging();
startServer();
