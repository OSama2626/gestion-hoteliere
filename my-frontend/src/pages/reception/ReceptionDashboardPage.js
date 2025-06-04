import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAllReservations } from '../../services/receptionReservationService';
// Assuming moment.js is available for date formatting, or use native Date
// import moment from 'moment';

// Basic styling
const styles = {
  container: { padding: '20px', fontFamily: 'Arial, sans-serif' },
  header: { fontSize: '2em', marginBottom: '20px', color: '#333' },
  quickLinks: { marginBottom: '30px', display: 'flex', gap: '15px', flexWrap: 'wrap' },
  linkCard: { padding: '20px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '5px', textAlign: 'center', flexGrow: 1, minWidth: '180px' },
  overviewSection: { marginBottom: '30px' },
  sectionTitle: { fontSize: '1.5em', marginBottom: '15px', color: '#444', borderBottom: '2px solid #007bff', paddingBottom: '5px' },
  statCardsContainer: { display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'space-around' },
  statCard: { backgroundColor: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px', minWidth: '200px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  statValue: { fontSize: '2.5em', fontWeight: 'bold', color: '#007bff', margin: '5px 0' },
  statLabel: { fontSize: '1.1em', color: '#555' },
  recentBookingsList: { listStyle: 'none', padding: 0 },
  bookingItem: { backgroundColor: '#fff', border: '1px solid #eee', padding: '10px', marginBottom: '8px', borderRadius: '4px' },
  error: { color: 'red', margin: '10px 0' },
  loading: { margin: '10px 0', fontStyle: 'italic' }
};

const ReceptionDashboardPage = () => {
  const [arrivalsToday, setArrivalsToday] = useState(0);
  const [departuresToday, setDeparturesToday] = useState(0);
  const [currentOccupancy, setCurrentOccupancy] = useState(0);
  const [recentBookings, setRecentBookings] = useState([]); // Optional

  const [isLoadingArrivals, setIsLoadingArrivals] = useState(false);
  const [isLoadingDepartures, setIsLoadingDepartures] = useState(false);
  const [isLoadingOccupancy, setIsLoadingOccupancy] = useState(false);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [error, setError] = useState('');

  const todayISO = new Date().toISOString().split('T')[0];
  // const todayFormatted = moment().format('YYYY-MM-DD'); // Using moment

  const fetchDashboardData = useCallback(async () => {
    // Fetch Arrivals Today
    setIsLoadingArrivals(true);
    try {
      const arrivalFilters = {
        dateFrom: todayISO, // check_in_date >= todayISO
        dateTo: todayISO,   // check_in_date <= todayISO (effectively check_in_date IS today)
        status: 'confirmed', // Or include 'modified_by_agent' if that's also an arrival status
        limit: 1 // We only need the count from pagination.totalItems
      };
      const arrivalData = await getAllReservations(arrivalFilters);
      setArrivalsToday(arrivalData.pagination?.totalItems || 0);
    } catch (err) {
      setError(prev => prev + '\nFailed to load arrivals: ' + (err.data?.error || err.message));
    } finally {
      setIsLoadingArrivals(false);
    }

    // Fetch Departures Today
    setIsLoadingDepartures(true);
    try {
      const departureFilters = {
        // Backend's getAllReservations with 'dateTo' filters 'check_out_date <= ?'
        // So, to get check_out_date = today, we need dateFrom=today AND dateTo=today for checkout
        // This assumes backend can filter check_out_date with dateFrom and dateTo params.
        // If not, the backend query for 'dateTo' on 'reservations/all' might need adjustment or a specific param.
        // For now, assuming dateTo means check_out_date IS today
        dateToForCheckout: todayISO, // Custom param to indicate we mean checkout date
        status: 'checked_in',
        limit: 1
      };
      // Translating to current backend: dateTo means check_out_date <= dateTo.
      // To get departures strictly for today, we'd need dateFrom and dateTo to target check_out_date.
      // The current backend filter for `reservations/all` uses `dateFrom` for `check_in_date >= ?`
      // and `dateTo` for `check_out_date <= ?`.
      // So, for departures today, we need check_out_date = today.
      // A precise filter would be `check_out_date_equals: todayISO`.
      // Using existing filters:
      const departureData = await getAllReservations({
          // dateFrom: todayISO, // This would be for check_in_date
          dateTo: todayISO, // This means check_out_date <= today
          status: 'checked_in',
          limit: 1000 // Fetch all to count, or rely on pagination.totalItems if backend counts correctly for this
      });
      // Client-side count if backend doesn't give precise count for check_out_date = today
      const actualDepartures = (departureData.reservations || []).filter(
          r => r.check_out_date.startsWith(todayISO)
      ).length;
      setDeparturesToday(actualDepartures > 0 ? actualDepartures : (departureData.pagination?.totalItems || 0) );
      // The above client-side filter is a fallback. Ideally backend provides precise count.
      // If pagination.totalItems from `dateTo:todayISO, status:checked_in` is accurate for departures, use it.

    } catch (err) {
      setError(prev => prev + '\nFailed to load departures: ' + (err.data?.error || err.message));
    } finally {
      setIsLoadingDepartures(false);
    }

    // Fetch Current Occupancy
    setIsLoadingOccupancy(true);
    try {
      const occupancyFilters = { status: 'checked_in', limit: 1 };
      const occupancyData = await getAllReservations(occupancyFilters);
      setCurrentOccupancy(occupancyData.pagination?.totalItems || 0);
    } catch (err) {
      setError(prev => prev + '\nFailed to load occupancy: ' + (err.data?.error || err.message));
    } finally {
      setIsLoadingOccupancy(false);
    }

    // Fetch Recent Bookings (Optional)
    setIsLoadingRecent(true);
    try {
      const recentFilters = { limit: 5, sortBy: 'created_at', order: 'DESC' }; // Assuming backend supports sort
      const recentData = await getAllReservations(recentFilters);
      setRecentBookings(recentData.reservations || []);
    } catch (err) {
      // Don't make this a blocking error for other stats
      console.warn('Failed to load recent bookings: ' + (err.data?.error || err.message));
    } finally {
      setIsLoadingRecent(false);
    }
  }, [todayISO]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Reception Dashboard</h1>

      {error && <pre style={styles.error}>{error}</pre>}

      <div style={styles.overviewSection}>
        <h2 style={styles.sectionTitle}>At a Glance</h2>
        <div style={styles.statCardsContainer}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{isLoadingArrivals ? '...' : arrivalsToday}</div>
            <div style={styles.statLabel}>Arrivals Today</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{isLoadingDepartures ? '...' : departuresToday}</div>
            <div style={styles.statLabel}>Departures Today</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{isLoadingOccupancy ? '...' : currentOccupancy}</div>
            <div style={styles.statLabel}>Current Occupancy</div>
          </div>
        </div>
      </div>

      <div style={styles.quickLinks}>
        <Link to="/reception/create-booking" style={styles.linkCard}>Create Booking</Link>
        <Link to="/reception/manage-bookings" style={styles.linkCard}>Manage Bookings</Link>
        <Link to="/reception/check-in-out" style={styles.linkCard}>Check-in / Check-out</Link>
        <Link to="/reception/billing" style={styles.linkCard}>Billing</Link>
        <Link to="/reception/clients" style={styles.linkCard}>Client Management</Link>
      </div>


      <div style={styles.overviewSection}>
        <h2 style={styles.sectionTitle}>Recent Bookings</h2>
        {isLoadingRecent && <p style={styles.loading}>Loading recent bookings...</p>}
        {recentBookings.length > 0 ? (
          <ul style={styles.recentBookingsList}>
            {recentBookings.map(booking => (
              <li key={booking.id} style={styles.bookingItem}>
                <strong>Ref:</strong> {booking.reference_number} <br />
                <strong>Client:</strong> {booking.client_first_name} {booking.client_last_name} ({booking.client_email}) <br />
                <strong>Dates:</strong> {new Date(booking.check_in_date).toLocaleDateString()} - {new Date(booking.check_out_date).toLocaleDateString()} <br />
                <strong>Status:</strong> {booking.status}
              </li>
            ))}
          </ul>
        ) : (
          !isLoadingRecent && <p>No recent bookings to display.</p>
        )}
      </div>
    </div>
  );
};

export default ReceptionDashboardPage;
