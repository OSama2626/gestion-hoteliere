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
        if (data && data.rooms && data.rooms.length > 0) {
          setSelectedRoomType(data.rooms[0].type);
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


    setIsSubmitting(true);

    // Find the roomTypeId from the selectedRoomType string
    const roomTypeObj = hotel.rooms.find(room => room.type === selectedRoomType);
    if (!roomTypeObj) {
        setReservationError('Selected room type details not found. Please try again.');
        setIsSubmitting(false);
        return;
    }
    // Assuming the room object has an 'id' property for roomTypeId.
    // This needs to match the actual property name in your hotel.rooms objects.
    const roomTypeId = roomTypeObj.id; 

    const reservationDetails = {
      hotelId: hotel.id, // This should be the integer ID of the hotel
      checkInDate: startDate, // Renamed from startDate
      checkOutDate: endDate,  // Renamed from endDate
      rooms: [
        {
          roomTypeId: roomTypeId, // Integer ID of the room type
          quantity: parseInt(numRooms, 10)
        }
      ]
      // hotelName, userId, userEmail are removed as they are not needed by the backend
    };
    console.log('HotelDetailPage: Submitting reservation with details:', reservationDetails);

    try {
      const result = await createReservation(reservationDetails);
      setReservationMessage(result.message);
      console.log('HotelDetailPage: Reservation submitted successfully:', result);
      // Clear form or redirect
      setStartDate('');
      setEndDate('');
      setNumRooms(1);
      // navigate('/client/reservations'); // Optional: redirect after success
    } catch (err) {
      setReservationError(err.message || 'Failed to submit reservation.');
      console.error('HotelDetailPage: Error submitting reservation:', err);
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
              {hotel.rooms.map(room => (
                <option key={room.type} value={room.type}>{room.type} (${room.currentPrice})</option>
              ))}
            </select>
          </div>
        )}
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="numRooms" style={{ marginRight: '10px' }}>Number of Rooms:</label>
          <input type="number" id="numRooms" value={numRooms} min="1" onChange={e => setNumRooms(parseInt(e.target.value))} required disabled={isSubmitting || !isAuthenticated} />
        </div>

        {!isAuthenticated && !authLoading && (
            <p style={{color: 'orange', marginTop: '10px'}}>
                Please <Link to="/login" state={{ from: location }}>login</Link> to make a reservation.
            </p>
        )}

        {reservationMessage && <p style={{ color: 'green', marginTop: '10px' }}>{reservationMessage}</p>}
        {reservationError && <p style={{ color: 'red', marginTop: '10px' }}>{reservationError}</p>}

        <button type="submit" style={{ marginTop: '15px' }} disabled={isSubmitting || !isAuthenticated}>
          {isSubmitting ? 'Submitting...' : 'Request Reservation'}
        </button>
      </form>
      <br />
      <Link to="/hotels">Back to Hotel List</Link>
    </div>
  );
};
export default HotelDetailPage;
