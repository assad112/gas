const express = require("express");

const {
  getProducts,
  updateProduct,
  deleteProduct
} = require("../controllers/productController");

const router = express.Router();

router.get("/", getProducts);
router.patch("/:id", updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;
