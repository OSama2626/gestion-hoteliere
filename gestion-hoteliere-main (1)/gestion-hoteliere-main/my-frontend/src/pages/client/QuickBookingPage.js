import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getHotels, getHotelById } from '../../services/hotelService';
import { createReservation } from '../../services/reservationService';
import { useAuth } from '../../store/contexts/AuthContext';
import ClientSidebar from '../../components/common/ClientSidebar';
import PageHeader from '../../components/common/PageHeader';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  MenuItem,
  Alert,
  CircularProgress,
  Snackbar
} from '@mui/material';

const QuickBookingPage = () => {
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState('');
  const [roomTypes, setRoomTypes] = useState([]);
  const [selectedRoomType, setSelectedRoomType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [numRooms, setNumRooms] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');

  const [loadingHotels, setLoadingHotels] = useState(true);
  const [loadingRoomTypes, setLoadingRoomTypes] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation(); // For redirect state
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // Fetch hotels on mount
  useEffect(() => {
    const fetchHotelsList = async () => {
      try {
        setLoadingHotels(true);
        const data = await getHotels();
        setHotels(data || []);
        setError('');
      } catch (err) {
        setError('Failed to fetch hotels. Please try again later.');
        console.error("QuickBookingPage: Error fetching hotels:", err);
        setHotels([]); // Ensure hotels is an array in case of error
      }
      setLoadingHotels(false);
    };
    fetchHotelsList();
  }, []);

  // Fetch room types when selectedHotel changes
  useEffect(() => {
    if (selectedHotel) {
      const fetchRoomTypesForHotel = async () => {
        try {
          setLoadingRoomTypes(true);
          setSelectedRoomType(''); 
          setRoomTypes([]); 
          const hotelDetails = await getHotelById(selectedHotel);
          // hotelService.getHotelById returns an object with a 'rooms' array
          setRoomTypes(hotelDetails.rooms || []); 
          setError('');
        } catch (err) {
          setError(`Failed to fetch room types: ${err.message || 'Unknown error'}`);
          console.error("QuickBookingPage: Error fetching room types:", err);
          setRoomTypes([]);
        }
        setLoadingRoomTypes(false);
      };
      fetchRoomTypesForHotel();
    } else {
      setRoomTypes([]); 
      setSelectedRoomType('');
    }
  }, [selectedHotel]);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!isAuthenticated) {
      setError('You must be logged in to make a reservation.');
      navigate('/login', { state: { from: location.pathname } }); 
      return;
    }

    if (!user || !user.id) {
      setError('User information is missing. Cannot make a reservation.');
      return;
    }

    if (!selectedHotel || !selectedRoomType || !startDate || !endDate) {
      setError('Please fill in all required fields: hotel, room type, start date, and end date.');
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Compare dates only
    if (new Date(startDate) < today) {
        setError('Start date cannot be in the past.');
        return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      setError('End date must be after start date.');
      return;
    }
    
    setIsSubmitting(true);
    const reservationPayload = {
      hotelId: parseInt(selectedHotel, 10),
      checkInDate: new Date(startDate).toISOString(),
      checkOutDate: new Date(endDate).toISOString(),
      rooms: [{
        roomTypeId: parseInt(selectedRoomType, 10),
        quantity: parseInt(numRooms, 10),
      }],
      specialRequests: specialRequests,
      bookingSource: 'website-quickbook'
    };

    try {
      const result = await createReservation(reservationPayload);
      setSuccessMessage(result.message || `Reservation confirmed! Reference: ${result.referenceNumber}. Total: $${result.totalAmount}`);
      setSelectedHotel('');
      setSelectedRoomType('');
      setStartDate('');
      setEndDate('');
      setNumRooms(1);
      setSpecialRequests('');
      // Optionally navigate: navigate('/client/reservations');
    } catch (err) {
      const backendErrorMessage = err.data?.message || err.data?.error;
      setError(backendErrorMessage || err.message || 'Failed to submit reservation.');
      console.error("QuickBookingPage: Error submitting reservation:", err);
    }
    setIsSubmitting(false);
  };

  if (authLoading) return <p>Loading user session...</p>;

  const getButtonText = () => {
    if (!isAuthenticated) return 'Login to Book';
    if (isSubmitting) return 'Booking...';
    if (loadingHotels || loadingRoomTypes) return 'Loading Data...';
    return 'Book Now';
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <ClientSidebar />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', p: { xs: 2, md: 4 } }}>
        <PageHeader
          title="Book a Room"
          breadcrumbs={[
            { label: 'Dashboard', path: '/client/dashboard' },
            { label: 'Book a Room', path: '/client/book-room' },
          ]}
        />
        <Card sx={{ width: '100%', maxWidth: 520, borderRadius: 3, boxShadow: 3 }}>
          <CardContent>
            <Typography variant="h5" fontWeight={600} mb={2} align="center">Quick Booking</Typography>
            <Typography variant="body1" mb={3} color="text.secondary" align="center">
              Book a room at any of our hotels in just a few clicks.
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}
            <form onSubmit={handleBookingSubmit} autoComplete="off">
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    select
                    label="Select Hotel"
                    value={selectedHotel}
                    onChange={e => setSelectedHotel(e.target.value)}
                    fullWidth
                    required
                    disabled={loadingHotels || isSubmitting || !isAuthenticated}
                  >
                    <MenuItem value="">{loadingHotels ? 'Loading hotels...' : '-- Select a Hotel --'}</MenuItem>
                    {hotels.map(hotel => (
                      <MenuItem key={hotel.id} value={hotel.id}>{hotel.name} ({hotel.city})</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    select
                    label="Room Type"
                    value={selectedRoomType}
                    onChange={e => setSelectedRoomType(e.target.value)}
                    fullWidth
                    required
                    disabled={loadingRoomTypes || isSubmitting || roomTypes.length === 0 || !isAuthenticated || !selectedHotel}
                  >
                    <MenuItem value="">
                      {loadingRoomTypes ? 'Loading room types...' :
                        (roomTypes.length === 0 ? 'No room types available' : '-- Select Room Type --')}
                    </MenuItem>
                    {roomTypes.map(rt => (
                      <MenuItem key={rt.roomTypeId} value={rt.roomTypeId}>
                        {rt.type} (${rt.currentPrice}/night) - Available: {rt.available}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Start Date"
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    required
                    disabled={isSubmitting || !isAuthenticated}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="End Date"
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    required
                    disabled={isSubmitting || !isAuthenticated}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Number of Rooms"
                    type="number"
                    value={numRooms}
                    min={1}
                    onChange={e => setNumRooms(parseInt(e.target.value, 10))}
                    fullWidth
                    required
                    disabled={isSubmitting || !isAuthenticated}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Special Requests (Optional)"
                    value={specialRequests}
                    onChange={e => setSpecialRequests(e.target.value)}
                    fullWidth
                    multiline
                    minRows={2}
                    disabled={isSubmitting || !isAuthenticated}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="large"
                    disabled={isSubmitting || loadingHotels || loadingRoomTypes || !isAuthenticated || (selectedHotel && roomTypes.length === 0 && !loadingRoomTypes)}
                  >
                    {getButtonText()}
                  </Button>
                </Grid>
                {!isAuthenticated && !authLoading && (
                  <Grid item xs={12}>
                    <Alert severity="warning" sx={{ mt: 2, textAlign: 'center' }}>
                      Please <a href="/login" style={{ color: '#1976d2', textDecoration: 'underline' }}>login</a> to make a reservation.
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </form>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default QuickBookingPage;
