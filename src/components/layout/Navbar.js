```javascript
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Adjusted path assuming AuthContext is in src/contexts

const Navbar = () => {
  const { isAuthenticated, user, logout, unreadNotificationsCount } = useAuth(); // Added unreadNotificationsCount
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect to login after logout
  };

  return (
    <nav>
      <ul>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/hotels">Hotels</Link></li>
        {isAuthenticated ? (
          <>
            {user && user.role === 'admin' && (
              <li><Link to="/admin/dashboard">Admin Dashboard</Link></li>
            )}
            {user && user.role === 'reception' && (
              <li><Link to="/reception/dashboard">Reception Dashboard</Link></li>
            )}
            {user && (user.role === 'user' || user.role === 'admin' || user.role === 'reception') && (
              <li><Link to="/client/profile">Profile</Link></li>
            )}
            {user && (user.role === 'user' || user.role === 'admin') && ( // Assuming only users and admins can see "My Reservations"
              <li><Link to="/client/reservations">My Reservations</Link></li>
            )}
            {user && (user.role === 'user' || user.role === 'admin' || user.role === 'reception') && ( // All logged-in users can see notifications
              <li>
                <Link to="/notifications">
                  Notifications {unreadNotificationsCount > 0 && `(${unreadNotificationsCount})`}
                </Link>
              </li>
            )}
            {user && (user.role === 'user' || user.role === 'admin') && ( // Assuming only users and admins can submit feedback
              <li><Link to="/feedback">Submit Feedback</Link></li>
            )}
            <li><button onClick={handleLogout}>Logout ({user ? user.name : ''})</button></li>
          </>
        ) : (
          <>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/signup">Sign Up</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
```
