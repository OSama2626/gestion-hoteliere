import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import ProtectedRoute from './utils/ProtectedRoute';
import UserProfilePage from './pages/User/UserProfilePage';

// Placeholders - create actual files for these later in src/pages/
const HomePage = () => <div><h1>Home</h1></div>;
const ClientDashboardPage = () => { const {user} = useAuth(); return <div><h1>Client Dashboard</h1><p>Hi, {user?.email}</p></div>; };
const NotFoundPage = () => <div><h1>404 Not Found</h1></div>;

const appStyles = { nav: { padding: '10px', backgroundColor: '#f0f0f0', display: 'flex', gap: '10px' } };

function App() {
  const { isAuthenticated, logout, isLoading, user } = useAuth();
  if (isLoading) return <div>Loading...</div>;

  return (
    <Router>
      <div>
        <nav style={appStyles.nav}>
          <Link to="/">Home</Link>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/profile">Profile</Link>
              <button onClick={logout}>Logout ({user?.email})</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><ClientDashboardPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </Router>
  );
}
export default App;