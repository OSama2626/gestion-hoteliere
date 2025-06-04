// middleware/auth.js - Middleware d'authentification
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { ROLES } = require('../utils/constants');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token d\'accès requis' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await db.execute(
      'SELECT id, email, role, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0 || !users[0].is_active) {
      return res.status(401).json({ error: 'Token invalide' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token invalide ou expiré' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }
    next();
  };
};

// Function to generate a JWT token
const generateToken = (userPayload) => {
  // Ensure userPayload contains id and role, or adjust as needed by your app's token claims
  return jwt.sign(
    { userId: userPayload.id, role: userPayload.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' } // Or your preferred expiration time
  );
};

module.exports = { authenticateToken, requireRole, generateToken };