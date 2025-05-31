import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/contexts/AuthContext';
import { updateUserProfile } from '../../services/authService';
import { Link } from 'react-router-dom';

const ProfilePage = () => {
  const { user, isAuthenticated, loading: authLoading, updateUserInContext } = useAuth();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || ''); // Initialize name from context user object
      console.log("ProfilePage: User data loaded into form state:", user);
    }
  }, [user]); // Effect runs when user object from context changes

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!user || !user.id) {
        setError("User data not available. Cannot update profile.");
        return;
    }

    setIsSubmitting(true);
    const profileData = { name };
    if (password) { // Only include password if user entered something
      profileData.password = password;
    }
    console.log("ProfilePage: Submitting profile update for user ID:", user.id, "with data:", profileData);

    try {
      const { user: updatedUser } = await updateUserProfile(user.id, profileData);
      updateUserInContext(updatedUser); // Update user in AuthContext and localStorage
      setMessage('Profile updated successfully!');
      console.log("ProfilePage: Profile update successful. New user data:", updatedUser);
      setPassword(''); // Clear password fields after successful update
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
      console.error("ProfilePage: Error updating profile:", err);
    }
    setIsSubmitting(false);
  };

  if (authLoading) {
    return <p>Loading user information...</p>;
  }

  if (!isAuthenticated || !user) {
    return (
      <div>
        <h1>My Profile</h1>
        <p>Please <Link to="/login">login</Link> to view your profile.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>My Profile</h1>
      <p><strong>Email:</strong> {user.email} (Cannot be changed)</p>

      {message && <p style={{ color: 'green', fontWeight: 'bold' }}>{message}</p>}
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '5px', maxWidth: '400px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="password">New Password (leave blank to keep current):</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            autoComplete="new-password"
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="confirmPassword">Confirm New Password:</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isSubmitting}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            autoComplete="new-password"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {isSubmitting ? 'Updating...' : 'Update Profile'}
        </button>
      </form>
    </div>
  );
};

export default ProfilePage;
