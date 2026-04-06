const Bill = require('../models/Bill');
const Product = require('../models/Product');

// @desc    Create a bill
// @route   POST /api/bills
// @access  Private
exports.createBill = async (req, res) => {
  try {
    const { customerName, customerPhone, items, totalAmount, paymentMethod } = req.body;
    
    // items is an array of { product: productId, quantity, price }
    
    const io = req.app.get('io');

    // Start a transaction implicitly by checking everything first
    for (const item of items) {
      const product = await Product.findOne({ _id: item.product, user: req.user.id });
      if (!product) {
        return res.status(404).json({ success: false, error: `Product not found with id of ${item.product}` });
      }
      if (product.quantity < item.quantity) {
        return res.status(400).json({ success: false, error: `Insufficient stock for product ${product.name}` });
      }
    }

    // Now reduce stock and compile bill
    for (const item of items) {
      const product = await Product.findOne({ _id: item.product, user: req.user.id });
      product.quantity -= item.quantity;
      await product.save();
      
      io.emit('inventory_updated', { type: 'update', product });
      if (product.quantity <= product.minStockThreshold) {
        io.emit('low_stock_alert', { product });
      }
    }

    const bill = await Bill.create({
      customerName,
      customerPhone,
      items,
      totalAmount,
      paymentMethod,
      user: req.user.id
    });

    res.status(201).json({ success: true, data: bill });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get all bills
// @route   GET /api/bills
// @access  Private
exports.getBills = async (req, res) => {
  try {
    const bills = await Bill.find({ user: req.user.id })
      .populate('items.product', 'name barcode')
      .sort('-createdAt');
    res.status(200).json({ success: true, count: bills.length, data: bills });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
