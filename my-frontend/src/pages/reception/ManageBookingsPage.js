import React, { useState, useEffect, useCallback } from 'react';
import { getAllReservations, updateReservationByAgent, assignRoomByAgent } from '../../services/receptionReservationService';
// Assuming a simple modal component or implementing one inline for now.
// import Modal from '../../components/common/Modal';

// Basic styling (inline for simplicity)
const styles = {
  container: { padding: '20px', fontFamily: 'Arial, sans-serif' },
  filtersSection: { marginBottom: '20px', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', display: 'flex', gap: '10px', alignItems: 'center' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
  th: { border: '1px solid #ddd', padding: '8px', backgroundColor: '#f2f2f2', textAlign: 'left' },
  td: { border: '1px solid #ddd', padding: '8px' },
  button: { padding: '5px 10px', margin: '0 5px', cursor: 'pointer', borderRadius: '3px', border: '1px solid #ccc' },
  actionButton: { backgroundColor: '#007bff', color: 'white' },
  editButton: { backgroundColor: '#ffc107' },
  assignButton: { backgroundColor: '#28a745' },
  cancelButton: { backgroundColor: '#dc3545', color: 'white' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalContent: { backgroundColor: 'white', padding: '20px', borderRadius: '5px', minWidth: '300px', maxWidth: '600px' },
  formGroup: { marginBottom: '15px' },
  label: { display: 'block', marginBottom: '5px', fontWeight: 'bold' },
  input: { width: 'calc(100% - 16px)', padding: '8px', boxSizing: 'border-box', borderRadius: '3px', border: '1px solid #ccc' },
  textarea: { width: 'calc(100% - 16px)', padding: '8px', minHeight: '60px', boxSizing: 'border-box', borderRadius: '3px', border: '1px solid #ccc' },
  error: { color: 'red', marginBottom: '10px' },
  success: { color: 'green', marginBottom: '10px' },
  pagination: { marginTop: '20px', textAlign: 'center' },
  pageButton: { margin: '0 5px', padding: '5px 10px', cursor: 'pointer' }
};

// Simple Modal Component (can be moved to a separate file)
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
        <button style={styles.button} onClick={onClose}>Close</button>
      </div>
    </div>
  );
};


