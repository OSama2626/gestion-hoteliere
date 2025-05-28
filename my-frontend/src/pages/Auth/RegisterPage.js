import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import '../../styles/auth.css';

// Basic inline styles (can be shared or use a UI library)
const styles = { /* ... same style object as in LoginPage.js, or your preferred styling ... */ };

function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [userType, setUserType] = useState('individual');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    try {
      const userData = { firstName, lastName, email, password, phone, userType, companyName };
      const result = await register(userData);
      if (result.success) {
        setMessage(result.message || 'Inscription réussie ! Veuillez vous connecter.');
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      const backendError = err.response?.data?.error;
      setError(backendError || err.message || "Échec de l'inscription.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h2>Inscription</h2>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}
          
          <div className="form-group">
            <input 
              type="text" 
              placeholder="Prénom" 
              value={firstName} 
              onChange={(e) => setFirstName(e.target.value)} 
              className="auth-input"
              required 
            />
          </div>
          
          <div className="form-group">
            <input 
              type="text" 
              placeholder="Nom" 
              value={lastName} 
              onChange={(e) => setLastName(e.target.value)} 
              className="auth-input"
              required 
            />
          </div>
          
          <div className="form-group">
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="auth-input"
              required 
            />
          </div>
          
          <div className="form-group">
            <input 
              type="password" 
              placeholder="Mot de passe" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="auth-input"
              required 
            />
          </div>
          
          <div className="form-group">
            <input 
              type="password" 
              placeholder="Confirmer le mot de passe" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              className="auth-input"
              required 
            />
          </div>
          
          <div className="form-group">
            <input 
              type="tel" 
              placeholder="Téléphone (optionnel)" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              className="auth-input"
            />
          </div>
          
          <div className="form-group">
            <select 
              value={userType} 
              onChange={e => setUserType(e.target.value)}
              className="auth-select"
            >
              <option value="individual">Particulier</option>
              <option value="company">Entreprise</option>
            </select>
          </div>
          
          {userType === 'company' && (
            <div className="form-group">
              <input 
                type="text" 
                placeholder="Nom de l'entreprise" 
                value={companyName} 
                onChange={e => setCompanyName(e.target.value)}
                className="auth-input" 
              />
            </div>
          )}
          
          <button type="submit" disabled={isLoading} className="auth-button">
            {isLoading ? 'Inscription en cours...' : "S'inscrire"}
          </button>
        </form>
        
        <div className="auth-links">
          <Link to="/login" className="auth-link">Déjà un compte ? Connectez-vous</Link>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;