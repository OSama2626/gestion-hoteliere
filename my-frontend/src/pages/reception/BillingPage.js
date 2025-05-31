import React from 'react';
import { Link } from 'react-router-dom';

const BillingPage = () => {
  return (
    <div>
      <h1>Client Billing</h1>
      <p><em>(This page will be used for managing client folios, posting charges, processing payments, generating invoices, and handling disputes or adjustments.)</em></p>
      <p>Feature coming soon.</p>
      <Link to="/reception/dashboard">Back to Reception Dashboard</Link>
    </div>
  );
};

export default BillingPage;
