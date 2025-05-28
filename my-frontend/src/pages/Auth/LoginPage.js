import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import '../../styles/auth.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    try {
      const result = await login({ email, password });
      if (result.success) {
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true }); 
      } else if (result.requiresTwoFactor) {
        navigate(`/verify-2fa?userId=${result.userId}`);
      }
    } catch (err) {
      setError(err.error || err.message || 'Failed to login.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h2>Connexion</h2>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}
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
          <button type="submit" disabled={isLoading} className="auth-button">
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <div className="auth-links">
          <Link to="/forgot-password" className="auth-link">Mot de passe oublié ?</Link>
          <Link to="/register" className="auth-link">Créer un compte</Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;