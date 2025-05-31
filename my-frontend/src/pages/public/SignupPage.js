import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../store/contexts/AuthContext';
import { signup as signupService } from '../../services/authService';
import Input from '../../components/common/forms/Input'; // Assuming this path is correct
import Button from '../../components/common/forms/Button'; // Assuming this path is correct

const SignupPage = () => {
  const [name, setName] = useState(''); // Added name state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signup: authSignup, user: authUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    console.log(`Signup attempt with name: ${name}, email: ${email}`);
    try {
      const { token, user } = await signupService(email, password, name); // Pass name
      authSignup(user, token); // user from service now includes name and role

      console.log(`Signup successful, user data from service:`, user);
      console.log(`Navigating to /client/dashboard (user role: ${user.role})`);
      navigate('/client/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to signup');
      console.error("Signup error:", err);
    }
  };

  // If user is already logged in, redirect them from Signup page
  if (authUser) {
    const defaultPath = authUser.role === 'admin' ? '/admin/dashboard' :
                        authUser.role === 'reception' ? '/reception/dashboard' :
                        '/client/dashboard';
    console.log(`User already logged in (${authUser.email}), redirecting from Signup page to ${defaultPath}`);
    return <Navigate to={defaultPath} replace />;
  }

  return (
    <div>
      <h1>Signup Page</h1>
      <form onSubmit={handleSubmit}>
        <Input
          label="Name" // Added Name field
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
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
        {/*
        <Input label="Confirm Password" type="password" id="confirmPassword" ... />
        */}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <Button type="submit">Signup</Button>
      </form>
    </div>
  );
};
export default SignupPage;
