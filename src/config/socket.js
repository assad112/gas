const { Server } = require("socket.io");
const customerModel = require("../models/customerModel");
const driverModel = require("../models/driverModel");

const ADMIN_ROOM = "admin_dashboard";
const DRIVERS_ROOM = "drivers_live";

function toCleanString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  return text.length ? text : null;
}

function readBearerTokenFromHeaders(headers = {}) {
  const headerValue = headers.authorization || headers.Authorization;
  const rawHeader = toCleanString(headerValue);

  if (!rawHeader) {
    return null;
  }

  const [scheme, token] = rawHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token.trim();
}

async function resolveCustomerIdentity(source = {}) {
  const token =
    toCleanString(source.token) ||
    readBearerTokenFromHeaders(source.headers) ||
    null;
  const hintedCustomerId =
    toCleanString(source.customerId) ||
    toCleanString(source.customer_id) ||
    null;

  if (token) {
    const customer = await customerModel.findCustomerBySessionToken(token);
    if (!customer) {
      return null;
    }

    return {
      customerId: String(customer.id),
      token
    };
  }

  if (!hintedCustomerId) {
    return null;
  }

  return {
    customerId: hintedCustomerId,
    token: null
  };
}

async function resolveDriverIdentity(source = {}) {
  const token =
    toCleanString(source.token) ||
    readBearerTokenFromHeaders(source.headers) ||
    null;
  const hintedDriverId =
    toCleanString(source.driverId) ||
    toCleanString(source.driver_id) ||
    null;

  if (token) {
    const driver = await driverModel.findDriverBySessionToken(token);

    if (!driver) {
      return null;
    }

    return {
      driverId: String(driver.id),
      token
    };
  }

  if (!hintedDriverId) {
    return null;
  }

  return {
    driverId: hintedDriverId,
    token: null
  };
}

async function joinCustomerRoom(socket, source = {}) {
  const identity = await resolveCustomerIdentity({
    ...source,
    headers: source.headers || socket.handshake?.headers || {}
  });

  if (!identity?.customerId) {
    return false;
  }

  const roomName = `customer:${identity.customerId}`;
  socket.join(roomName);
  socket.data.customerId = identity.customerId;
  socket.data.customerRoom = roomName;
  return true;
}

async function joinDriverRooms(socket, source = {}) {
  const identity = await resolveDriverIdentity({
    ...source,
    headers: source.headers || socket.handshake?.headers || {}
  });

  if (!identity?.driverId) {
    return false;
  }

  const roomName = `driver:${identity.driverId}`;
  socket.join(DRIVERS_ROOM);
  socket.join(roomName);
  socket.data.driverId = identity.driverId;
  socket.data.driverRoom = roomName;
  return true;
}

function joinAdminRoom(socket) {
  socket.join(ADMIN_ROOM);
}

function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", async (socket) => {
    const handshakeSource = {
      ...socket.handshake?.query,
      ...socket.handshake?.auth,
      headers: socket.handshake?.headers || {}
    };

    const isCustomerSocket = await joinCustomerRoom(socket, handshakeSource);

    if (!isCustomerSocket) {
      await joinDriverRooms(socket, handshakeSource);
    }

    socket.on("join_admin_room", () => {
      joinAdminRoom(socket);
    });

    socket.on("join_customer_room", async (payload = {}) => {
      await joinCustomerRoom(socket, payload);
    });

    socket.on("join_driver_room", async (payload = {}) => {
      await joinDriverRooms(socket, payload);
    });

    socket.on("subscribe_orders", async (payload = {}) => {
      const joinedCustomer = await joinCustomerRoom(socket, payload);

      if (!joinedCustomer) {
        await joinDriverRooms(socket, payload);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = initializeSocket;
