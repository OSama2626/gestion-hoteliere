import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getHotels } from '../../services/hotelService';
import {
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  TextField,
  Button,
  useTheme,
} from '@mui/material';
import HotelIcon from '@mui/icons-material/Hotel';
import ClientSidebar from '../../components/common/ClientSidebar';
import PageHeader from '../../components/common/PageHeader';

const HotelListPage = () => {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const theme = useTheme();

  useEffect(() => {
    const fetchHotels = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {};
        if (cityFilter.trim() !== '') {
          params.city = cityFilter;
        }
        const data = await getHotels(params);
        setHotels(data);
      } catch (err) {
        setError('Failed to fetch hotels.');
      }
      setLoading(false);
    };
    fetchHotels();
  }, [cityFilter]);

  const handleFilterChange = (e) => {
    setCityFilter(e.target.value);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <ClientSidebar />
      <Box sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, bgcolor: theme.palette.background.default }}>
        <PageHeader
          title="Available Hotels"
          breadcrumbs={[
            { label: 'Hotels', path: '/hotels' },
          ]}
          actions={null}
        />
        <Card sx={{ mb: 4, p: 3, bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 3 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Find your perfect stay!
          </Typography>
          <Typography variant="body1">
            Browse and filter hotels by city. Click any hotel for more details and booking options.
          </Typography>
        </Card>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            label="Search by city"
            variant="outlined"
            value={cityFilter}
            onChange={handleFilterChange}
            sx={{ width: { xs: '100%', sm: 300 } }}
          />
        </Box>
        {loading ? (
          <Typography variant="body1">Loading hotels...</Typography>
        ) : error ? (
          <Typography variant="body1" color="error">{error}</Typography>
        ) : hotels.length === 0 ? (
          <Typography variant="body1">No hotels found matching your criteria.</Typography>
        ) : (
          <Grid container spacing={3}>
            {hotels.map((hotel) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={hotel.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3, boxShadow: 3 }}>
                  <CardMedia
                    component="img"
                    height="180"
                    image={hotel.thumbnail}
                    alt={hotel.name}
                    sx={{ objectFit: 'cover', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <HotelIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" component={Link} to={`/hotels/${hotel.id}`} sx={{ textDecoration: 'none', color: 'inherit', fontWeight: 600 }}>
                        {hotel.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">City: {hotel.city}</Typography>
                    <Typography variant="body2" color="text.secondary">Category: {hotel.category}</Typography>
                    <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 500 }}>
                      Starting from: <span style={{ color: theme.palette.primary.main }}>${hotel.startingPrice}</span> / night
                    </Typography>
                    <Button
                      component={Link}
                      to={`/hotels/${hotel.id}`}
                      variant="contained"
                      color="primary"
                      size="small"
                      sx={{ mt: 2, borderRadius: 2 }}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default HotelListPage;
