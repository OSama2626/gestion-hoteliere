import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../store/contexts/AuthContext';
import { signup as signupService } from '../../services/authService';
import Input from '../../components/common/forms/Input'; // Assuming this path is correct
import Button from '../../components/common/forms/Button'; // Assuming this path is correct

const SignupPage = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [userType, setUserType] = useState('individual'); // Default to 'individual'
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signup: authSignup, user: authUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const signupData = {
      email,
      password,
      firstName,
      lastName,
      phone,
      userType,
    };
    if (userType === 'company') {
      signupData.companyName = companyName;
    }
    console.log(`Signup attempt with data:`, signupData);
    try {
      // Adapt the call to signupService to pass an object.
      // The actual modification of signupService to accept this object will be a separate step.
      const data = await signupService(signupData);
      // Optionally, you could add user info here if your backend returns it
      // For now, just redirect after success
      console.log(`Signup successful, userId from service:`, data.userId);
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
          label="First Name"
          type="text"
          id="firstName"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />
        <Input
          label="Last Name"
          type="text"
          id="lastName"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
        <Input
          label="Phone"
          type="tel"
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <div>
          <label htmlFor="userType">User Type:</label>
          <select
            id="userType"
            value={userType}
            onChange={(e) => setUserType(e.target.value)}
            required
          >
            <option value="individual">Individual</option>
            <option value="company">Company</option>
          </select>
        </div>
        {userType === 'company' && (
          <Input
            label="Company Name"
            type="text"
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />
        )}
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
