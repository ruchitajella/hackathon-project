import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';

import Login         from './pages/auth/Login';
import Register      from './pages/auth/Register';
import Dashboard     from './pages/employee/Dashboard';
import MyLeaves      from './pages/employee/MyLeaves';
import NewLeave      from './pages/employee/NewLeave';
import LeaveDetail   from './pages/employee/LeaveDetail';
import TeamLeaves    from './pages/manager/TeamLeaves';
import LeaveApproval from './pages/manager/LeaveApproval';
import Availability  from './pages/shared/Availability';

// ─── Blocks managers from accessing employee-only pages ───────────
function EmployeeOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.role === 'manager') return <Navigate to="/" replace />;
  return children;
}

// ─── Shared layout with navbar ────────────────────────────────────
function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Public */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Dashboard — both roles */}
          <Route path="/" element={
            <PrivateRoute>
              <Layout><Dashboard /></Layout>
            </PrivateRoute>
          } />

          {/* Employee only routes */}
          <Route path="/my-leaves" element={
            <PrivateRoute>
              <EmployeeOnlyRoute>
                <Layout><MyLeaves /></Layout>
              </EmployeeOnlyRoute>
            </PrivateRoute>
          } />

          <Route path="/my-leaves/new" element={
            <PrivateRoute>
              <EmployeeOnlyRoute>
                <Layout><NewLeave /></Layout>
              </EmployeeOnlyRoute>
            </PrivateRoute>
          } />

          <Route path="/my-leaves/:id" element={
            <PrivateRoute>
              <EmployeeOnlyRoute>
                <Layout><LeaveDetail /></Layout>
              </EmployeeOnlyRoute>
            </PrivateRoute>
          } />

          {/* Shared — both roles */}
          <Route path="/availability" element={
            <PrivateRoute>
              <Layout><Availability /></Layout>
            </PrivateRoute>
          } />

          {/* Manager only routes */}
          <Route path="/manager/team-leaves" element={
            <PrivateRoute>
              <Layout><TeamLeaves /></Layout>
            </PrivateRoute>
          } />

          <Route path="/manager/team-leaves/:id" element={
            <PrivateRoute>
              <Layout><LeaveApproval /></Layout>
            </PrivateRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

