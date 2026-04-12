const express = require('express');
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.route('/')
  .get(getProducts)
  .post(createProduct);

router.route('/:id')
  .get(getProduct)
  .put(updateProduct)
  .delete(deleteProduct);

module.exports = router;
