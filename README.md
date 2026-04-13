# SmartPOS

SmartPOS is a full-stack retail billing and inventory management app built for fast counter operations, stock tracking, expense monitoring, and phone-assisted barcode scanning.

It includes:
- inventory management
- billing and receipt generation
- expense tracking
- dashboard and optimization insights
- live phone scanner sessions that push scans into the desktop bill

## Project Structure

```text
MINI-PROJECT/
├── backend/   # Express, MongoDB, Socket.IO API
└── frontend/  # React + Vite client
```

## Features

- Secure login and registration
- Product create, update, delete, and barcode lookup
- Billing workflow with `Cash`, `Card`, and `UPI`
- Branded PDF receipt generation
- Receipt download and WhatsApp handoff
- Expense logging
- Dashboard metrics for revenue, expenses, profit, and low stock
- Optimization insights based on sales frequency and margin
- Live phone scanner session with QR-based pairing
- Auto-managed scanner tunnel support for mobile phone access in local development

## Tech Stack

### Frontend

- React
- Vite
- React Router
- Axios
- Recharts
- Socket.IO Client

### Backend

- Node.js
- Express
- MongoDB with Mongoose
- Socket.IO
- JWT authentication

## Setup

### 1. Install dependencies

Backend:

```powershell
cd backend
npm install
```

Frontend:

```powershell
cd frontend
npm install
```

### 2. Configure environment

Create `backend/.env`:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=30d
PUBLIC_FRONTEND_URL=
SCANNER_TUNNEL_TARGET=http://your_mongodb_connection_string
```

Notes:
- Keep `PUBLIC_FRONTEND_URL` empty in local development unless you have a real deployed HTTPS frontend.
- The scanner tunnel can automatically create a temporary secure URL for phone scanning during local development.

### 3. Run the app

Backend:

```powershell
cd backend
npm run dev
```

Frontend:

```powershell
cd frontend
npm run dev
```

Then open:

```text
http://localhost:5173
```

## Phone Scanner Flow

The billing screen supports QR-based phone pairing:

1. Desktop opens Billing
2. Desktop creates scanner session
3. QR is shown on the desktop
4. Phone scans the QR
5. Phone joins the session
6. Phone scans a barcode
7. Backend pushes the scanned item back to the desktop bill

In local development, the app can automatically start a `cloudflared` tunnel so the phone gets a secure URL for camera access.

## Receipt Flow

After checkout:

- a bill is saved to the backend
- a branded PDF receipt is generated
- the user can download it
- or open WhatsApp sharing flow

If customer name is empty, the receipt uses:

```text
Walk-in Customer
```

Customer phone number is optional.

## Scripts

### Backend

```powershell
npm run dev
npm start
```

### Frontend

```powershell
npm run dev
npm run build
npm run lint
npm run preview
```

## GitHub Safety


```

## Deployment Notes

For the best mobile scanner experience, deploy the app over HTTPS.

Recommended stack:

- frontend: Vercel or Netlify
- backend: Render, Railway, or VPS
- database: MongoDB Atlas

With a permanent HTTPS domain:

- the phone scanner works more reliably
- camera permissions work better
- no local tunnel juggling is needed

## Current Status

This project currently supports:

- professional dashboard and billing UI
- live phone scanner pairing
- branded receipt generation
- user-scoped data isolation on backend resources

## License

This project is currently private/internal unless you choose to add a license before publishing.
