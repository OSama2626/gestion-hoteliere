import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../store/contexts/AuthContext';
import { getReservationsForUser, cancelReservation } from '../../services/reservationService';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Snackbar,
  Alert,
} from '@mui/material';
import BookIcon from '@mui/icons-material/Book';
import CancelIcon from '@mui/icons-material/Cancel';
import Sidebar from './Sidebar'; // If you have a Sidebar component, else use Drawer code from dashboard

const ReservationsPage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const fetchUserReservations = useCallback(async () => {
    if (isAuthenticated && user && user.id) {
      setLoading(true);
      setError('');
      setMessage('');
      try {
        const data = await getReservationsForUser();
        setReservations(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch reservations.');
      }
      setLoading(false);
    } else {
      if (!authLoading) {
        setReservations([]);
        setLoading(false);
      }
    }
  }, [isAuthenticated, user, authLoading]);

  useEffect(() => {
    if (!authLoading) {
      fetchUserReservations();
    }
  }, [fetchUserReservations, authLoading]);

  const handleCancelReservation = async (reservationId) => {
    if (!user || !user.id) {
      setError('User information is missing, cannot cancel.');
      return;
    }
    setMessage('');
    setError('');
    const confirmCancel = window.confirm('Are you sure you want to cancel this reservation?');
    if (confirmCancel) {
      try {
        const result = await cancelReservation(reservationId);
        setMessage(result.message);
        setSnackbarOpen(true);
        fetchUserReservations();
      } catch (err) {
        setError(err.message || 'Failed to cancel reservation.');
        setSnackbarOpen(true);
      }
    }
  };

  if (authLoading) {
    return <Typography>Loading user information...</Typography>;
  }

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>My Reservations</Typography>
        <Typography>Please <Button component={RouterLink} to="/login" color="primary">login</Button> to view your reservations.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '80vh' }}>
      {/* Sidebar (reuse dashboard sidebar or Drawer) */}
      {/* If you have a Sidebar component, use it here. Otherwise, copy Drawer code from DashboardPage.js */}
      <Sidebar selected="My Reservations" />
      <Box sx={{ flexGrow: 1, p: { xs: 2, md: 4 } }}>
        <Typography variant="h4" gutterBottom>My Reservations</Typography>
        <Card sx={{ mb: 4 }}>
          <CardContent>
            {loading ? (
              <Typography>Loading your reservations...</Typography>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Reference</TableCell>
                      <TableCell>Hotel</TableCell>
                      <TableCell>Room Type</TableCell>
                      <TableCell>Check-in</TableCell>
                      <TableCell>Check-out</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reservations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          You have no active reservations. <Button component={RouterLink} to="/hotels" color="primary">Book a stay</Button>
                        </TableCell>
                      </TableRow>
                    ) : (
                      reservations.map(res => (
                        <TableRow key={res.id}>
                          <TableCell>{res.reference_number || 'N/A'}</TableCell>
                          <TableCell>{res.hotel_name || 'N/A'}</TableCell>
                          <TableCell>{res.room_type_name || res.roomType || 'N/A'}</TableCell>
                          <TableCell>{res.check_in_date ? new Date(res.check_in_date).toLocaleDateString() : 'Invalid Date'}</TableCell>
                          <TableCell>{res.check_out_date ? new Date(res.check_out_date).toLocaleDateString() : 'Invalid Date'}</TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 'bold', color: res.status === 'cancelled_by_client' ? 'red' : (res.status === 'confirmed' ? 'green' : 'orange')}}>
                              {(res.status || 'Unknown').replace(/_/g, ' ')}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {['pending_admin_validation', 'confirmed'].includes(res.status) && (
                              <IconButton color="error" onClick={() => handleCancelReservation(res.id)} title="Cancel Reservation">
                                <CancelIcon />
                              </IconButton>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
        <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)}>
          {error ? (
            <Alert severity="error" onClose={() => setSnackbarOpen(false)}>{error}</Alert>
          ) : (
            <Alert severity="success" onClose={() => setSnackbarOpen(false)}>{message}</Alert>
          )}
        </Snackbar>
      </Box>
    </Box>
  );
};

export default ReservationsPage;
