content: |
  import React from 'react';
  import { Link } from 'react-router-dom';

  const BillingPage = () => {
    return (
      <div>
        <h1>Billing</h1>
        <p>This page is for managing billing and payments.</p>
        {/* Placeholder content for billing functionalities */}
        <p><Link to="/reception/dashboard">Back to Reception Dashboard</Link></p>
      </div>
    );
  };

  export default BillingPage;
