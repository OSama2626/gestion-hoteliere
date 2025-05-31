```javascript
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getHotelById } from '../../services/hotelService'; // Adjust path as needed
import { createReservation } from '../../services/reservationService'; // Import new service
import { useAuth } from '../../contexts/AuthContext'; // Import useAuth

const HotelDetailPage = () => {
  const { id: hotelId } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, loading: authLoading } = useAuth();

  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Reservation form state placeholders
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRoomType, setSelectedRoomType] = useState('');
  const [numRooms, setNumRooms] = useState(1);
  const [reservationMessage, setReservationMessage] = useState('');
  const [reservationError, setReservationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchHotel = async () => {
      if (!hotelId) return;
      setLoading(true);
      try {
        const data = await getHotelById(hotelId);
        setHotel(data);
        if (data.rooms && data.rooms.length > 0) {
          setSelectedRoomType(data.rooms[0].type);
        }
      } catch (err) {
        setError('Failed to fetch hotel details.');
        console.error(err);
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

    if (!currentUser || !currentUser.id) {
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
    const reservationDetails = {
      hotelId: hotel.id,
      hotelName: hotel.name,
      userId: currentUser.id,
      userEmail: currentUser.email,
      roomType: selectedRoomType,
      numRooms,
      startDate,
      endDate,
    };

    try {
      const result = await createReservation(reservationDetails);
      setReservationMessage(result.message);
      // Clear form or redirect
      setStartDate('');
      setEndDate('');
      setNumRooms(1);
      // navigate('/client/reservations'); // Optional: redirect after success
    } catch (err) {
      setReservationError(err.message || 'Failed to submit reservation.');
    }
    setIsSubmitting(false);
  };

  if (authLoading || loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>{error} <Link to="/hotels">Go back to list</Link></p>;
  if (!hotel) return <p>Hotel not found. <Link to="/hotels">Go back to list</Link></p>;

  return (
    <div>
      <h1>{hotel.name}</h1>
      <p><strong>Address:</strong> {hotel.address}, {hotel.city}</p>
      <p><strong>Category:</strong> {hotel.category}</p>

      {hotel.images && hotel.images.length > 0 && (
        <div className="hotel-images">
          {hotel.images.map((img, index) => (
            <img
              key={index}
              src={img}
              alt={`${hotel.name} view ${index + 1}`}
              style={{ width: '200px', height: 'auto', marginRight: '10px', marginBottom: '10px' }}
              onError={(e) => { e.target.style.display='none'; }} // Hide if image fails to load
            />
          ))}
        </div>
      )}

      {(!hotel.images || hotel.images.length === 0) && (
        <img
            src={'/default-hotel.png'}  // A default image if no specific ones are available
            alt={`${hotel.name} (default)`}
            style={{ width: '200px', height: 'auto', marginRight: '10px', marginBottom: '10px' }}
        />
      )}

      <h2>Rooms</h2>
      {hotel.rooms && hotel.rooms.length > 0 ? (
        <ul>
          {hotel.rooms.map(room => (
            <li key={room.type}>
              <strong>{room.type}</strong> - ${room.currentPrice}/night (Available: {room.available})
            </li>
          ))}
        </ul>
      ) : <p>No room information available for this hotel.</p>}

      <h2>Reserve a Room</h2>
      <form onSubmit={handleReservationSubmit}>
        <div>
          <label htmlFor="startDate">Start Date:</label>
          <input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="endDate">End Date:</label>
          <input type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>
        {hotel.rooms && hotel.rooms.length > 0 && (
          <div>
            <label htmlFor="roomType">Room Type:</label>
            <select id="roomType" value={selectedRoomType} onChange={(e) => setSelectedRoomType(e.target.value)} required>
              {hotel.rooms.map(room => (
                <option key={room.type} value={room.type}>{room.type} (${room.currentPrice})</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="numRooms">Number of Rooms:</label>
          <input type="number" id="numRooms" value={numRooms} min="1" onChange={(e) => setNumRooms(parseInt(e.target.value))} required />
        </div>
        {reservationError && <p style={{ color: 'red' }}>{reservationError}</p>}
        {reservationMessage && <p style={{ color: 'green' }}>{reservationMessage}</p>}
        <Button type="submit" disabled={isSubmitting || !isAuthenticated}>
          {isSubmitting ? 'Processing...' : 'Reserve Now'}
        </Button>
        {!isAuthenticated && !authLoading && (
          <p style={{color: 'red'}}>You must be <Link to="/login" state={{ from: location }}>logged in</Link> to make a reservation.</p>
        )}
      </form>
    </div>
  );
};

export default HotelDetailPage;
```
