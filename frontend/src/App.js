import React, { Suspense, lazy } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { HelmetProvider } from "react-helmet-async";
import SEO from "./components/SEO";

// Pages (Code-splitted with dynamic lazy imports)
const LandingPage = lazy(() => import("./pages/LandingPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const PasswordRecoveryPage = lazy(() => import("./pages/PasswordRecoveryPage"));
const GuestBrowse = lazy(() => import("./pages/GuestBrowse"));
const GuestBookings = lazy(() => import("./pages/GuestBookings"));
const HostDashboard = lazy(() => import("./pages/HostDashboard"));
const HostCalendar = lazy(() => import("./pages/HostCalendar"));
const HostListProperty = lazy(() => import("./pages/HostListProperty"));
const PropertyDetail = lazy(() => import("./pages/PropertyDetail"));
const BookingConfirmation = lazy(() => import("./pages/BookingConfirmation"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminAccount = lazy(() => import("./pages/AdminAccount"));
const BrokerDashboard = lazy(() => import("./pages/BrokerDashboard"));
const EmployeeDashboard = lazy(() => import("./pages/EmployeeDashboard"));
const HostPayouts = lazy(() => import("./pages/HostPayouts"));
const HostBookings = lazy(() => import("./pages/HostBookings"));
const SsoCallback = lazy(() => import("./pages/SsoCallback"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const Blog = lazy(() => import("./pages/Blog"));

const ScreenLoading = () => (
  <div className="min-h-screen bg-stone flex items-center justify-center">
    <div className="text-center animate-pulse">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terracotta mx-auto mb-4"></div>
      <p className="text-charcoal-light text-sm font-medium tracking-wide">Loading Screen...</p>
    </div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-stone flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terracotta mx-auto mb-4"></div>
          <p className="text-charcoal-light">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const loginPath = allowedRoles?.includes("admin") ? "/admin/login" : "/login";
    return <Navigate to={loginPath} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <SEO robots="noindex,nofollow" />
      {children}
    </>
  );
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

const GlobalAlertDialog = () => {
  const [message, setMessage] = React.useState('');
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const originalAlert = window.alert;

    window.alert = (value) => {
      setMessage(String(value || ''));
      setOpen(true);
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-charcoal/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-elevated border border-gray-100 animate-scale-in">
        <div className="mb-6">
          <div className="w-12 h-12 rounded-2xl bg-terracotta/10 flex items-center justify-center mb-4">
            <span className="text-2xl font-bold tracking-tight text-terracotta">!</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-charcoal mb-2">X-Space360</h2>
          <p className="text-sm font-medium text-charcoal-muted leading-relaxed whitespace-pre-wrap">
            {message}
          </p>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setMessage('');
            }}
            className="px-8 py-3 rounded-2xl bg-terracotta text-white text-xs font-bold tracking-tight uppercase tracking-widest shadow-premium hover:bg-terracotta-dark transition"
            autoFocus
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <HelmetProvider>
        <BrowserRouter>
          <AuthProvider>
            <GlobalAlertDialog />
            <Suspense fallback={<ScreenLoading />}>
              <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/register" element={<AuthPage />} />
              <Route path="/forgot-password" element={<PasswordRecoveryPage mode="forgot" />} />
              <Route path="/reset-password" element={<PasswordRecoveryPage mode="reset" />} />
              <Route path="/admin" element={<AuthPage isAdminLogin={true} />} />
              <Route path="/admin/login" element={<AuthPage isAdminLogin={true} />} />
              <Route path="/property/:id" element={<PropertyDetail />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/about-us" element={<AboutUs />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/sso/goldenrich/callback" element={<SsoCallback />} />

              {/* Role-based Dashboard Redirect */}
              <Route path="/dashboard" element={<RoleBasedRedirect />} />

              {/* Guest Routes */}
              <Route path="/guest/browse" element={<GuestBrowse />} />
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
                path="/host/bookings"
                element={
                  <ProtectedRoute allowedRoles={["host"]}>
                    <HostBookings />
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
              <Route
                path="/host/list-property"
                element={
                  <ProtectedRoute allowedRoles={["host", "admin"]}>
                    <HostListProperty />
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

              {/* Broker Routes */}
              <Route
                path="/broker/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["broker"]}>
                    <BrokerDashboard />
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
                  <div className="min-h-screen bg-stone flex items-center justify-center">
                    <div className="text-center">
                      <h1 className="text-6xl font-semibold tracking-tight text-terracotta mb-4">404</h1>
                      <p className="text-charcoal-light mb-6">Page not found</p>
                      <a href="/" className="btn-primary">
                        Go Home
                      </a>
                    </div>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </AuthProvider>
        </BrowserRouter>
      </HelmetProvider>
    </div>
  );
}

export default App;
