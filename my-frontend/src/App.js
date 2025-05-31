import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './routes';
import Navbar from './components/layout/Navbar'; // Placeholder
import Footer from './components/layout/Footer'; // Placeholder
// import { ThemeProvider } from './theme'; // If using a theme
import { AuthProvider } from './store/contexts/AuthContext';

function App() {
  return (
    <AuthProvider> {/* Wrap with AuthProvider */}
      {/* <ThemeProvider> // If using a theme */}
      <Router>
        <Navbar />
        <div className="main-content"> {/* Optional: for styling */}
          <AppRoutes />
        </div>
        <Footer />
      </Router>
      {/* </ThemeProvider> */}
    </AuthProvider>
  );
}
export default App;
