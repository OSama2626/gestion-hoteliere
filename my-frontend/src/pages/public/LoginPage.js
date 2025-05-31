import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/contexts/AuthContext';
import { login as loginService } from '../../services/authService';
import Input from '../../components/common/forms/Input'; // Assuming this path is correct
import Button from '../../components/common/forms/Button'; // Assuming this path is correct

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login: authLogin, user: authUser } = useAuth(); // Get user from auth to check role
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { token, user } = await loginService(email, password);
      authLogin(user, token); // Update AuthContext

      // Redirect based on user role or to intended page
      const from = location.state?.from?.pathname || getDefaultPathForRole(user.role);
      console.log(`Login successful, navigating to: ${from} (user role: ${user.role})`);
      navigate(from, { replace: true });

    } catch (err) {
      setError(err.message || 'Failed to login');
      console.error("Login error:", err);
    }
  };

  const getDefaultPathForRole = (role) => {
    switch (role) {
      case 'admin':
        return '/admin/dashboard';
      case 'reception':
        return '/reception/dashboard';
      case 'client':
      default:
        return '/client/dashboard';
    }
  };

  // If user is already logged in, redirect them
  if (authUser) {
    const defaultPath = getDefaultPathForRole(authUser.role);
    console.log(`User already logged in, redirecting from Login page to ${defaultPath}`);
    return <Navigate to={defaultPath} replace />;
   }


  return (
    <div>
      <h1>Login Page</h1>
      <form onSubmit={handleSubmit}>
        <Input
          label="Email"
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <Button type="submit">Login</Button>
      </form>
    </div>
  );
};
export default LoginPage;
