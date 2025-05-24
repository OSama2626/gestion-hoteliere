// routes/users.js - Gestion des utilisateurs
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult, query } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Obtenir le profil utilisateur actuel
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.execute(
      `SELECT id, email, first_name, last_name, phone, user_type, company_name, 
       role, two_factor_enabled, created_at, updated_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json(users[0]);

  } catch (error) {
    logger.error('Erreur récupération profil:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Mettre à jour le profil
router.put('/profile', authenticateToken, [
  body('firstName').optional().trim().isLength({ min: 2 }),
  body('lastName').optional().trim().isLength({ min: 2 }),
  body('phone').optional().trim(),
  body('companyName').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, phone, companyName } = req.body;

    await db.execute(
      `UPDATE users SET 
       first_name = COALESCE(?, first_name),
       last_name = COALESCE(?, last_name),
       phone = COALESCE(?, phone),
       company_name = COALESCE(?, company_name),
       updated_at = NOW()
       WHERE id = ?`,
      [firstName, lastName, phone, companyName, req.user.id]
    );

    res.json({ message: 'Profil mis à jour avec succès' });

  } catch (error) {
    logger.error('Erreur mise à jour profil:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Changer le mot de passe
router.put('/change-password', authenticateToken, [
  body('currentPassword').exists(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const [users] = await db.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.id]
    );

    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await db.execute(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, req.user.id]
    );

    res.json({ message: 'Mot de passe changé avec succès' });

  } catch (error) {
    logger.error('Erreur changement mot de passe:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Lister tous les utilisateurs (admin seulement)
router.get('/', authenticateToken, requireRole(['admin']), [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('role').optional().isIn(['client', 'hotel_manager', 'admin']),
  query('search').optional().trim()
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { role, search } = req.query;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }

    if (search) {
      whereClause += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const [users] = await db.execute(
      `SELECT id, email, first_name, last_name, phone, user_type, company_name, 
       role, is_active, two_factor_enabled, created_at, updated_at
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );

    res.json({
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(countResult[0].total / limit),
        totalItems: countResult[0].total,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    logger.error('Erreur récupération utilisateurs:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Obtenir un utilisateur spécifique (admin seulement)
router.get('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const [users] = await db.execute(
      `SELECT id, email, first_name, last_name, phone, user_type, company_name, 
       role, is_active, two_factor_enabled, created_at, updated_at
       FROM users WHERE id = ?`,
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json(users[0]);

  } catch (error) {
    logger.error('Erreur récupération utilisateur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Activer/Désactiver un utilisateur (admin seulement)
router.patch('/:id/status', authenticateToken, requireRole(['admin']), [
  body('isActive').isBoolean()
], async (req, res) => {
  try {
    const { isActive } = req.body;

    await db.execute(
      'UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?',
      [isActive, req.params.id]
    );

    res.json({ message: `Utilisateur ${isActive ? 'activé' : 'désactivé'} avec succès` });

  } catch (error) {
    logger.error('Erreur changement statut utilisateur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Changer le rôle d'un utilisateur (admin seulement)
router.patch('/:id/role', authenticateToken, requireRole(['admin']), [
  body('role').isIn(['client', 'hotel_manager', 'admin'])
], async (req, res) => {
  try {
    const { role } = req.body;

    await db.execute(
      'UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?',
      [role, req.params.id]
    );

    res.json({ message: 'Rôle utilisateur mis à jour avec succès' });

  } catch (error) {
    logger.error('Erreur changement rôle utilisateur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Supprimer un utilisateur (admin seulement)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Vérifier s'il y a des réservations liées
    const [reservations] = await connection.execute(
      'SELECT COUNT(*) as count FROM reservations WHERE user_id = ?',
      [req.params.id]
    );

    if (reservations[0].count > 0) {
      return res.status(400).json({ 
        error: 'Impossible de supprimer un utilisateur avec des réservations' 
      });
    }

    await connection.execute(
      'DELETE FROM users WHERE id = ?',
      [req.params.id]
    );

    await connection.commit();
    res.json({ message: 'Utilisateur supprimé avec succès' });

  } catch (error) {
    await connection.rollback();
    logger.error('Erreur suppression utilisateur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  } finally {
    connection.release();
  }
});

module.exports = router;