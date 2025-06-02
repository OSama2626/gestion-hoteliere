import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Page Imports
import HomePage from '../pages/public/HomePage';
import LoginPage from '../pages/public/LoginPage';
import SignupPage from '../pages/public/SignupPage';
import HotelListPage from '../pages/public/HotelListPage'; // Actual component
import HotelDetailPage from '../pages/public/HotelDetailPage'; // Actual component

import ClientDashboardPage from '../pages/client/ClientDashboardPage';
import ReservationsPage from '../pages/client/ReservationsPage';
import ProfilePage from '../pages/client/ProfilePage';
import NotificationsPage from '../pages/client/NotificationsPage';
import FeedbackPage from '../pages/client/FeedbackPage';

// Reception Pages
import ReceptionDashboardPage from '../pages/reception/ReceptionDashboardPage';
import CreateBookingPage from '../pages/reception/CreateBookingPage';
import ManageBookingsPage from '../pages/reception/ManageBookingsPage';
import CheckInCheckOutPage from '../pages/reception/CheckInCheckOutPage';
import BillingPage from '../pages/reception/BillingPage';

// Admin Pages (placeholders)
const AdminDashboardPage = () => <h1>Admin Dashboard</h1>; // Placeholder
const ManageHotelsPage = () => <h1>Manage Hotels (Admin)</h1>; // Placeholder
const ValidateReservationsPage = () => <h1>Validate Reservations (Admin)</h1>; // Placeholder
const UserManagementPage = () => <h1>User Management (Admin)</h1>; // Placeholder

// Placeholder for ProtectedRoute - will be developed in auth step
const ProtectedRoute = ({ children, role }) => {
  // For now, allow all access. Auth logic will be added later.
  // const isAuthenticated = true; // Replace with actual auth check
  // const userRole = "admin"; // Replace with actual user role
  // if (!isAuthenticated) return <Navigate to="/login" />;
  // if (role && userRole !== role) return <Navigate to="/unauthorized" />;
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/hotels" element={<HotelListPage />} />
      <Route path="/hotels/:id" element={<HotelDetailPage />} />

      {/* Client Routes */}
      <Route path="/client/dashboard" element={<ProtectedRoute role="client"><ClientDashboardPage /></ProtectedRoute>} />
      <Route path="/client/reservations" element={<ProtectedRoute role="client"><ReservationsPage /></ProtectedRoute>} />
      <Route path="/client/profile" element={<ProtectedRoute role="client"><ProfilePage /></ProtectedRoute>} />
      <Route path="/client/notifications" element={<ProtectedRoute role="client"><NotificationsPage /></ProtectedRoute>} />
      <Route path="/client/feedback" element={<ProtectedRoute role="client"><FeedbackPage /></ProtectedRoute>} />

      {/* Reception Routes */}
      <Route path="/reception/dashboard" element={<ProtectedRoute role="reception"><ReceptionDashboardPage /></ProtectedRoute>} />
      <Route path="/reception/create-booking" element={<ProtectedRoute role="reception"><CreateBookingPage /></ProtectedRoute>} />
      <Route path="/reception/manage-bookings" element={<ProtectedRoute role="reception"><ManageBookingsPage /></ProtectedRoute>} />
      <Route path="/reception/checkin-checkout" element={<ProtectedRoute role="reception"><CheckInCheckOutPage /></ProtectedRoute>} />
      <Route path="/reception/billing" element={<ProtectedRoute role="reception"><BillingPage /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboardPage /></ProtectedRoute>} />
      <Route path="/admin/manage-hotels" element={<ProtectedRoute role="admin"><ManageHotelsPage /></ProtectedRoute>} />
      <Route path="/admin/validate-reservations" element={<ProtectedRoute role="admin"><ValidateReservationsPage /></ProtectedRoute>} />
      <Route path="/admin/user-management" element={<ProtectedRoute role="admin"><UserManagementPage /></ProtectedRoute>} />

      {/* Fallback for unknown routes */}
      <Route path="*" element={<h1>404 Not Found</h1>} />
      <Route path="/unauthorized" element={<h1>Unauthorized Access</h1>} />
    </Routes>
  );
};
export default AppRoutes;
