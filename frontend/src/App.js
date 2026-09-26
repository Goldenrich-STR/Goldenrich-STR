import React, { Suspense, lazy } from "react";
import "@/App.css";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import SEO from "./components/SEO";
import ChatbotWidget from "./components/ChatbotWidget";
import { SEO_BROWSE_PATHS } from "./lib/seoRoutes";

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
const PlaceDetails = lazy(() => import("./pages/PlaceDetails"));
const BookingConfirmation = lazy(() => import("./pages/BookingConfirmation"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminAccount = lazy(() => import("./pages/AdminAccount"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const ExecutiveDashboard = lazy(() => import("./pages/admin/ExecutiveDashboard"));
const UserOrganizationManagement = lazy(() => import("./pages/admin/UserOrganizationManagement"));
const RolesPermissions = lazy(() => import("./pages/admin/RolesPermissions"));
const ReportingHierarchy = lazy(() => import("./pages/admin/ReportingHierarchy"));
const EscalationMatrix = lazy(() => import("./pages/admin/EscalationMatrix"));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const DepartmentsAdmin = lazy(() => import("./pages/admin/Departments"));
const BranchFranchiseManagementAdmin = lazy(() => import("./pages/admin/BranchFranchiseManagement"));
const HostManagementAdmin = lazy(() => import("./pages/admin/HostManagement"));
const PropertyOperationsAdmin = lazy(() => import("./pages/admin/PropertyOperations"));
const SubscriptionManagementAdmin = lazy(() => import("./pages/admin/SubscriptionManagement"));
const BookingOperationsAdmin = lazy(() => import("./pages/admin/BookingOperations"));
const FinanceSettlementsAdmin = lazy(() => import("./pages/admin/FinanceSettlements"));
const SalesCrmAdmin = lazy(() => import("./pages/admin/SalesCrm"));
const MarketingCmsAdmin = lazy(() => import("./pages/admin/MarketingCms"));
const BlogManagementAdmin = lazy(() => import("./pages/admin/BlogManagement"));
const CommunicationCenterAdmin = lazy(() => import("./pages/admin/CommunicationCenter"));
const ChannelManagerAdmin = lazy(() => import("./pages/admin/ChannelManager"));
const SupportTicketManagementAdmin = lazy(() => import("./pages/admin/SupportTicketManagement"));
const PlatformSettingsAdmin = lazy(() => import("./pages/admin/PlatformSettings"));
const ReportsAnalyticsAdmin = lazy(() => import("./pages/admin/ReportsAnalytics"));
const ApprovalCenterAdmin = lazy(() => import("./pages/admin/ApprovalCenter"));
const BrokerDashboard = lazy(() => import("./pages/BrokerDashboard"));
const EmployeeDashboard = lazy(() => import("./pages/EmployeeDashboard"));
const ManagingDirectorDashboard = lazy(() => import("./pages/ManagingDirectorDashboard"));
const TelecallerDashboard = lazy(() => import("./pages/TelecallerDashboard"));
const VideoVerificationRoom = lazy(() => import("./pages/VideoVerificationRoom"));
const HostPayouts = lazy(() => import("./pages/HostPayouts"));
const HostBookings = lazy(() => import("./pages/HostBookings"));
const HostPerformance = lazy(() => import("./pages/HostPerformance"));
const HostPricing = lazy(() => import("./pages/HostPricing"));
const SsoCallback = lazy(() => import("./pages/SsoCallback"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPostDetail = lazy(() => import("./pages/BlogPostDetail"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const AccountDeletionPage = lazy(() => import("./pages/AccountDeletionPage"));
const ListYourPropertyPage = lazy(() => import("./pages/ListYourPropertyPage"));

const ScreenLoading = () => (
  <div className="min-h-screen bg-stone flex items-center justify-center">
    <div className="text-center animate-pulse">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terracotta mx-auto mb-4"></div>
      <p className="text-charcoal-light text-sm font-medium tracking-wide">Loading Screen...</p>
    </div>
  </div>
);

// Protected Route Component
const normalizeRoleKey = (value) => String(value || '').toLowerCase().replace(/[\s-]+/g, '_');
const isRoleKey = (user, keys = []) => keys.includes(normalizeRoleKey(user?.admin_role_key || user?.designation));

const ProtectedRoute = ({ children, allowedRoles, allowedRoleKeys }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

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
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`${loginPath}?next=${encodeURIComponent(next)}`} replace />;
  }

  const roleAllowed = !allowedRoles || allowedRoles.includes(user.role);
  const roleKeyAllowed = allowedRoleKeys && isRoleKey(user, allowedRoleKeys);
  if (!roleAllowed && !roleKeyAllowed) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <SEO robots="noindex,nofollow" />
      {children}
    </>
  );
};

const MdProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

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
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/md/login?next=${encodeURIComponent(next)}`} replace />;
  }

  const mdKey = `${user.admin_role_key || ''} ${user.designation || ''}`.toLowerCase().replace(/[\s-]+/g, '_');
  if (user.role !== 'admin' || !mdKey.includes('managing_director')) {
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

  const hostResumePath = user?.user_id
    ? localStorage.getItem(`host_resume_path_${user.user_id}`)
    : null;

  switch (user.role) {
    case "admin":
      if (`${user.admin_role_key || ''} ${user.designation || ''}`.toLowerCase().replace(/[\s-]+/g, '_').includes('managing_director')) {
        return <Navigate to="/md/dashboard" replace />;
      }
      return <Navigate to="/admin/dashboard" replace />;
    case "host":
      return <Navigate to={hostResumePath || "/host/dashboard"} replace />;
    case "broker":
      return <Navigate to="/broker/dashboard" replace />;
    case "employee":
      const adminRole = user?.admin_role_key;
      if (adminRole === 'telecaller') {
        return <Navigate to="/telecaller/dashboard" replace />;
      }
      if (adminRole === 'rm' || adminRole === 'relationship_manager') {
        return <Navigate to="/broker/dashboard" replace />;
      }
      return <Navigate to="/employee/dashboard" replace />;
    case "guest":
    default:
      return <Navigate to="/guest/browse" replace />;
  }
};

const RoleAwareVideoVerificationRoom = () => {
  const { user } = useAuth();
  return <VideoVerificationRoom role={isRoleKey(user, ["telecaller"]) ? "telecaller" : "host"} />;
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

function AppRoutes() {
  const location = useLocation();

  // Check if current route is an authentication page
  const isAuthRoute = 
    location.pathname === "/login" || 
    location.pathname === "/register" || 
    location.pathname === "/register/host" ||
    location.pathname === "/host/register" ||
    location.pathname === "/admin/login" ||
    location.pathname === "/md/login";

  // Use state.backgroundLocation if navigating via React Router, or default to "/" (LandingPage)
  const backgroundLocation = location.state?.backgroundLocation || (isAuthRoute ? { pathname: "/" } : null);

  return (
    <>
      <Routes location={backgroundLocation || location}>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/register/host" element={<AuthPage defaultRole="host" />} />
        <Route path="/host/register" element={<AuthPage defaultRole="host" />} />
        <Route path="/forgot-password" element={<PasswordRecoveryPage mode="forgot" />} />
        <Route path="/reset-password" element={<PasswordRecoveryPage mode="reset" />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/login" element={<AuthPage isAdminLogin={true} />} />
        <Route path="/md/login" element={<AuthPage isAdminLogin={true} isMdLogin={true} />} />
        <Route path="/md/dashboard"
          element={
            <MdProtectedRoute>
              <ManagingDirectorDashboard />
            </MdProtectedRoute>
          }
        />
        {/* SEO Clean Category & City Browse Routes */}
        {SEO_BROWSE_PATHS.map((path) => (
          <Route key={path} path={path} element={<GuestBrowse />} />
        ))}
        <Route path="/property/villas-in-bhnadardara" element={<Navigate to="/property/villas-in-bhandardara" replace />} />
        <Route path="/property/laxury-villas-in-nashik" element={<Navigate to="/property/luxury-villas-in-nashik" replace />} />
        <Route path="/property/scenic-villas-in-bhnadardara" element={<Navigate to="/property/scenic-villas-in-bhandardara" replace />} />
        <Route path="/property/residential/*" element={<GuestBrowse />} />
        <Route path="/property/event-venues" element={<Navigate to="/event-venues/" replace />} />
        <Route path="/property/event-venues/*" element={<GuestBrowse />} />
        <Route path="/property/commercial-spaces" element={<Navigate to="/property/workspaces/" replace />} />
        <Route path="/property/commercial-spaces/*" element={<GuestBrowse />} />
        <Route path="/property/villas/*" element={<GuestBrowse />} />

        <Route path="/property/:id" element={<PropertyDetail />} />
        <Route path="/places/:slug" element={<PlaceDetails />} />
        <Route path="/list-your-property" element={<ListYourPropertyPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/about-us" element={<AboutUs />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPostDetail />} />
        <Route path="/legal" element={<LegalPage />} />
        <Route path="/legal/:slug" element={<LegalPage />} />
        <Route path="/terms" element={<LegalPage />} />
        <Route path="/privacy" element={<LegalPage />} />
        <Route path="/refund-policy" element={<LegalPage />} />
        <Route path="/account-deletion" element={<AccountDeletionPage />} />
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
          path="/host/performance"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <HostPerformance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/pricing"
          element={
            <ProtectedRoute allowedRoles={["host"]}>
              <HostPricing />
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
            <ProtectedRoute allowedRoles={["broker", "employee"]}>
              <BrokerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Telecaller Routes */}
        <Route path="/telecalling/dashboard" element={<Navigate to="/telecaller/dashboard" replace />} />
        <Route
          path="/telecaller/dashboard"
          element={
            <ProtectedRoute allowedRoleKeys={["telecaller"]}>
              <TelecallerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/telecaller/verification/:verificationId"
          element={
            <ProtectedRoute allowedRoleKeys={["telecaller"]}>
              <TelecallerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/verification/video/:verificationId"
          element={
            <ProtectedRoute allowedRoles={["host", "admin"]} allowedRoleKeys={["telecaller"]}>
              <RoleAwareVideoVerificationRoom />
            </ProtectedRoute>
          }
        />
        <Route
          path="/host/properties/:propertyId/video-verification"
          element={
            <ProtectedRoute allowedRoles={["host", "admin"]} allowedRoleKeys={["telecaller"]}>
              <RoleAwareVideoVerificationRoom />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<ExecutiveDashboard />} />
          <Route path="users" element={<UserOrganizationManagement />} />
          <Route path="roles-permissions" element={<RolesPermissions />} />
          <Route path="reporting-hierarchy" element={<ReportingHierarchy />} />
          <Route path="escalation-matrix" element={<EscalationMatrix />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="departments" element={<DepartmentsAdmin />} />
          <Route path="branch-franchise" element={<BranchFranchiseManagementAdmin />} />
          <Route path="hosts" element={<HostManagementAdmin />} />
          <Route path="properties" element={<PropertyOperationsAdmin />} />
          <Route path="subscriptions" element={<SubscriptionManagementAdmin />} />
          <Route path="bookings" element={<BookingOperationsAdmin />} />
          <Route path="finance" element={<FinanceSettlementsAdmin />} />
          <Route path="crm" element={<SalesCrmAdmin />} />
          <Route path="cms" element={<MarketingCmsAdmin />} />
          <Route path="blogs" element={<BlogManagementAdmin />} />
          <Route path="communication" element={<CommunicationCenterAdmin />} />
          <Route path="channel-manager" element={<ChannelManagerAdmin />} />
          <Route path="channel-manager/price-engine" element={<ChannelManagerAdmin />} />
          <Route path="support" element={<SupportTicketManagementAdmin />} />
          <Route path="settings" element={<PlatformSettingsAdmin />} />
          <Route path="approvals" element={<ApprovalCenterAdmin />} />
          <Route path="reports" element={<ReportsAnalyticsAdmin />} />
        </Route>
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

      {/* Render AuthPage as a modal overlay on top of the background route */}
      {isAuthRoute && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <AuthPage isAdminLogin={location.pathname.startsWith("/admin") || location.pathname.startsWith("/md")} isMdLogin={location.pathname.startsWith("/md")} />
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <GlobalAlertDialog />
        <Suspense fallback={<ScreenLoading />}>
          <AppRoutes />
        </Suspense>
        <ChatbotWidget />
      </AuthProvider>
    </div>
  );
}

export default App;
