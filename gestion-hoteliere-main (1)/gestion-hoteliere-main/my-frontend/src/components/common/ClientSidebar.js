import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Divider,
  Box,
  Typography,
  Badge,
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
import { useAuth } from '../../store/contexts/AuthContext';

const drawerWidth = 220;

const navItems = [
  { label: 'Dashboard', icon: <HomeIcon />, to: '/client/dashboard' },
  { label: 'My Reservations', icon: <BookIcon />, to: '/client/reservations' },
  { label: 'Book a Room', icon: <HotelIcon />, to: '/client/book-room' },
  { label: 'Notifications', icon: <NotificationsIcon />, to: '/client/notifications', badgeKey: 'unreadNotificationsCount' },
  { label: 'Hotels', icon: <EventIcon />, to: '/hotels' },
  { label: 'Profile', icon: <AccountCircleIcon />, to: '/client/profile' },
];

const ClientSidebar = () => {
  const theme = useTheme();
  const { user, unreadNotificationsCount, logout } = useAuth();
  const location = useLocation();

  return (
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
        {navItems.map((item) => (
          <ListItem
            button
            component={RouterLink}
            to={item.to}
            key={item.label}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              bgcolor: location.pathname === item.to ? 'action.selected' : 'inherit',
            }}
            selected={location.pathname === item.to}
          >
            <ListItemIcon>
              {item.badgeKey && unreadNotificationsCount ? (
                <Badge badgeContent={unreadNotificationsCount} color="error">
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
  );
};

export default ClientSidebar;
