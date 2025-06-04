import React from 'react';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import AppRoutes from './routes';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import { AuthProvider } from './store/contexts/AuthContext';
import theme from './theme';

// Helper component to use hooks outside Router
function AppLayout() {
  const location = useLocation();
  const hideNavAndFooter = location.pathname.startsWith('/client/');

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      minHeight: '100vh',
      bgcolor: 'background.default'
    }}>
      {!hideNavAndFooter && <Navbar />}
      <Box component="main" sx={{ 
        flexGrow: 1,
        py: 3,
        px: { xs: 2, sm: 3, md: 4 }
      }}>
        <AppRoutes />
      </Box>
      {!hideNavAndFooter && <Footer />}
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <AppLayout />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
