const customerModel = require("../models/customerModel");
const { generateTemporaryPassword } = require("../utils/driverCredentials");
const { hashPassword } = require("../utils/password");

const ADMIN_ROOM = "admin_dashboard";

function toNullableString(value) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function emitCustomerDeleted(io, customerId) {
  if (!io || !customerId) {
    return;
  }

  io.to(ADMIN_ROOM).emit("customer_deleted", {
    id: Number(customerId)
  });
}

async function getCustomers(req, res, next) {
  try {
    const search = toNullableString(req.query.search);
    const customers = await customerModel.getAllCustomersForAdmin({ search });
    return res.status(200).json(customers);
  } catch (error) {
    return next(error);
  }
}

async function resetCustomerPassword(req, res, next) {
  try {
    const customerId = Number(req.params.id);

    if (Number.isNaN(customerId) || customerId <= 0) {
      return res.status(400).json({
        message: "Invalid customer id."
      });
    }

    const existingCustomer = await customerModel.findCustomerById(customerId);

    if (!existingCustomer) {
      return res.status(404).json({
        message: "Customer not found."
      });
    }

    const temporaryPassword = generateTemporaryPassword();
    const updatedCustomer = await customerModel.updateCustomerPassword(
      customerId,
      hashPassword(temporaryPassword)
    );

    return res.status(200).json({
      customer: updatedCustomer,
      credentials: {
        identifier:
          updatedCustomer?.phone || existingCustomer?.phone || existingCustomer?.email || "",
        temporaryPassword
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteCustomer(req, res, next) {
  try {
    const customerId = Number(req.params.id);

    if (Number.isNaN(customerId) || customerId <= 0) {
      return res.status(400).json({
        message: "Invalid customer id."
      });
    }

    const existingCustomer = await customerModel.findCustomerById(customerId);

    if (!existingCustomer) {
      return res.status(404).json({
        message: "Customer not found."
      });
    }

    const deletedCustomer = await customerModel.deleteCustomer(customerId);

    emitCustomerDeleted(req.app.get("io"), customerId);

    return res.status(200).json({
      message: "Customer deleted successfully.",
      customer: deletedCustomer || existingCustomer
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getCustomers,
  resetCustomerPassword,
  deleteCustomer
};