const ManageBookingsPage = () => {
  const [reservations, setReservations] = useState([]);
  const [filters, setFilters] = useState({
    clientId: '',
    hotelId: '',
    dateFrom: '',
    dateTo: '',
    status: '',
    referenceNumber: '',
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [selectedReservation, setSelectedReservation] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignRoomModalOpen, setIsAssignRoomModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const [editFormData, setEditFormData] = useState({});
  const [assignRoomData, setAssignRoomData] = useState([]); // [{ reservationRoomId, newRoomId }]


  const fetchReservations = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const queryFilters = { ...filters };
      // Remove empty filters to avoid sending empty params
      for (const key in queryFilters) {
        if (queryFilters[key] === '' || queryFilters[key] === null) {
          delete queryFilters[key];
        }
      }
      const data = await getAllReservations(queryFilters);
      setReservations(data.reservations || []);
      setPagination(data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0 });
    } catch (err) {
      setError('Failed to fetch reservations: ' + err.message);
      setReservations([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value, page: 1 }));
  };

  const handleApplyFilters = () => {
      fetchReservations(); // Refetch with current filters
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  // Modal Openers
  const openDetailModal = (reservation) => { setSelectedReservation(reservation); setIsDetailModalOpen(true); };
  const openEditModal = (reservation) => {
    setSelectedReservation(reservation);
    setEditFormData({
        checkInDate: reservation.check_in_date ? reservation.check_in_date.split('T')[0] : '', // Format for date input
        checkOutDate: reservation.check_out_date ? reservation.check_out_date.split('T')[0] : '',
        specialRequests: reservation.special_requests || '',
        status: reservation.status || ''
    });
    setIsEditModalOpen(true);
  };
  const openAssignRoomModal = (reservation) => {
    setSelectedReservation(reservation);
    // Initialize assignRoomData based on reservation.reservation_rooms (assuming it's fetched/available)
    // This part is tricky as `getAllReservations` might not return detailed `reservation_rooms` with their IDs.
    // For now, let's assume we need to fetch them separately or they are part of `selectedReservation`.
    // If not, this modal will need another fetch or a simplified input.
    // Let's assume `selectedReservation.reservation_rooms_details` exists from a detailed fetch (not done yet)
    const initialAssignments = (selectedReservation?.reservation_rooms_details || []).map(rr => ({
        reservationRoomId: rr.id, // This is reservation_rooms.id
        currentRoomId: rr.room_id,
        roomTypeName: rr.room_type_name, // For display
        newRoomId: '' // Input by agent
    }));
    setAssignRoomData(initialAssignments);
    setIsAssignRoomModalOpen(true);
  };
  const openCancelModal = (reservation) => { setSelectedReservation(reservation); setIsCancelModalOpen(true); };

  // Form Handlers
  const handleEditFormChange = (e) => {
    setEditFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAssignRoomFormChange = (index, newRoomIdValue) => {
    setAssignRoomData(prev => prev.map((item, i) => i === index ? {...item, newRoomId: newRoomIdValue} : item));
  };

  // Actions
  const submitEditReservation = async () => {
    if (!selectedReservation) return;
    setError(''); setSuccessMessage('');
    // Basic validation for dates
    if (editFormData.checkInDate && editFormData.checkOutDate &&
        new Date(editFormData.checkOutDate) <= new Date(editFormData.checkInDate)) {
        setError('Check-out date must be after check-in date.');
        return;
    }
    try {
      setIsLoading(true);
      // Filter out empty strings from editFormData to only send changed fields
      const payload = {};
      if(editFormData.checkInDate) payload.checkInDate = editFormData.checkInDate;
      if(editFormData.checkOutDate) payload.checkOutDate = editFormData.checkOutDate;
      if(editFormData.specialRequests) payload.specialRequests = editFormData.specialRequests.split('\n'); // Assuming backend expects array
      if(editFormData.status) payload.status = editFormData.status;

      await updateReservationByAgent(selectedReservation.id, payload);
      setSuccessMessage('Reservation updated successfully!');
      setIsEditModalOpen(false);
      fetchReservations(); // Refresh list
    } catch (err) {
      setError('Failed to update reservation: ' + (err.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const submitAssignRooms = async () => {
    if (!selectedReservation || assignRoomData.length === 0) return;
    setError(''); setSuccessMessage('');

    const assignmentsPayload = assignRoomData
        .filter(a => a.newRoomId && String(a.newRoomId).trim() !== '') // only send if newRoomId is entered
        .map(a => ({
            reservationRoomId: a.reservationRoomId,
            newRoomId: parseInt(a.newRoomId, 10)
        }));

    if (assignmentsPayload.length === 0) {
        setError("No new room assignments provided.");
        return;
    }

    try {
      setIsLoading(true);
      await assignRoomByAgent(selectedReservation.id, { assignments: assignmentsPayload });
      setSuccessMessage('Rooms assigned/changed successfully!');
      setIsAssignRoomModalOpen(false);
      fetchReservations(); // Refresh list (or update selectedReservation locally)
    } catch (err) {
      setError('Failed to assign rooms: ' + (err.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const submitCancelReservation = async () => {
    if (!selectedReservation) return;
    setError(''); setSuccessMessage('');
    try {
      setIsLoading(true);
      await updateReservationByAgent(selectedReservation.id, { status: 'cancelled' });
      setSuccessMessage('Reservation cancelled successfully!');
      setIsCancelModalOpen(false);
      fetchReservations(); // Refresh list
    } catch (err) {
      setError('Failed to cancel reservation: ' + (err.data?.error || err.message));
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div style={styles.container}>
      <h1>Manage Bookings</h1>
      {error && <p style={styles.error}>{error}</p>}
      {successMessage && <p style={styles.success}>{successMessage}</p>}

      <div style={styles.filtersSection}>
        <input type="text" name="referenceNumber" placeholder="Ref Number" value={filters.referenceNumber} onChange={handleFilterChange} style={styles.input} />
        <input type="text" name="clientId" placeholder="Client ID" value={filters.clientId} onChange={handleFilterChange} style={styles.input} />
        <input type="date" name="dateFrom" value={filters.dateFrom} onChange={handleFilterChange} style={styles.input} />
        <input type="date" name="dateTo" value={filters.dateTo} onChange={handleFilterChange} style={styles.input} />
        <select name="status" value={filters.status} onChange={handleFilterChange} style={styles.input}>
            <option value="">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked_in">Checked-In</option>
            <option value="checked_out">Checked-Out</option>
            <option value="cancelled">Cancelled</option>
            <option value="modified_by_agent">Modified</option>
        </select>
        <button onClick={handleApplyFilters} style={styles.button} disabled={isLoading}>Apply Filters</button>
      </div>

      {isLoading && <p>Loading reservations...</p>}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Ref #</th>
            <th style={styles.th}>Client</th>
            <th style={styles.th}>Hotel</th>
            <th style={styles.th}>Check-in</th>
            <th style={styles.th}>Check-out</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Total</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map(res => (
            <tr key={res.id}>
              <td style={styles.td}>{res.reference_number}</td>
              <td style={styles.td}>{res.client_first_name} {res.client_last_name} ({res.client_email})</td>
              <td style={styles.td}>{res.hotel_name}</td>
              <td style={styles.td}>{new Date(res.check_in_date).toLocaleDateString()}</td>
              <td style={styles.td}>{new Date(res.check_out_date).toLocaleDateString()}</td>
              <td style={styles.td}>{res.status}</td>
              <td style={styles.td}>${res.total_amount?.toFixed(2)}</td>
              <td style={styles.td}>
                <button style={{...styles.button, ...styles.actionButton}} onClick={() => openDetailModal(res)}>Details</button>
                <button style={{...styles.button, ...styles.editButton}} onClick={() => openEditModal(res)}>Edit</button>
                <button style={{...styles.button, ...styles.assignButton}} onClick={() => openAssignRoomModal(res)}>Assign Room</button>
                {res.status !== 'cancelled' && res.status !== 'checked_out' &&
                    <button style={{...styles.button, ...styles.cancelButton}} onClick={() => openCancelModal(res)}>Cancel</button>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={styles.pagination}>
        {pagination.currentPage > 1 &&
            <button style={styles.pageButton} onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={isLoading}>Previous</button>}
        <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
        {pagination.currentPage < pagination.totalPages &&
            <button style={styles.pageButton} onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={isLoading}>Next</button>}
      </div>

      {/* Detail Modal */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Reservation Details">
        {selectedReservation && (
          <div>
            <p><strong>Reference:</strong> {selectedReservation.reference_number}</p>
            <p><strong>Client:</strong> {selectedReservation.client_first_name} {selectedReservation.client_last_name} ({selectedReservation.client_email})</p>
            <p><strong>Hotel:</strong> {selectedReservation.hotel_name}</p>
            <p><strong>Check-in:</strong> {new Date(selectedReservation.check_in_date).toLocaleString()}</p>
            <p><strong>Check-out:</strong> {new Date(selectedReservation.check_out_date).toLocaleString()}</p>
            <p><strong>Status:</strong> {selectedReservation.status}</p>
            <p><strong>Total:</strong> ${selectedReservation.total_amount?.toFixed(2)}</p>
            <p><strong>Special Requests:</strong> {selectedReservation.special_requests || 'N/A'}</p>
            {/* TODO: Display room details (would need to be part of selectedReservation or fetched separately) */}
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Reservation">
        {selectedReservation && (
          <div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Check-in Date:</label>
              <input type="date" name="checkInDate" style={styles.input} value={editFormData.checkInDate || ''} onChange={handleEditFormChange} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Check-out Date:</label>
              <input type="date" name="checkOutDate" style={styles.input} value={editFormData.checkOutDate || ''} onChange={handleEditFormChange} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Special Requests:</label>
              <textarea name="specialRequests" style={styles.textarea} value={editFormData.specialRequests || ''} onChange={handleEditFormChange}></textarea>
            </div>
             <div style={styles.formGroup}>
                <label style={styles.label}>Status:</label>
                <select name="status" style={styles.input} value={editFormData.status || ''} onChange={handleEditFormChange}>
                    <option value="confirmed">Confirmed</option>
                    <option value="modified_by_agent">Modified by Agent</option>
                    {/* Other statuses might be less common to set manually here */}
                </select>
            </div>
            <p style={{fontSize: '0.9em', color: 'gray'}}>Note: Room type/quantity changes are not supported in this simplified edit form.</p>
            <button style={{...styles.button, ...styles.actionButton}} onClick={submitEditReservation} disabled={isLoading}>Save Changes</button>
          </div>
        )}
      </Modal>

      {/* Assign Room Modal */}
      <Modal isOpen={isAssignRoomModalOpen} onClose={() => setIsAssignRoomModalOpen(false)} title="Assign/Change Rooms">
        {selectedReservation && (
          <div>
            <p>Reservation: {selectedReservation.reference_number}</p>
            <p><em>Note: This is a simplified room assignment. In a full app, you'd see current assignments and available rooms.</em></p>
            {assignRoomData.length > 0 ? assignRoomData.map((item, index) => (
                 <div key={item.reservationRoomId || index} style={styles.formGroup}> {/* Ensure key is unique */}
                    <label style={styles.label}>
                        Change Room for Reservation Room Entry ID: {item.reservationRoomId}
                        (Type: {item.roomTypeName || 'N/A'}, Currently: Room ID {item.currentRoomId || 'N/A'})
                    </label>
                    <input
                        type="number"
                        placeholder="Enter New Physical Room ID"
                        style={styles.input}
                        value={item.newRoomId}
                        onChange={(e) => handleAssignRoomFormChange(index, e.target.value)}
                    />
                 </div>
            )) : <p>Reservation room details not fully loaded for assignment. This might indicate missing `reservation_rooms_details` in the fetched reservation data for the modal.</p>}
            <button style={{...styles.button, ...styles.actionButton}} onClick={submitAssignRooms} disabled={isLoading || assignRoomData.length === 0}>Confirm Assignments</button>
          </div>
        )}
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} title="Confirm Cancellation">
        {selectedReservation && (
          <div>
            <p>Are you sure you want to cancel reservation {selectedReservation.reference_number}?</p>
            <p>Client: {selectedReservation.client_first_name} {selectedReservation.client_last_name}</p>
            <p>Hotel: {selectedReservation.hotel_name}</p>
            <button style={{...styles.button, ...styles.cancelButton}} onClick={submitCancelReservation} disabled={isLoading}>Yes, Cancel Reservation</button>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default ManageBookingsPage;
