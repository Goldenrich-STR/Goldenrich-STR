import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Pages
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import GuestBrowse from "./pages/GuestBrowse";
import HostDashboard from "./pages/HostDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import BrokerDashboard from "./pages/BrokerDashboard";

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-sand-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terracotta mx-auto mb-4"></div>
          <p className="text-charcoal-light">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Role-based redirect
const RoleBasedRedirect = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case "admin":
      return <Navigate to="/admin/dashboard" replace />;
    case "host":
      return <Navigate to="/host/dashboard" replace />;
    case "broker":
      return <Navigate to="/broker/dashboard" replace />;
    case "employee":
      return <Navigate to="/employee/dashboard" replace />;
    case "guest":
    default:
      return <Navigate to="/guest/browse" replace />;
  }
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage />} />

            {/* Role-based Dashboard Redirect */}
            <Route path="/dashboard" element={<RoleBasedRedirect />} />

            {/* Guest Routes */}
            <Route
              path="/guest/browse"
              element={
                <ProtectedRoute allowedRoles={["guest"]}>
                  <GuestBrowse />
                </ProtectedRoute>
              }
            />

            {/* Host Routes */}
            <Route
              path="/host/dashboard"
              element={
                <ProtectedRoute allowedRoles={["host"]}>
                  <HostDashboard />
                </ProtectedRoute>
              }
            />

            {/* Broker Routes */}
            <Route
              path="/broker/dashboard"
              element={
                <ProtectedRoute allowedRoles={["broker"]}>
                  <BrokerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Employee Routes - Placeholder */}
            <Route
              path="/employee/dashboard"
              element={
                <ProtectedRoute allowedRoles={["employee"]}>
                  <div className="min-h-screen bg-sand-50 flex items-center justify-center">
                    <div className="text-center">
                      <h1 className="text-4xl font-extrabold text-charcoal mb-4">
                        Employee Dashboard
                      </h1>
                      <p className="text-charcoal-light">Coming soon...</p>
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route
              path="*"
              element={
                <div className="min-h-screen bg-sand-50 flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-6xl font-extrabold text-terracotta mb-4">404</h1>
                    <p className="text-charcoal-light mb-6">Page not found</p>
                    <a href="/" className="btn-primary">
                      Go Home
                    </a>
                  </div>
                </div>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
