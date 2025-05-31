import React from 'react';
import { Link } from 'react-router-dom';

const ManageBookingsPage = () => {
  return (
    <div>
      <h1>Manage Bookings & Availability</h1>
      <p><em>(This page will allow reception agents to view, search, filter, and modify existing bookings. It will also provide tools to manage room availability, block rooms, etc.)</em></p>
      <p>Feature coming soon.</p>
      <Link to="/reception/dashboard">Back to Reception Dashboard</Link>
    </div>
  );
};

export default ManageBookingsPage;
