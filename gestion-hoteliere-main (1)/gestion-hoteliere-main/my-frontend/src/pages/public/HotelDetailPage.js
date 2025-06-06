import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'; // Added Link, useLocation
import { getHotelById } from '../../services/hotelService';
import { createReservation } from '../../services/reservationService'; // Import new service
import { useAuth } from '../../store/contexts/AuthContext';

const HotelDetailPage = () => {
  const { id: hotelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation(); // For redirect state
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true); // For hotel data fetching
  const [error, setError] = useState('');

  // Reservation form state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRoomType, setSelectedRoomType] = useState('');
  const [numRooms, setNumRooms] = useState(1);
  const [specialRequests, setSpecialRequests] = useState(''); // Added special requests state
  const [reservationMessage, setReservationMessage] = useState('');
  const [reservationError, setReservationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // For reservation submission

  useEffect(() => {
    const fetchHotel = async () => {
      if (!hotelId) {
        setError('No hotel ID specified.');
        setLoading(false);
        return;
      }
      console.log(`HotelDetailPage: Fetching hotel with ID: ${hotelId}`);
      setLoading(true);
      setError('');
      try {
        const data = await getHotelById(hotelId);
        setHotel(data);
        console.log('HotelDetailPage: Hotel data fetched successfully:', data);
        if (data && data.rooms && data.rooms.length > 0 && data.rooms[0].roomTypeId !== undefined) {
          setSelectedRoomType(data.rooms[0].roomTypeId.toString());
        } else if (data && data.rooms && data.rooms.length > 0) {
          // Fallback or error if roomTypeId is missing, though ideally it should always be there
          console.warn("HotelDetailPage: First room is missing roomTypeId. Falling back to empty selection or first available type if necessary.");
          setSelectedRoomType(''); // Or handle differently, e.g., select first available if any
        }
      } catch (err) {
        console.error('HotelDetailPage: Error fetching hotel details:', err);
        setError(err.message || 'Failed to fetch hotel details.');
      }
      setLoading(false);
    };
    fetchHotel();
  }, [hotelId]);

  const handleReservationSubmit = async (e) => {
    e.preventDefault();
    setReservationMessage('');
    setReservationError('');

    if (!isAuthenticated) {
      setReservationError('You must be logged in to make a reservation.');
      // Optionally, redirect to login: navigate('/login', { state: { from: location } });
      return;
    }

    if (!user || !user.id) {
        setReservationError('User information is missing. Cannot make a reservation.');
        console.error("HotelDetailPage: User ID missing in auth context during reservation submission.");
        return;
    }

    if (!startDate || !endDate) {
        setReservationError('Please select start and end dates.');
        return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
        setReservationError('End date must be after start date.');
        return;
    }
    if (!selectedRoomType) {
        setReservationError('Please select a room type.');
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day for comparison
    if (new Date(startDate) < today) {
        setReservationError('Start date cannot be in the past.');
        return;
    }

    setIsSubmitting(true);

    // Adapt payload for the new reservationService
    // Ensure hotel.id, selectedRoomType, and numRooms are correctly sourced and parsed.
    // selectedRoomType now holds the roomTypeId (as a string from the form)

    const reservationPayload = {
      hotelId: parseInt(hotel.id, 10), // Ensure hotelId is an integer
      checkInDate: new Date(startDate).toISOString(), // Convert to ISO string
      checkOutDate: new Date(endDate).toISOString(),   // Convert to ISO string
      rooms: [{
        roomTypeId: parseInt(selectedRoomType, 10), // selectedRoomType is the ID, parse to int
        quantity: parseInt(numRooms, 10),
      }],
      specialRequests: specialRequests, // Add if special requests field exists
      bookingSource: 'website' // Added booking source
    };

    console.log('HotelDetailPage: Submitting reservation with payload:', reservationPayload);

    try {
      const result = await createReservation(reservationPayload);
      // The backend is expected to return { message, reservationId, referenceNumber, totalAmount }
      // or similar upon success.
      setReservationMessage(result.message || `Reservation confirmed! Reference: ${result.referenceNumber}`);
      console.log('HotelDetailPage: Reservation submitted successfully:', result);

      // Clear form or redirect
      setStartDate('');
      setEndDate('');
      setSelectedRoomType(hotel.rooms && hotel.rooms.length > 0 && hotel.rooms[0].roomTypeId !== undefined ? hotel.rooms[0].roomTypeId.toString() : ''); // Reset room type
      setNumRooms(1);
      setSpecialRequests(''); // Clear special requests on success

      // Optionally, navigate to reservations page
      // navigate('/client/reservations');
      // alert(`Reservation created successfully! Your reference number is ${result.referenceNumber}. Total amount: ${result.totalAmount}`); // Removed alert

    } catch (err) {
      // err.data might contain more specific error details from the backend
      const backendErrorMessage = err.data?.message || err.data?.error;
      setReservationError(backendErrorMessage || err.message || 'Failed to submit reservation.');
      console.error('HotelDetailPage: Error submitting reservation:', err.data || err);
      // alert(`Error creating reservation: ${backendErrorMessage || err.message}`); // Removed alert
    }
    setIsSubmitting(false);
  };

  // Handle combined loading state from auth and local data fetching
  if (authLoading || loading) return <p>Loading page details...</p>;

  if (error) return (
    <div>
        <p style={{ color: 'red' }}>Error: {error}</p>
        <Link to="/hotels">Return to Hotel List</Link>
    </div>
  );
  if (!hotel) return (
    <div>
        <p>Hotel not found.</p>
        <Link to="/hotels">Return to Hotel List</Link>
    </div>
  );


  return (
    <div>
      <h1>{hotel.name}</h1>
      <p><strong>Address:</strong> {hotel.address}, {hotel.city}</p>
      <p><strong>Category:</strong> {hotel.category}</p>

      {hotel.images && hotel.images.length > 0 && (
        <div className="hotel-images" style={{ marginBottom: '20px' }}>
          {hotel.images.map((img, index) => (
            <img
                key={index}
                src={img}
                alt={`${hotel.name} view ${index + 1}`}
                style={{ width: '200px', height: 'auto', marginRight: '10px', marginBottom: '10px', border: '1px solid #ddd' }}
                onError={(e) => { e.target.src = '/default-hotel.png'; /* Fallback to default if specific image fails */ }}
            />
          ))}
        </div>
      )}
       {(!hotel.images || hotel.images.length === 0) && (
        <img
            src={'/default-hotel.png'}
            alt={`${hotel.name} (default)`}
            style={{ width: '200px', height: 'auto', marginRight: '10px', marginBottom: '10px', border: '1px solid #ddd' }}
        />
      )}


      <h2>Rooms</h2>
      {hotel.rooms && hotel.rooms.length > 0 ? (
         <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
            {hotel.rooms.map(room => (
                <li key={room.type} style={{ border: '1px solid #eee', padding: '10px', marginBottom: '5px'}}>
                <strong>{room.type}</strong> - ${room.currentPrice}/night (Available: {room.available})
                </li>
            ))}
        </ul>
      ) : <p>No room information available for this hotel.</p>}

      <h2>Reserve a Room</h2>
      <form onSubmit={handleReservationSubmit} style={{ border: '1px solid #ddd', padding: '15px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="startDate" style={{ marginRight: '10px' }}>Start Date:</label>
          <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} required disabled={isSubmitting || !isAuthenticated} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="endDate" style={{ marginRight: '10px' }}>End Date:</label>
          <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} required disabled={isSubmitting || !isAuthenticated} />
        </div>
        {hotel.rooms && hotel.rooms.length > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <label htmlFor="roomType" style={{ marginRight: '10px' }}>Room Type:</label>
            <select id="roomType" value={selectedRoomType} onChange={e => setSelectedRoomType(e.target.value)} required disabled={isSubmitting || !isAuthenticated}>
              {hotel.rooms
                .filter(room => room.roomTypeId !== undefined) // Ensure the ID property exists
                .map(room => (
                <option key={room.roomTypeId} value={room.roomTypeId}>
                  {room.type} (${room.currentPrice}/night) - Available: {room.available}
                </option>
              ))}
            </select>
          </div>
        )}
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="numRooms" style={{ marginRight: '10px' }}>Number of Rooms:</label>
          <input type="number" id="numRooms" value={numRooms} min="1" onChange={e => setNumRooms(parseInt(e.target.value))} required disabled={isSubmitting || !isAuthenticated} />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="specialRequests" style={{ marginRight: '10px' }}>Special Requests:</label>
          <textarea
            id="specialRequests"
            value={specialRequests}
            onChange={e => setSpecialRequests(e.target.value)}
            rows="3"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            disabled={isSubmitting || !isAuthenticated}
          />
        </div>

        {!isAuthenticated && !authLoading && (
            <p style={{color: 'orange', marginTop: '10px'}}>
                Please <Link to="/login" state={{ from: location }}>login</Link> to make a reservation.
            </p>
        )}

        {reservationMessage && <p style={{ color: 'green', marginTop: '10px' }}>{reservationMessage}</p>}
        {reservationError && <p style={{ color: 'red', marginTop: '10px' }}>{reservationError}</p>}

        <button type="submit" style={{ marginTop: '15px' }} disabled={isSubmitting || !isAuthenticated}>
          {isSubmitting ? 'Submitting...' : (isAuthenticated ? 'Request Reservation' : 'Login to Book')}
        </button>
      </form>
      <br />
      <Link to="/hotels">Back to Hotel List</Link>
    </div>
  );
};
export default HotelDetailPage;
