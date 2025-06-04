import React, { useState, useEffect, useCallback } from 'react';
// Services
import { createClientByAgent, listClientsByAgent } from '../../services/receptionUserService';
import { createReservationByAgent } from '../../services/receptionReservationService';
import { getHotels } from '../../services/hotelService'; // Stubbed
import { getRoomTypesForHotel } from '../../services/roomTypeService'; // Stubbed

// Basic styling (inline for simplicity, ideally this would be in a CSS file)
const styles = {
  container: { padding: '20px', maxWidth: '800px', margin: '0 auto' },
  section: { marginBottom: '30px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' },
  sectionTitle: { fontSize: '1.5em', marginBottom: '10px' },
  formGroup: { marginBottom: '15px' },
  label: { display: 'block', marginBottom: '5px', fontWeight: 'bold' },
  input: { width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '3px', border: '1px solid #ccc' },
  button: { padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', marginRight: '10px' },
  error: { color: 'red', marginBottom: '10px' },
  success: { color: 'green', marginBottom: '10px' },
  clientSearchResult: { padding: '5px', border: '1px solid #ddd', cursor: 'pointer', marginBottom: '2px' },
  selectedClient: { backgroundColor: '#e0e0e0', padding: '10px' },
  roomTypeRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  quantityInput: { width: '60px', padding: '5px'}
};

const CreateBookingPage = () => {
  // Client state
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [foundClients, setFoundClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', userType: 'Individual', companyName: ''
  });

  // Hotel and Room state
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState('');
  const [roomTypes, setRoomTypes] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]); // Array of { roomTypeId, quantity }

  // Date and other booking details state
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // UI feedback state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch hotels on component mount
  useEffect(() => {
    const fetchHotels = async () => {
      try {
        setIsLoading(true);
        const data = await getHotels();
        setHotels(data || []);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load hotels: ' + err.message);
        setIsLoading(false);
      }
    };
    fetchHotels();
  }, []);

  // Fetch room types when hotel changes
  useEffect(() => {
    if (selectedHotelId) {
      const fetchRoomTypes = async () => {
        try {
          setIsLoading(true);
          const data = await getRoomTypesForHotel(selectedHotelId);
          setRoomTypes(data || []);
          setSelectedRooms([]); // Reset selected rooms when hotel changes
          setIsLoading(false);
        } catch (err) {
          setError(`Failed to load room types for hotel ${selectedHotelId}: ` + err.message);
          setIsLoading(false);
        }
      };
      fetchRoomTypes();
    } else {
      setRoomTypes([]);
      setSelectedRooms([]);
    }
  }, [selectedHotelId]);

  const handleClientSearch = async () => {
    if (!clientSearchTerm.trim()) {
      setFoundClients([]);
      return;
    }
    try {
      setIsLoading(true);
      setError('');
      const result = await listClientsByAgent({ search: clientSearchTerm, limit: 5 });
      setFoundClients(result.users || []);
      setIsLoading(false);
    } catch (err) {
      setError('Error searching clients: ' + err.message);
      setFoundClients([]);
      setIsLoading(false);
    }
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setIsNewClient(false);
    setFoundClients([]);
    setClientSearchTerm('');
  };

  const handleNewClientInputChange = (e) => {
    const { name, value } = e.target;
    setNewClientForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateNewClient = async () => {
    // Basic validation
    if (!newClientForm.email || !newClientForm.firstName || !newClientForm.lastName) {
        setError("New client's First Name, Last Name, and Email are required.");
        return;
    }
    try {
        setIsLoading(true);
        setError('');
        const newClient = await createClientByAgent(newClientForm);
        setSuccessMessage(`New client ${newClient.first_name} created successfully.`);
        handleSelectClient(newClient); // Auto-select the newly created client
        setIsNewClient(false); // Switch back to selection mode (optional)
        setIsLoading(false);
    } catch (err) {
        setError('Error creating new client: ' + err.message);
        setIsLoading(false);
    }
  };


  const handleRoomQuantityChange = (roomTypeId, quantity) => {
    const numQuantity = parseInt(quantity, 10);
    setSelectedRooms(prevRooms => {
      const existingRoom = prevRooms.find(r => r.roomTypeId === roomTypeId);
      if (numQuantity > 0) {
        if (existingRoom) {
          return prevRooms.map(r => r.roomTypeId === roomTypeId ? { ...r, quantity: numQuantity } : r);
        } else {
          return [...prevRooms, { roomTypeId, quantity: numQuantity }];
        }
      } else {
        return prevRooms.filter(r => r.roomTypeId !== roomTypeId);
      }
    });
  };

  const validateBookingForm = () => {
    if (!selectedClient && !isNewClient) { setError('Please select or create a client.'); return false; }
    if (isNewClient && (!newClientForm.email || !newClientForm.firstName || !newClientForm.lastName)) {
        setError("For a new client, First Name, Last Name, and Email are required before booking."); return false;
    }
    if (!selectedHotelId) { setError('Please select a hotel.'); return false; }
    if (!checkInDate || !checkOutDate) { setError('Please select check-in and check-out dates.'); return false; }
    if (new Date(checkOutDate) <= new Date(checkInDate)) { setError('Check-out date must be after check-in date.'); return false; }
    if (new Date(checkInDate) < new Date(new Date().setHours(0,0,0,0))) { setError('Check-in date cannot be in the past.'); return false;}
    if (selectedRooms.length === 0 || selectedRooms.every(r => r.quantity === 0)) { setError('Please select at least one room and quantity.'); return false; }
    return true;
  };


  const handleSubmitBooking = async () => {
    setError('');
    setSuccessMessage('');
    if (!validateBookingForm()) return;

    let currentClientId = selectedClient ? selectedClient.id : null;

    if (isNewClient && !selectedClient) { // If new client form is active AND no client has been selected (i.e. created yet)
        setError("Please save the new client's details first using the 'Create New Client' button before submitting the booking.");
        // Alternatively, automatically create client then booking
        // For now, require explicit client creation first if isNewClient is true and selectedClient is null
        return;
    }
    if (!currentClientId) {
        setError("Client not finalized. Please ensure a client is selected or created.");
        return;
    }


    const reservationData = {
      userId: currentClientId,
      hotelId: parseInt(selectedHotelId, 10),
      checkInDate,
      checkOutDate,
      rooms: selectedRooms.filter(r => r.quantity > 0), // Only include rooms with quantity > 0
      specialRequests: specialRequests.trim() || undefined,
    };

    try {
      setIsLoading(true);
      const result = await createReservationByAgent(reservationData);
      setSuccessMessage(`Reservation created successfully! Reference: ${result.referenceNumber}`);
      // Clear form (optional)
      setSelectedClient(null); setNewClientForm({ firstName: '', lastName: '', email: '', phone: '' });
      setSelectedHotelId(''); setCheckInDate(''); setCheckOutDate(''); setSelectedRooms([]); setSpecialRequests('');
      setIsLoading(false);
    } catch (err) {
      setError('Error creating reservation: ' + err.message);
      setIsLoading(false);
    }
  };


  return (
    <div style={styles.container}>
      <h1>Create New Booking (Reception)</h1>
      {error && <p style={styles.error}>{error}</p>}
      {successMessage && <p style={styles.success}>{successMessage}</p>}
      {isLoading && <p>Loading...</p>}

      {/* Client Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Client Details</h2>
        {!selectedClient && !isNewClient && (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label} htmlFor="clientSearch">Search Existing Client (Email/Name):</label>
              <input
                type="text"
                id="clientSearch"
                style={styles.input}
                value={clientSearchTerm}
                onChange={(e) => setClientSearchTerm(e.target.value)}
                disabled={isLoading}
              />
              <button style={styles.button} onClick={handleClientSearch} disabled={isLoading}>Search</button>
            </div>
            {foundClients.length > 0 && (
              <div>
                {foundClients.map(client => (
                  <div key={client.id} style={styles.clientSearchResult} onClick={() => handleSelectClient(client)}>
                    {client.firstName} {client.lastName} ({client.email})
                  </div>
                ))}
              </div>
            )}
            <button style={styles.button} onClick={() => { setIsNewClient(true); setSelectedClient(null); }} disabled={isLoading}>
              Or Create New Client
            </button>
          </>
        )}

        {selectedClient && !isNewClient && (
          <div style={styles.selectedClient}>
            <p>Selected Client: {selectedClient.firstName} {selectedClient.lastName} ({selectedClient.email})</p>
            <button style={styles.button} onClick={() => { setSelectedClient(null); setIsNewClient(false); }} disabled={isLoading}>
              Change Client
            </button>
          </div>
        )}

        {isNewClient && (
          <>
            <h3>New Client Form</h3>
            <div style={styles.formGroup}><label style={styles.label}>First Name:</label><input type="text" style={styles.input} name="firstName" value={newClientForm.firstName} onChange={handleNewClientInputChange} /></div>
            <div style={styles.formGroup}><label style={styles.label}>Last Name:</label><input type="text" style={styles.input} name="lastName" value={newClientForm.lastName} onChange={handleNewClientInputChange} /></div>
            <div style={styles.formGroup}><label style={styles.label}>Email:</label><input type="email" style={styles.input} name="email" value={newClientForm.email} onChange={handleNewClientInputChange} /></div>
            <div style={styles.formGroup}><label style={styles.label}>Phone:</label><input type="tel" style={styles.input} name="phone" value={newClientForm.phone} onChange={handleNewClientInputChange} /></div>
            {/* Add userType, companyName inputs if needed */}
            <button style={styles.button} onClick={handleCreateNewClient} disabled={isLoading}>Save New Client</button>
            <button style={styles.button} onClick={() => setIsNewClient(false)} disabled={isLoading}>Cancel New Client</button>
          </>
        )}
      </div>

      {/* Booking Details Section */}
      { (selectedClient || (isNewClient && newClientForm.email)) && ( /* Show booking details if a client is active */
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Booking Details</h2>
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="hotel">Hotel:</label>
            <select id="hotel" style={styles.input} value={selectedHotelId} onChange={(e) => setSelectedHotelId(e.target.value)} disabled={isLoading}>
              <option value="">Select Hotel</option>
              {hotels.map(hotel => <option key={hotel.id} value={hotel.id}>{hotel.name}</option>)}
            </select>
          </div>

          {selectedHotelId && (
            <>
              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="checkInDate">Check-in Date:</label>
                <input type="date" id="checkInDate" style={styles.input} value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} disabled={isLoading} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="checkOutDate">Check-out Date:</label>
                <input type="date" id="checkOutDate" style={styles.input} value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} disabled={isLoading} />
              </div>

              <h3>Room Selection:</h3>
              {roomTypes.length > 0 ? roomTypes.map(rt => (
                <div key={rt.id} style={styles.roomTypeRow}>
                  <span>{rt.name} (Price: ${rt.base_price}/night)</span>
                  <input
                    type="number"
                    min="0"
                    style={styles.quantityInput}
                    value={selectedRooms.find(r => r.roomTypeId === rt.id)?.quantity || 0}
                    onChange={(e) => handleRoomQuantityChange(rt.id, e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              )) : <p>No room types available for this hotel or select a hotel first.</p>}

              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="specialRequests">Special Requests:</label>
                <textarea
                    id="specialRequests"
                    style={{...styles.input, height: '80px'}}
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    disabled={isLoading}
                />
              </div>
            </>
          )}
        </div>
      )}

      <button
        style={{...styles.button, backgroundColor: '#28a745', padding: '15px 25px', fontSize: '1.2em'}}
        onClick={handleSubmitBooking}
        disabled={isLoading || (!selectedClient && !isNewClient) }
      >
        Create Reservation
      </button>
    </div>
  );
};

export default CreateBookingPage;
