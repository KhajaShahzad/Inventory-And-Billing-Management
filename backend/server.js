const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const billRoutes = require('./routes/billRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const scannerSessionRoutes = require('./routes/scannerSessionRoutes');

const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(express.json());

// Security middleware
app.use(helmet()); // Set security headers
app.use(hpp()); // Prevent HTTP Parameter Pollution

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175'
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i.test(origin)) {
    return true;
  }

  return /^https?:\/\/((localhost)|(127\.0\.0\.1)|(\d{1,3}(\.\d{1,3}){3}))(:\d+)?$/i.test(origin);
};

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true
}));

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/scanner-sessions', scannerSessionRoutes);

// Move error handling or unhandled routes if needed
app.use((err, req, res, next) => {
  const errorMsg = process.env.NODE_ENV === 'development' ? err.message : 'Server Error';
  console.error(err);
  res.status(500).json({ success: false, error: errorMsg });
});

const PORT = process.env.PORT || 5000;

// Setup Socket.io
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

app.set('io', io); // inject io into app context

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Mobile scanner room logic
  socket.on('join_session', (payload) => {
    const sessionId = typeof payload === 'string' ? payload : payload?.sessionId;
    const role = typeof payload === 'string' ? 'unknown' : payload?.role;
    if (!sessionId) {
      return;
    }

    socket.join(`scanner_${sessionId}`);
    if (role === 'mobile') {
      io.to(`scanner_${sessionId}`).emit('scanner_presence', {
        sessionId,
        role,
        status: 'connected',
        socketId: socket.id,
      });
    }
  });

  socket.on('mobile_scan', (data) => {
    // Expected structure: data = { session, barcode }
    if (data && data.session && data.barcode) {
      const scan = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        barcode: data.barcode,
        createdAt: Date.now(),
      };
      io.to(`scanner_${data.session}`).emit('scanned_barcode', scan);
      io.to(`scanner_${data.session}`).emit('scanner_session_updated', scan);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
