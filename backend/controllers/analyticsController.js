const Product = require('../models/Product');
const Bill = require('../models/Bill');
const Expense = require('../models/Expense');

// @desc    Get AI-driven Profit Optimization and Analytics
// @route   GET /api/analytics/optimization
// @access  Private
exports.getOptimizationInsights = async (req, res) => {
  try {
    const products = await Product.find({ user: req.user.id }).lean();
    const bills = await Bill.find({ user: req.user.id }).lean();
    const expenses = await Expense.find({ user: req.user.id }).lean();

    if (!products.length) {
      return res.status(200).json({
        success: true,
        data: [],
        summary: {
          topSeller: null,
          slowMover: null,
          highestExpenseCategory: null,
          restockCandidate: null,
        },
      });
    }

    // 1. Calculate sales frequency map
    const salesMap = {};
    bills.forEach(bill => {
      bill.items.forEach(item => {
        const pId = item.product.toString();
        if (!salesMap[pId]) salesMap[pId] = 0;
        salesMap[pId] += item.quantity;
      });
    });

    // 2. Calculate profit margin and frequency for each product
    let analyticsData = products.map(product => {
      const price = product.price || 0;
      const costPrice = product.costPrice || 0;
      
      // Profit margin calculation bounded
      let profitMargin = 0;
      if (price > 0) {
        profitMargin = ((price - costPrice) / price) * 100;
      }

      const salesFrequency = salesMap[product._id.toString()] || 0;

      return {
        _id: product._id,
        name: product.name,
        barcode: product.barcode,
        price,
        costPrice,
        profitMargin, // in percentage
        salesFrequency,
        currentStock: product.quantity
      };
    });

    // 3. Normalization for Greedy Strategy
    const maxProfit = Math.max(...analyticsData.map(p => p.profitMargin));
    const maxFreq = Math.max(...analyticsData.map(p => p.salesFrequency));

    // Calculate score using greedy approach (50/50 weight for profit and sales freq)
    analyticsData = analyticsData.map(p => {
      const normProfit = maxProfit > 0 ? (p.profitMargin / maxProfit) : 0;
      const normFreq = maxFreq > 0 ? (p.salesFrequency / maxFreq) : 0;
      p.greedyScore = (normProfit * 0.6) + (normFreq * 0.4); // slightly greedier on profit
      return p;
    });

    // 4. Sort by score descending
    analyticsData.sort((a, b) => b.greedyScore - a.greedyScore);

    // 5. Generate Recommendations based on rank
    const total = analyticsData.length;
    analyticsData = analyticsData.map((p, index) => {
      if (index < Math.ceil(total * 0.25) && p.greedyScore > 0) {
        p.action = 'Focus more on ' + p.name;
        p.category = 'Winner';
      } else if (index >= Math.floor(total * 0.75)) {
        p.action = 'Reduce stock of ' + p.name;
        p.category = 'Underperformer';
      } else {
        p.action = 'Maintain normal stock';
        p.category = 'Average';
      }
      return p;
    });

    const topSeller = [...analyticsData]
      .sort((a, b) => b.salesFrequency - a.salesFrequency)[0] || null;

    const slowMover = [...analyticsData]
      .filter((product) => product.currentStock > 0)
      .sort((a, b) => {
        if (a.salesFrequency === b.salesFrequency) {
          return b.currentStock - a.currentStock;
        }
        return a.salesFrequency - b.salesFrequency;
      })[0] || null;

    const restockCandidate = [...analyticsData]
      .filter((product) => product.currentStock <= 10)
      .sort((a, b) => {
        if (b.salesFrequency === a.salesFrequency) {
          return a.currentStock - b.currentStock;
        }
        return b.salesFrequency - a.salesFrequency;
      })[0] || null;

    const expenseCategoryMap = expenses.reduce((acc, expense) => {
      const category = expense.category || 'Other';
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += Number(expense.amount || 0);
      return acc;
    }, {});

    const highestExpenseCategoryEntry = Object.entries(expenseCategoryMap)
      .sort((a, b) => b[1] - a[1])[0];

    const highestExpenseCategory = highestExpenseCategoryEntry
      ? {
          category: highestExpenseCategoryEntry[0],
          totalAmount: highestExpenseCategoryEntry[1],
        }
      : null;

    res.status(200).json({
      success: true,
      data: analyticsData,
      summary: {
        topSeller,
        slowMover,
        highestExpenseCategory,
        restockCandidate,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
