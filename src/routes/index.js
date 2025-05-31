```javascript
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Assuming AuthContext is in 'contexts'

// Import Page Components
import HomePage from '../pages/public/HomePage';
import LoginPage from '../pages/public/LoginPage';
import SignupPage from '../pages/public/SignupPage';
import HotelListPage from '../pages/public/HotelListPage';
import HotelDetailPage from '../pages/public/HotelDetailPage';
import ClientDashboardPage from '../pages/client/ClientDashboardPage';
import ReservationsPage from '../pages/client/ReservationsPage';
import ProfilePage from '../pages/client/ProfilePage';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import ManageHotelsPage from '../pages/admin/ManageHotelsPage';
import ValidateReservationsPage from '../pages/admin/ValidateReservationsPage';
import UserManagementPage from '../pages/admin/UserManagementPage';

// Placeholder for ProtectedRoute - will be created later
const ProtectedRoute = ({ children, role }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  if (role && user && user.role !== role) {
    // If a role is required and the user's role doesn't match, redirect to unauthorized or home
    // For simplicity, redirecting to home page if role doesn't match
    return <Navigate to="/" replace />;
  }

  return children;
};


const AppRoutes = () => (
  <Routes>
    {/* Public Routes */}
    <Route path="/" element={<HomePage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />
    <Route path="/hotels" element={<HotelListPage />} />
    <Route path="/hotel/:id" element={<HotelDetailPage />} />

    {/* Client Routes */}
    <Route
      path="/client/dashboard"
      element={
        <ProtectedRoute role="user">
          <ClientDashboardPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/client/reservations"
      element={
        <ProtectedRoute role="user">
          <ReservationsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/client/profile"
      element={
        <ProtectedRoute role="user">
          <ProfilePage />
        </ProtectedRoute>
      }
    />

    {/* Admin Routes */}
    <Route
      path="/admin/dashboard"
      element={
        <ProtectedRoute role="admin">
          <AdminDashboardPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/manage-hotels"
      element={
        <ProtectedRoute role="admin">
          <ManageHotelsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/validate-reservations"
      element={
        <ProtectedRoute role="admin">
          <ValidateReservationsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/admin/user-management"
      element={
        <ProtectedRoute role="admin">
          <UserManagementPage />
        </ProtectedRoute>
      }
    />

    {/* Fallback for unmatched routes */}
    <Route path="*" element={<h1>404 Not Found</h1>} />
  </Routes>
);

export default AppRoutes;
```
