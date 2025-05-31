```javascript
import React from 'react';
import { Link }from 'react-router-dom';

const CreateBookingPage = () => {
  return (
    <div>
      <h1>Create New Booking</h1>
      <p>This page will allow reception staff to create new bookings for guests.</p>
      {/* Placeholder for booking form and functionality */}
      <p><Link to="/reception/dashboard">Back to Reception Dashboard</Link></p>
    </div>
  );
};

export default CreateBookingPage;
```
