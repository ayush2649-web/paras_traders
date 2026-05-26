import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useAuth from "./hooks/useAuth";
import useCart from "./hooks/useCart";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import EmployeeTopbar from "./components/layout/EmployeeTopbar";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";
import DeliveryRoute from "./components/auth/DeliveryRoute";
import SuperAdminRoute from "./components/auth/SuperAdminRoute";
import EmployeeHomeRoute from "./components/auth/EmployeeHomeRoute";
import MerchantRoute from "./components/auth/MerchantRoute";
import Home from "./pages/public/Home";
import Products from "./pages/shop/Products";
import ProductDetail from "./pages/shop/ProductDetail";
import Cart from "./pages/shop/Cart";
import Checkout from "./pages/shop/Checkout";
import Login from "./pages/auth/Login";
import EmployeeLogin from "./pages/auth/EmployeeLogin";
import Register from "./pages/auth/Register";
import Profile from "./pages/shop/Profile";
import Wishlist from "./pages/shop/Wishlist";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SuperAdmin from "./pages/admin/SuperAdmin";
import OrderManagement from "./pages/employee/OrderManagement";
import InventoryManagement from "./pages/employee/InventoryManagement";
import DeliveryPartner from "./pages/delivery/DeliveryPartner";
import Rewards from "./pages/shop/Rewards";
import FeaturesRoadmap from "./pages/public/FeaturesRoadmap";
import Jobs from "./pages/public/Jobs";
import OrderTracking from "./pages/shop/OrderTracking";
import MerchantInventory from "./pages/merchant/MerchantInventory";
import MerchantApplications from "./pages/merchant/MerchantApplications";
import MerchantAnalytics from "./pages/merchant/MerchantAnalytics";
import MerchantOrders from "./pages/merchant/MerchantOrders";
import MerchantQuestions from "./pages/merchant/MerchantQuestions";
import MerchantSettings from "./pages/merchant/MerchantSettings";
import BecomeAMerchant from "./pages/merchant/BecomeAMerchant";
import MerchantLogin from "./pages/auth/MerchantLogin";
import { isEmployeeUser } from "./utils/roleAccess";
import "./App.css";

