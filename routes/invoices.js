const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { ROLES } = require('../utils/constants'); // Added ROLES
const logger = require('../utils/logger');
const { param, query, validationResult } = require('express-validator');

// GET / (List Invoices - User/Admin)
router.get('/',
  [
    authenticateToken,
    query('page').optional().isInt({ min: 1 }).toInt().withMessage('Page must be a positive integer.'),
    query('limit').optional().isInt({ min: 1 }).toInt().withMessage('Limit must be a positive integer.'),
    query('user_id').optional().isInt().toInt().withMessage('User ID must be an integer.'), // Admin only
    query('status').optional().isString().trim().escape()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const offset = (page - 1) * limit;

    const { id: currentUserId, role: currentUserRole } = req.user;
    let { user_id: filterUserId, status: filterStatus } = req.query;

    let sql = `
      SELECT i.*, u.username as user_username, u.email as user_email, r.id as reservation_reference
      FROM invoices i
      JOIN users u ON i.user_id = u.id
      JOIN reservations r ON i.reservation_id = r.id
    `;
    const params = [];
    const countParams = [];
    let whereClauses = [];

    if (currentUserRole !== ROLES.ADMIN) { // Used ROLES.ADMIN
      whereClauses.push('i.user_id = ?');
      params.push(currentUserId);
      countParams.push(currentUserId);
    } else {
      if (filterUserId) {
        whereClauses.push('i.user_id = ?');
        params.push(filterUserId);
        countParams.push(filterUserId);
      }
    }

    if (filterStatus) {
      whereClauses.push('i.status = ?');
      params.push(filterStatus);
      countParams.push(filterStatus);
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    sql += ' ORDER BY i.generated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const countSql = `SELECT COUNT(*) as total FROM invoices i ${whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''}`;


    try {
      const [invoices] = await db.promise().query(sql, params);
      const [countResult] = await db.promise().query(countSql, countParams);
      const totalInvoices = countResult[0].total;

      res.status(200).json({
        data: invoices,
        pagination: {
          total: totalInvoices,
          page,
          limit,
          totalPages: Math.ceil(totalInvoices / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching invoices:', error);
      res.status(500).json({ message: 'Error fetching invoices' });
    }
  }
);

// PUT /:invoiceId/status (Update Invoice Status - Admin/Manager)
router.put('/:invoiceId/status',
  [
    authenticateToken,
    requireRole([ROLES.ADMIN, ROLES.HOTEL_MANAGER]), // Used ROLES.ADMIN, ROLES.HOTEL_MANAGER
    param('invoiceId').isInt().withMessage('Invoice ID must be an integer.'),
    body('status').notEmpty().isIn(['pending', 'paid', 'overdue', 'cancelled']).withMessage('Invalid or missing status. Must be one of: pending, paid, overdue, cancelled.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { invoiceId } = req.params;
    const { status } = req.body;

    try {
      // Check if invoice exists first
      const [invoiceCheck] = await db.promise().query('SELECT id FROM invoices WHERE id = ?', [invoiceId]);
      if (invoiceCheck.length === 0) {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      const [result] = await db.promise().query(
        'UPDATE invoices SET status = ? WHERE id = ?',
        [status, invoiceId]
      );

      if (result.affectedRows === 0) {
        // Should ideally be caught by the check above, but as a safeguard
        return res.status(404).json({ message: 'Invoice not found or status not changed' });
      }

      // Retrieve the updated invoice to send back
      const [updatedInvoice] = await db.promise().query(
        `SELECT i.*, u.username as user_username, u.email as user_email, r.id as reservation_reference
         FROM invoices i
         JOIN users u ON i.user_id = u.id
         JOIN reservations r ON i.reservation_id = r.id
         WHERE i.id = ?`,
        [invoiceId]
      );
      
      res.status(200).json(updatedInvoice[0]);
    } catch (error) {
      logger.error(`Error updating status for invoice ${invoiceId}:`, error);
      res.status(500).json({ message: 'Error updating invoice status' });
    }
  }
);

// GET /:invoiceId (Get Specific Invoice)
router.get('/:invoiceId',
  [
    authenticateToken,
    param('invoiceId').isInt().withMessage('Invoice ID must be an integer.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { invoiceId } = req.params;
    const { id: currentUserId, role: currentUserRole } = req.user;

    let sql = `
      SELECT i.*, u.username as user_username, u.email as user_email, r.id as reservation_reference
      FROM invoices i
      JOIN users u ON i.user_id = u.id
      JOIN reservations r ON i.reservation_id = r.id
      WHERE i.id = ?
    `;
    const params = [invoiceId];

    try {
      const [invoices] = await db.promise().query(sql, params);

      if (invoices.length === 0) {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      const invoice = invoices[0];

      // If user is not admin, check if the invoice belongs to them
      if (currentUserRole !== ROLES.ADMIN && invoice.user_id !== currentUserId) { // Used ROLES.ADMIN
        return res.status(403).json({ message: 'Forbidden: You do not have access to this invoice.' });
      }

      // Concept: If itemization is needed, a separate query for invoice_items would go here
      // const [items] = await db.promise().query('SELECT * FROM invoice_items WHERE invoice_id = ?', [invoiceId]);
      // invoice.items = items;

      res.status(200).json(invoice);
    } catch (error) {
      logger.error(`Error fetching invoice ${invoiceId}:`, error);
      res.status(500).json({ message: 'Error fetching invoice' });
    }
  }
);

module.exports = router;
