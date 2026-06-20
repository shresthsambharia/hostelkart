import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

// Context Providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';

// Protected Route Wrapper
import ProtectedRoute from './routes/ProtectedRoute';

// Global Layout Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';

// Keep Home page statically imported to optimize FCP/LCP of the initial lander
import Home from './pages/Home';

// Lazy load other routes to shrink initial bundle size and speed up page load
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const ProductListing = React.lazy(() => import('./pages/ProductListing'));
const ProductDetails = React.lazy(() => import('./pages/ProductDetails'));
const Cart = React.lazy(() => import('./pages/Cart'));
const Checkout = React.lazy(() => import('./pages/Checkout'));
const OrderSuccess = React.lazy(() => import('./pages/OrderSuccess'));
const MyOrders = React.lazy(() => import('./pages/MyOrders'));
const OrderTracking = React.lazy(() => import('./pages/OrderTracking'));
const Profile = React.lazy(() => import('./pages/Profile'));
const CustomRequest = React.lazy(() => import('./pages/CustomRequest'));
const Wishlist = React.lazy(() => import('./pages/Wishlist'));
const PaymentDebug = React.lazy(() => import('./pages/PaymentDebug'));
const PaymentTest = React.lazy(() => import('./pages/PaymentTest'));

// Static info pages
const About = React.lazy(() => import('./pages/About'));
const Contact = React.lazy(() => import('./pages/Contact'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const Terms = React.lazy(() => import('./pages/Terms'));
const RefundPolicy = React.lazy(() => import('./pages/RefundPolicy'));

// Admin pages
const AdminDashboard = React.lazy(() => import('./admin/AdminDashboard'));
const AdminProducts = React.lazy(() => import('./admin/AdminProducts'));
const AdminOrders = React.lazy(() => import('./admin/AdminOrders'));
const AdminUsers = React.lazy(() => import('./admin/AdminUsers'));
const AdminCustomRequests = React.lazy(() => import('./admin/AdminCustomRequests'));
const AdminSettings = React.lazy(() => import('./admin/AdminSettings'));

// Delivery Dashboard pages
const DeliveryDashboard = React.lazy(() => import('./delivery/DeliveryDashboard'));
const DeliveryHistory = React.lazy(() => import('./pages/DeliveryHistory'));

// Suspense loading fallback
const LoadingSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8 animate-pulse">
    <div className="h-8 bg-slate-200 rounded w-1/4"></div>
    <div className="space-y-4">
      <div className="h-32 bg-slate-200 rounded-2xl"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-48 bg-slate-200 rounded-2xl"></div>
        <div className="h-48 bg-slate-200 rounded-2xl"></div>
        <div className="h-48 bg-slate-200 rounded-2xl"></div>
      </div>
    </div>
  </div>
);

// Layout switcher helper component
const LayoutContainer = ({ children }) => {
  const location = useLocation();
  const { user } = useAuth();
  
  const path = location.pathname;
  const isAdminPath = path.startsWith('/admin');
  const isDeliveryPath = path.startsWith('/delivery');

  // Sidebar Layout for Admin and Delivery riders portals
  if (user && (isAdminPath || isDeliveryPath)) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 bg-slate-50 min-h-[calc(100vh-4rem)]">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Standard student/public e-commerce layout
  return (
    <div className="min-h-screen flex flex-col justify-between">
      <div className="flex-grow flex flex-col">
        <Navbar />
        <main className="flex-grow bg-slate-50/50">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
};

const AppContent = () => {
  return (
    <LayoutContainer>
      <React.Suspense fallback={<LoadingSkeleton />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/products" element={<ProductListing />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/payment-debug" element={<PaymentDebug />} />
          <Route path="/payment-test" element={<PaymentTest />} />

          {/* Protected Student Routes */}
          <Route
            path="/cart"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <Cart />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/order-success"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <OrderSuccess />
              </ProtectedRoute>
            }
          />
          <Route
            path="/myorders"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <MyOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/track/:id"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <OrderTracking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/custom-request"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <CustomRequest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <Wishlist />
              </ProtectedRoute>
            }
          />
          
          {/* Profile Shared Protected Route (Available to student, admin, delivery) */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin', 'delivery']}>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Protected Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminProducts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/custom-requests"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminCustomRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminSettings />
              </ProtectedRoute>
            }
          />

          {/* Protected Delivery Partner Routes */}
          <Route
            path="/delivery/dashboard"
            element={
              <ProtectedRoute allowedRoles={['delivery']}>
                <DeliveryDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery/history"
            element={
              <ProtectedRoute allowedRoles={['delivery']}>
                <DeliveryHistory />
              </ProtectedRoute>
            }
          />

          {/* Fallback route */}
          <Route path="*" element={<Home />} />
        </Routes>
      </React.Suspense>
    </LayoutContainer>
  );
};

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <AppContent />
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
