// routes/invoices.js - Routes pour la gestion des factures
const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');
const logger = require('../utils/logger');

// GET /api/invoices - List all invoices with filtering (Admin/Reception)
router.get('/',
  authenticateToken,
  requireRole([ROLES.ADMIN, ROLES.RECEPTION]),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('clientId').optional().isInt({ min: 1 }).toInt(),
    query('status').optional().trim().escape(),
    query('dateFrom').optional().isISO8601(), // Issue date from
    query('dateTo').optional().isISO8601()    // Issue date to
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const offset = (page - 1) * limit;

    let sql = `SELECT i.*, u.email as client_email_display
               FROM invoices i
               LEFT JOIN users u ON i.client_id = u.id
               WHERE 1=1`;
    let countSql = `SELECT COUNT(*) as total FROM invoices i WHERE 1=1`;

    const params = [];
    const countParams = [];

    if (req.query.clientId) {
      sql += ' AND i.client_id = ?';
      countSql += ' AND i.client_id = ?';
      params.push(req.query.clientId);
      countParams.push(req.query.clientId);
    }
    if (req.query.status) {
      sql += ' AND i.status = ?';
      countSql += ' AND i.status = ?';
      params.push(req.query.status);
      countParams.push(req.query.status);
    }
    if (req.query.dateFrom) {
      sql += ' AND i.issue_date >= ?';
      countSql += ' AND i.issue_date >= ?';
      params.push(req.query.dateFrom);
      countParams.push(req.query.dateFrom);
    }
    if (req.query.dateTo) {
      sql += ' AND i.issue_date <= ?';
      countSql += ' AND i.issue_date <= ?';
      params.push(req.query.dateTo);
      countParams.push(req.query.dateTo);
    }

    sql += ' ORDER BY i.issue_date DESC, i.id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    try {
      const [invoices] = await db.execute(sql, params);
      const [countResult] = await db.execute(countSql, countParams);
      const totalItems = countResult[0].total;
      const totalPages = Math.ceil(totalItems / limit);

      res.json({
        invoices,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit
        }
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération des factures:', error);
      res.status(500).json({ error: 'Erreur interne du serveur.'});
    }
  }
);


// GET /api/invoices/:invoiceId - Get specific invoice details
router.get('/:invoiceId',
  authenticateToken,
  async (req, res) => {
    const { invoiceId } = req.params;
    try {
      const [invoices] = await db.execute(
        'SELECT * FROM invoices WHERE id = ?',
        [invoiceId]
      );

      if (invoices.length === 0) {
        return res.status(404).json({ error: 'Facture non trouvée.' });
      }
      const invoice = invoices[0];

      // Authorization: Admin/Reception can see any. Client can only see their own.
      const isAgent = req.user.role === ROLES.ADMIN || req.user.role === ROLES.RECEPTION;
      if (!isAgent && req.user.id !== invoice.client_id) {
        return res.status(403).json({ error: 'Accès non autorisé à cette facture.' });
      }

      const [items] = await db.execute(
        'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY item_type, description',
        [invoiceId]
      );
      invoice.items = items;

      res.json(invoice);

    } catch (error) {
      logger.error(`Erreur récupération facture ${invoiceId}:`, error);
      res.status(500).json({ error: 'Erreur interne du serveur.'});
    }
  }
);

// POST /api/invoices/:invoiceId/send-email - Send invoice via email
router.post('/:invoiceId/send-email',
  authenticateToken,
  requireRole([ROLES.ADMIN, ROLES.RECEPTION]),
  async (req, res) => {
    const { invoiceId } = req.params;
    // Basic implementation: Fetch invoice, send email with summary.
    // PDF generation and attachment is out of scope for this step.
    // Actual email sending utility is already mocked in tests.
    try {
        const [invoices] = await db.execute('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
        if (invoices.length === 0) {
            return res.status(404).json({ error: 'Facture non trouvée.' });
        }
        const invoice = invoices[0];

        const emailSubject = `Votre facture ${invoice.invoice_reference_number}`;
        const emailText = `
            <h1>Facture ${invoice.invoice_reference_number}</h1>
            <p>Bonjour ${invoice.client_name || 'Client'},</p>
            <p>Veuillez trouver ci-joint un récapitulatif de votre facture.</p>
            <p>Référence: ${invoice.invoice_reference_number}</p>
            <p>Date d'émission: ${invoice.issue_date}</p>
            <p>Montant total dû: ${invoice.total_amount_due} EUR</p>
            <p>Pour plus de détails, veuillez contacter l'hôtel.</p>
            <p>Cordialement,</p>
            <p>${invoice.hotel_name}</p>
        `;
        // In a real app, you'd use a proper email template (HTML)

        // Assuming sendEmail utility is available and imported
        // const { sendEmail } = require('../utils/email');
        // await sendEmail(invoice.client_email, emailSubject, emailText);

        logger.info(`Tentative d'envoi par e-mail de la facture ${invoice.invoice_reference_number} à ${invoice.client_email}`);
        res.json({ message: `La facture ${invoice.invoice_reference_number} serait envoyée à ${invoice.client_email}` });

    } catch (error) {
        logger.error(`Erreur envoi email pour facture ${invoiceId}:`, error);
        res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
  }
);

// GET /api/invoices/:invoiceId/download-pdf - Download invoice as PDF (stub)
router.get('/:invoiceId/download-pdf',
  authenticateToken, // Auth check for client vs agent similar to GET /:invoiceId
  async (req, res) => {
    const { invoiceId } = req.params;
     try {
        const [invoices] = await db.execute('SELECT client_id FROM invoices WHERE id = ?', [invoiceId]);
        if (invoices.length === 0) {
            return res.status(404).json({ error: 'Facture non trouvée pour le PDF.' });
        }
        const invoice = invoices[0];
        const isAgent = req.user.role === ROLES.ADMIN || req.user.role === ROLES.RECEPTION;
        if (!isAgent && req.user.id !== invoice.client_id) {
            return res.status(403).json({ error: 'Accès non autorisé à ce PDF de facture.' });
        }

        // PDF generation logic would go here. For now, a stub.
        logger.info(`Demande de téléchargement PDF pour la facture ${invoiceId}. Fonctionnalité non implémentée.`);
        res.status(501).json({ message: 'La génération de PDF n\'est pas encore implémentée.', invoiceId: invoiceId });

    } catch (error) {
        logger.error(`Erreur stub PDF pour facture ${invoiceId}:`, error);
        res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
  }
);


// The existing POST, PUT, DELETE, and GET /user/:userId routes from the stub
// are very basic and don't align with the new detailed schema or generation logic.
// They should ideally be removed or significantly refactored if similar functionality is needed.
// For now, I will leave them commented out or remove them to avoid conflict if they are not used.
// /*
// router.post('/', ...); // Old stub
// router.put('/:id', ...); // Old stub
// router.delete('/:id', ...); // Old stub
// router.get('/user/:userId', ...); // Old stub
// */

module.exports = router;