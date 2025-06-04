import React, { useState } from 'react';
import { Link as RouterLink, useNavigate, Navigate } from 'react-router-dom';
import {
  TextField,
  Button,
  Typography,
  Link,
  Box,
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  useTheme,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import PhoneIcon from '@mui/icons-material/Phone';
import { useAuth } from '../../store/contexts/AuthContext';
import { signup as signupService } from '../../services/authService';
import FormContainer from '../../components/common/FormContainer';

const SignupPage = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [userType, setUserType] = useState('individual');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signup: authSignup, user: authUser } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

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
    try {
      const data = await signupService(signupData);
      navigate('/client/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to signup');
    }
  };

  if (authUser) {
    const defaultPath = authUser.role === 'admin' ? '/admin/dashboard' :
                        authUser.role === 'reception' ? '/reception/dashboard' :
                        '/client/dashboard';
    return <Navigate to={defaultPath} replace />;
  }

  return (
    <FormContainer>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Create Account
      </Typography>
      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
        Sign up to get started with your hotel experience
      </Typography>
      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="First Name"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Last Name"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <TextField
          label="Phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          fullWidth
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PhoneIcon />
              </InputAdornment>
            ),
          }}
        />
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="userType-label">User Type</InputLabel>
          <Select
            labelId="userType-label"
            id="userType"
            value={userType}
            label="User Type"
            onChange={(e) => setUserType(e.target.value)}
            required
          >
            <MenuItem value="individual">
              <PersonIcon sx={{ mr: 1 }} /> Individual
            </MenuItem>
            <MenuItem value="company">
              <BusinessIcon sx={{ mr: 1 }} /> Company
            </MenuItem>
          </Select>
        </FormControl>
        {userType === 'company' && (
          <TextField
            label="Company Name"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            fullWidth
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <BusinessIcon />
                </InputAdornment>
              ),
            }}
          />
        )}
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          fullWidth
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailIcon />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          fullWidth
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon />
              </InputAdornment>
            ),
          }}
        />
        {error && (
          <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>
            {error}
          </Typography>
        )}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          sx={{ mb: 2, py: 1.5, fontWeight: 600, fontSize: '1.1rem' }}
        >
          Sign Up
        </Button>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" color="primary">
              Sign in
            </Link>
          </Typography>
        </Box>
      </form>
    </FormContainer>
  );
};
export default SignupPage;
