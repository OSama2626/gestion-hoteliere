import React, { useState, useEffect, useCallback } from 'react';
import { getAllReservations } from '../../services/receptionReservationService';
import { generateOrGetInvoice, getInvoiceDetails, listInvoicesByAgent, sendInvoiceEmail, downloadInvoicePdfUrl } from '../../services/receptionInvoiceService';

// Basic styling (inline for simplicity)
const styles = {
  container: { padding: '20px', fontFamily: 'Arial, sans-serif', display: 'flex', gap: '20px' },
  searchListSection: { flex: 1, minWidth: '400px' },
  invoiceDetailSection: { flex: 2, paddingLeft: '20px', borderLeft: '1px solid #ccc' },
  filtersSection: { marginBottom: '20px', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' },
  listItem: { padding: '10px', borderBottom: '1px solid #eee', cursor: 'pointer', ':hover': { backgroundColor: '#f0f0f0'} },
  selectedListItem: { backgroundColor: '#e0f7fa' },
  button: { padding: '5px 10px', margin: '0 5px', cursor: 'pointer', borderRadius: '3px', border: '1px solid #ccc' },
  actionButton: { backgroundColor: '#007bff', color: 'white', marginRight: '10px', marginBottom: '10px' },
  invoiceDetailBox: { border: '1px solid #ddd', padding: '15px', borderRadius: '5px', marginTop: '10px' },
  invoiceHeader: { marginBottom: '15px' },
  invoiceItemsTable: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
  th: { border: '1px solid #ddd', padding: '8px', backgroundColor: '#f2f2f2', textAlign: 'left' },
  td: { border: '1px solid #ddd', padding: '8px' },
  totals: { marginTop: '15px', textAlign: 'right' },
  error: { color: 'red', marginBottom: '10px' },
  success: { color: 'green', marginBottom: '10px' },
};


const BillingPage = () => {
  const [searchType, setSearchType] = useState('reservations'); // 'reservations' or 'invoices'
  const [searchTerm, setSearchTerm] = useState(''); // For reservation ref or client name/email
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState(''); // For invoice ref
  const [filterStatus, setFilterStatus] = useState('checked_out'); // Default filter for reservations

  const [searchResults, setSearchResults] = useState([]); // Can be reservations or invoices
  const [selectedReservationId, setSelectedReservationId] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSearch = async () => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    setSelectedInvoice(null); // Clear previous invoice
    setSearchResults([]);

    try {
      if (searchType === 'reservations') {
        const filters = {
            status: filterStatus || undefined,
            limit: 10 // Simple limit for now
        };
        if (searchTerm) {
            // Assuming backend's getAllReservations 'search' param handles ref num or client name/email
            filters.search = searchTerm;
            filters.referenceNumber = searchTerm; // Or be more specific if backend allows both
        }
        const data = await getAllReservations(filters);
        setSearchResults(data.reservations || []);
      } else { // searchType === 'invoices'
        const filters = {
            status: filterStatus || undefined,
            limit: 10
        };
        if (invoiceSearchTerm) filters.invoice_reference_number_like = invoiceSearchTerm; // Assuming backend support for this
        // Or, if searching by client for invoices:
        // if (searchTerm) filters.clientId = someClientIdFetchedBasedOnSearchTerm;
        const data = await listInvoicesByAgent(filters);
        setSearchResults(data.invoices || []);
      }
    } catch (err) {
      setError('Failed to fetch data: ' + (err.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch initial list (e.g., recently checked-out reservations)
    handleSearch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchType, filterStatus]); // Re-fetch if searchType or default status changes

  const handleSelectReservation = async (reservationId) => {
    setSelectedReservationId(reservationId);
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const invoiceData = await generateOrGetInvoice(reservationId);
      setSelectedInvoice(invoiceData);
    } catch (err) {
      setError('Failed to generate/get invoice: ' + (err.data?.error || err.message));
      setSelectedInvoice(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectInvoiceDirectly = async (invoiceId) => {
    setSelectedReservationId(null); // Clear reservation selection if directly selecting an invoice
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
        const invoiceData = await getInvoiceDetails(invoiceId);
        setSelectedInvoice(invoiceData);
    } catch (err) {
        setError('Failed to fetch invoice details: ' + (err.data?.error || err.message));
        setSelectedInvoice(null);
    } finally {
        setIsLoading(false);
    }
  };

  const handleEmailInvoice = async () => {
    if (!selectedInvoice || !selectedInvoice.id) {
      setError("No invoice selected to email.");
      return;
    }
    setIsLoading(true); setError(''); setSuccessMessage('');
    try {
      const result = await sendInvoiceEmail(selectedInvoice.id);
      setSuccessMessage(result.message || 'Email request sent successfully (simulated).');
    } catch (err) {
      setError('Failed to send email: ' + (err.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!selectedInvoice || !selectedInvoice.id) {
      setError("No invoice selected to download.");
      return;
    }
    const url = downloadInvoicePdfUrl(selectedInvoice.id);
    window.open(url, '_blank'); // Open in new tab, browser will handle PDF or error
  };

  return (
    <div style={styles.container}>
      <div style={styles.searchListSection}>
        <h1>Billing & Invoicing</h1>
        {error && <p style={styles.error}>{error}</p>}
        {successMessage && <p style={styles.success}>{successMessage}</p>}

        <div style={styles.filtersSection}>
          <select value={searchType} onChange={(e) => {setSearchType(e.target.value); setSearchResults([])}} style={styles.input}>
            <option value="reservations">Search Reservations</option>
            <option value="invoices">Search Invoices</option>
          </select>

          {searchType === 'reservations' && (
            <input
              type="text"
              placeholder="Reservation Ref or Client"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.input}
            />
          )}
          {searchType === 'invoices' && (
             <input
              type="text"
              placeholder="Invoice Ref #"
              value={invoiceSearchTerm}
              onChange={(e) => setInvoiceSearchTerm(e.target.value)}
              style={styles.input}
            />
          )}
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.input}>
            <option value="">Any Status</option>
            {searchType === 'reservations' && <option value="confirmed">Confirmed</option>}
            {searchType === 'reservations' && <option value="checked_in">Checked-In</option>}
            <option value="checked_out">Checked-Out</option>
            {searchType === 'invoices' && <option value="draft">Draft</option>}
            {searchType === 'invoices' && <option value="issued">Issued</option>}
            {searchType === 'invoices' && <option value="paid">Paid</option>}
          </select>
          <button onClick={handleSearch} style={styles.button} disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {isLoading && searchResults.length === 0 && <p>Loading results...</p>}

        <div>
          {searchType === 'reservations' && searchResults.map(res => (
            <div
              key={res.id}
              style={selectedReservationId === res.id ? {...styles.listItem, ...styles.selectedListItem} : styles.listItem}
              onClick={() => handleSelectReservation(res.id)}
            >
              <p>Ref: {res.reference_number} - Client: {res.client_first_name} {res.client_last_name} ({res.client_email})</p>
              <p>Dates: {new Date(res.check_in_date).toLocaleDateString()} to {new Date(res.check_out_date).toLocaleDateString()} - Status: {res.status}</p>
            </div>
          ))}
          {searchType === 'invoices' && searchResults.map(inv => (
            <div
              key={inv.id}
              style={selectedInvoice?.id === inv.id ? {...styles.listItem, ...styles.selectedListItem} : styles.listItem}
              onClick={() => handleSelectInvoiceDirectly(inv.id)}
            >
              <p>Invoice Ref: {inv.invoice_reference_number} - Client: {inv.client_name} ({inv.client_email})</p>
              <p>Issue Date: {new Date(inv.issue_date).toLocaleDateString()} - Total: ${inv.total_amount_due} - Status: {inv.status}</p>
            </div>
          ))}
           {searchResults.length === 0 && !isLoading && <p>No results found for current filters.</p>}
        </div>
      </div>

      <div style={styles.invoiceDetailSection}>
        <h2>Invoice Details</h2>
        {isLoading && selectedInvoice && <p>Loading invoice details...</p>}
        {!selectedInvoice && !isLoading && <p>Select a reservation or invoice from the list to view details.</p>}
        {selectedInvoice && (
          <div style={styles.invoiceDetailBox}>
            <div style={styles.invoiceHeader}>
              <h3>Invoice: {selectedInvoice.invoice_reference_number}</h3>
              <p><strong>Status:</strong> {selectedInvoice.status}</p>
              <p><strong>Issued Date:</strong> {new Date(selectedInvoice.issue_date).toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> {new Date(selectedInvoice.due_date).toLocaleDateString()}</p>
              <hr/>
              <h4>Client:</h4>
              <p>{selectedInvoice.client_name}</p>
              <p>{selectedInvoice.client_email}</p>
              {/* <p>{selectedInvoice.client_address}</p> */}
              <hr/>
              <h4>Hotel:</h4>
              <p>{selectedInvoice.hotel_name}</p>
              {/* <p>{selectedInvoice.hotel_address}</p> */}
            </div>

            <h4>Items:</h4>
            <table style={styles.invoiceItemsTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Description</th>
                  <th style={styles.th}>Quantity</th>
                  <th style={styles.th}>Unit Price</th>
                  <th style={styles.th}>Total Price</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items && selectedInvoice.items.map((item, index) => (
                  <tr key={item.id || index}>
                    <td style={styles.td}>{item.description}</td>
                    <td style={styles.td}>{item.quantity}</td>
                    <td style={styles.td}>${parseFloat(item.unit_price).toFixed(2)}</td>
                    <td style={styles.td}>${parseFloat(item.total_price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={styles.totals}>
              <p><strong>Subtotal Room Charges:</strong> ${parseFloat(selectedInvoice.subtotal_room_charges || 0).toFixed(2)}</p>
              <p><strong>Subtotal Consumptions:</strong> ${parseFloat(selectedInvoice.subtotal_consumption_charges || 0).toFixed(2)}</p>
              <p><strong>Taxes:</strong> ${parseFloat(selectedInvoice.taxes_amount || 0).toFixed(2)}</p>
              <h3><strong>Total Amount Due:</strong> ${parseFloat(selectedInvoice.total_amount_due || 0).toFixed(2)}</h3>
            </div>

            <div style={{marginTop: '20px'}}>
              <button style={styles.actionButton} onClick={handleEmailInvoice} disabled={isLoading}>Email Invoice (Simulated)</button>
              <button style={styles.actionButton} onClick={handleDownloadPdf} disabled={isLoading}>Download PDF (Stub)</button>
              {/* TODO: Add Record Payment button and functionality */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingPage;
