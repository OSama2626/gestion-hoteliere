import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/contexts/AuthContext';

const Navbar = () => {
  const { isAuthenticated, logout, user, unreadNotificationsCount } = useAuth(); // Added unreadNotificationsCount
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav>
      <ul>
        <li><Link to="/">Home</Link></li>
        {!isAuthenticated ? (
          <>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/signup">Signup</Link></li>
          </>
        ) : (
          <>
            {/* Role-based navigation example */}
            {user?.role === 'client' && (
              <>
                <li><Link to="/client/dashboard">Dashboard</Link></li>
                <li><Link to="/client/reservations">My Reservations</Link></li>
                <li><Link to="/client/profile">Profile</Link></li>
                <li>
                  <Link to="/client/notifications">
                    Notifications {unreadNotificationsCount > 0 && `(${unreadNotificationsCount})`}
                  </Link>
                </li>
                 <li><Link to="/client/feedback">Submit Feedback</Link></li>
              </>
            )}
            {/* Reception Specific Nav */}
            {user?.role === 'reception' && (
              <>
                <li><Link to="/reception/dashboard">Reception Hub</Link></li>
                {/* Key reception tasks might be directly linked here too if very common */}
              </>
            )}
            {/* Admin Specific Nav */}
            {user?.role === 'admin' && (
              <>
                <li><Link to="/admin/dashboard">Admin Hub</Link></li>
                 {/* Key admin tasks might be directly linked here too */}
              </>
            )}
            <li><button onClick={handleLogout}>Logout</button></li>
          </>
        )}
        <li><Link to="/hotels">Hotels</Link></li>
        <li><Link to="/book-room">Book a Room</Link></li>

        {/* For broad testing, keeping these visible. Refine if they should be role-specific */}
        {!isAuthenticated && ( // Only show these if not logged in, or adjust based on roles
            <>
             {/* Example: Maybe Admin and Reception links are always visible for quick access in dev, or hide them */}
            </>
        )}
         {/* Simplified: Show all main dashboards for testing if NOT authenticated, or adjust if user has NO role */}
         {/* This section can be removed if role-based links above are sufficient */}
        {!user && (
            <>
                <li><Link to="/admin/dashboard">Admin (Test)</Link></li>
                <li><Link to="/reception/dashboard">Reception (Test)</Link></li>
            </>
        )}


      </ul>
      {isAuthenticated && user && <span>Welcome, {user.email}! (Role: {user.role})</span>}
    </nav>
  );
};
export default Navbar;
