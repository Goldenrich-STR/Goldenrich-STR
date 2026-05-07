import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Pages
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import GuestBrowse from "./pages/GuestBrowse";
import GuestBookings from "./pages/GuestBookings";
import HostDashboard from "./pages/HostDashboard";
import HostCalendar from "./pages/HostCalendar";
import HostListProperty from "./pages/HostListProperty";
import PropertyDetail from "./pages/PropertyDetail";
import BookingConfirmation from "./pages/BookingConfirmation";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAccount from "./pages/AdminAccount";
import BrokerDashboard from "./pages/BrokerDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import HostPayouts from "./pages/HostPayouts";

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
            <Route path="/property/:id" element={<PropertyDetail />} />

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
            <Route
              path="/guest/booking-confirmation"
              element={
                <ProtectedRoute allowedRoles={["guest"]}>
                  <BookingConfirmation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/guest/bookings"
              element={
                <ProtectedRoute allowedRoles={["guest"]}>
                  <GuestBookings />
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
            <Route
              path="/host/calendar"
              element={
                <ProtectedRoute allowedRoles={["host"]}>
                  <HostCalendar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/list-property"
              element={
                <ProtectedRoute allowedRoles={["host"]}>
                  <HostListProperty />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/payouts"
              element={
                <ProtectedRoute allowedRoles={["host"]}>
                  <HostPayouts />
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

            {/* Employee Routes */}
            <Route
              path="/employee/dashboard"
              element={
                <ProtectedRoute allowedRoles={["employee"]}>
                  <EmployeeDashboard />
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
            <Route
              path="/admin/account"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminAccount />
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
