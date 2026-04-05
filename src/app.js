require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const authRoutes = require("./routes/authRoutes");
const driverAuthRoutes = require("./routes/driverAuthRoutes");
const driverAppRoutes = require("./routes/driverAppRoutes");
const customerRoutes = require("./routes/customerRoutes");
const driverRoutes = require("./routes/driverRoutes");
const orderRoutes = require("./routes/orderRoutes");
const routeRoutes = require("./routes/routeRoutes");
const productRoutes = require("./routes/productRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const zoneRoutes = require("./routes/zoneRoutes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

function createApp(nextHandler) {
  const app = express();

  app.use(
    cors({
      origin: true,
      credentials: true
    })
  );
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/driver-auth", driverAuthRoutes);
  app.use("/api/driver", driverAppRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/routes", routeRoutes);
  app.use("/api/drivers", driverRoutes);
  app.use("/api/customers", customerRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/zones", zoneRoutes);
  app.use("/api", notFound);

  if (typeof nextHandler === "function") {
    app.all("*", (req, res) => nextHandler(req, res));
  } else {
    app.use(notFound);
  }

  app.use(errorHandler);

  return app;
}

module.exports = createApp;
