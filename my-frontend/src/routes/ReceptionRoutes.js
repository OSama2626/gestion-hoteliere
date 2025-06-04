import React from 'react';
import { Routes, Route } from 'react-router-dom'; // Use Routes instead of just Route for defining a collection
import ProtectedRoute from './ProtectedRoute'; // Assuming this path is correct

// Import Reception Page Components (assuming these paths are correct)
import ReceptionDashboardPage from '../pages/reception/ReceptionDashboardPage';
import CreateBookingPage from '../pages/reception/CreateBookingPage';
import ManageBookingsPage from '../pages/reception/ManageBookingsPage';
import CheckInCheckOutPage from '../pages/reception/CheckInCheckOutPage';
import BillingPage from '../pages/reception/BillingPage';
import ClientManagementPage from '../pages/reception/ClientManagementPage'; // Added as per common reception tasks

// Assuming ROLES are defined somewhere accessible, e.g., a constants file
// For now, using string 'reception'. This should align with ProtectedRoute's expectation.
const RECEPTION_ROLE = 'reception';

const ReceptionRoutes = () => {
  return (
    <Routes>
      <Route
        path="dashboard"
        element={
          <ProtectedRoute role={RECEPTION_ROLE}>
            <ReceptionDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="create-booking"
        element={
          <ProtectedRoute role={RECEPTION_ROLE}>
            <CreateBookingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="manage-bookings"
        element={
          <ProtectedRoute role={RECEPTION_ROLE}>
            <ManageBookingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="check-in-out"
        element={
          <ProtectedRoute role={RECEPTION_ROLE}>
            <CheckInCheckOutPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="billing"
        element={
          <ProtectedRoute role={RECEPTION_ROLE}>
            <BillingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="clients" // Added a route for client management by reception
        element={
          <ProtectedRoute role={RECEPTION_ROLE}>
            <ClientManagementPage />
          </ProtectedRoute>
        }
      />
      {/* Add more reception-specific routes here if needed */}
    </Routes>
  );
};

export default ReceptionRoutes;
