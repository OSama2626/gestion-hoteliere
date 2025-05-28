import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext'; // Adjust path if needed
import axiosInstance from '../../api/axiosInstance';
import { Link } from 'react-router-dom'; // For placeholder links


// Basic inline styles (same as LoginPage or your preferred styling)
const styles = { /* ... styles from the previous full UserProfilePage.js code ... */ };

function UserProfilePage() {
  const { user, isLoading: authLoading, fetchUserProfile } = useAuth();
  const [formData, setFormData] = useState({ firstName: '', lastName: '', phone: '', companyName: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        phone: user.phone || '',
        companyName: user.company_name || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setMessage(''); setIsSaving(true);
    const profileData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        companyName: formData.companyName
    };
    try {
      const response = await axiosInstance.put('/users/profile', profileData);
      setMessage(response.data.message || 'Profile updated!');
      await fetchUserProfile(); // Refresh user data in AuthContext
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Update failed.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || !user) return <div>Loading profile...</div>;

  return (
    <div /* style={styles.container} */> {/* Apply styles if included */}
      <h2>User Profile</h2>
      {error && <p /* style={styles.error} */>{error}</p>}
      {message && <p /* style={styles.message} */>{message}</p>}
      
      <div /* style={styles.formGroup} */>
        <label /* style={styles.label} */>Email:</label>
        <div /* style={styles.readOnlyValue} */>{user.email}</div>
      </div>

      <form onSubmit={handleSubmit}>
        {Object.keys(formData).map((key) => (
          <div key={key} /* style={styles.formGroup} */>
            <label htmlFor={key} /* style={styles.label} */>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</label>
            {isEditing ? (
              <input type={key === 'phone' ? 'tel' : 'text'} id={key} name={key} value={formData[key]} onChange={handleChange} /* style={styles.input} */ />
            ) : (
              <div /* style={styles.readOnlyValue} */>{formData[key] || '(not set)'}</div>
            )}
          </div>
        ))}

        {isEditing ? (
          <>
            <button type="submit" disabled={isSaving} /* style={styles.button} */>
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
            <button type="button" onClick={() => { setIsEditing(false); /* Reset form if needed */ }} disabled={isSaving} /* style={{...styles.button, ...}} */>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setIsEditing(true)} /* style={styles.button} */>
            Edit Profile
          </button>
        )}
      </form>
      {/* Placeholder links for future features */}
      <div style={{marginTop: '20px'}}>
        <Link to="/change-password">Change Password</Link><br/>
        <Link to="/manage-2fa">Manage 2FA</Link>
      </div>
    </div>
  );
}
export default UserProfilePage;