import React, { useState } from 'react';
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';

// Context Providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';

// Protected Route Wrapper
import ProtectedRoute from './routes/ProtectedRoute';
import StudentOnlyOrGuestRoute from './routes/StudentOnlyOrGuestRoute';

// Global Layout Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';
import MobileBottomNav from './components/MobileBottomNav';
import InstallPrompt from './components/InstallPrompt';

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
const Wallet = React.lazy(() => import('./pages/Wallet'));
const ReferralDashboard = React.lazy(() => import('./pages/ReferralDashboard'));

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
const AdminCoupons = React.lazy(() => import('./admin/AdminCoupons'));

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

// Floating Cart Button component for Mobile viewports
const FloatingCartButton = () => {
  const { itemsCount, total } = useCart();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isCartOrCheckout = ['/cart', '/checkout', '/order-success'].includes(location.pathname);
  const showFloatingCart = itemsCount > 0 && !isCartOrCheckout && (!user || user.role === 'student');

  if (!showFloatingCart) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 md:hidden animate-bounce-subtle">
      <button
        onClick={() => navigate('/cart')}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-3.5 rounded-xl shadow-lg flex items-center justify-between font-black text-xs uppercase tracking-wider transition-all active:scale-[0.98] border border-emerald-500/20"
      >
        <div className="flex items-center space-x-2">
          <span>🛒 {itemsCount} {itemsCount === 1 ? 'Item' : 'Items'}</span>
          <span className="opacity-40">|</span>
          <span>₹{total}</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span>View Cart</span>
          <span>&rarr;</span>
        </div>
      </button>
    </div>
  );
};

// Layout switcher helper component
const LayoutContainer = ({ children }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const path = location.pathname;
  const isAdminPath = path.startsWith('/admin');
  const isDeliveryPath = path.startsWith('/delivery');
  const isProfilePath = path === '/profile';

  // Sidebar Layout for Admin and Delivery riders portals, and their profile views
  const showPortalLayout = user && (isAdminPath || isDeliveryPath || ((user.role === 'admin' || user.role === 'delivery') && isProfilePath));

  if (showPortalLayout) {
    return (
      <div className="min-h-screen flex flex-col w-full max-w-[100vw] overflow-x-hidden pb-16 md:pb-0">
        <Navbar />
        
        {/* Toggle button bar for mobile */}
        <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-t border-slate-800 shadow-sm shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center space-x-2 transition-colors focus:outline-none"
            aria-label="Open portal navigation"
          >
            <Menu size={20} />
            <span className="text-xs font-bold uppercase tracking-wider">Portal Menu</span>
          </button>
          <span className="text-xs font-extrabold text-primary-400 capitalize bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
            {user.role} View
          </span>
        </div>

        <div className="flex flex-col md:flex-row flex-1 w-full max-w-[100vw] overflow-x-hidden relative">
          {/* Backdrop overlay for mobile drawer */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-[1px] z-40 md:hidden animate-fade-in"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="flex-1 bg-slate-50 min-h-[calc(100vh-4rem)] w-full max-w-[100vw] overflow-x-hidden">
            {children}
          </main>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  // Standard student/public e-commerce layout
  return (
    <div className="min-h-screen flex flex-col justify-between pb-16 md:pb-0 relative">
      <div className="flex-grow flex flex-col">
        <Navbar />
        <main className="flex-grow bg-slate-50/50">
          {children}
        </main>
      </div>
      <Footer />
      <FloatingCartButton />
      <MobileBottomNav />
      <InstallPrompt />
    </div>
  );
};

const AppContent = () => {
  return (
    <LayoutContainer>
      <React.Suspense fallback={<LoadingSkeleton />}>
        <Routes>
          {/* Public Routes - Guest accessible, Student restricted on login */}
          <Route path="/" element={<StudentOnlyOrGuestRoute><Home /></StudentOnlyOrGuestRoute>} />
          <Route path="/login" element={<StudentOnlyOrGuestRoute><Login /></StudentOnlyOrGuestRoute>} />
          <Route path="/register" element={<StudentOnlyOrGuestRoute><Register /></StudentOnlyOrGuestRoute>} />
          <Route path="/products" element={<StudentOnlyOrGuestRoute><ProductListing /></StudentOnlyOrGuestRoute>} />
          <Route path="/products/:id" element={<StudentOnlyOrGuestRoute><ProductDetails /></StudentOnlyOrGuestRoute>} />
          <Route path="/about" element={<StudentOnlyOrGuestRoute><About /></StudentOnlyOrGuestRoute>} />
          <Route path="/contact" element={<StudentOnlyOrGuestRoute><Contact /></StudentOnlyOrGuestRoute>} />
          <Route path="/privacy-policy" element={<StudentOnlyOrGuestRoute><PrivacyPolicy /></StudentOnlyOrGuestRoute>} />
          <Route path="/terms" element={<StudentOnlyOrGuestRoute><Terms /></StudentOnlyOrGuestRoute>} />
          <Route path="/refund-policy" element={<StudentOnlyOrGuestRoute><RefundPolicy /></StudentOnlyOrGuestRoute>} />
          <Route path="/payment-debug" element={<StudentOnlyOrGuestRoute><PaymentDebug /></StudentOnlyOrGuestRoute>} />
          <Route path="/payment-test" element={<StudentOnlyOrGuestRoute><PaymentTest /></StudentOnlyOrGuestRoute>} />

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
          <Route
            path="/wallet"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <Wallet />
              </ProtectedRoute>
            }
          />
          <Route
            path="/referrals"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <ReferralDashboard />
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
          <Route
            path="/admin/coupons"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminCoupons />
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
          <Route path="*" element={<Navigate to="/" replace />} />
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
