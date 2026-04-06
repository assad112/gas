const productModel = require("../models/productModel");

function emitProductUpdated(io, product) {
  if (!io || !product) {
    return;
  }

  io.emit("product_updated", product);
}

function emitProductDeleted(io, product) {
  if (!io || !product) {
    return;
  }

  io.emit("product_deleted", {
    id: product.id,
    code: product.code
  });
}

async function getProducts(_req, res, next) {
  try {
    const products = await productModel.getAllProducts();
    return res.status(200).json(products);
  } catch (error) {
    return next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const productId = Number(req.params.id);

    if (Number.isNaN(productId) || productId <= 0) {
      return res.status(400).json({
        message: "Invalid product id."
      });
    }

    const existingProduct = await productModel.getProductById(productId);

    if (!existingProduct) {
      return res.status(404).json({
        message: "Product not found."
      });
    }

    const product = await productModel.updateProduct(productId, req.body || {});
    emitProductUpdated(req.app.get("io"), product);
    return res.status(200).json(product);
  } catch (error) {
    return next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const productId = Number(req.params.id);

    if (Number.isNaN(productId) || productId <= 0) {
      return res.status(400).json({
        message: "Invalid product id."
      });
    }

    const existingProduct = await productModel.getProductById(productId);

    if (!existingProduct) {
      return res.status(404).json({
        message: "Product not found."
      });
    }

    const deletedProduct = await productModel.deleteProduct(productId);
    emitProductDeleted(req.app.get("io"), deletedProduct);

    return res.status(200).json({
      product: deletedProduct
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getProducts,
  updateProduct,
  deleteProduct
};
