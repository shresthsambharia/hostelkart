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

// Pages - Public & Student
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ProductListing from './pages/ProductListing';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import MyOrders from './pages/MyOrders';
import OrderTracking from './pages/OrderTracking';
import Profile from './pages/Profile';
import CustomRequest from './pages/CustomRequest';
import Wishlist from './pages/Wishlist';
import PaymentDebug from './pages/PaymentDebug';
import PaymentTest from './pages/PaymentTest';

// Public static info pages
import About from './pages/About';
import Contact from './pages/Contact';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
import RefundPolicy from './pages/RefundPolicy';

// Pages - Admin Panel
import AdminDashboard from './admin/AdminDashboard';
import AdminProducts from './admin/AdminProducts';
import AdminOrders from './admin/AdminOrders';
import AdminUsers from './admin/AdminUsers';
import AdminCustomRequests from './admin/AdminCustomRequests';
import AdminSettings from './admin/AdminSettings';

// Pages - Delivery Dashboard
import DeliveryDashboard from './delivery/DeliveryDashboard';
import DeliveryHistory from './pages/DeliveryHistory';

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
