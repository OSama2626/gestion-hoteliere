content: |
  import React from 'react';
  import { useLocation, Link } from 'react-router-dom';

  const BookingConfirmationPage = () => {
    const location = useLocation();
    const { reservationDetails } = location.state || {};

    if (!reservationDetails) {
      return (
        <div>
          <h2>Booking Confirmation</h2>
          <p>No booking details found. Please try again or contact support.</p>
          <Link to="/">Go to Homepage</Link>
        </div>
      );
    }

    return (
      <div>
        <h2>Booking Confirmation</h2>
        <p>Thank you for your booking, {reservationDetails.guestName || 'Guest'}!</p>
        <p>Your reservation for <strong>{reservationDetails.hotelName}</strong> has been successfully submitted.</p>
        <p><strong>Reservation ID:</strong> {reservationDetails.id}</p>
        <p><strong>Room Type:</strong> {reservationDetails.roomType}</p>
        <p><strong>Number of Rooms:</strong> {reservationDetails.numRooms}</p>
        <p><strong>Check-in Date:</strong> {new Date(reservationDetails.startDate).toLocaleDateString()}</p>
        <p><strong>Check-out Date:</strong> {new Date(reservationDetails.endDate).toLocaleDateString()}</p>
        <p><strong>Status:</strong> {reservationDetails.status}</p>
        <p>You will receive an email confirmation shortly. Please check your spam folder if you don't see it.</p>
        <Link to="/my-bookings">View My Bookings</Link>
        <br />
        <Link to="/">Back to Homepage</Link>
      </div>
    );
  };

  export default BookingConfirmationPage;
```
