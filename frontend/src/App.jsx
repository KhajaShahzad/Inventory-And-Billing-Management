import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContextValue';

import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Billing from './pages/Billing';
import Expenses from './pages/Expenses';
import Optimization from './pages/Optimization';
import MobileScanner from './pages/MobileScanner';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  return children;
};

function App() {
  return (
    <Router>
      <Routes>

        {/* PUBLIC ROUTES */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ✅ MOBILE SCANNER (NO AUTH REQUIRED) */}
        <Route path="/mobi" element={<MobileScanner />} />
        <Route path="/mobile-scanner" element={<MobileScanner />} />

        {/* PROTECTED ROUTES */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="billing" element={<Billing />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="optimization" element={<Optimization />} />
        </Route>

      </Routes>
    </Router>
  );
}

export default App;
