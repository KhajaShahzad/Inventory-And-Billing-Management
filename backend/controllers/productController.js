const Product = require('../models/Product');

// @desc    Get all products
// @route   GET /api/products
// @access  Private
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find({ user: req.user.id });
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
exports.getProduct = async (req, res) => {
  try {
    let product;
    const { isValidObjectId } = require('mongoose');
    if (isValidObjectId(req.params.id)) {
      product = await Product.findOne({ _id: req.params.id, user: req.user.id });
    } else {
      // Allow searching by barcode
      product = await Product.findOne({ barcode: req.params.id, user: req.user.id });
    }

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private
exports.createProduct = async (req, res) => {
  try {
    // Add user to req.body
    req.body.user = req.user.id;

    const product = await Product.create(req.body);

    const io = req.app.get('io');
    io.emit('inventory_updated', { type: 'create', product });

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, error: 'Barcode already exists' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
exports.updateProduct = async (req, res) => {
  try {
    let product = await Product.findOne({ _id: req.params.id, user: req.user.id });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    product = await Product.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, req.body, {
      new: true,
      runValidators: true
    });

    const io = req.app.get('io');
    io.emit('inventory_updated', { type: 'update', product });

    // Check for low stock
    if (product.quantity <= product.minStockThreshold) {
      io.emit('low_stock_alert', { product });
    }

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, user: req.user.id });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    await Product.deleteOne({ _id: req.params.id, user: req.user.id });

    const io = req.app.get('io');
    io.emit('inventory_updated', { type: 'delete', productId: req.params.id });

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
