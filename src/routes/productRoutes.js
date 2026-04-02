const express = require("express");

const {
  getProducts,
  updateProduct
} = require("../controllers/productController");

const router = express.Router();

router.get("/", getProducts);
router.patch("/:id", updateProduct);

module.exports = router;