function AppShell() {
  const location = useLocation();
  const { user, loading } = useAuth();
  // Initialize cart hook at top level so auto-fetch runs once
  useCart();

  const isEmployeeLoginPage = location.pathname === "/employee/login";
  const isMerchantLoginPage = 
    location.pathname === "/merchant" || 
    location.pathname === "/mercent" ||
    location.pathname === "/merchant/login" ||
    location.pathname === "/mercent/login";
  const isFullAdmin = Boolean(user?.is_superuser || user?.is_staff);
  const isOnEmployeeRoute = location.pathname.startsWith("/employee");
  const isEmployeeUserOnEmployeeRoute =
    isOnEmployeeRoute && (loading || isEmployeeUser(user) || isFullAdmin);
  const hideCommonLayout = isEmployeeLoginPage || isMerchantLoginPage || isEmployeeUserOnEmployeeRoute;
  const showEmployeeTopbar =
    isOnEmployeeRoute &&
    !isEmployeeLoginPage &&
    Boolean(user) &&
    (isEmployeeUser(user) || isFullAdmin);

  return (
    <div className={`app ${hideCommonLayout ? "app-employee-layout" : ""}`}>
      {!hideCommonLayout && <Navbar />}
      {showEmployeeTopbar && <EmployeeTopbar />}
      <main
        className={`main-content ${hideCommonLayout ? "main-content-employee" : ""}`}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route
            path="/innovation"
            element={
              <ProtectedRoute>
                <FeaturesRoadmap />
              </ProtectedRoute>
            }
          />
          <Route
            path="/features"
            element={<Navigate to="/innovation" replace />}
          />
          <Route
            path="/invotion"
            element={<Navigate to="/innovation" replace />}
          />
          <Route
            path="/jobs"
            element={
              <ProtectedRoute>
                <Jobs />
              </ProtectedRoute>
            }
          />
          <Route path="/careers" element={<Navigate to="/jobs" replace />} />
          <Route path="/sell" element={<BecomeAMerchant />} />
          <Route
            path="/track-order"
            element={
              <ProtectedRoute>
                <OrderTracking />
              </ProtectedRoute>
            }
          />
          <Route path="/employee/login" element={<EmployeeLogin />} />
          <Route path="/employee" element={<EmployeeHomeRoute />} />
          <Route
            path="/employee/portal"
            element={<Navigate to="/employee" replace />}
          />
          <Route
            path="/employee/dashboard"
            element={
              <AdminRoute requiredModule="dashboard">
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/employee/orders"
            element={
              <AdminRoute requiredModule="orders">
                <OrderManagement />
              </AdminRoute>
            }
          />
          <Route
            path="/employee/inventory"
            element={
              <AdminRoute requiredModule="inventory">
                <InventoryManagement />
              </AdminRoute>
            }
          />
          <Route
            path="/employee/delivery"
            element={
              <DeliveryRoute>
                <DeliveryPartner />
              </DeliveryRoute>
            }
          />
          <Route
            path="/employee/merchant/inventory"
            element={
              <MerchantRoute>
                <MerchantInventory />
              </MerchantRoute>
            }
          />
          <Route
            path="/employee/merchant/orders"
            element={
              <MerchantRoute>
                <MerchantOrders />
              </MerchantRoute>
            }
          />
          <Route
            path="/employee/merchant/applications"
            element={
              <MerchantRoute>
                <MerchantApplications />
              </MerchantRoute>
            }
          />
          <Route
            path="/employee/merchant/questions"
            element={
              <MerchantRoute>
                <MerchantQuestions />
              </MerchantRoute>
            }
          />
          <Route
            path="/employee/merchant/settings"
            element={
              <MerchantRoute>
                <MerchantSettings />
              </MerchantRoute>
            }
          />
          <Route
            path="/employee/merchant/analytics"
            element={
              <MerchantRoute>
                <MerchantAnalytics />
              </MerchantRoute>
            }
          />
          <Route
            path="/employee-portal"
            element={<Navigate to="/employee" replace />}
          />
          <Route
            path="/merchant"
            element={<MerchantLogin />}
          />
          <Route
            path="/merchant/login"
            element={<Navigate to="/merchant" replace />}
          />
          <Route
            path="/mercent"
            element={<Navigate to="/merchant" replace />}
          />
          <Route
            path="/mercent/login"
            element={<Navigate to="/merchant" replace />}
          />
          <Route
            path="/order-tracking"
            element={<Navigate to="/track-order" replace />}
          />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute>
                <Wishlist />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rewards"
            element={
              <ProtectedRoute>
                <Rewards />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-dashboard"
            element={<Navigate to="/employee/dashboard" replace />}
          />
          <Route
            path="/admin/orders"
            element={<Navigate to="/employee/orders" replace />}
          />
          <Route
            path="/admin/inventory"
            element={<Navigate to="/employee/inventory" replace />}
          />
          <Route
            path="/order-management"
            element={<Navigate to="/employee/orders" replace />}
          />
          <Route
            path="/inventory-management"
            element={<Navigate to="/employee/inventory" replace />}
          />
          <Route
            path="/super-admin"
            element={
              <SuperAdminRoute>
                <SuperAdmin />
              </SuperAdminRoute>
            }
          />
          <Route
            path="/super-admin/users"
            element={<Navigate to="/super-admin?view=users" replace />}
          />
          <Route
            path="/super-admin/employees"
            element={<Navigate to="/super-admin?view=employees" replace />}
          />
          <Route
            path="/super-admin/merchants"
            element={<Navigate to="/super-admin?view=merchants" replace />}
          />
          <Route
            path="/super-admin/admins"
            element={<Navigate to="/super-admin?view=admins" replace />}
          />
          <Route
            path="/superadmin"
            element={<Navigate to="/super-admin" replace />}
          />
          <Route
            path="/delivery"
            element={<Navigate to="/employee/delivery" replace />}
          />
          <Route
            path="/dilivary-partner"
            element={<Navigate to="/employee/delivery" replace />}
          />
          <Route
            path="/dilivery-partner"
            element={<Navigate to="/employee/delivery" replace />}
          />
          <Route
            path="/delivery-partner"
            element={<Navigate to="/employee/delivery" replace />}
          />
        </Routes>
      </main>
      {!hideCommonLayout && <Footer />}
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        theme="dark"
        toastStyle={{
          background: "#1e293b",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default App;
