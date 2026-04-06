const Bill = require('../models/Bill');
const Expense = require('../models/Expense');
const Product = require('../models/Product');

// @desc    Get dashboard metrics (Total Sales, P/L, Stats)
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    // Set to end of day for proper $lte logic
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const currentMonthStr = String(today.getMonth() + 1).padStart(2, '0');
    const currentYear = today.getFullYear();

    // 1. Total Sales & Revenue for Current Month
    const billsAgg = await Bill.aggregate([
      {
        $match: {
          user: req.user._id,
          createdAt: {
            $gte: new Date(`${currentYear}-${currentMonthStr}-01T00:00:00.000Z`),
            $lte: endOfToday
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalSales: { $sum: 1 }
        }
      }
    ]);

    const totalRevenue = billsAgg[0]?.totalRevenue || 0;
    const totalSales = billsAgg[0]?.totalSales || 0;

    // 2. Total Expenses for Current Month
    const expensesAgg = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
          date: {
            $gte: new Date(`${currentYear}-${currentMonthStr}-01T00:00:00.000Z`),
            $lte: endOfToday
          }
        }
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' }
        }
      }
    ]);

    const totalExpenses = expensesAgg[0]?.totalExpenses || 0;

    // 3. Low stock alerts
    const lowStockProducts = await Product.aggregate([
      {
        $match: {
          user: req.user._id,
          $expr: { $lte: ['$quantity', '$minStockThreshold'] }
        }
      }
    ]);

    // Calculate Profit
    const profit = totalRevenue - totalExpenses;

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        totalSales,
        totalExpenses,
        profit,
        lowStockItems: lowStockProducts.length,
        lowStockProducts
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @desc    Get Monthly report data for charts
// @route   GET /api/dashboard/chart
// @access  Private
exports.getChartData = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    
    // Group bills by month
    const monthlySales = await Bill.aggregate([
      {
        $match: {
          user: req.user._id,
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Group expenses by month
    const monthlyExpenses = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
          date: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$date' },
          expenses: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Format chart data
    const chartData = months.map((month, index) => {
      const monthNum = index + 1;
      const saleObj = monthlySales.find(item => item._id === monthNum);
      const expenseObj = monthlyExpenses.find(item => item._id === monthNum);
      
      const revenue = saleObj ? saleObj.revenue : 0;
      const expenses = expenseObj ? expenseObj.expenses : 0;

      return {
        name: month,
        revenue,
        expenses,
        profit: revenue - expenses
      };
    });

    res.status(200).json({ success: true, data: chartData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
