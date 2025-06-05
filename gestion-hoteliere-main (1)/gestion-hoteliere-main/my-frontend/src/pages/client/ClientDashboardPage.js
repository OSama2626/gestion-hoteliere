import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Badge,
  Avatar,
  Divider,
  useTheme,
} from '@mui/material';
import {
  Hotel as HotelIcon,
  Event as EventIcon,
  Payment as PaymentIcon,
  Message as MessageIcon,
  Notifications as NotificationsIcon,
  Book as BookIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import PageContainer from '../../components/common/PageContainer';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import { useAuth } from '../../store/contexts/AuthContext';

const drawerWidth = 220;

const DashboardPage = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const theme = useTheme();
  const { user, unreadNotificationsCount, logout } = useAuth();

  // Sample data for recent bookings
  const recentBookings = [
    { id: 1, room: 'Deluxe Suite', checkIn: '2024-03-20', checkOut: '2024-03-25', status: 'Confirmed' },
    { id: 2, room: 'Standard Room', checkIn: '2024-03-15', checkOut: '2024-03-18', status: 'Completed' },
    { id: 3, room: 'Executive Suite', checkIn: '2024-04-01', checkOut: '2024-04-05', status: 'Pending' },
  ];

  const columns = [
    { id: 'room', label: 'Room', minWidth: 170 },
    { id: 'checkIn', label: 'Check In', minWidth: 100 },
    { id: 'checkOut', label: 'Check Out', minWidth: 100 },
    {
      id: 'status',
      label: 'Status',
      minWidth: 100,
      render: (value) => (
        <Typography
          sx={{
            color: value === 'Confirmed' ? 'success.main' : value === 'Pending' ? 'warning.main' : 'text.secondary',
          }}
        >
          {value}
        </Typography>
      ),
    },
  ];

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const stats = [
    {
      title: 'Active Bookings',
      value: '2',
      icon: <HotelIcon sx={{ fontSize: 40 }} />,
      color: 'primary.main',
    },
    {
      title: 'Upcoming Events',
      value: '1',
      icon: <EventIcon sx={{ fontSize: 40 }} />,
      color: 'secondary.main',
    },
    {
      title: 'Pending Payments',
      value: '$500',
      icon: <PaymentIcon sx={{ fontSize: 40 }} />,
      color: 'warning.main',
    },
    {
      title: 'Unread Messages',
      value: '3',
      icon: <MessageIcon sx={{ fontSize: 40 }} />,
      color: 'info.main',
    },
  ];

  // Sidebar navigation items
  const navItems = [
    { label: 'Dashboard', icon: <HomeIcon />, to: '/client/dashboard' },
    { label: 'My Reservations', icon: <BookIcon />, to: '/client/reservations' },
    { label: 'Book a Room', icon: <HotelIcon />, to: '/client/book-room' },
    { label: 'Notifications', icon: <NotificationsIcon />, to: '/client/notifications', badge: unreadNotificationsCount },
    { label: 'Hotels', icon: <EventIcon />, to: '/hotels' },
    { label: 'Profile', icon: <AccountCircleIcon />, to: '/client/profile' },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '80vh' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: theme.palette.background.paper,
            borderRight: `1px solid ${theme.palette.divider}`,
            pt: 2,
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ width: 64, height: 64, mb: 1, bgcolor: 'primary.main' }}>
            <AccountCircleIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h6" fontWeight={600} align="center">
            {user?.name || user?.email || 'User'}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 1 }}>
            {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Client'}
          </Typography>
        </Box>
        <Divider sx={{ mb: 1 }} />
        <List>
          {navItems.map((item, idx) => (
            <ListItem button component={RouterLink} to={item.to} key={item.label} sx={{ borderRadius: 2, mb: 0.5 }}>
              <ListItemIcon>
                {item.badge ? (
                  <Badge badgeContent={item.badge} color="error">
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItem>
          ))}
        </List>
        <Box sx={{ flexGrow: 1 }} />
        <Divider sx={{ my: 1 }} />
        <List>
          <ListItem button onClick={logout} sx={{ borderRadius: 2 }}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItem>
        </List>
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, p: { xs: 2, md: 4 } }}>
        <PageHeader
          title="Dashboard"
          breadcrumbs={[
            { label: 'Home', path: '/' },
            { label: 'Dashboard', path: '/client/dashboard' },
          ]}
          actions={
            <Button
              component={RouterLink}
              to="/client/book-room"
              variant="contained"
              color="primary"
              startIcon={<HotelIcon />}
            >
              Book New Room
            </Button>
          }
        />

        {/* Welcome Section */}
        <Card sx={{ mb: 4, p: 3, bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 3 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Welcome, {user?.name || user?.email || 'Guest'}!
          </Typography>
          <Typography variant="body1">
            Here you can manage your reservations, book new rooms, check notifications, and stay updated with the latest hotel news.
          </Typography>
        </Card>

        {user?.email === 'client@hotel.com' ? (
          <Card sx={{ mb: 4, p: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Start your journey with us!
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Explore our amazing hotels or book your first room to get started.
            </Typography>
            <Button component={RouterLink} to="/hotels" variant="outlined" sx={{ mr: 2 }}>
              Explore Hotels
            </Button>
            <Button component={RouterLink} to="/client/book-room" variant="contained">
              Book a Room
            </Button>
          </Card>
        ) : (
          <>
            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {stats.map((stat, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ color: stat.color, mr: 2 }}>{stat.icon}</Box>
                        <Typography variant="h6" component="div">
                          {stat.title}
                        </Typography>
                      </Box>
                      <Typography variant="h4" component="div">
                        {stat.value}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Recent Bookings Table */}
            <Typography variant="h5" gutterBottom>
              Recent Bookings
            </Typography>
            <DataTable
              columns={columns}
              data={recentBookings}
              page={page}
              rowsPerPage={rowsPerPage}
              totalCount={recentBookings.length}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
            />
          </>
        )}
      </Box>
    </Box>
  );
};

export default DashboardPage; 