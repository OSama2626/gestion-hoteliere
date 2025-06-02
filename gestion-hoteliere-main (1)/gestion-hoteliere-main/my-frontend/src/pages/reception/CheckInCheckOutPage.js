import React from 'react';
import { Link } from 'react-router-dom';

const CheckInCheckOutPage = () => {
  return (
    <div>
      <h1>Process Check-in / Check-out</h1>
      <p><em>(This page will provide functionalities for guest check-in (verifying booking, assigning rooms, taking payments/deposits) and check-out (finalizing bills, processing payments, updating room status).)</em></p>
      <p>Feature coming soon.</p>
      <Link to="/reception/dashboard">Back to Reception Dashboard</Link>
    </div>
  );
};

export default CheckInCheckOutPage;
