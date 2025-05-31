import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/contexts/AuthContext';

// Placeholder for role-based access, roles will come from user object
const checkUserRole = (user, requiredRole) => {
  if (!user || !user.role) {
    console.log('ProtectedRoute: User or user.role is undefined. User:', user);
    return false;
  }
  console.log(`ProtectedRoute: Checking role. User role: ${user.role}, Required role: ${requiredRole}`);
  return user.role === requiredRole;
};

const ProtectedRoute = ({ children, role }) => { // 'role' prop for future use
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  console.log(`ProtectedRoute: Path: ${location.pathname}, Loading: ${loading}, Authenticated: ${isAuthenticated}, User:`, user);

  if (loading) {
    console.log('ProtectedRoute: Auth loading, showing loading indicator.');
    return <div>Loading...</div>; // Or a spinner component
  }

  if (!isAuthenticated) {
    console.log('ProtectedRoute: Not authenticated, redirecting to login.');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check
  if (role) { // If a specific role is required for this route
    if (!user) {
      console.log('ProtectedRoute: Role check - User object is null/undefined, but isAuthenticated is true. This should not happen.');
      return <Navigate to="/login" state={{ from: location }} replace />; // Or an error page/unauthorized
    }
    if (!checkUserRole(user, role)) {
      console.log(`ProtectedRoute: Role mismatch or user has no role. User role: ${user.role}, Required role: ${role}. Redirecting to unauthorized.`);
      // If user has a role but it doesn't match, or if user has no role defined.
      return <Navigate to="/unauthorized" state={{ from: location }} replace />;
    }
    console.log('ProtectedRoute: Role check passed.');
  } else {
    // If no specific role is required, just being authenticated is enough.
    // However, our current setup implies that most protected routes will have a role.
    // If a route is protected but has no role, it implies access for any authenticated user.
    console.log('ProtectedRoute: No specific role required, access granted.');
  }

  return children;
};
export default ProtectedRoute;
