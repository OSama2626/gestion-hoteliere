const express = require('express');
const { body, validationResult, query } = require('express-validator');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid'); // Consider if still needed if ref_number is different
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');
const { sendEmail } = require('../utils/email');
const logger = require('../utils/logger');

const router = express.Router();


// Helper function to check user existence and role (can be expanded)
async function findClientById(userId) {
  const [users] = await db.execute('SELECT id, email, role FROM users WHERE id = ?', [userId]);
  if (users.length === 0) {
    return null;
  }
  if (users[0].role !== ROLES.CLIENT) {
    // Or throw an error, or return a specific status
    return { error: 'User is not a client', user: users[0] };
  }
  return users[0];
}


// Add this after your existing router definitions, but before module.exports

// Fetch reservations for the current authenticated user
router.get('/my-reservations', authenticateToken, async (req, res) => {
  try {
    // Replace this query with your actual reservation table/fields as needed
    const [reservations] = await db.execute(
      `SELECT r.*, h.name AS hotel_name 
       FROM reservations r
       JOIN hotels h ON r.hotel_id = h.id
       WHERE r.user_id = ?
       ORDER BY r.check_in_date DESC`,
      [req.user.id]
    );

    res.json(reservations);
  } catch (error) {
    logger.error('Erreur récupération réservations:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});
// Créer une réservation
router.post('/', authenticateToken, [
  body('hotelId').isInt({ min: 1 }),
  body('checkInDate').isISO8601(),
  body('checkOutDate').isISO8601(),
  body('rooms').isArray({ min: 1 }),
  body('rooms.*.roomTypeId').isInt({ min: 1 }),
  body('rooms.*.quantity').isInt({ min: 1 })
], async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { hotelId, checkInDate, checkOutDate, rooms, specialRequests } = req.body;
    const userId = req.user.id;

    const checkIn = moment(checkInDate);
    const checkOut = moment(checkOutDate);

    if (!checkIn.isValid() || !checkOut.isValid()) {
      return res.status(400).json({ error: 'Dates invalides' });
    }

    if (checkOut.isSameOrBefore(checkIn)) {
      return res.status(400).json({ error: 'La date de départ doit être après la date d\'arrivée' });
    }

    if (checkIn.isBefore(moment(), 'day')) {
      return res.status(400).json({ error: 'Impossible de réserver dans le passé' });
    }

    const totalNights = checkOut.diff(checkIn, 'days');
    let totalAmount = 0;
    let availabilityChecks = [];

    for (const roomReq of rooms) {
      const [availableRooms] = await connection.execute(`
        SELECT r.id, rt.name, rr.base_price 
        FROM rooms r
        JOIN room_types rt ON r.room_type_id = rt.id
        LEFT JOIN room_rates rr ON rr.hotel_id = r.hotel_id AND rr.room_type_id = rt.id
        WHERE r.hotel_id = ? AND r.room_type_id = ? AND r.is_available = TRUE
        AND r.id NOT IN (
          SELECT DISTINCT rroom.room_id
          FROM reservation_rooms rroom
          JOIN reservations res ON rroom.reservation_id = res.id
          WHERE res.hotel_id = ?
          AND res.status IN ('confirmed', 'checked_in')
          AND NOT (res.check_out_date <= ? OR res.check_in_date >= ?)
        )
        LIMIT ?
      `, [hotelId, roomReq.roomTypeId, hotelId, checkInDate, checkOutDate, roomReq.quantity]);

      if (availableRooms.length < roomReq.quantity) {
        await connection.rollback();
        return res.status(400).json({
          error: `Pas assez de chambres disponibles pour le type ${roomReq.roomTypeId}`
        });
      }

      availabilityChecks.push({
        roomTypeId: roomReq.roomTypeId,
        rooms: availableRooms.slice(0, roomReq.quantity),
        quantity: roomReq.quantity
      });

      const roomPrice = availableRooms[0].base_price || 100;
      totalAmount += roomPrice * roomReq.quantity * totalNights;
    }

    const referenceNumber = `HTL${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const [reservationResult] = await connection.execute(
      `INSERT INTO reservations (reference_number, user_id, hotel_id, check_in_date, check_out_date, total_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, 'confirmed')`,
      [referenceNumber, userId, hotelId, checkInDate, checkOutDate, totalAmount]
    );

    const reservationId = reservationResult.insertId;

    for (const roomGroup of availabilityChecks) {
      for (const room of roomGroup.rooms) {
        await connection.execute(
          'INSERT INTO reservation_rooms (reservation_id, room_id, room_type_id, rate_per_night) VALUES (?, ?, ?, ?)',
          [reservationId, room.id, roomGroup.roomTypeId, room.base_price || 100]
        );
      }
    }

    if (specialRequests && Array.isArray(specialRequests) && specialRequests.length > 0) {
      for (const request of specialRequests) {
        await connection.execute(
          'INSERT INTO special_requests (reservation_id, request_text) VALUES (?, ?)',
          [reservationId, request]
        );
      }
    }

    await connection.commit();

    const emailContent = `
      <h1>Confirmation de réservation</h1>
      <p>Votre réservation ${referenceNumber} a été confirmée.</p>
      <p>Dates: ${moment(checkInDate).format('LL')} - ${moment(checkOutDate).format('LL')}</p>
      <p>Total: €${totalAmount.toFixed(2)}</p>
      <p>Merci pour votre confiance !</p>
    `;

    try {
      await sendEmail(req.user.email, 'Confirmation de réservation', emailContent);
    } catch (emailErr) {
      logger.warn('Échec de l’envoi de l’e-mail de confirmation:', emailErr);
    }

    logger.info(`Réservation créée: ${referenceNumber}`);
    res.status(201).json({
      message: 'Réservation créée avec succès',
      reservationId,
      referenceNumber,
      totalAmount
    });

  } catch (error) {
    await connection.rollback();
    logger.error('Erreur création réservation:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  } finally {
    connection.release();
  }
});

// Récupérer une réservation avec ses chambres
router.get('/:id', authenticateToken, async (req, res) => {
  const reservationId = req.params.id;
  try {
    // Get the reservation (with hotel info, optional)
    const [reservations] = await db.execute(
      `SELECT r.*, h.name AS hotel_name
       FROM reservations r
       JOIN hotels h ON r.hotel_id = h.id
       WHERE r.id = ? AND r.user_id = ?`,
      [reservationId, req.user.id]
    );
    if (reservations.length === 0) {
      return res.status(404).json({ error: 'Réservation non trouvée' });
    }
    const reservation = reservations[0];

    // Get all rooms for this reservation
    const [rooms] = await db.execute(
      `SELECT rr.*, rt.name AS room_type_name
       FROM reservation_rooms rr
       JOIN room_types rt ON rr.room_type_id = rt.id
       WHERE rr.reservation_id = ?`,
      [reservationId]
    );

    // Attach rooms array to reservation object
    reservation.rooms = rooms;

    res.json(reservation);
  } catch (error) {
    logger.error('Erreur récupération réservation avec chambres:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});
// Annuler une réservation
router.patch('/:id/cancel', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [reservations] = await connection.execute(
      `SELECT id, reference_number, status, check_in_date 
       FROM reservations 
       WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );

    if (reservations.length === 0) {
      return res.status(404).json({ error: 'Réservation non trouvée' });
    }

    const reservation = reservations[0];

    if (reservation.status !== 'confirmed') {
      return res.status(400).json({ error: 'Annulation non autorisée' });
    }

    await connection.execute(
      `UPDATE reservations 
       SET status = 'cancelled', cancelled_at = NOW() 
       WHERE id = ?`,
      [req.params.id]
    );

    await connection.execute(
      `UPDATE rooms r
       JOIN <<<<<<< HEAD
=======
    if (moment().isAfter(moment(reservation.check_in_date).subtract(5, 'days'))) {
      return res.status(400).json({ error: 'Annulation trop tardive' });
    }

>>>>>>> 39bcf49c4a16da7f1facfe7ad3a03d41c693ed79
reservation_rooms rr ON r.id = rr.room_id
       SET r.is_available = TRUE
       WHERE rr.reservation_id = ?`,
      [req.params.id]
    );

    await connection.commit();

    try {
      await sendEmail(
        req.user.email,
        'Réservation annulée',
        `Votre réservation ${reservation.reference_number} a été annulée.`
      );
    } catch (emailErr) {
      logger.warn('Échec de l’envoi de l’e-mail d’annulation:', emailErr);
    }

    res.json({ message: 'Réservation annulée avec succès' });

  } catch (error) {
    await connection.rollback();
    logger.error('Erreur annulation réservation:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  } finally {
    connection.release();
  }
});


// GET /api/reservations/all - Fetch all/filtered reservations (Admin/Reception)
router.get('/all', authenticateToken, requireRole([ROLES.ADMIN, ROLES.RECEPTION]), [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('clientId').optional().isInt({ min: 1 }).toInt(),
  query('hotelId').optional().isInt({ min: 1 }).toInt(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('status').optional().trim().escape(),
  query('referenceNumber').optional().trim().escape()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const page = req.query.page || 1;
  const limit = req.query.limit || 20;
  const offset = (page - 1) * limit;

  let sql = `SELECT r.*,
              u.email as client_email, u.first_name as client_first_name, u.last_name as client_last_name,
              h.name as hotel_name
             FROM reservations r
             JOIN users u ON r.user_id = u.id
             JOIN hotels h ON r.hotel_id = h.id
             WHERE 1=1`;
  let countSql = `SELECT COUNT(*) as total
                  FROM reservations r
                  JOIN users u ON r.user_id = u.id
                  JOIN hotels h ON r.hotel_id = h.id
                  WHERE 1=1`;

  const params = [];
  const countParams = [];

  if (req.query.clientId) {
    sql += ' AND r.user_id = ?';
    countSql += ' AND r.user_id = ?';
    params.push(req.query.clientId);
    countParams.push(req.query.clientId);
  }
  if (req.query.hotelId) {
    sql += ' AND r.hotel_id = ?';
    countSql += ' AND r.hotel_id = ?';
    params.push(req.query.hotelId);
    countParams.push(req.query.hotelId);
  }
  if (req.query.dateFrom) {
    sql += ' AND r.check_in_date >= ?';
    countSql += ' AND r.check_in_date >= ?';
    params.push(req.query.dateFrom);
    countParams.push(req.query.dateFrom);
  }
  if (req.query.dateTo) {
    // If dateTo is provided, it usually means reservations that START before or on this date,
    // or reservations that END after or on this date.
    // For simplicity, let's filter by check_out_date being less than or equal to dateTo.
    // This might need adjustment based on exact requirements (e.g., active bookings within a range).
    sql += ' AND r.check_out_date <= ?';
    countSql += ' AND r.check_out_date <= ?';
    params.push(req.query.dateTo);
    countParams.push(req.query.dateTo);
  }
  if (req.query.status) {
    sql += ' AND r.status = ?';
    countSql += ' AND r.status = ?';
    params.push(req.query.status);
    countParams.push(req.query.status);
  }
  if (req.query.referenceNumber) {
    sql += ' AND r.reference_number LIKE ?';
    countSql += ' AND r.reference_number LIKE ?';
    params.push(`%${req.query.referenceNumber}%`);
    countParams.push(`%${req.query.referenceNumber}%`);
  }

  sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  try {
    const [reservations] = await db.execute(sql, params);
    const [countResult] = await db.execute(countSql, countParams);
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      reservations,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    logger.error('Erreur récupération de toutes les réservations:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});


// POST /api/reservations/agent-create - Create reservation by Agent (Admin/Reception)
router.post('/agent-create',
  authenticateToken,
  requireRole([ROLES.ADMIN, ROLES.RECEPTION]),
  [
    body('userId').isInt({ min: 1 }),
    body('hotelId').isInt({ min: 1 }),
    body('checkInDate').isISO8601(),
    body('checkOutDate').isISO8601(),
    body('rooms').isArray({ min: 1 }),
    body('rooms.*.roomTypeId').isInt({ min: 1 }),
    body('rooms.*.quantity').isInt({ min: 1 }),
    body('specialRequests').optional().isArray()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const { userId, hotelId, checkInDate, checkOutDate, rooms, specialRequests } = req.body;

      // Verify user exists and is a client
      const clientUser = await findClientById(userId);
      if (!clientUser) {
        await connection.rollback();
        return res.status(404).json({ error: `Client avec ID ${userId} non trouvé.` });
      }
      if (clientUser.error) { // e.g., user is not a client
        await connection.rollback();
        return res.status(400).json({ error: clientUser.error });
      }
      const clientEmail = clientUser.email; // For sending confirmation

      // Date validations
      const checkIn = moment(checkInDate);
      const checkOut = moment(checkOutDate);
      if (!checkIn.isValid() || !checkOut.isValid() || checkOut.isSameOrBefore(checkIn) || checkIn.isBefore(moment(), 'day')) {
        await connection.rollback();
        return res.status(400).json({ error: 'Dates de réservation invalides.' });
      }

      // TODO: Refactor availability check and reservation creation logic into a shared function
      // For now, duplicating and adapting the logic from POST /
      const totalNights = checkOut.diff(checkIn, 'days');
      let totalAmount = 0;
      let availabilityChecks = [];
      let bookedRoomDetailsForEmail = []; // For email confirmation

      for (const roomReq of rooms) {
        const [availableRooms] = await connection.execute(`
          SELECT r.id, rt.name as room_type_name, rr.base_price
          FROM rooms r
          JOIN room_types rt ON r.room_type_id = rt.id
          LEFT JOIN room_rates rr ON rr.hotel_id = r.hotel_id AND rr.room_type_id = rt.id /* Assume default rate if specific not found */
          WHERE r.hotel_id = ? AND r.room_type_id = ? AND r.is_available = TRUE
          AND r.id NOT IN (
            SELECT DISTINCT rroom.room_id
            FROM reservation_rooms rroom
            JOIN reservations res ON rroom.reservation_id = res.id
            WHERE res.hotel_id = ?
            AND res.status IN ('confirmed', 'checked_in')
            AND NOT (res.check_out_date <= ? OR res.check_in_date >= ?)
          )
          LIMIT ?
        `, [hotelId, roomReq.roomTypeId, hotelId, checkInDate, checkOutDate, roomReq.quantity]);

        if (availableRooms.length < roomReq.quantity) {
          await connection.rollback();
          return res.status(400).json({
            error: `Pas assez de chambres disponibles pour le type ${roomReq.roomTypeId} (ID: ${roomReq.roomTypeId})`
          });
        }

        const roomPrice = availableRooms[0].base_price || 100; // Fallback price
        totalAmount += roomPrice * roomReq.quantity * totalNights;

        availabilityChecks.push({
          roomTypeId: roomReq.roomTypeId,
          roomsToBook: availableRooms.slice(0, roomReq.quantity),
          quantity: roomReq.quantity,
          pricePerRoomPerNight: roomPrice,
          roomTypeName: availableRooms[0].room_type_name
        });
        bookedRoomDetailsForEmail.push(`${roomReq.quantity} x ${availableRooms[0].room_type_name}`);
      }

      const referenceNumber = `AGT${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const [reservationResult] = await connection.execute(
        `INSERT INTO reservations (reference_number, user_id, hotel_id, check_in_date, check_out_date, total_amount, status, created_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?)`,
        [referenceNumber, userId, hotelId, checkInDate, checkOutDate, totalAmount, req.user.id] // Store agent's ID
      );
      const reservationId = reservationResult.insertId;

      for (const roomGroup of availabilityChecks) {
        for (const roomToBook of roomGroup.roomsToBook) {
          await connection.execute(
            'INSERT INTO reservation_rooms (reservation_id, room_id, room_type_id, rate_per_night) VALUES (?, ?, ?, ?)',
            [reservationId, roomToBook.id, roomGroup.roomTypeId, roomGroup.pricePerRoomPerNight]
          );
        }
      }

      if (specialRequests && Array.isArray(specialRequests) && specialRequests.length > 0) {
        for (const request of specialRequests) {
          await connection.execute(
            'INSERT INTO special_requests (reservation_id, request_text) VALUES (?, ?)',
            [reservationId, request.text || request] // Assuming request might be {text: "..."} or just "..."
          );
        }
      }

      await connection.commit();

      // Send confirmation email to the client
      const emailSubject = 'Votre réservation a été créée par un agent';
      const emailText = `
        <h1>Confirmation de réservation</h1>
        <p>Bonjour,</p>
        <p>Une réservation a été créée pour vous par un de nos agents.</p>
        <p>Référence: ${referenceNumber}</p>
        <p>Hôtel: [Nom de l'hôtel - à récupérer si besoin]</p>
        <p>Dates: ${moment(checkInDate).format('LL')} - ${moment(checkOutDate).format('LL')}</p>
        <p>Chambres: ${bookedRoomDetailsForEmail.join(', ')}</p>
        <p>Montant total: €${totalAmount.toFixed(2)}</p>
        <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        <p>Cordialement,</p>
        <p>L'équipe de l'hôtel</p>
      `; // TODO: Add hotel name to email if easily available or query it.

      try {
        await sendEmail(clientEmail, emailSubject, emailText);
      } catch (emailErr) {
        logger.warn(`Échec de l’envoi de l’e-mail de confirmation pour la réservation ${referenceNumber} au client ${clientEmail}:`, emailErr);
        // Don't fail the request if email fails, but log it.
      }

      logger.info(`Réservation ${referenceNumber} créée par l'agent ${req.user.id} pour le client ${userId}`);
      res.status(201).json({
        message: 'Réservation créée avec succès pour le client.',
        reservationId,
        referenceNumber,
        totalAmount
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Erreur création réservation par agent:', error);
      res.status(500).json({ error: 'Erreur interne du serveur lors de la création de la réservation.' });
    } finally {
      if (connection) connection.release();
    }
  }
);

const TAX_RATE = 0.10; // Example: 10% tax rate

// POST /api/reservations/:reservationId/invoice - Generate/Retrieve an invoice for a reservation
router.post('/:reservationId/invoice',
  authenticateToken,
  requireRole([ROLES.ADMIN, ROLES.RECEPTION]),
  async (req, res) => {
    const { reservationId } = req.params;
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Check if an invoice already exists for this reservation
      const [existingInvoices] = await connection.execute(
        'SELECT * FROM invoices WHERE reservation_id = ?',
        [reservationId]
      );

      if (existingInvoices.length > 0) {
        // If invoice exists, fetch its items and return it
        const invoice = existingInvoices[0];
        const [items] = await connection.execute('SELECT * FROM invoice_items WHERE invoice_id = ?', [invoice.id]);
        invoice.items = items;
        await connection.commit(); // Commit transaction even if just reading
        return res.json(invoice);
      }

      // 2. Fetch reservation, client, hotel, consumption, and room details
      const [reservationRows] = await connection.execute(
        `SELECT r.*,
                u.first_name as client_first_name, u.last_name as client_last_name, u.email as client_email, u.company_name as client_company,
                h.name as hotel_name, h.address as hotel_address
         FROM reservations r
         JOIN users u ON r.user_id = u.id
         JOIN hotels h ON r.hotel_id = h.id
         WHERE r.id = ?`,
        [reservationId]
      );

      if (reservationRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Réservation non trouvée.' });
      }
      const reservation = reservationRows[0];

      // Ensure reservation is in a state where an invoice can be generated (e.g., checked_out, confirmed, etc.)
      // This rule might vary. For now, let's assume 'checked_out' or 'confirmed' (if pre-payment invoice)
      if (!['confirmed', 'checked_in', 'checked_out', 'modified_by_agent'].includes(reservation.status)) {
        await connection.rollback();
        return res.status(400).json({ error: `Impossible de générer une facture pour une réservation avec le statut '${reservation.status}'.` });
      }

      const [consumptionItems] = await connection.execute(
        'SELECT * FROM consumption_items WHERE reservation_id = ?',
        [reservationId]
      );

      const [reservationRoomsDetails] = await connection.execute(
        `SELECT rr.rate_per_night, rr.room_id, rt.name as room_type_name, COUNT(rr.room_id) as quantity
         FROM reservation_rooms rr
         JOIN room_types rt ON rr.room_type_id = rt.id
         WHERE rr.reservation_id = ?
         GROUP BY rr.rate_per_night, rr.room_id, rt.name`, // Group by room_id if each booked room is a separate entry
        [reservationId]
      );

      // Calculate total nights
      const totalNights = moment(reservation.check_out_date).diff(moment(reservation.check_in_date), 'days');

      // 3. Calculate amounts
      let subtotalRoomCharges = 0;
      reservationRoomsDetails.forEach(room => {
        subtotalRoomCharges += room.rate_per_night * room.quantity * totalNights;
      });
      // If reservation.total_amount is purely room charges and accurate, could use it.
      // But recalculating provides itemization flexibility. For now, use the sum from reservation_rooms.
      // This might differ from reservation.total_amount if it was calculated differently or manually adjusted.
      // For consistency, the invoice should reflect the sum of its items.

      let subtotalConsumptionCharges = 0;
      consumptionItems.forEach(item => {
        subtotalConsumptionCharges += parseFloat(item.total_price);
      });

      const subtotalBeforeTax = subtotalRoomCharges + subtotalConsumptionCharges;
      const taxesAmount = subtotalBeforeTax * TAX_RATE;
      const totalAmountDue = subtotalBeforeTax + taxesAmount;

      // 4. Generate Invoice Reference Number & Dates
      const invoiceReferenceNumber = `INV-${reservation.reference_number || reservationId}-${Date.now().toString().slice(-6)}`;
      const issueDate = moment().format('YYYY-MM-DD');
      const dueDate = moment().add(15, 'days').format('YYYY-MM-DD'); // Example: Due in 15 days

      // 5. Create Invoice Record
      const [invoiceResult] = await connection.execute(
        `INSERT INTO invoices (reservation_id, invoice_reference_number, issue_date, due_date, client_id,
                               client_name, client_email, hotel_name, hotel_address,
                               subtotal_room_charges, subtotal_consumption_charges, taxes_amount, total_amount_due,
                               status, created_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
        [ reservationId, invoiceReferenceNumber, issueDate, dueDate, reservation.user_id,
          `${reservation.client_first_name || ''} ${reservation.client_last_name || ''}`.trim() || reservation.client_company,
          reservation.client_email, reservation.hotel_name, reservation.hotel_address,
          subtotalRoomCharges, subtotalConsumptionCharges, taxesAmount, totalAmountDue,
          req.user.id
        ]
      );
      const invoiceId = invoiceResult.insertId;

      // 6. Create Invoice Items
      // Room charges item(s)
      // Summarize all room charges into one line item for simplicity, or break down by room type.
      if (subtotalRoomCharges > 0) {
          let roomChargesDescription = `${totalNights} nuit(s) - `;
          const roomTypeSummaries = reservationRoomsDetails.map(r => `${r.quantity} x ${r.room_type_name}`);
          roomChargesDescription += roomTypeSummaries.join(', ');

          await connection.execute(
            `INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, total_price)
             VALUES (?, 'room', ?, 1, ?, ?)`, // Qty 1 for the entire stay package
            [invoiceId, roomChargesDescription, subtotalRoomCharges, subtotalRoomCharges]
          );
      }

      // Consumption items
      for (const item of consumptionItems) {
        await connection.execute(
          `INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, total_price)
           VALUES (?, 'consumption', ?, ?, ?, ?)`,
          [invoiceId, item.item_name, item.quantity, item.price_per_unit, item.total_price]
        );
      }
      // Tax item
      if (taxesAmount > 0) {
        await connection.execute(
          `INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, total_price)
           VALUES (?, 'tax', 'TVA (${(TAX_RATE * 100).toFixed(0)}%)', 1, ?, ?)`,
          [invoiceId, taxesAmount, taxesAmount]
        );
      }

      await connection.commit();

      // 7. Return the full invoice
      const [finalInvoice] = await connection.execute('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      const [finalItems] = await connection.execute('SELECT * FROM invoice_items WHERE invoice_id = ?', [invoiceId]);
      finalInvoice[0].items = finalItems;

      logger.info(`Facture ${invoiceReferenceNumber} générée pour la réservation ${reservationId} par l'agent ${req.user.id}`);
      res.status(201).json(finalInvoice[0]);

    } catch (error) {
      await connection.rollback();
      logger.error(`Erreur génération facture pour réservation ${reservationId}:`, error);
      res.status(500).json({ error: 'Erreur interne du serveur lors de la génération de la facture.' });
    } finally {
      if (connection) connection.release();
    }
  }
);

// PATCH /api/reservations/:id/check-in - Check-in a reservation
router.patch('/:id/check-in',
  authenticateToken,
  requireRole([ROLES.ADMIN, ROLES.RECEPTION]),
  async (req, res) => {
    const reservationId = req.params.id;
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [reservations] = await connection.execute(
        'SELECT * FROM reservations WHERE id = ?',
        [reservationId]
      );
      if (reservations.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Réservation non trouvée.' });
      }
      const reservation = reservations[0];

      if (reservation.status !== 'confirmed' && reservation.status !== 'modified_by_agent') {
        await connection.rollback();
        return res.status(400).json({ error: `La réservation doit être confirmée pour le check-in. Statut actuel: ${reservation.status}` });
      }

      // Validate check-in date (e.g., today or not too far in the past/future - simplified here)
      const today = moment().startOf('day');
      const checkInDate = moment(reservation.check_in_date).startOf('day');
      if (checkInDate.isAfter(today.add(1, 'day'))) { // Allow check-in on scheduled day or a bit later, but not too early
        // This rule might need adjustment based on hotel policy (e.g. allow check-in one day before if rooms are ready)
        // For now, strict: cannot check-in before the check-in day.
         // Or if checkInDate.isAfter(today) if strict same-day check-in
        // await connection.rollback();
        // return res.status(400).json({ error: `Check-in impossible avant le ${checkInDate.format('LL')}.` });
        logger.warn(`Check-in pour la réservation ${reservationId} est fait en avance. Date prévue: ${checkInDate.format('LL')}`);
      }


      await connection.execute(
        'UPDATE reservations SET status = ?, actual_check_in_time = NOW(), updated_at = NOW(), updated_by_user_id = ? WHERE id = ?',
        ['checked_in', req.user.id, reservationId]
      );
      await connection.commit();

      const [updatedReservation] = await connection.execute('SELECT * FROM reservations WHERE id = ?', [reservationId]);
      logger.info(`Réservation ${reservationId} check-in par l'agent ${req.user.id}.`);
      res.json({ message: 'Check-in effectué avec succès.', reservation: updatedReservation[0] });

    } catch (error) {
      await connection.rollback();
      logger.error(`Erreur check-in réservation ${reservationId}:`, error);
      res.status(500).json({ error: 'Erreur interne du serveur.' });
    } finally {
      if (connection) connection.release();
    }
  }
);

// PATCH /api/reservations/:id/check-out - Check-out a reservation
router.patch('/:id/check-out',
  authenticateToken,
  requireRole([ROLES.ADMIN, ROLES.RECEPTION]),
  async (req, res) => {
    const reservationId = req.params.id;
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [reservations] = await connection.execute(
        'SELECT * FROM reservations WHERE id = ?',
        [reservationId]
      );
      if (reservations.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Réservation non trouvée.' });
      }
      const reservation = reservations[0];

      if (reservation.status !== 'checked_in') {
        await connection.rollback();
        return res.status(400).json({ error: `La réservation doit être en statut 'checked_in' pour le check-out. Statut actuel: ${reservation.status}` });
      }

      // TODO: Add logic here to ensure any outstanding payments are made or invoice is generated.
      // This might involve checking a related 'invoices' table or payment status.
      // For now, this is a simplified check-out just updating status.

      await connection.execute(
        'UPDATE reservations SET status = ?, actual_check_out_time = NOW(), updated_at = NOW(), updated_by_user_id = ? WHERE id = ?',
        ['checked_out', req.user.id, reservationId]
      );

      // Optional: Update associated room statuses to 'available' or 'needs_cleaning'
      // This requires more complex logic based on how room statuses are managed.
      // Example: UPDATE rooms SET status = 'needs_cleaning' WHERE id IN (SELECT room_id FROM reservation_rooms WHERE reservation_id = ?);

      await connection.commit();

      const [updatedReservation] = await connection.execute('SELECT * FROM reservations WHERE id = ?', [reservationId]);
      logger.info(`Réservation ${reservationId} check-out par l'agent ${req.user.id}.`);
      res.json({ message: 'Check-out effectué avec succès.', reservation: updatedReservation[0] });

    } catch (error) {
      await connection.rollback();
      logger.error(`Erreur check-out réservation ${reservationId}:`, error);
      res.status(500).json({ error: 'Erreur interne du serveur.' });
    } finally {
      if (connection) connection.release();
    }
  }
);

// POST /api/reservations/:id/consumptions - Add a consumption item to a reservation
router.post('/:id/consumptions',
  authenticateToken,
  requireRole([ROLES.ADMIN, ROLES.RECEPTION]),
  [
    body('item_name').trim().notEmpty().withMessage('Item name is required.'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1.'),
    body('price_per_unit').isDecimal({ decimal_digits: '2' }).withMessage('Price per unit must be a decimal.'),
    body('item_description').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const reservationId = req.params.id;
    const { item_name, quantity, price_per_unit, item_description } = req.body;

    try {
      const [reservations] = await db.execute(
        'SELECT status FROM reservations WHERE id = ?',
        [reservationId]
      );
      if (reservations.length === 0) {
        return res.status(404).json({ error: 'Réservation non trouvée.' });
      }
      if (reservations[0].status !== 'checked_in') {
        return res.status(400).json({ error: 'Les consommations ne peuvent être ajoutées qu\'aux réservations en statut \'checked_in\'.' });
      }

      const totalPrice = parseFloat(price_per_unit) * parseInt(quantity, 10);

      const [result] = await db.execute(
        `INSERT INTO consumption_items (reservation_id, item_name, quantity, price_per_unit, total_price, item_description, created_by_user_id, billed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [reservationId, item_name, quantity, price_per_unit, totalPrice, item_description, req.user.id]
      );

      const consumptionId = result.insertId;
      const [newConsumptionItem] = await db.execute('SELECT * FROM consumption_items WHERE id = ?', [consumptionId]);

      logger.info(`Consommation ajoutée à la réservation ${reservationId} par l'agent ${req.user.id}: ${item_name}`);
      res.status(201).json(newConsumptionItem[0]);

    } catch (error) {
      logger.error(`Erreur ajout consommation à la réservation ${reservationId}:`, error);
      // Check for specific DB errors like foreign key constraint if reservation_id is invalid
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
          return res.status(404).json({ error: 'Réservation non trouvée pour lier la consommation.' });
      }
      res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
  }
);

// GET /api/reservations/:id/consumptions - List consumption items for a reservation
router.get('/:id/consumptions',
  authenticateToken, // All roles can try, further checks inside
  async (req, res) => {
    const reservationId = req.params.id;
    try {
      const [reservations] = await db.execute(
        'SELECT user_id FROM reservations WHERE id = ?',
        [reservationId]
      );
      if (reservations.length === 0) {
        return res.status(404).json({ error: 'Réservation non trouvée.' });
      }

      // Authorization: Admin/Reception can see any. Client can only see their own.
      const isAgent = req.user.role === ROLES.ADMIN || req.user.role === ROLES.RECEPTION;
      if (!isAgent && req.user.id !== reservations[0].user_id) {
        return res.status(403).json({ error: 'Accès non autorisé aux consommations de cette réservation.' });
      }

      const [consumptionItems] = await db.execute(
        'SELECT * FROM consumption_items WHERE reservation_id = ? ORDER BY billed_at DESC',
        [reservationId]
      );

      res.json(consumptionItems);

    } catch (error) {
      logger.error(`Erreur récupération consommations pour la réservation ${reservationId}:`, error);
      res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
  }
);

// PUT /api/reservations/:id/agent-update - Update reservation by Agent (Admin/Reception)
router.put('/:id/agent-update',
  authenticateToken,
  requireRole([ROLES.ADMIN, ROLES.RECEPTION]),
  [
    body('checkInDate').optional().isISO8601(),
    body('checkOutDate').optional().isISO8601(),
    // body('rooms').optional().isArray({ min: 1 }), // Complex: Handle separately if provided
    // body('rooms.*.roomTypeId').optional().isInt({ min: 1 }),
    // body('rooms.*.quantity').optional().isInt({ min: 1 }),
    body('specialRequests').optional().isArray(),
    body('status').optional().trim().escape()
    // Not allowing hotelId change for now as it complicates things significantly
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const reservationId = req.params.id;
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [currentReservations] = await connection.execute(
        'SELECT * FROM reservations WHERE id = ?',
        [reservationId]
      );

      if (currentReservations.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Réservation non trouvée.' });
      }
      const currentReservation = currentReservations[0];

      // For now, only allow updates if status is 'confirmed' or a similar modifiable state
      if (!['confirmed', 'modified_by_agent'].includes(currentReservation.status)) {
        await connection.rollback();
        return res.status(400).json({ error: `La réservation avec statut '${currentReservation.status}' ne peut pas être modifiée par un agent.` });
      }

      let { checkInDate, checkOutDate, specialRequests, status } = req.body;
      let needsRecalculation = false;
      let logEntries = []; // For auditing changes (optional)

      // Prepare updates
      const updateFields = {};
      if (checkInDate && checkInDate !== currentReservation.check_in_date) {
        updateFields.check_in_date = moment(checkInDate).format('YYYY-MM-DD HH:mm:ss');
        needsRecalculation = true;
        logEntries.push(`Date d'arrivée changée de ${currentReservation.check_in_date} à ${updateFields.check_in_date}`);
      } else {
        // Use current if not provided or not changed, for date validation logic
        checkInDate = moment(currentReservation.check_in_date).format('YYYY-MM-DD');
      }

      if (checkOutDate && checkOutDate !== currentReservation.check_out_date) {
        updateFields.check_out_date = moment(checkOutDate).format('YYYY-MM-DD HH:mm:ss');
        needsRecalculation = true;
        logEntries.push(`Date de départ changée de ${currentReservation.check_out_date} à ${updateFields.check_out_date}`);
      } else {
        checkOutDate = moment(currentReservation.check_out_date).format('YYYY-MM-DD');
      }

      // Date validations if any date changed
      if (updateFields.check_in_date || updateFields.check_out_date) {
        const checkIn = moment(updateFields.check_in_date || checkInDate);
        const checkOut = moment(updateFields.check_out_date || checkOutDate);

        if (!checkIn.isValid() || !checkOut.isValid() || checkOut.isSameOrBefore(checkIn)) {
          await connection.rollback();
          return res.status(400).json({ error: 'Dates de réservation invalides après mise à jour.' });
        }
        // Prevent setting check-in date to the past, unless it was already in the past (e.g. modifying a current booking)
        if (checkIn.isBefore(moment(), 'day') && moment(currentReservation.check_in_date).isSameOrAfter(moment(), 'day')) {
          await connection.rollback();
          return res.status(400).json({ error: 'Impossible de déplacer la date d\'arrivée dans le passé.' });
        }
      }


      // For this iteration, we are NOT handling changes to `rooms` array due to its complexity.
      // This would involve:
      // 1. Fetching current reservation_rooms.
      // 2. Comparing with new `rooms` array.
      // 3. Releasing old rooms (update their availability or delete from reservation_rooms).
      // 4. Checking availability for new/changed rooms.
      // 5. Adding new rooms to reservation_rooms.
      // 6. Recalculating total_amount.
      // This is a significant feature in itself.
      if (req.body.rooms) {
        await connection.rollback();
        return res.status(400).json({ error: "La modification des chambres n'est pas encore prise en charge dans cette version." });
      }

      if (needsRecalculation) {
        // If only dates changed, and rooms did not, recalculate total_amount based on existing rooms and new duration
        const newTotalNights = moment(updateFields.check_out_date || checkOutDate).diff(moment(updateFields.check_in_date || checkInDate), 'days');
        const [currentReservationRooms] = await connection.execute(
            'SELECT room_type_id, rate_per_night, COUNT(*) as quantity FROM reservation_rooms WHERE reservation_id = ? GROUP BY room_type_id, rate_per_night',
            [reservationId]
        );

        let newTotalAmount = 0;
        for (const roomGroup of currentReservationRooms) {
            newTotalAmount += roomGroup.rate_per_night * roomGroup.quantity * newTotalNights;
        }
        updateFields.total_amount = newTotalAmount;
        logEntries.push(`Montant total recalculé à ${newTotalAmount} (ancien: ${currentReservation.total_amount})`);
      }

      if (status && status !== currentReservation.status) {
        // Add validation for allowed status transitions if necessary
        updateFields.status = status;
        logEntries.push(`Statut changé de ${currentReservation.status} à ${status}`);
      }

      updateFields.updated_at = moment().format('YYYY-MM-DD HH:mm:ss');
      // Add who made the update
      updateFields.updated_by_user_id = req.user.id;

      const updateQueryParts = Object.keys(updateFields).map(key => `${key} = ?`);
      if (updateQueryParts.length > 0) {
        const updateValues = [...Object.values(updateFields), reservationId];
        await connection.execute(
          `UPDATE reservations SET ${updateQueryParts.join(', ')} WHERE id = ?`,
          updateValues
        );
      }

      // Handle special requests (replace existing ones)
      if (specialRequests) {
        await connection.execute('DELETE FROM special_requests WHERE reservation_id = ?', [reservationId]);
        if (Array.isArray(specialRequests) && specialRequests.length > 0) {
          for (const request of specialRequests) {
            await connection.execute(
              'INSERT INTO special_requests (reservation_id, request_text) VALUES (?, ?)',
              [reservationId, request.text || request]
            );
          }
        }
        logEntries.push("Demandes spéciales mises à jour.");
      }

      await connection.commit();

      // Optional: Log changes to an audit table here using logEntries

      const [updatedReservations] = await connection.execute(
        `SELECT r.*,
          u.email as client_email, u.first_name as client_first_name, u.last_name as client_last_name,
          h.name as hotel_name
         FROM reservations r
         JOIN users u ON r.user_id = u.id
         JOIN hotels h ON r.hotel_id = h.id
         WHERE r.id = ?`, [reservationId]
      );

      // TODO: Send email notification about modification to client if significant changes were made.

      logger.info(`Réservation ${reservationId} mise à jour par l'agent ${req.user.id}. Modifications: ${logEntries.join('; ')}`);
      res.json({ message: 'Réservation mise à jour avec succès.', reservation: updatedReservations[0] });

    } catch (error) {
      await connection.rollback();
      logger.error(`Erreur mise à jour réservation ${reservationId} par agent:`, error);
      res.status(500).json({ error: 'Erreur interne du serveur lors de la mise à jour.' });
    } finally {
      if (connection) connection.release();
    }
  }
);

// PATCH /api/reservations/:id/assign-room - Assign/Change a specific room for a reservation
router.patch('/:id/assign-room',
  authenticateToken,
  requireRole([ROLES.ADMIN, ROLES.RECEPTION]),
  [
    body('assignments').isArray({ min: 1 }).withMessage('Assignments array is required.'),
    body('assignments.*.reservationRoomId').isInt().withMessage('Valid reservationRoomId is required.'),
    body('assignments.*.newRoomId').isInt().withMessage('Valid newRoomId is required.')
    // `floorNumber` is not directly handled here as it's assumed to be a property of the room itself.
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const reservationId = req.params.id;
    const { assignments } = req.body;
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [currentReservations] = await connection.execute(
        'SELECT * FROM reservations WHERE id = ?',
        [reservationId]
      );

      if (currentReservations.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Réservation principale non trouvée.' });
      }
      const reservationDetails = currentReservations[0];

      // Ensure reservation is in a state where rooms can be assigned/changed
      if (!['confirmed', 'modified_by_agent', 'checked_in'].includes(reservationDetails.status)) {
         await connection.rollback();
         return res.status(400).json({ error: `Les chambres pour la réservation avec statut '${reservationDetails.status}' ne peuvent pas être modifiées.` });
      }

      for (const assignment of assignments) {
        const { reservationRoomId, newRoomId } = assignment;

        // 1. Get the original reservation_rooms entry
        const [rrEntries] = await connection.execute(
          'SELECT * FROM reservation_rooms WHERE id = ? AND reservation_id = ?',
          [reservationRoomId, reservationId]
        );
        if (rrEntries.length === 0) {
          await connection.rollback();
          return res.status(404).json({ error: `Entrée de chambre réservée ${reservationRoomId} non trouvée pour cette réservation.` });
        }
        const originalReservationRoom = rrEntries[0];
        const originalRoomTypeId = originalReservationRoom.room_type_id;

        if (originalReservationRoom.room_id === newRoomId) {
          logger.info(`La chambre ${newRoomId} est déjà assignée à reservation_rooms ${reservationRoomId}. Aucune modification nécessaire.`);
          continue; // Skip if the new room is the same as the current one
        }

        // 2. Get details of the new room to be assigned
        const [newRoomDetails] = await connection.execute(
          'SELECT * FROM rooms WHERE id = ?',
          [newRoomId]
        );
        if (newRoomDetails.length === 0) {
          await connection.rollback();
          return res.status(404).json({ error: `Nouvelle chambre ${newRoomId} non trouvée.` });
        }
        const newRoom = newRoomDetails[0];

        // 3. Validate new room: same hotel, same type, and is available
        if (newRoom.hotel_id !== reservationDetails.hotel_id) {
          await connection.rollback();
          return res.status(400).json({ error: `La nouvelle chambre ${newRoomId} n'appartient pas au même hôtel que la réservation.`});
        }
        if (newRoom.room_type_id !== originalRoomTypeId) {
          await connection.rollback();
          return res.status(400).json({ error: `La nouvelle chambre ${newRoomId} (type ${newRoom.room_type_id}) n'est pas du même type que la chambre réservée originale (type ${originalRoomTypeId}).` });
        }

        // 4. Check availability of the newRoomId for the reservation dates
        // This query is adapted from the creation logic
        const [conflictingReservations] = await connection.execute(`
          SELECT res.id
          FROM reservations res
          JOIN reservation_rooms rroom ON rroom.reservation_id = res.id
          WHERE rroom.room_id = ?
            AND res.id != ?
            AND res.status IN ('confirmed', 'checked_in', 'modified_by_agent')
            AND NOT (res.check_out_date <= ? OR res.check_in_date >= ?)
          LIMIT 1
        `, [newRoomId, reservationId, reservationDetails.check_in_date, reservationDetails.check_out_date]);

        if (conflictingReservations.length > 0) {
          await connection.rollback();
          return res.status(400).json({ error: `La nouvelle chambre ${newRoomId} n'est pas disponible pour les dates de la réservation.` });
        }

        // 5. Update the room_id in reservation_rooms
        // Note: The old room (originalReservationRoom.room_id) is now implicitly "free" for this reservation_room entry.
        // The overall availability of that old room depends on other reservations.
        // No explicit update to rooms.is_available needed here as availability is dynamically checked.
        await connection.execute(
          'UPDATE reservation_rooms SET room_id = ?, updated_at = NOW() WHERE id = ?',
          [newRoomId, reservationRoomId]
        );
        logger.info(`Chambre pour reservation_rooms ID ${reservationRoomId} (Rés. ID ${reservationId}) changée de ${originalReservationRoom.room_id} à ${newRoomId} par l'agent ${req.user.id}`);
      }

      await connection.commit();
      res.json({ message: 'Assignation des chambres mise à jour avec succès.' });

    } catch (error) {
      await connection.rollback();
      logger.error(`Erreur assignation de chambre pour réservation ${reservationId} par agent:`, error);
      res.status(500).json({ error: 'Erreur interne du serveur lors de l\'assignation de la chambre.' });
    } finally {
      if (connection) connection.release();
    }
  }
);

module.exports = router;
