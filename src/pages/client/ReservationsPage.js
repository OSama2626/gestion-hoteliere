```javascript
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext'; // Adjust path as needed
import { getReservationsForUser, cancelReservation } from '../../services/reservationService'; // Adjust path as needed

const ReservationsPage = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  const fetchReservations = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      const userReservations = await getReservationsForUser(currentUser.id);
      setReservations(userReservations);
    } catch (err) {
      setError('Failed to load reservations.');
      console.error("Error fetching reservations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && currentUser) {
      fetchReservations();
    } else if (!authLoading && !currentUser) {
      // Handle case where user is not logged in, though ProtectedRoute should prevent this
      setError("Please log in to view your reservations.");
      setIsLoading(false);
    }
  }, [currentUser, authLoading]); // Removed fetchReservations from dependencies

  const handleCancelReservation = async (reservationId) => {
    if (!currentUser) return;
    const originalReservations = [...reservations];
    // Optimistically update UI
    setReservations(prevReservations => prevReservations.filter(res => res.id !== reservationId));
    setMessage(''); // Clear previous messages
    setError('');   // Clear previous errors

    try {
      await cancelReservation(reservationId, currentUser.id);
      setMessage('Reservation cancelled successfully.');
      // Optionally re-fetch or update state more precisely based on API response
      fetchReservations(); // Re-fetch to confirm cancellation
    } catch (err) {
      setError(err.message || 'Failed to cancel reservation.');
      setReservations(originalReservations); // Rollback on error
      console.error("Error cancelling reservation:", err);
    }
  };

  if (authLoading || isLoading) {
    return <p>Loading reservations...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div>
      <h2>My Reservations</h2>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {reservations.length === 0 ? (
        <p>You have no reservations.</p>
      ) : (
        <ul>
          {reservations.map((reservation) => (
            <li key={reservation.id} style={{ border: '1px solid #ccc', marginBottom: '10px', padding: '10px' }}>
              <h3>Reservation ID: {reservation.id}</h3>
              <p>Hotel: {reservation.hotelName}</p>
              <p>Room Type: {reservation.roomType}</p>
              <p>From: {new Date(reservation.startDate).toLocaleDateString()} To: {new Date(reservation.endDate).toLocaleDateString()}</p>
              <p>Status: {reservation.status}</p>
              {reservation.status !== 'cancelled_by_client' && reservation.status !== 'cancelled_by_admin' && (
                <button onClick={() => handleCancelReservation(reservation.id)}>Cancel Reservation</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ReservationsPage;
```
