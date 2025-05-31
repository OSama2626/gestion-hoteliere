import React from 'react';
import { Link } from 'react-router-dom';

const CreateBookingPage = () => {
  return (
    <div>
      <h1>New On-Site Reservation</h1>
      <p><em>(This page will contain a form to create new reservations directly, typically for walk-ins or phone bookings.)</em></p>
      <p>Feature coming soon.</p>
      <Link to="/reception/dashboard">Back to Reception Dashboard</Link>
    </div>
  );
};

export default CreateBookingPage;
