import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const StudentOnlyOrGuestRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          <p className="text-gray-500 font-medium">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  // If logged in, restrict non-student roles
  if (user) {
    if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (user.role === 'delivery') {
      return <Navigate to="/delivery/dashboard" replace />;
    }
  }

  return children;
};

export default StudentOnlyOrGuestRoute;
