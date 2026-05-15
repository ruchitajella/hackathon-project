import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/employee/Dashboard';
import MyLeaves from './pages/employee/MyLeaves';
import NewLeave from './pages/employee/NewLeave';
import LeaveDetail from './pages/employee/LeaveDetail';
import TeamLeaves from './pages/manager/TeamLeaves';
import LeaveApproval from './pages/manager/LeaveApproval';
import Availability from './pages/shared/Availability';

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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/my-leaves"
            element={
              <PrivateRoute>
                <Layout>
                  <MyLeaves />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/my-leaves/new"
            element={
              <PrivateRoute>
                <Layout>
                  <NewLeave />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/my-leaves/:id"
            element={
              <PrivateRoute>
                <Layout>
                  <LeaveDetail />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/availability"
            element={
              <PrivateRoute>
                <Layout>
                  <Availability />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/manager/team-leaves"
            element={
              <PrivateRoute>
                <Layout>
                  <TeamLeaves />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route
            path="/manager/team-leaves/:id"
            element={
              <PrivateRoute>
                <Layout>
                  <LeaveApproval />
                </Layout>
              </PrivateRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}