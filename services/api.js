import axios from "axios";

import { toLatitude, toLongitude } from "@/lib/geo";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json"
  }
});

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function toBoolean(value) {
  return Boolean(value);
}

function normalizeOrder(order) {
  if (!order) {
    return null;
  }

  const latitude = toLatitude(order.latitude);
  const longitude = toLongitude(order.longitude);
  const customerLatitude = toLatitude(
    order.customerLatitude ?? order.customer_latitude ?? latitude
  );
  const customerLongitude = toLongitude(
    order.customerLongitude ?? order.customer_longitude ?? longitude
  );
  const driverLatitude = toLatitude(order.driverLatitude ?? order.driver_latitude);
  const driverLongitude = toLongitude(
    order.driverLongitude ?? order.driver_longitude
  );

  return {
    id: Number(order.id),
    customerId: order.customerId
      ? Number(order.customerId)
      : order.customer_id
        ? Number(order.customer_id)
        : null,
    name: order.name || "",
    phone: order.phone || "",
    location: order.location || "",
    addressText: order.addressText || order.address_text || order.location || "",
    addressFull: order.addressFull || order.address_full || order.location || "",
    gasType: order.gasType || order.gas_type || "",
    quantity: Number(order.quantity || 1),
    paymentMethod:
      order.paymentMethod || order.payment_method || "cash_on_delivery",
    notes: order.notes || "",
    preferredDeliveryWindow:
      order.preferredDeliveryWindow || order.preferred_delivery_window || "",
    totalAmount: toNumber(order.totalAmount ?? order.total_amount),
    status: order.status || "pending",
    driverStage: order.driverStage || order.driver_stage || "",
    assignedDriverId: order.assignedDriverId
      ? Number(order.assignedDriverId)
      : order.assigned_driver_id
        ? Number(order.assigned_driver_id)
        : null,
    latitude,
    longitude,
    customerLatitude,
    customerLongitude,
    createdAt: order.createdAt || order.created_at || null,
    updatedAt: order.updatedAt || order.updated_at || null,
    acceptedAt: order.acceptedAt || order.accepted_at || null,
    deliveredAt: order.deliveredAt || order.delivered_at || null,
    cancelledAt: order.cancelledAt || order.cancelled_at || null,
    customerFullName:
      order.customerFullName || order.customer_full_name || order.name || "",
    customerEmail: order.customerEmail || order.customer_email || "",
    driverName: order.driverName || order.driver_name || "",
    driverPhone: order.driverPhone || order.driver_phone || "",
    driverStatus: order.driverStatus || order.driver_status || "",
    driverAvailability:
      order.driverAvailability || order.driver_availability || "",
    driverLocation: order.driverLocation || order.driver_location || "",
    driverLatitude,
    driverLongitude,
    driverVehicleLabel:
      order.driverVehicleLabel || order.driver_vehicle_label || ""
  };
}

function normalizeDriver(driver) {
  if (!driver) {
    return null;
  }

  return {
    id: Number(driver.id),
    name: driver.name || "",
    username: driver.username || "",
    phone: driver.phone || "",
    email: driver.email || "",
    status: driver.status || "offline",
    availability: driver.availability || "available",
    currentLocation: driver.current_location || "",
    currentLatitude: toLatitude(driver.currentLatitude ?? driver.current_latitude),
    currentLongitude: toLongitude(
      driver.currentLongitude ?? driver.current_longitude
    ),
    vehicleLabel: driver.vehicle_label || "",
    licenseNumber: driver.license_number || "",
    lastSeenAt: driver.last_seen_at || null,
    lastLocationAt: driver.last_location_at || null,
    currentOrderId: driver.current_order_id ? Number(driver.current_order_id) : null,
    currentOrderStatus: driver.current_order_status || "",
    currentOrderLocation: driver.current_order_location || ""
  };
}

function normalizeCustomer(customer) {
  if (!customer) {
    return null;
  }

  return {
    id: Number(customer.id),
    fullName: customer.full_name || "",
    phone: customer.phone || "",
    email: customer.email || "",
    createdAt: customer.created_at || null,
    ordersCount: Number(customer.orders_count || 0),
    lastOrderAt: customer.last_order_at || null
  };
}

