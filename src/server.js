require("dotenv").config();

const path = require("path");
const http = require("http");
const next = require("next");

const createApp = require("./app");
const { initializeDatabase } = require("./config/db");
const initializeSocket = require("./config/socket");

const PORT = Number(process.env.PORT || 5000);
const projectRoot = path.resolve(__dirname, "..");
const isDevelopment = process.env.NODE_ENV !== "production";

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

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start the server:", error);
    process.exit(1);
  }
}

startServer();
