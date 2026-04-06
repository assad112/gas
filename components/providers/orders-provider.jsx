"use client";

import { createContext, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { useI18n } from "@/hooks/use-i18n";
import {
  advanceOrderStatusRequest,
  cancelOrderRequest,
  createDriverRequest,
  deleteProductRequest,
  deleteZoneRequest,
  deleteDriverRequest,
  deleteCustomerRequest,
  fallbackSettings,
  fetchCustomersRequest,
  fetchDriversRequest,
  fetchOrdersRequest,
  fetchProductsRequest,
  fetchSettingsRequest,
  fetchZonesRequest,
  getApiErrorMessage,
  normalizeCustomer,
  normalizeDriver,
  normalizeOrder,
  normalizeProduct,
  normalizeSettings,
  normalizeZone,
  resetCustomerPasswordRequest,
  resetDriverPasswordRequest,
  resetOrdersRequest,
  updateDriverRequest,
  updateOrderRequest,
  updateProductRequest,
  updateSettingsRequest,
  updateZoneRequest
} from "@/services/api";
import { getSocket } from "@/services/socket";

export const OrdersContext = createContext(null);

const STORAGE_KEYS = {
  orders: "gas-admin-orders-cache",
  settings: "gas-admin-settings-cache"
};

const defaultResourceState = {
  loading: true,
  refreshing: false,
  error: "",
  stale: false
};

function createResourceState() {
  return {
    orders: { ...defaultResourceState },
    drivers: { ...defaultResourceState },
    customers: { ...defaultResourceState },
    settings: { ...defaultResourceState },
    products: { ...defaultResourceState },
    zones: { ...defaultResourceState }
  };
}

function sortOrders(orders) {
  return [...orders].sort((firstOrder, secondOrder) => {
    const firstTime = new Date(
      firstOrder.updatedAt || firstOrder.createdAt || 0
    ).getTime();
    const secondTime = new Date(
      secondOrder.updatedAt || secondOrder.createdAt || 0
    ).getTime();

    return secondTime - firstTime;
  });
}

function upsertOrder(orders, incomingOrder) {
  const normalizedOrder = normalizeOrder(incomingOrder);

  if (!normalizedOrder) {
    return orders;
  }

  const existingIndex = orders.findIndex((order) => order.id === normalizedOrder.id);

  if (existingIndex === -1) {
    return sortOrders([normalizedOrder, ...orders]);
  }

  const nextOrders = [...orders];
  nextOrders[existingIndex] = {
    ...nextOrders[existingIndex],
    ...normalizedOrder
  };

  return sortOrders(nextOrders);
}

function upsertDriver(drivers, incomingDriver) {
  const normalizedDriver = normalizeDriver(incomingDriver);

  if (!normalizedDriver) {
    return drivers;
  }

  const existingIndex = drivers.findIndex((driver) => driver.id === normalizedDriver.id);

  if (existingIndex === -1) {
    return [normalizedDriver, ...drivers];
  }

  const nextDrivers = [...drivers];
  nextDrivers[existingIndex] = {
    ...nextDrivers[existingIndex],
    ...normalizedDriver
  };

  return nextDrivers;
}

function removeDriver(drivers, driverId) {
  return drivers.filter((driver) => driver.id !== Number(driverId));
}

function upsertCustomer(customers, incomingCustomer) {
  const normalizedCustomer = normalizeCustomer(incomingCustomer);

  if (!normalizedCustomer) {
    return customers;
  }

  const existingIndex = customers.findIndex(
    (customer) => customer.id === normalizedCustomer.id
  );

  if (existingIndex === -1) {
    return [normalizedCustomer, ...customers];
  }

  const nextCustomers = [...customers];
  nextCustomers[existingIndex] = {
    ...nextCustomers[existingIndex],
    ...normalizedCustomer
  };

  return nextCustomers;
}

function removeCustomer(customers, customerId) {
  return customers.filter((customer) => customer.id !== Number(customerId));
}

function upsertProduct(products, incomingProduct) {
  const normalizedProduct = normalizeProduct(incomingProduct);

  if (!normalizedProduct) {
    return products;
  }

  const existingIndex = products.findIndex(
    (product) => product.id === normalizedProduct.id
  );

  if (existingIndex === -1) {
    return [normalizedProduct, ...products];
  }

  const nextProducts = [...products];
  nextProducts[existingIndex] = {
    ...nextProducts[existingIndex],
    ...normalizedProduct
  };

  return nextProducts;
}

function removeProduct(products, productId) {
  return products.filter((product) => product.id !== Number(productId));
}

function upsertZone(zones, incomingZone) {
  const normalizedZone = normalizeZone(incomingZone);

  if (!normalizedZone) {
    return zones;
  }

  const existingIndex = zones.findIndex((zone) => zone.id === normalizedZone.id);

  if (existingIndex === -1) {
    return [normalizedZone, ...zones];
  }

  const nextZones = [...zones];
  nextZones[existingIndex] = {
    ...nextZones[existingIndex],
    ...normalizedZone
  };

  return nextZones;
}

function removeZone(zones, zoneId) {
  return zones.filter((zone) => zone.id !== Number(zoneId));
}

function readCachedValue(key, fallbackValue) {
  if (typeof window === "undefined") {
    return fallbackValue;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function writeCachedValue(key, value) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore cache write failures.
  }
}

function getMessages(locale) {
  return locale === "en"
    ? {
        ordersLoadError: "Unable to load orders right now.",
        driversLoadError: "Unable to load drivers right now.",
        customersLoadError: "Unable to load customers right now.",
        settingsLoadError: "Unable to load settings right now.",
        productsLoadError: "Unable to load products right now.",
        zonesLoadError: "Unable to load delivery zones right now.",
        driverCreateError: "Unable to add this driver.",
        driverUpdateError: "Unable to update this driver.",
        orderUpdated: "Order updated successfully.",
        orderCancelled: "Order cancelled successfully.",
        orderUpdateError: "Unable to update this order.",
        driverCreated: "Driver added successfully.",
        driverUpdated: "Driver profile updated successfully.",
        settingsSaved: "Settings saved successfully.",
        settingsSavedLocally: "Backend unavailable. Settings were saved locally.",
        settingsSaveError: "Unable to save settings.",
        productSaved: "Product updated successfully.",
        productSaveError: "Unable to update this product.",
        productDeleted: "Product deleted successfully.",
        productDeleteError: "Unable to delete this product.",
        zoneSaved: "Zone updated successfully.",
        zoneSaveError: "Unable to update this delivery zone.",
        zoneDeleted: "Zone deleted successfully.",
        zoneDeleteError: "Unable to delete this delivery zone.",
        ordersReset: "Orders cleared successfully.",
        ordersResetError: "Unable to clear orders right now.",
        newOrder: (name) => `New order from ${name || "customer"}.`
      }
    : {
        ordersLoadError: "تعذر تحميل الطلبات الآن.",
        driversLoadError: "تعذر تحميل السائقين الآن.",
        customersLoadError: "تعذر تحميل العملاء الآن.",
        settingsLoadError: "تعذر تحميل الإعدادات الآن.",
        productsLoadError: "تعذر تحميل المنتجات الآن.",
        zonesLoadError: "تعذر تحميل مناطق التوصيل الآن.",
        driverCreateError: "تعذر إضافة هذا السائق.",
        driverUpdateError: "تعذر تحديث بيانات السائق.",
        orderUpdated: "تم تحديث الطلب بنجاح.",
        orderCancelled: "تم إلغاء الطلب بنجاح.",
        orderUpdateError: "تعذر تحديث هذا الطلب.",
        driverCreated: "تمت إضافة السائق بنجاح.",
        driverUpdated: "تم تحديث بيانات السائق.",
        driverDeleted: "تم حذف السائق بنجاح.",
        settingsSaved: "تم حفظ الإعدادات بنجاح.",
        settingsSavedLocally: "الخادم غير متاح حاليًا. تم حفظ الإعدادات محليًا.",
        settingsSaveError: "تعذر حفظ الإعدادات.",
        productSaved: "تم تحديث المنتج بنجاح.",
        productSaveError: "تعذر تحديث هذا المنتج.",
        productDeleted: "تم حذف المنتج بنجاح.",
        productDeleteError: "تعذر حذف هذا المنتج.",
        zoneSaved: "تم تحديث منطقة التوصيل.",
        zoneSaveError: "تعذر تحديث منطقة التوصيل.",
        zoneDeleted: "تم حذف المنطقة بنجاح.",
        zoneDeleteError: "تعذر حذف منطقة التوصيل.",
        ordersReset: "تم تصفير الطلبات بنجاح.",
        ordersResetError: "تعذر تصفير الطلبات الآن.",
        newOrder: (name) => `وصل طلب جديد من ${name || "عميل"}.`
      };
}

export function OrdersProvider({ children }) {
  const { locale } = useI18n();
  const messages = useMemo(() => {
    const nextMessages = getMessages(locale);
    return {
      ...nextMessages,
      driverResetPasswordError:
        nextMessages.driverResetPasswordError ||
        (locale === "en"
          ? "Unable to reset this driver's password."
          : "تعذر إعادة تعيين كلمة مرور السائق."),
      driverPasswordReset:
        nextMessages.driverPasswordReset ||
        (locale === "en"
          ? "Driver password reset successfully."
          : "تمت إعادة تعيين كلمة مرور السائق."),
      driverDeleteError:
        nextMessages.driverDeleteError ||
        (locale === "en"
          ? "Unable to delete this driver."
          : "تعذر حذف هذا السائق."),
      driverDeleted:
        nextMessages.driverDeleted ||
        (locale === "en"
          ? "Driver deleted successfully."
          : "تم حذف السائق بنجاح."),
      customerResetPasswordError:
        nextMessages.customerResetPasswordError ||
        (locale === "en"
          ? "Unable to reset this customer's password."
          : "تعذر إعادة تعيين كلمة مرور العميل."),
      customerPasswordReset:
        nextMessages.customerPasswordReset ||
        (locale === "en"
          ? "Customer password reset successfully."
          : "تمت إعادة تعيين كلمة مرور العميل."),
      customerDeleteError:
        nextMessages.customerDeleteError ||
        (locale === "en"
          ? "Unable to delete this customer."
          : "تعذر حذف هذا العميل."),
      customerDeleted:
        nextMessages.customerDeleted ||
        (locale === "en"
          ? "Customer deleted successfully."
          : "تم حذف العميل بنجاح.")
    };
  }, [locale]);
  const messagesRef = useRef(messages);
  const [orders, setOrders] = useState(() =>
    sortOrders(readCachedValue(STORAGE_KEYS.orders, []))
  );
  const [drivers, setDrivers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState(() =>
    readCachedValue(STORAGE_KEYS.settings, fallbackSettings)
  );
  const [products, setProducts] = useState([]);
  const [zones, setZones] = useState([]);
  const [resources, setResources] = useState(createResourceState);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [latestIncomingOrder, setLatestIncomingOrder] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [creatingDriver, setCreatingDriver] = useState(false);
  const [resettingOrders, setResettingOrders] = useState(false);
  const [orderMutationIds, setOrderMutationIds] = useState({});
  const [driverMutationIds, setDriverMutationIds] = useState({});
  const [customerMutationIds, setCustomerMutationIds] = useState({});
  const [productMutationIds, setProductMutationIds] = useState({});
  const [zoneMutationIds, setZoneMutationIds] = useState({});
  const announcedOrderIdsRef = useRef(new Set());

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  function setResourceStatus(resourceKey, patch) {
    setResources((current) => ({
      ...current,
      [resourceKey]: {
        ...current[resourceKey],
        ...patch
      }
    }));
  }

  async function refreshOrders(options = {}) {
    const { silent = false } = options;

    setResourceStatus("orders", {
      loading: !silent && orders.length === 0,
      refreshing: silent || orders.length > 0,
      error: "",
      stale: false
    });

    try {
      const response = await fetchOrdersRequest();
      const nextOrders = sortOrders(response);
      setOrders(nextOrders);
      writeCachedValue(STORAGE_KEYS.orders, nextOrders);
      setResourceStatus("orders", {
        loading: false,
        refreshing: false,
        error: "",
        stale: false
      });
      return nextOrders;
    } catch (error) {
      const cachedOrders = readCachedValue(STORAGE_KEYS.orders, []);

      if (cachedOrders.length > 0) {
        setOrders(sortOrders(cachedOrders));
      }

      setResourceStatus("orders", {
        loading: false,
        refreshing: false,
        error:
          cachedOrders.length > 0
            ? ""
            : getApiErrorMessage(error, messagesRef.current.ordersLoadError),
        stale: cachedOrders.length > 0
      });

      if (cachedOrders.length === 0) {
        throw error;
      }

      return cachedOrders;
    }
  }

  async function refreshDrivers(options = {}) {
    const { silent = false } = options;

    setResourceStatus("drivers", {
      loading: !silent && drivers.length === 0,
      refreshing: silent || drivers.length > 0,
      error: "",
      stale: false
    });

    try {
      const response = await fetchDriversRequest();
      setDrivers(response);
      setResourceStatus("drivers", {
        loading: false,
        refreshing: false,
        error: "",
        stale: false
      });
      return response;
    } catch (error) {
      setResourceStatus("drivers", {
        loading: false,
        refreshing: false,
        error: getApiErrorMessage(error, messagesRef.current.driversLoadError),
        stale: false
      });
      throw error;
    }
  }

  async function refreshCustomers(options = {}) {
    const { silent = false } = options;

    setResourceStatus("customers", {
      loading: !silent && customers.length === 0,
      refreshing: silent || customers.length > 0,
      error: "",
      stale: false
    });

    try {
      const response = await fetchCustomersRequest();
      setCustomers(response);
      setResourceStatus("customers", {
        loading: false,
        refreshing: false,
        error: "",
        stale: false
      });
      return response;
    } catch (error) {
      setResourceStatus("customers", {
        loading: false,
        refreshing: false,
        error: getApiErrorMessage(error, messagesRef.current.customersLoadError),
        stale: false
      });
      throw error;
    }
  }

  async function refreshSettings(options = {}) {
    const { silent = false } = options;

    setResourceStatus("settings", {
      loading: !silent && !settings?.systemName,
      refreshing: silent || Boolean(settings?.systemName),
      error: "",
      stale: false
    });

    try {
      const response = await fetchSettingsRequest();
      setSettings(response);
      writeCachedValue(STORAGE_KEYS.settings, response);
      setResourceStatus("settings", {
        loading: false,
        refreshing: false,
        error: "",
        stale: false
      });
      return response;
    } catch {
      const cachedSettings = readCachedValue(
        STORAGE_KEYS.settings,
        fallbackSettings
      );
      setSettings(cachedSettings);
      setResourceStatus("settings", {
        loading: false,
        refreshing: false,
        error: "",
        stale: true
      });
      return cachedSettings;
    }
  }

  async function refreshProducts(options = {}) {
    const { silent = false } = options;

    setResourceStatus("products", {
      loading: !silent && products.length === 0,
      refreshing: silent || products.length > 0,
      error: "",
      stale: false
    });

    try {
      const response = await fetchProductsRequest();
      setProducts(response);
      setResourceStatus("products", {
        loading: false,
        refreshing: false,
        error: "",
        stale: false
      });
      return response;
    } catch (error) {
      setResourceStatus("products", {
        loading: false,
        refreshing: false,
        error: getApiErrorMessage(error, messagesRef.current.productsLoadError),
        stale: false
      });
      throw error;
    }
  }

  async function refreshZones(options = {}) {
    const { silent = false } = options;

    setResourceStatus("zones", {
      loading: !silent && zones.length === 0,
      refreshing: silent || zones.length > 0,
      error: "",
      stale: false
    });

    try {
      const response = await fetchZonesRequest();
      setZones(response);
      setResourceStatus("zones", {
        loading: false,
        refreshing: false,
        error: "",
        stale: false
      });
      return response;
    } catch (error) {
      setResourceStatus("zones", {
        loading: false,
        refreshing: false,
        error: getApiErrorMessage(error, messagesRef.current.zonesLoadError),
        stale: false
      });
      throw error;
    }
  }

  async function refreshAdminData(options = {}) {
    const { silent = false } = options;

    await Promise.allSettled([
      refreshOrders({ silent }),
      refreshDrivers({ silent }),
      refreshCustomers({ silent }),
      refreshSettings({ silent }),
      refreshProducts({ silent }),
      refreshZones({ silent })
    ]);
  }

  function dismissLatestAlert() {
    setLatestIncomingOrder(null);
  }

  function setOrderBusy(orderId, isBusy) {
    setOrderMutationIds((current) => {
      const next = { ...current };
      if (isBusy) {
        next[orderId] = true;
      } else {
        delete next[orderId];
      }
      return next;
    });
  }

  function setDriverBusy(driverId, isBusy) {
    setDriverMutationIds((current) => {
      const next = { ...current };
      if (isBusy) {
        next[driverId] = true;
      } else {
        delete next[driverId];
      }
      return next;
    });
  }

  function setCustomerBusy(customerId, isBusy) {
    setCustomerMutationIds((current) => {
      const next = { ...current };
      if (isBusy) {
        next[customerId] = true;
      } else {
        delete next[customerId];
      }
      return next;
    });
  }

  function clearOrdersState() {
    setOrders([]);
    writeCachedValue(STORAGE_KEYS.orders, []);
    setLatestIncomingOrder(null);
    setOrderMutationIds({});
    announcedOrderIdsRef.current.clear();
    setResourceStatus("orders", {
      loading: false,
      refreshing: false,
      error: "",
      stale: false
    });
  }

  async function syncAfterOrderMutation(updatedOrder, successMessage) {
    setOrders((currentOrders) => {
      const nextOrders = upsertOrder(currentOrders, updatedOrder);
      writeCachedValue(STORAGE_KEYS.orders, nextOrders);
      return nextOrders;
    });

    await Promise.allSettled([
      refreshDrivers({ silent: true }),
      refreshCustomers({ silent: true })
    ]);

    toast.success(successMessage);
    return updatedOrder;
  }

  async function advanceOrderStatus(orderId) {
    const currentOrder = orders.find((order) => order.id === orderId);

    if (!currentOrder) {
      return null;
    }

    if (currentOrder.status === "pending") {
      toast.error(
        locale === "en"
          ? "Pending order must be accepted from driver app first."
          : "قبول الطلب المعلّق يتم من تطبيق السائق أولًا."
      );
      return currentOrder;
    }

    if (currentOrder.status !== "accepted") {
      toast.error(
        locale === "en"
          ? "Order can be completed only after driver acceptance."
          : "لا يمكن تأكيد التسليم إلا بعد قبول السائق للطلب."
      );
      return currentOrder;
    }

    setOrderBusy(orderId, true);

    try {
      const updatedOrder = await advanceOrderStatusRequest(orderId);
      return await syncAfterOrderMutation(
        updatedOrder,
        messagesRef.current.orderUpdated
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, messagesRef.current.orderUpdateError));
      throw error;
    } finally {
      setOrderBusy(orderId, false);
    }
  }

  async function updateOrder(orderId, payload) {
    setOrderBusy(orderId, true);

    try {
      const updatedOrder = await updateOrderRequest(orderId, payload);
      return await syncAfterOrderMutation(
        updatedOrder,
        messagesRef.current.orderUpdated
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, messagesRef.current.orderUpdateError));
      throw error;
    } finally {
      setOrderBusy(orderId, false);
    }
  }

  async function cancelOrder(orderId) {
    setOrderBusy(orderId, true);

    try {
      const updatedOrder = await cancelOrderRequest(orderId);
      return await syncAfterOrderMutation(
        updatedOrder,
        messagesRef.current.orderCancelled
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, messagesRef.current.orderUpdateError));
      throw error;
    } finally {
      setOrderBusy(orderId, false);
    }
  }

  async function resetOrders() {
    setResettingOrders(true);

    try {
      const resetResult = await resetOrdersRequest();
      clearOrdersState();
      await Promise.allSettled([
        refreshDrivers({ silent: true }),
        refreshCustomers({ silent: true })
      ]);
      toast.success(messagesRef.current.ordersReset);
      return resetResult;
    } catch (error) {
      toast.error(getApiErrorMessage(error, messagesRef.current.ordersResetError));
      throw error;
    } finally {
      setResettingOrders(false);
    }
  }

  async function createDriver(payload) {
    setCreatingDriver(true);

    try {
      const createdDriverResult = await createDriverRequest(payload);
      setDrivers((currentDrivers) =>
        upsertDriver(currentDrivers, createdDriverResult?.driver)
      );
      toast.success(messagesRef.current.driverCreated);
      return createdDriverResult;
    } catch (error) {
      toast.error(getApiErrorMessage(error, messagesRef.current.driverCreateError));
      throw error;
    } finally {
      setCreatingDriver(false);
    }
  }

  async function updateDriver(driverId, payload) {
    setDriverBusy(driverId, true);

    try {
      const updatedDriver = await updateDriverRequest(driverId, payload);
      setDrivers((currentDrivers) => upsertDriver(currentDrivers, updatedDriver));
      toast.success(messagesRef.current.driverUpdated);
      return updatedDriver;
    } catch (error) {
      toast.error(getApiErrorMessage(error, messagesRef.current.driverUpdateError));
      throw error;
    } finally {
      setDriverBusy(driverId, false);
    }
  }

  async function resetDriverPassword(driverId) {
    setDriverBusy(driverId, true);

    try {
      const resetResult = await resetDriverPasswordRequest(driverId);
      setDrivers((currentDrivers) =>
        upsertDriver(currentDrivers, resetResult?.driver)
      );
      toast.success(messagesRef.current.driverPasswordReset);
      return resetResult;
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, messagesRef.current.driverResetPasswordError)
      );
      throw error;
    } finally {
      setDriverBusy(driverId, false);
    }
  }

  async function deleteDriver(driverId) {
    setDriverBusy(driverId, true);

    try {
      const deleteResult = await deleteDriverRequest(driverId);
      setDrivers((currentDrivers) =>
        removeDriver(currentDrivers, deleteResult.driverId || driverId)
      );
      await refreshOrders({ silent: true }).catch(() => null);
      toast.success(messagesRef.current.driverDeleted);
      return deleteResult;
    } catch (error) {
      toast.error(getApiErrorMessage(error, messagesRef.current.driverDeleteError));
      throw error;
    } finally {
      setDriverBusy(driverId, false);
    }
  }

  async function resetCustomerPassword(customerId) {
    setCustomerBusy(customerId, true);

    try {
      const resetResult = await resetCustomerPasswordRequest(customerId);
      toast.success(messagesRef.current.customerPasswordReset);
      return resetResult;
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, messagesRef.current.customerResetPasswordError)
      );
      throw error;
    } finally {
      setCustomerBusy(customerId, false);
    }
  }

  async function deleteCustomer(customerId) {
    setCustomerBusy(customerId, true);

    try {
      const deleteResult = await deleteCustomerRequest(customerId);
      setCustomers((currentCustomers) =>
        removeCustomer(currentCustomers, deleteResult.customerId || customerId)
      );
      await refreshOrders({ silent: true }).catch(() => null);
      toast.success(messagesRef.current.customerDeleted);
      return deleteResult;
    } catch (error) {
      toast.error(getApiErrorMessage(error, messagesRef.current.customerDeleteError));
      throw error;
    } finally {
      setCustomerBusy(customerId, false);
    }
  }

  async function saveSettings(nextSettings) {
    setSavingSettings(true);

    try {
      const savedSettings = await updateSettingsRequest(nextSettings);
      setSettings(savedSettings);
      writeCachedValue(STORAGE_KEYS.settings, savedSettings);
      setResourceStatus("settings", { error: "", stale: false });
      toast.success(messagesRef.current.settingsSaved);
      return savedSettings;
    } catch {
      setSettings(nextSettings);
      writeCachedValue(STORAGE_KEYS.settings, nextSettings);
      setResourceStatus("settings", { stale: true });
      toast.success(messagesRef.current.settingsSavedLocally);
      return nextSettings;
    } finally {
      setSavingSettings(false);
    }
  }

  function setMutationState(setter, id, isBusy) {
    setter((current) => {
      const next = { ...current };
      if (isBusy) {
        next[id] = true;
      } else {
        delete next[id];
      }
      return next;
    });
  }

  async function saveProduct(productId, payload) {
    setMutationState(setProductMutationIds, productId, true);

    try {
      const savedProduct = await updateProductRequest(productId, payload);
      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === productId ? savedProduct : product
        )
      );
      toast.success(messagesRef.current.productSaved);
      return savedProduct;
    } catch (error) {
      toast.error(getApiErrorMessage(error, messagesRef.current.productSaveError));
      throw error;
    } finally {
      setMutationState(setProductMutationIds, productId, false);
    }
  }

  async function deleteProduct(productId) {
    setMutationState(setProductMutationIds, productId, true);

    try {
      const deleteResult = await deleteProductRequest(productId);
      setProducts((currentProducts) =>
        removeProduct(currentProducts, deleteResult.productId || productId)
      );
      toast.success(messagesRef.current.productDeleted);
      return deleteResult;
    } catch (error) {
      toast.error(getApiErrorMessage(error, messagesRef.current.productDeleteError));
      throw error;
    } finally {
      setMutationState(setProductMutationIds, productId, false);
    }
  }

  async function saveZone(zoneId, payload) {
    setMutationState(setZoneMutationIds, zoneId, true);

    try {
      const savedZone = await updateZoneRequest(zoneId, payload);
      setZones((currentZones) =>
        currentZones.map((zone) => (zone.id === zoneId ? savedZone : zone))
      );
      toast.success(messagesRef.current.zoneSaved);
      return savedZone;
    } catch (error) {
      toast.error(getApiErrorMessage(error, messagesRef.current.zoneSaveError));
      throw error;
    } finally {
      setMutationState(setZoneMutationIds, zoneId, false);
    }
  }

  async function deleteZone(zoneId) {
    setMutationState(setZoneMutationIds, zoneId, true);

    try {
      const deleteResult = await deleteZoneRequest(zoneId);
      setZones((currentZones) =>
        removeZone(currentZones, deleteResult.zoneId || zoneId)
      );
      toast.success(messagesRef.current.zoneDeleted);
      return deleteResult;
    } catch (error) {
      toast.error(getApiErrorMessage(error, messagesRef.current.zoneDeleteError));
      throw error;
    } finally {
      setMutationState(setZoneMutationIds, zoneId, false);
    }
  }

  useEffect(() => {
    refreshAdminData();

    const socket = getSocket();

    function handleConnect() {
      setConnectionStatus("connected");
    }

    function handleDisconnect() {
      setConnectionStatus("disconnected");
    }

    function handleReconnecting() {
      setConnectionStatus("connecting");
    }

    function handleRealtimeOrder(incomingOrder, options = {}) {
      const normalizedOrder = normalizeOrder(incomingOrder);

      if (!normalizedOrder) {
        return;
      }

      setOrders((currentOrders) => {
        const nextOrders = upsertOrder(currentOrders, normalizedOrder);
        writeCachedValue(STORAGE_KEYS.orders, nextOrders);
        return nextOrders;
      });

      if (options.announce && !announcedOrderIdsRef.current.has(normalizedOrder.id)) {
        announcedOrderIdsRef.current.add(normalizedOrder.id);
        setLatestIncomingOrder(normalizedOrder);
        toast.success(messagesRef.current.newOrder(normalizedOrder.name));
      }

      refreshDrivers({ silent: true }).catch(() => {});
      refreshCustomers({ silent: true }).catch(() => {});
    }

    function handleDriverRealtime(incomingDriver) {
      setDrivers((currentDrivers) => upsertDriver(currentDrivers, incomingDriver));
    }

    function handleProductRealtime(incomingProduct) {
      setProducts((currentProducts) =>
        upsertProduct(currentProducts, incomingProduct)
      );
    }

    function handleProductDeleted(payload) {
      const productId = Number(payload?.id);

      if (!productId) {
        refreshProducts({ silent: true }).catch(() => {});
        return;
      }

      setProducts((currentProducts) => removeProduct(currentProducts, productId));
    }

    function handleZoneRealtime(incomingZone) {
      setZones((currentZones) => upsertZone(currentZones, incomingZone));
    }

    function handleZoneDeleted(payload) {
      const zoneId = Number(payload?.id);

      if (!zoneId) {
        refreshZones({ silent: true }).catch(() => {});
        return;
      }

      setZones((currentZones) => removeZone(currentZones, zoneId));
    }

    function handleSettingsRealtime(incomingSettings) {
      const normalizedSettings = normalizeSettings(incomingSettings);

      if (!normalizedSettings) {
        return;
      }

      setSettings(normalizedSettings);
      writeCachedValue(STORAGE_KEYS.settings, normalizedSettings);
      setResourceStatus("settings", {
        stale: false,
        error: ""
      });
    }

    function handleCustomerRealtime(incomingCustomer) {
      if (incomingCustomer) {
        setCustomers((currentCustomers) =>
          upsertCustomer(currentCustomers, incomingCustomer)
        );
        return;
      }

      refreshCustomers({ silent: true }).catch(() => {});
    }

    function handleCustomerDeleted(payload) {
      const customerId = Number(payload?.id);

      if (!customerId) {
        refreshCustomers({ silent: true }).catch(() => {});
        return;
      }

      setCustomers((currentCustomers) => removeCustomer(currentCustomers, customerId));
      refreshOrders({ silent: true }).catch(() => {});
    }

    function handleDriverDeleted(payload) {
      const driverId = Number(payload?.id);

      if (!driverId) {
        refreshDrivers({ silent: true }).catch(() => {});
        return;
      }

      setDrivers((currentDrivers) => removeDriver(currentDrivers, driverId));
      refreshOrders({ silent: true }).catch(() => {});
    }

    function handleOrdersReset() {
      clearOrdersState();
      refreshDrivers({ silent: true }).catch(() => {});
      refreshCustomers({ silent: true }).catch(() => {});
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleReconnecting);
    socket.on("reconnect_attempt", handleReconnecting);
    socket.on("new_order", (order) => handleRealtimeOrder(order, { announce: true }));
    socket.on("order_updated", handleRealtimeOrder);
    socket.on("order_status_changed", handleRealtimeOrder);
    socket.on("orders_reset", handleOrdersReset);
    socket.on("driver_created", handleDriverRealtime);
    socket.on("driver_updated", handleDriverRealtime);
    socket.on("driver_deleted", handleDriverDeleted);
    socket.on("product_updated", handleProductRealtime);
    socket.on("product_deleted", handleProductDeleted);
    socket.on("zone_updated", handleZoneRealtime);
    socket.on("zone_deleted", handleZoneDeleted);
    socket.on("settings_updated", handleSettingsRealtime);
    socket.on("customer_registered", handleCustomerRealtime);
    socket.on("customer_deleted", handleCustomerDeleted);

    if (socket.connected) {
      setConnectionStatus("connected");
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleReconnecting);
      socket.off("reconnect_attempt", handleReconnecting);
      socket.off("new_order");
      socket.off("order_updated", handleRealtimeOrder);
      socket.off("order_status_changed", handleRealtimeOrder);
      socket.off("orders_reset", handleOrdersReset);
      socket.off("driver_created", handleDriverRealtime);
      socket.off("driver_updated", handleDriverRealtime);
      socket.off("driver_deleted", handleDriverDeleted);
      socket.off("product_updated", handleProductRealtime);
      socket.off("product_deleted", handleProductDeleted);
      socket.off("zone_updated", handleZoneRealtime);
      socket.off("zone_deleted", handleZoneDeleted);
      socket.off("settings_updated", handleSettingsRealtime);
      socket.off("customer_registered", handleCustomerRealtime);
      socket.off("customer_deleted", handleCustomerDeleted);
    };
  }, []);

  const stats = useMemo(() => {
    return orders.reduce(
      (accumulator, order) => {
        accumulator.total += 1;

        if (order.status === "pending") {
          accumulator.pending += 1;
          accumulator.newOrders += 1;
        }

        if (order.status === "accepted") {
          accumulator.accepted += 1;
          accumulator.active += 1;
        }

        if (order.status === "delivered") {
          accumulator.delivered += 1;
          accumulator.completed += 1;
        }

        if (order.status === "cancelled") {
          accumulator.cancelled += 1;
        }

        return accumulator;
      },
      {
        total: 0,
        pending: 0,
        accepted: 0,
        delivered: 0,
        cancelled: 0,
        newOrders: 0,
        active: 0,
        completed: 0
      }
    );
  }, [orders]);

  const operationalSnapshot = useMemo(() => {
    const onlineDrivers = drivers.filter((driver) => driver.status === "online");
    const availableDrivers = drivers.filter(
      (driver) =>
        driver.status === "online" && driver.availability === "available"
    );

    return {
      onlineDrivers: onlineDrivers.length,
      availableDrivers: availableDrivers.length,
      totalDrivers: drivers.length,
      totalCustomers: customers.length
    };
  }, [drivers, customers]);

  const value = {
    orders,
    drivers,
    customers,
    settings,
    products,
    zones,
    resources,
    connectionStatus,
    latestIncomingOrder,
    savingSettings,
    creatingDriver,
    resettingOrders,
    orderMutationIds,
    driverMutationIds,
    customerMutationIds,
    productMutationIds,
    zoneMutationIds,
    stats,
    operationalSnapshot,
    isRefreshing: Object.values(resources).some((resource) => resource.refreshing),
    refreshOrders,
    refreshDrivers,
    refreshCustomers,
    refreshSettings,
    refreshProducts,
    refreshZones,
    refreshAdminData,
    advanceOrderStatus,
    updateOrder,
    cancelOrder,
    resetOrders,
    createDriver,
    updateDriver,
    resetDriverPassword,
    deleteDriver,
    resetCustomerPassword,
    deleteCustomer,
    saveSettings,
    saveProduct,
    deleteProduct,
    saveZone,
    deleteZone,
    dismissLatestAlert
  };

  return (
    <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
  );
}
