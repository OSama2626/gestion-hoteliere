```javascript
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Ensure this path is correct

// Placeholder for role-based access, roles will come from user object
// For now, just checking if authenticated
// const checkUserRole = (user, requiredRole) => {
//   if (!user || !user.role) return false;
//   return user.role === requiredRole;
// };

const ProtectedRoute = ({ children, role }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    // You might want to show a loading spinner here
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    // Redirect to login page if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Basic role check example (can be expanded)
  // This mock user object doesn't have 'role' yet.
  // We'll assume for now that if they are authenticated, they can access client routes.
  // Specific role checks for admin/reception will need user.role to be set upon login.
  if (role && (!user || user.role !== role)) {
    // If the user is admin, they can access role-specific routes for testing purposes.
    // Otherwise, if it's a specific role and user doesn't match, they are unauthorized.
    // if (user.role !== 'admin') { // This logic might be too specific for a generic ProtectedRoute
      return <Navigate to="/unauthorized" replace />;
    // }
  }

  return children;
};

export default ProtectedRoute;
```
