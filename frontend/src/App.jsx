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
import TeamAccess from './pages/TeamAccess';
import Reports from './pages/Reports';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'staff' ? '/billing' : '/'} replace />;
  }

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
          <Route index element={<ProtectedRoute allowedRoles={['admin']}><Dashboard /></ProtectedRoute>} />
          <Route path="inventory" element={<ProtectedRoute allowedRoles={['admin']}><Inventory /></ProtectedRoute>} />
          <Route path="billing" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><Billing /></ProtectedRoute>} />
          <Route path="expenses" element={<ProtectedRoute allowedRoles={['admin']}><Expenses /></ProtectedRoute>} />
          <Route path="optimization" element={<ProtectedRoute allowedRoles={['admin']}><Optimization /></ProtectedRoute>} />
          <Route path="team-access" element={<ProtectedRoute allowedRoles={['admin']}><TeamAccess /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>} />
        </Route>
        {/* 404 CATCH-ALL */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </Router>
  );
}

export default App;
