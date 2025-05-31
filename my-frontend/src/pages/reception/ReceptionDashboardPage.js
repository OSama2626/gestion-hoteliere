import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/contexts/AuthContext';

const ReceptionDashboardPage = () => {
  const { user } = useAuth();

  return (
    <div>
      <h1>Reception Dashboard</h1>
      {user && <p>Welcome, {user.name || user.email}! (Role: {user.role})</p>}
      <p>This is the main dashboard for reception agents. From here you can manage guest interactions and hotel operations.</p>

      <nav>
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          <li style={{ marginBottom: '10px' }}><Link to="/reception/create-booking" style={linkStyle}>New On-Site Reservation</Link></li>
          <li style={{ marginBottom: '10px' }}><Link to="/reception/manage-bookings" style={linkStyle}>Manage Bookings & Availability</Link></li>
          <li style={{ marginBottom: '10px' }}><Link to="/reception/checkin-checkout" style={linkStyle}>Process Check-in / Check-out</Link></li>
          <li style={{ marginBottom: '10px' }}><Link to="/reception/billing" style={linkStyle}>Client Billing</Link></li>
          {/* Add more links as features are developed */}
        </ul>
      </nav>

      {/* Placeholder sections for dashboard items */}
      <div style={{ marginTop: '30px', borderTop: '1px solid #ccc', paddingTop: '20px' }}>
        <h2>Overview</h2>
        <p><em>(Dashboard widgets for today's arrivals, departures, occupancy, etc. will be here)</em></p>
        <p><em>(Quick access to recently viewed bookings or frequent tasks could also be here)</em></p>
      </div>
    </div>
  );
};

const linkStyle = {
  display: 'inline-block',
  padding: '8px 12px',
  margin: '5px 0',
  backgroundColor: '#007bff',
  color: 'white',
  textDecoration: 'none',
  borderRadius: '4px',
  fontSize: '1em'
};

export default ReceptionDashboardPage;
