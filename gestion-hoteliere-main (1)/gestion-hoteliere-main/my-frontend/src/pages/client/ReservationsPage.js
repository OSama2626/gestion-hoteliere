import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../store/contexts/AuthContext';
import { getReservationsForUser, cancelReservation } from '../../services/reservationService';
import { Link } from 'react-router-dom';

const ReservationsPage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true); // For reservations data fetching
  const [error, setError] = useState('');
  const [message, setMessage] = useState(''); // For success/info messages

  const fetchUserReservations = useCallback(async () => {
    // Log user.id and current reservations state at the beginning of the function
    console.log('fetchUserReservations: user.id:', user?.id, 'current reservations:', reservations);
    if (isAuthenticated && user && user.id) { // Ensure user and user.id are available
      console.log(`ReservationsPage: Fetching reservations for user ID: ${user.id}`);
      setLoading(true);
      setError('');
      setMessage('');
      try {
        const data = await getReservationsForUser(); // Removed user.id argument
        // Log fetched data and state before setReservations
        console.log('fetchUserReservations: data received:', data, 'state before setReservations:', reservations);
        setReservations(data);
        console.log('ReservationsPage: Reservations data received:', data);
      } catch (err) {
        // Log error
        console.error('fetchUserReservations: error:', err);
        setError(err.message || 'Failed to fetch reservations.');
        console.error('ReservationsPage: Error fetching reservations:', err);
      }
      setLoading(false);
    } else {
      if (!authLoading) { // Only clear if not in initial auth loading phase
        console.log('ReservationsPage: User not authenticated or user ID missing, clearing reservations.');
        setReservations([]);
        setLoading(false);
      }
    }
  }, [isAuthenticated, user, authLoading]); // Added authLoading to dependencies

  useEffect(() => {
    // Fetch reservations when component mounts or when user/auth state changes
    if (!authLoading) { // Don't fetch if auth is still loading
        fetchUserReservations();
    }
  }, [fetchUserReservations, authLoading]); // authLoading ensures we wait for auth check

  const handleCancelReservation = async (reservationId) => {
    if (!user || !user.id) {
        setError("User information is missing, cannot cancel.");
        return;
    }
    setMessage(''); // Clear previous messages
    setError('');   // Clear previous errors

    const confirmCancel = window.confirm("Are you sure you want to cancel this reservation?");
    if (confirmCancel) {
      // Log current reservations state before calling cancelReservation
      console.log('handleCancelReservation: before cancelReservation, reservations:', reservations);
      console.log(`ReservationsPage: Attempting to cancel reservation ID: ${reservationId} for user ID: ${user.id}`);
      try {
        const result = await cancelReservation(reservationId); // Removed user.id argument
        // Log success message and current reservations state after cancelReservation succeeds
        console.log('handleCancelReservation: cancelReservation succeeded, result:', result, 'reservations before fetch:', reservations);
        setMessage(result.message);
        console.log('ReservationsPage: Cancellation successful:', result);
        // Refresh reservations list
        fetchUserReservations();
      } catch (err) {
        // Log error and reservations state
        console.error('handleCancelReservation: error cancelling reservation:', err, 'reservations state:', reservations);
        setError(err.message || 'Failed to cancel reservation.');
        console.error('ReservationsPage: Error cancelling reservation:', err);
      }
    }
  };

  if (authLoading) {
    return <p>Loading user information...</p>;
  }

  if (!isAuthenticated) {
    return (
      <div>
        <h1>My Reservations</h1>
        <p>Please <Link to="/login">login</Link> to view your reservations.</p>
      </div>
    );
  }

  if (loading) return <p>Loading your reservations...</p>;

  // Derive activeReservations before the return statement
  const activeReservations = reservations.filter(
    res => res.status !== 'cancelled_by_client' && res.status !== 'completed'
  );

  return (
    <div>
      <h1>My Reservations</h1>
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>Error: {error}</p>}
      {message && <p style={{ color: 'green', fontWeight: 'bold' }}>{message}</p>}

      {/* Log reservations, loading, and error state before conditional rendering */}
      {console.log('Render JSX: reservations:', reservations, 'loading:', loading, 'error:', error, 'activeReservations:', activeReservations)}
      {activeReservations.length === 0 && !error ? ( // Check !error to avoid showing "no reservations" if there was a fetch error
        <p>You have no active reservations. Why not <Link to="/hotels">book a stay</Link>?</p>
      ) : (
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {reservations.map(res => (
            <li key={res.id} style={{ border: '1px solid #eee', borderRadius: '5px', marginBottom: '15px', padding: '15px', boxShadow: '2px 2px 5px #ccc' }}>
              <h3>Reservation ID: {res.id}</h3>
              <p><strong>Reference Number:</strong> {res.reference_number || 'N/A'}</p>
              <p><strong>Hotel:</strong> {res.hotel_name || 'N/A'}</p>
              <p><strong>Room Type:</strong> {res.room_type_name || res.roomType || 'N/A'}</p>
              <p><strong>Number of Rooms:</strong> {res.number_of_rooms || res.numRooms || 'N/A'}</p>
              <p><strong>Check-in:</strong> {res.check_in_date ? new Date(res.check_in_date).toLocaleDateString() : 'Invalid Date'}</p>
              <p><strong>Check-out:</strong> {res.check_out_date ? new Date(res.check_out_date).toLocaleDateString() : 'Invalid Date'}</p>
              {(() => {
                const amount = parseFloat(res.total_amount);
                return <p><strong>Total Amount:</strong> ${!isNaN(amount) ? amount.toFixed(2) : 'N/A'}</p>;
              })()}
              <p><strong>Payment Status:</strong> {res.payment_status ? res.payment_status.replace(/_/g, ' ') : 'N/A'}</p>
              <p><strong>Status:</strong> <span style={{ fontWeight: 'bold', color: res.status === 'cancelled_by_client' ? 'red' : (res.status === 'confirmed' ? 'green' : 'orange')}}>{(res.status || 'Unknown').replace(/_/g, ' ')}</span></p>
              {res.special_requests && <p><strong>Special Requests:</strong> {res.special_requests}</p>}
              {res.bookingSource && <p><strong>Booking Source:</strong> {res.bookingSource}</p>}
              <p><em>Booked on: {res.created_at ? new Date(res.created_at).toLocaleString() : 'Invalid Date'} by {res.user_name || res.userEmail || 'User N/A'}</em></p>

              {['pending_admin_validation', 'confirmed'].includes(res.status) && (
                <button
                  onClick={() => handleCancelReservation(res.id)}
                  style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '8px 12px', cursor: 'pointer', borderRadius: '4px' }}
                >
                  Cancel Reservation
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ReservationsPage;
