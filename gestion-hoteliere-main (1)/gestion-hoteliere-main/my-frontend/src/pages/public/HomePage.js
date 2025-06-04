import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Rating,
  Avatar,
  useTheme,
  useMediaQuery,
  IconButton,
} from '@mui/material';
import {
  Hotel as HotelIcon,
  Restaurant as RestaurantIcon,
  Event as EventIcon,
  Security as SecurityIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

const features = [
  {
    icon: <HotelIcon sx={{ fontSize: 40 }} />,
    title: 'Luxury Rooms',
    description: 'Experience comfort in our well-appointed rooms with modern amenities.',
  },
  {
    icon: <RestaurantIcon sx={{ fontSize: 40 }} />,
    title: 'Fine Dining',
    description: 'Enjoy exquisite cuisine prepared by our world-class chefs.',
  },
  {
    icon: <EventIcon sx={{ fontSize: 40 }} />,
    title: 'Event Spaces',
    description: 'Host your special events in our versatile and elegant venues.',
  },
  {
    icon: <SecurityIcon sx={{ fontSize: 40 }} />,
    title: '24/7 Security',
    description: 'Your safety is our priority with round-the-clock security services.',
  },
];

const rooms = [
  {
    id: 1,
    name: 'Deluxe Suite',
    price: '$299',
    image: '/images/room-deluxe.jpg',
    description: 'Spacious suite with ocean view and premium amenities',
    rating: 4.8,
  },
  {
    id: 2,
    name: 'Executive Room',
    price: '$199',
    image: '/images/room-executive.jpg',
    description: 'Modern room with city view and business facilities',
    rating: 4.6,
  },
  {
    id: 3,
    name: 'Presidential Suite',
    price: '$499',
    image: '/images/room-presidential.jpg',
    description: 'Luxurious suite with private terrace and butler service',
    rating: 4.9,
  },
];

const testimonials = [
  {
    id: 1,
    name: 'John Smith',
    role: 'Business Traveler',
    avatar: '/images/avatar-1.jpg',
    comment: "The best hotel experience I've ever had. The staff was incredibly attentive and the facilities were top-notch.",
    rating: 5,
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    role: 'Family Vacation',
    avatar: '/images/avatar-2.jpg',
    comment: 'Perfect for family stays. Kids loved the pool and the room service was excellent.',
    rating: 5,
  },
  {
    id: 3,
    name: 'Michael Brown',
    role: 'Honeymoon',
    avatar: '/images/avatar-3.jpg',
    comment: 'An unforgettable experience. The romantic dinner setup was perfect.',
    rating: 5,
  },
];

const HomePage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [currentRoom, setCurrentRoom] = useState(0);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const nextRoom = () => {
    setCurrentRoom((prev) => (prev + 1) % rooms.length);
  };

  const prevRoom = () => {
    setCurrentRoom((prev) => (prev - 1 + rooms.length) % rooms.length);
  };

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <Box>
      {/* Hero Section with Parallax Effect */}
      <Box
        sx={{
          height: { xs: '70vh', md: '90vh' },
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url(/images/hotel-hero.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.6)',
            zIndex: 1,
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Typography
                  variant="h1"
                  component="h1"
                  gutterBottom
                  sx={{
                    color: 'white',
                    fontSize: { xs: '2.5rem', md: '3.5rem' },
                    fontWeight: 700,
                    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                    lineHeight: 1.2,
                  }}
                >
                  Experience Luxury Living
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    color: 'white',
                    mb: 4,
                    opacity: 0.9,
                    textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                    lineHeight: 1.4,
                  }}
                >
                  Where comfort meets elegance
                </Typography>
                <Button
                  component={RouterLink}
                  to="/hotels"
                  variant="contained"
                  size="large"
                  sx={{
                    bgcolor: 'white',
                    color: 'primary.main',
                    '&:hover': {
                      bgcolor: 'grey.100',
                    },
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                  }}
                >
                  Book Your Stay
                </Button>
              </MotionBox>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section with Animation */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Typography
            variant="h3"
            component="h2"
            align="center"
            gutterBottom
            sx={{ 
              fontWeight: 600,
              mb: 2,
              fontSize: { xs: '2rem', md: '2.5rem' },
            }}
          >
            Our Features
          </Typography>
          <Typography
            variant="h6"
            align="center"
            color="text.secondary"
            sx={{ 
              mb: { xs: 4, md: 8 },
              fontSize: { xs: '1rem', md: '1.25rem' },
            }}
          >
            Discover what makes us special
          </Typography>
        </MotionBox>
        <Box sx={{ overflowX: { xs: 'auto', md: 'visible' }, width: '100%', mb: 4 }}>
          <Grid container spacing={2} wrap="nowrap" sx={{ minWidth: 900 }}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index} sx={{ minWidth: 250 }}>
                <MotionBox
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card
                    sx={{
                      height: { xs: '180px', sm: '200px', md: '220px' },
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      p: { xs: 1, md: 2 },
                      boxShadow: 1,
                      transition: 'transform 0.3s, box-shadow 0.3s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 6px 12px rgba(0,0,0,0.08)',
                      },
                    }}
                  >
                    <Box 
                      sx={{ 
                        color: 'primary.main', 
                        mb: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        bgcolor: 'primary.light',
                        boxShadow: 0,
                      }}
                    >
                      {React.cloneElement(feature.icon, { sx: { fontSize: 28 } })}
                    </Box>
                    <CardContent sx={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 0,
                    }}>
                      <Typography 
                        variant="subtitle1" 
                        component="h3" 
                        gutterBottom
                        sx={{ 
                          fontWeight: 600,
                          mb: 1,
                        }}
                      >
                        {feature.title}
                      </Typography>
                      <Typography 
                        color="text.secondary"
                        sx={{
                          fontSize: '0.95rem',
                          lineHeight: 1.5,
                        }}
                      >
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </MotionBox>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>

      {/* Room Showcase Section */}
      <Box sx={{ bgcolor: 'grey.100', py: { xs: 4, md: 6 } }}>
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            component="h2"
            align="center"
            gutterBottom
            sx={{ 
              fontWeight: 600,
              mb: 1,
              fontSize: { xs: '2rem', md: '2.5rem' },
            }}
          >
            Our Rooms
          </Typography>
          <Typography
            variant="h6"
            align="center"
            color="text.secondary"
            sx={{ 
              mb: 3,
              fontSize: { xs: '1rem', md: '1.25rem' },
            }}
          >
            Choose your perfect stay
          </Typography>
          <Box sx={{ position: 'relative' }}>
            <Grid container spacing={2} alignItems="flex-start">
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    height: { xs: '240px', sm: '320px', md: '380px' },
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 2,
                  }}
                >
                  <CardMedia
                    component="img"
                    image={rooms[currentRoom].image}
                    alt={rooms[currentRoom].name}
                    sx={{
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      bgcolor: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      p: 2,
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {rooms[currentRoom].name}
                    </Typography>
                    <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 500 }}>
                      {rooms[currentRoom].price} / night
                    </Typography>
                  </Box>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box 
                  sx={{ 
                    height: { xs: 'auto', md: '380px' },
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    p: { xs: 1, md: 2 },
                    mt: { xs: 2, md: 0 },
                  }}
                >
                  <Typography 
                    variant="h6" 
                    gutterBottom
                    sx={{ 
                      fontWeight: 600,
                      mb: 1,
                    }}
                  >
                    {rooms[currentRoom].name}
                  </Typography>
                  <Rating 
                    value={rooms[currentRoom].rating} 
                    precision={0.1} 
                    readOnly 
                    sx={{ mb: 1 }}
                  />
                  <Typography 
                    variant="body2" 
                    paragraph
                    sx={{
                      fontSize: '1rem',
                      lineHeight: 1.5,
                      mb: 2,
                    }}
                  >
                    {rooms[currentRoom].description}
                  </Typography>
                  <Button
                    component={RouterLink}
                    to={`/rooms/${rooms[currentRoom].id}`}
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                    sx={{ 
                      alignSelf: 'flex-start',
                      px: 3,
                      py: 1,
                      fontSize: '1rem',
                    }}
                  >
                    View Details
                  </Button>
                </Box>
              </Grid>
            </Grid>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 2 }}>
              <IconButton 
                onClick={prevRoom} 
                color="primary"
                sx={{ 
                  bgcolor: 'white',
                  boxShadow: 1,
                  '&:hover': { bgcolor: 'grey.100' },
                }}
              >
                <ArrowBackIcon />
              </IconButton>
              <IconButton 
                onClick={nextRoom} 
                color="primary"
                sx={{ 
                  bgcolor: 'white',
                  boxShadow: 1,
                  '&:hover': { bgcolor: 'grey.100' },
                }}
              >
                <ArrowForwardIcon />
              </IconButton>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Testimonials Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Typography
          variant="h3"
          component="h2"
          align="center"
          gutterBottom
          sx={{ 
            fontWeight: 600,
            mb: 2,
            fontSize: { xs: '2rem', md: '2.5rem' },
          }}
        >
          Guest Reviews
        </Typography>
        <Typography
          variant="h6"
          align="center"
          color="text.secondary"
          sx={{ 
            mb: { xs: 4, md: 8 },
            fontSize: { xs: '1rem', md: '1.25rem' },
          }}
        >
          What our guests say about us
        </Typography>
        <Box sx={{ position: 'relative', maxWidth: 800, mx: 'auto' }}>
          <Card 
            sx={{ 
              p: { xs: 3, md: 4 },
              borderRadius: 2,
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar
                src={testimonials[currentTestimonial].avatar}
                sx={{ 
                  width: { xs: 50, md: 60 },
                  height: { xs: 50, md: 60 },
                  mr: 2,
                }}
              />
              <Box>
                <Typography 
                  variant="h6"
                  sx={{ fontWeight: 600 }}
                >
                  {testimonials[currentTestimonial].name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {testimonials[currentTestimonial].role}
                </Typography>
              </Box>
            </Box>
            <Rating 
              value={testimonials[currentTestimonial].rating} 
              readOnly 
              sx={{ mb: 2 }}
            />
            <Typography 
              variant="body1" 
              paragraph
              sx={{
                fontSize: '1.1rem',
                lineHeight: 1.6,
                fontStyle: 'italic',
              }}
            >
              {testimonials[currentTestimonial].comment}
            </Typography>
          </Card>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, gap: 2 }}>
            <IconButton 
              onClick={prevTestimonial} 
              color="primary"
              sx={{ 
                bgcolor: 'white',
                boxShadow: 1,
                '&:hover': { bgcolor: 'grey.100' },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <IconButton 
              onClick={nextTestimonial} 
              color="primary"
              sx={{ 
                bgcolor: 'white',
                boxShadow: 1,
                '&:hover': { bgcolor: 'grey.100' },
              }}
            >
              <ArrowForwardIcon />
            </IconButton>
          </Box>
        </Box>
      </Container>

      {/* Call to Action Section */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: { xs: 6, md: 10 } }}>
        <Container maxWidth="md">
          <Card sx={{ p: { xs: 3, md: 4 }, textAlign: 'center', bgcolor: 'transparent', boxShadow: 'none' }}>
            <Typography 
              variant="h4" 
              component="h2" 
              gutterBottom
              sx={{ 
                fontWeight: 600,
                mb: 2,
                fontSize: { xs: '1.75rem', md: '2.25rem' },
              }}
            >
              Ready to Experience Luxury?
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                mb: 4, 
                opacity: 0.9,
                fontSize: '1.1rem',
                lineHeight: 1.6,
              }}
            >
              Book your stay now and enjoy our exclusive offers and premium services.
            </Typography>
            <Button
              component={RouterLink}
              to="/signup"
              variant="contained"
              size="large"
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                mr: 2,
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                '&:hover': {
                  bgcolor: 'grey.100',
                },
              }}
            >
              Create Account
            </Button>
            <Button
              component={RouterLink}
              to="/hotels"
              variant="outlined"
              size="large"
              sx={{
                borderColor: 'white',
                color: 'white',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                '&:hover': {
                  borderColor: 'grey.100',
                  bgcolor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              View Rooms
            </Button>
          </Card>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;
