```javascript
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserProfile } from '../../services/authService'; // Adjust path as needed

const ProfilePage = () => {
  const { currentUser, updateUser, loading: authLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
    }
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (password && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const updatedData = { name };
    if (password) {
      updatedData.password = password;
    }

    try {
      await updateUser(updatedData); // updateUser now calls apiUpdateUserProfile
      setMessage('Profile updated successfully!');
      setPassword(''); // Clear password fields after successful update
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    }
  };

  if (authLoading) {
    return <p>Loading profile...</p>;
  }

  if (!currentUser) {
    return <p>Please log in to view your profile.</p>;
  }

  return (
    <div>
      <h2>User Profile</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            disabled // Email is usually not changeable
          />
        </div>
        <div>
          <label htmlFor="password">New Password (leave blank to keep current):</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="confirmPassword">Confirm New Password:</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {message && <p style={{ color: 'green' }}>{message}</p>}
        <button type="submit">Update Profile</button>
      </form>
    </div>
  );
};

export default ProfilePage;
```