function normalizeSettings(settings) {
  if (!settings) {
    return null;
  }

  return {
    id: Number(settings.id || 1),
    systemName: settings.system_name || "",
    supportPhone: settings.support_phone || "",
    defaultLanguage: settings.default_language || "ar",
    currencyCode: settings.currency_code || "OMR",
    maintenanceMode: toBoolean(settings.maintenance_mode),
    notificationsEnabled: toBoolean(settings.notifications_enabled),
    autoAssignDrivers: toBoolean(settings.auto_assign_drivers),
    orderIntakeEnabled: toBoolean(settings.order_intake_enabled),
    defaultDeliveryFee: toNumber(settings.default_delivery_fee) ?? 0,
    systemMessage: settings.system_message || "",
    updatedAt: settings.updated_at || null
  };
}

function normalizeProduct(product) {
  if (!product) {
    return null;
  }

  return {
    id: Number(product.id),
    code: product.code || "",
    nameAr: product.name_ar || "",
    nameEn: product.name_en || "",
    sizeLabel: product.size_label || "",
    price: toNumber(product.price) ?? 0,
    deliveryFee: toNumber(product.delivery_fee) ?? 0,
    isAvailable: toBoolean(product.is_available),
    operationalNotes: product.operational_notes || "",
    createdAt: product.created_at || null,
    updatedAt: product.updated_at || null
  };
}

function normalizeZone(zone) {
  if (!zone) {
    return null;
  }

  return {
    id: Number(zone.id),
    code: zone.code || "",
    nameAr: zone.name_ar || "",
    nameEn: zone.name_en || "",
    governorate: zone.governorate || "",
    deliveryFee: toNumber(zone.delivery_fee) ?? 0,
    estimatedDeliveryMinutes: Number(zone.estimated_delivery_minutes || 0),
    isActive: toBoolean(zone.is_active),
    operationalNotes: zone.operational_notes || "",
    createdAt: zone.created_at || null,
    updatedAt: zone.updated_at || null
  };
}

function buildOrderPayload(payload = {}) {
  return {
    ...(payload.status ? { status: payload.status } : {}),
    ...(Object.prototype.hasOwnProperty.call(payload, "assignedDriverId")
      ? { assignedDriverId: payload.assignedDriverId }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(payload, "paymentMethod")
      ? { paymentMethod: payload.paymentMethod }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(payload, "notes")
      ? { notes: payload.notes }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(payload, "preferredDeliveryWindow")
      ? { preferredDeliveryWindow: payload.preferredDeliveryWindow }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(payload, "totalAmount")
      ? { totalAmount: payload.totalAmount }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(payload, "addressText")
      ? { addressText: payload.addressText }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(payload, "addressFull")
      ? { addressFull: payload.addressFull }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(payload, "customerLatitude")
      ? { customerLatitude: payload.customerLatitude }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(payload, "customerLongitude")
      ? { customerLongitude: payload.customerLongitude }
      : {})
  };
}

function buildSettingsPayload(payload = {}) {
  return {
    systemName: payload.systemName,
    supportPhone: payload.supportPhone,
    defaultLanguage: payload.defaultLanguage,
    currencyCode: payload.currencyCode,
    maintenanceMode: payload.maintenanceMode,
    notificationsEnabled: payload.notificationsEnabled,
    autoAssignDrivers: payload.autoAssignDrivers,
    orderIntakeEnabled: payload.orderIntakeEnabled,
    defaultDeliveryFee: payload.defaultDeliveryFee,
    systemMessage: payload.systemMessage
  };
}

export const fallbackSettings = {
  systemName: "سوبر غاز",
  supportPhone: "+96880001111",
  defaultLanguage: "ar",
  currencyCode: "OMR",
  maintenanceMode: false,
  notificationsEnabled: true,
  autoAssignDrivers: false,
  orderIntakeEnabled: true,
  defaultDeliveryFee: 1.25,
  systemMessage: "يتم توصيل الطلبات خلال 30 دقيقة داخل موقط والمناطق القريبة."
};

export function getApiErrorMessage(error, fallbackMessage) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallbackMessage
  );
}

