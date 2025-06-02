const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');
const { ROLES } = require('../utils/constants'); // Added ROLES

const logger = require('../utils/logger');

const router = express.Router();

// Inscription client
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 2 }),
  body('lastName').trim().isLength({ min: 2 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors during registration:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    let { email, password, firstName, lastName, phone, userType, companyName } = req.body;

    // Defensive: set defaults for optional fields
    phone = phone || null;
    userType = userType || 'individual';
    companyName = companyName || null;

    // Defensive: check ROLES.CLIENT exists
    if (!ROLES || !ROLES.CLIENT) {
      logger.error('ROLES.CLIENT is undefined. Check your utils/constants.js!');
      return res.status(500).json({ error: 'Role configuration error.' });
    }

    logger.info('Attempting registration with:', { email, firstName, lastName, phone, userType, companyName, role: ROLES.CLIENT });

    const [existingUsers] = await db.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      logger.warn('Attempted registration with existing email:', email);
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await db.execute(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, user_type, company_name, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [email, hashedPassword, firstName, lastName, phone, userType, companyName, ROLES.CLIENT]
    );

    try {
      await sendEmail(email, 'Bienvenue !', 'Votre compte a été créé avec succès.');
    } catch (mailErr) {
      logger.error('Erreur lors de l\'envoi du mail:', mailErr);
      // Don't fail registration if email fails; just log it
    }

    logger.info(`Nouvel utilisateur enregistré: ${email} (ID: ${result.insertId})`);
    res.status(201).json({ message: 'Compte créé avec succès', userId: result.insertId });

  } catch (error) {
    logger.error('Erreur lors de l\'inscription:', error.stack || error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});


// Vérification 2FA
router.post('/verify-2fa', [
  body('userId').isInt(),
  body('token').isLength({ min: 6, max: 6 })
], async (req, res) => {
  try {
    const { userId, token } = req.body;

    const [users] = await db.execute(
      'SELECT * FROM users WHERE id = ? AND two_factor_enabled = TRUE',
      [userId]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'Utilisateur non trouvé' });
    }

    const user = users[0];
    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(401).json({ error: 'Code 2FA invalide' });
    }

    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password_hash, two_factor_secret, ...userInfo } = user;
    
    res.json({ 
      token: jwtToken, 
      user: userInfo,
      message: 'Connexion 2FA réussie'
    });

  } catch (error) {
    logger.error('Erreur vérification 2FA:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Configuration 2FA
router.post('/setup-2fa', authenticateToken, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `Hotel Management (${req.user.email})`,
      length: 32
    });

    await db.execute(
      'UPDATE users SET two_factor_secret = ? WHERE id = ?',
      [secret.base32, req.user.id]
    );

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl
    });

  } catch (error) {
    logger.error('Erreur setup 2FA:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Activation 2FA
router.post('/enable-2fa', authenticateToken, [
  body('token').isLength({ min: 6, max: 6 })
], async (req, res) => {
  try {
    const { token } = req.body;

    const [users] = await db.execute(
      'SELECT two_factor_secret FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'Secret 2FA non trouvé' });
    }

    const verified = speakeasy.totp.verify({
      secret: users[0].two_factor_secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(401).json({ error: 'Code 2FA invalide' });
    }

    await db.execute(
      'UPDATE users SET two_factor_enabled = TRUE WHERE id = ?',
      [req.user.id]
    );

    res.json({ message: '2FA activé avec succès' });

  } catch (error) {
    logger.error('Erreur activation 2FA:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Désactiver 2FA
router.post('/disable-2fa', authenticateToken, [
  body('token').isLength({ min: 6, max: 6 })
], async (req, res) => {
  try {
    const { token } = req.body;

    const [users] = await db.execute(
      'SELECT two_factor_secret FROM users WHERE id = ?',
      [req.user.id]
    );

    const verified = speakeasy.totp.verify({
      secret: users[0].two_factor_secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(401).json({ error: 'Code 2FA invalide' });
    }

    await db.execute(
      'UPDATE users SET two_factor_enabled = FALSE, two_factor_secret = NULL WHERE id = ?',
      [req.user.id]
    );

    res.json({ message: '2FA désactivé avec succès' });

  } catch (error) {
    logger.error('Erreur désactivation 2FA:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Mot de passe oublié
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const { email } = req.body;

    const [users] = await db.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      // Ne pas révéler si l'email existe ou non
      return res.json({ message: 'Si l\'email existe, un lien de réinitialisation a été envoyé' });
    }

    const resetToken = jwt.sign(
      { userId: users[0].id, type: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    await sendEmail(
      email,
      'Réinitialisation de mot de passe',
      `Cliquez sur ce lien pour réinitialiser votre mot de passe: ${resetLink}`
    );

    res.json({ message: 'Si l\'email existe, un lien de réinitialisation a été envoyé' });

  } catch (error) {
    logger.error('Erreur mot de passe oublié:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Réinitialiser mot de passe
router.post('/reset-password', [
  body('token').exists(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const { token, password } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ error: 'Token invalide' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await db.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hashedPassword, decoded.userId]
    );

    res.json({ message: 'Mot de passe réinitialisé avec succès' });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'Token expiré' });
    }
    logger.error('Erreur réinitialisation mot de passe:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Déconnexion (optionnel - pour blacklister le token)
router.post('/logout', authenticateToken, (req, res) => {
  // Dans une implémentation complète, on pourrait ajouter le token à une blacklist
  res.json({ message: 'Déconnexion réussie' });
});

module.exports = router;