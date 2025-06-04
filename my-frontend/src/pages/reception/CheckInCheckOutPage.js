import React, { useState, useEffect, useCallback } from 'react';
import { getAllReservations, checkInReservation, checkOutReservation } from '../../services/receptionReservationService';
import { addConsumptionItem } from '../../services/receptionConsumptionService';
// Assuming a simple modal component or implementing one inline for now.

// Basic styling (inline for simplicity)
const styles = {
  container: { padding: '20px', fontFamily: 'Arial, sans-serif' },
  filtersSection: { marginBottom: '20px', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
  th: { border: '1px solid #ddd', padding: '8px', backgroundColor: '#f2f2f2', textAlign: 'left' },
  td: { border: '1px solid #ddd', padding: '8px' },
  button: { padding: '5px 10px', margin: '0 5px', cursor: 'pointer', borderRadius: '3px', border: '1px solid #ccc' },
  checkInButton: { backgroundColor: '#28a745', color: 'white' },
  checkOutButton: { backgroundColor: '#dc3545', color: 'white' },
  addConsumptionButton: { backgroundColor: '#17a2b8', color: 'white' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: 'white', padding: '20px', borderRadius: '5px', minWidth: '300px', maxWidth: '500px', zIndex: 1001 },
  formGroup: { marginBottom: '15px' },
  label: { display: 'block', marginBottom: '5px', fontWeight: 'bold' },
  input: { width: 'calc(100% - 16px)', padding: '8px', boxSizing: 'border-box', borderRadius: '3px', border: '1px solid #ccc' },
  error: { color: 'red', marginBottom: '10px' },
  success: { color: 'green', marginBottom: '10px' },
};

// Simple Modal Component
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
        <button style={{...styles.button, marginTop: '10px'}} onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

const CheckInCheckOutPage = () => {
  const [reservations, setReservations] = useState([]);
  const [filters, setFilters] = useState({
    referenceNumber: '',
    clientName: '', // Assuming backend can search by combined name or email via 'search' param
    status: '', // Default to confirmed for arrivals, checked_in for departures
    dateFilterType: 'arrivals_today', // 'arrivals_today', 'departures_today', 'in_house'
    // dateFrom and dateTo will be set based on dateFilterType
  });
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0, limit: 15 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [selectedReservationForConsumption, setSelectedReservationForConsumption] = useState(null);
  const [isConsumptionModalOpen, setIsConsumptionModalOpen] = useState(false);
  const [consumptionFormData, setConsumptionFormData] = useState({
    item_name: '', quantity: 1, price_per_unit: '', item_description: ''
  });

  const fetchReservations = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    const today = new Date().toISOString().split('T')[0];
    let queryFilters = {
        page: filters.page || 1,
        limit: filters.limit || pagination.limit,
        referenceNumber: filters.referenceNumber || undefined,
        // Assuming backend `getAllReservations` uses a general 'search' for client name/email
        search: filters.clientName || undefined,
    };

    switch (filters.dateFilterType) {
      case 'arrivals_today':
        queryFilters.dateFrom = today;
        queryFilters.dateTo = today; // For check_in_date = today
        queryFilters.status = 'confirmed'; // Or include 'modified_by_agent'
        break;
      case 'departures_today':
        // For check_out_date = today. Backend needs to support this specific filtering.
        // Assuming dateTo in backend for reservations/all means check_out_date <= dateTo
        queryFilters.dateToForCheckout = today;
        queryFilters.status = 'checked_in';
        break;
      case 'in_house':
        queryFilters.status = 'checked_in';
        break;
      default:
        queryFilters.status = filters.status || undefined;
        break;
    }
     // Clean up undefined filters
    Object.keys(queryFilters).forEach(key => queryFilters[key] === undefined && delete queryFilters[key]);

    try {
      const data = await getAllReservations(queryFilters);
      setReservations(data.reservations || []);
      setPagination(data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, limit: pagination.limit });
    } catch (err) {
      setError('Failed to fetch reservations: ' + (err.data?.error || err.message));
      setReservations([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination.limit]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value, page: 1 }));
  };

  const handleDateFilterTypeChange = (e) => {
    setFilters(prev => ({
        ...prev,
        dateFilterType: e.target.value,
        status: '', // Reset status when changing date filter type for clarity
        referenceNumber: '',
        clientName: '',
        page: 1
    }));
  };

  const handleConsumptionFormChange = (e) => {
    setConsumptionFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCheckIn = async (reservationId) => {
    if (!window.confirm("Are you sure you want to check-in this guest?")) return;
    setIsLoading(true); setError(''); setSuccessMessage('');
    try {
      const result = await checkInReservation(reservationId);
      setSuccessMessage(`Reservation ${result.reservation.reference_number || reservationId} checked-in successfully.`);
      fetchReservations(); // Refresh list
    } catch (err) {
      setError('Check-in failed: ' + (err.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async (reservationId) => {
    if (!window.confirm("Are you sure you want to check-out this guest? Ensure all payments are settled.")) return;
    setIsLoading(true); setError(''); setSuccessMessage('');
    try {
      const result = await checkOutReservation(reservationId);
      setSuccessMessage(`Reservation ${result.reservation.reference_number || reservationId} checked-out successfully.`);
      fetchReservations(); // Refresh list
    } catch (err) {
      setError('Check-out failed: ' + (err.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const openConsumptionModal = (reservation) => {
    setSelectedReservationForConsumption(reservation);
    setConsumptionFormData({ item_name: '', quantity: 1, price_per_unit: '', item_description: ''});
    setIsConsumptionModalOpen(true);
  };

  const handleAddConsumption = async (e) => {
    e.preventDefault();
    if (!selectedReservationForConsumption) return;
    setIsLoading(true); setError(''); setSuccessMessage('');
    try {
      await addConsumptionItem(selectedReservationForConsumption.id, {
        ...consumptionFormData,
        quantity: parseInt(consumptionFormData.quantity, 10),
        price_per_unit: parseFloat(consumptionFormData.price_per_unit),
      });
      setSuccessMessage('Consumption item added successfully.');
      setIsConsumptionModalOpen(false);
      // No need to refresh full reservation list, consumption is separate
    } catch (err) {
      setError('Failed to add consumption: ' + (err.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div style={styles.container}>
      <h1>Check-in / Check-out / Consumptions</h1>
      {error && <p style={styles.error}>{error}</p>}
      {successMessage && <p style={styles.success}>{successMessage}</p>}

      <div style={styles.filtersSection}>
        <select name="dateFilterType" value={filters.dateFilterType} onChange={handleDateFilterTypeChange} style={styles.input}>
          <option value="arrivals_today">Arrivals Today</option>
          <option value="departures_today">Departures Today</option>
          <option value="in_house">Currently In-House</option>
          <option value="custom">Custom Search</option>
        </select>
        {filters.dateFilterType === 'custom' && (
            <>
                <input type="text" name="referenceNumber" placeholder="Ref Number" value={filters.referenceNumber} onChange={handleFilterChange} style={styles.input} />
                <input type="text" name="clientName" placeholder="Client Name/Email" value={filters.clientName} onChange={handleFilterChange} style={styles.input} />
                 <select name="status" value={filters.status} onChange={handleFilterChange} style={styles.input}>
                    <option value="">Any Status</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="modified_by_agent">Modified</option>
                    <option value="checked_in">Checked-In</option>
                    <option value="checked_out">Checked-Out</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </>
        )}
        <button onClick={fetchReservations} style={styles.button} disabled={isLoading}>Search</button>
      </div>

      {isLoading && <p>Loading...</p>}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Ref #</th>
            <th style={styles.th}>Client</th>
            <th style={styles.th}>Hotel</th>
            <th style={styles.th}>Check-in</th>
            <th style={styles.th}>Check-out</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reservations.length > 0 ? reservations.map(res => (
            <tr key={res.id}>
              <td style={styles.td}>{res.reference_number}</td>
              <td style={styles.td}>{res.client_first_name} {res.client_last_name} ({res.client_email})</td>
              <td style={styles.td}>{res.hotel_name}</td>
              <td style={styles.td}>{new Date(res.check_in_date).toLocaleDateString()}</td>
              <td style={styles.td}>{new Date(res.check_out_date).toLocaleDateString()}</td>
              <td style={styles.td}>{res.status}</td>
              <td style={styles.td}>
                {res.status === 'confirmed' || res.status === 'modified_by_agent' ? (
                  <button style={{...styles.button, ...styles.checkInButton}} onClick={() => handleCheckIn(res.id)} disabled={isLoading}>Check-in</button>
                ) : null}
                {res.status === 'checked_in' ? (
                  <>
                    <button style={{...styles.button, ...styles.checkOutButton}} onClick={() => handleCheckOut(res.id)} disabled={isLoading}>Check-out</button>
                    <button style={{...styles.button, ...styles.addConsumptionButton}} onClick={() => openConsumptionModal(res)} disabled={isLoading}>Add Consumption</button>
                  </>
                ) : null}
              </td>
            </tr>
          )) : (
            <tr><td colSpan="7" style={{textAlign: 'center', padding: '10px'}}>No reservations found for current filters.</td></tr>
          )}
        </tbody>
      </table>
      {/* TODO: Pagination controls if needed, though current setup fetches based on filter button */}

      <Modal isOpen={isConsumptionModalOpen} onClose={() => setIsConsumptionModalOpen(false)} title={`Add Consumption for Res #${selectedReservationForConsumption?.reference_number}`}>
        {selectedReservationForConsumption && (
          <form onSubmit={handleAddConsumption}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Item Name:</label>
              <input type="text" name="item_name" style={styles.input} value={consumptionFormData.item_name} onChange={handleConsumptionFormChange} required />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Quantity:</label>
              <input type="number" name="quantity" style={styles.input} value={consumptionFormData.quantity} onChange={handleConsumptionFormChange} min="1" required />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Price Per Unit (€):</label>
              <input type="number" name="price_per_unit" style={styles.input} value={consumptionFormData.price_per_unit} onChange={handleConsumptionFormChange} step="0.01" min="0" required />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Description (Optional):</label>
              <textarea name="item_description" style={{...styles.input, height: '60px'}} value={consumptionFormData.item_description} onChange={handleConsumptionFormChange}></textarea>
            </div>
            <button type="submit" style={{...styles.button, ...styles.addConsumptionButton}} disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Item'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default CheckInCheckOutPage;