export async function fetchOrdersRequest(params = {}) {
  const response = await api.get("/orders", { params });
  return response.data.map(normalizeOrder);
}

export async function resetOrdersRequest() {
  const response = await api.delete("/orders");
  return response.data;
}

export async function fetchOrderRequest(orderId) {
  const response = await api.get(`/orders/${orderId}`);
  return normalizeOrder(response.data);
}

export async function advanceOrderStatusRequest(orderId) {
  const response = await api.put(`/orders/${orderId}`);
  return normalizeOrder(response.data);
}

export async function driverAcceptOrderRequest(orderId, driverId) {
  const response = await api.post(`/orders/${orderId}/driver-accept`, {
    driverId
  });
  return normalizeOrder(response.data);
}

export async function updateOrderRequest(orderId, payload) {
  const response = await api.patch(`/orders/${orderId}`, buildOrderPayload(payload));
  return normalizeOrder(response.data);
}

export async function cancelOrderRequest(orderId) {
  const response = await api.post(`/orders/${orderId}/cancel`);
  return normalizeOrder(response.data);
}

export async function fetchDriversRequest() {
  const response = await api.get("/drivers");
  return response.data.map(normalizeDriver);
}

export async function createDriverRequest(payload) {
  const response = await api.post("/drivers", payload);
  return {
    driver: normalizeDriver(response.data?.driver || response.data),
    credentials: response.data?.credentials
      ? {
          username: response.data.credentials.username || "",
          temporaryPassword: response.data.credentials.temporaryPassword || ""
        }
      : null
  };
}

export async function updateDriverRequest(driverId, payload) {
  const response = await api.patch(`/drivers/${driverId}`, payload);
  return normalizeDriver(response.data);
}

export async function resetDriverPasswordRequest(driverId) {
  const response = await api.post(`/drivers/${driverId}/reset-password`);
  return {
    driver: normalizeDriver(response.data?.driver || response.data),
    credentials: response.data?.credentials
      ? {
          username: response.data.credentials.username || "",
          temporaryPassword: response.data.credentials.temporaryPassword || ""
        }
      : null
  };
}

export async function deleteDriverRequest(driverId) {
  const response = await api.delete(`/drivers/${driverId}`);
  return {
    driverId: Number(response.data?.driver?.id || driverId) || Number(driverId),
    driver: normalizeDriver(response.data?.driver || null)
  };
}

export async function fetchCustomersRequest(params = {}) {
  const response = await api.get("/customers", { params });
  return response.data.map(normalizeCustomer);
}

export async function resetCustomerPasswordRequest(customerId) {
  const response = await api.post(`/customers/${customerId}/reset-password`);
  return {
    customer: response.data?.customer || null,
    credentials: response.data?.credentials
      ? {
          identifier: response.data.credentials.identifier || "",
          temporaryPassword: response.data.credentials.temporaryPassword || ""
        }
      : null
  };
}

export async function deleteCustomerRequest(customerId) {
  const response = await api.delete(`/customers/${customerId}`);
  return {
    customerId:
      Number(response.data?.customer?.id || customerId) || Number(customerId),
    customer: response.data?.customer || null
  };
}

export async function fetchSettingsRequest() {
  const response = await api.get("/settings");
  return normalizeSettings(response.data) || fallbackSettings;
}

export async function updateSettingsRequest(payload) {
  const response = await api.patch("/settings", buildSettingsPayload(payload));
  return normalizeSettings(response.data) || fallbackSettings;
}

export async function fetchProductsRequest() {
  const response = await api.get("/products");
  return response.data.map(normalizeProduct);
}

export async function updateProductRequest(productId, payload) {
  const response = await api.patch(`/products/${productId}`, payload);
  return normalizeProduct(response.data);
}

export async function fetchZonesRequest() {
  const response = await api.get("/zones");
  return response.data.map(normalizeZone);
}

export async function updateZoneRequest(zoneId, payload) {
  const response = await api.patch(`/zones/${zoneId}`, payload);
  return normalizeZone(response.data);
}

export {
  normalizeOrder,
  normalizeDriver,
  normalizeCustomer,
  normalizeSettings,
  normalizeProduct,
  normalizeZone
};
export default api;
