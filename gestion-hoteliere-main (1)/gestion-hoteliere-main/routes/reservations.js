const express = require('express');
const { body, validationResult, query } = require('express-validator');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');
const logger = require('../utils/logger');

const router = express.Router();


// Add this after your existing router definitions, but before module.exports

// Fetch reservations for the current authenticated user
router.get('/my-reservations', authenticateToken, async (req, res) => {
  try {
    // Replace this query with your actual reservation table/fields as needed
    const [reservations] = await db.execute(
      `SELECT
  r.*,
  h.name AS hotel_name,
  u.email AS user_email  -- Added this line to select the email
FROM
  reservations r
JOIN
  hotels h ON r.hotel_id = h.id
LEFT JOIN               -- Added this JOIN with the users table
  users u ON r.user_id = u.id
WHERE
  r.user_id = ?
ORDER BY
  r.check_in_date DESC`,
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

    if (moment().isAfter(moment(reservation.check_in_date).subtract(5, 'days'))) {
      return res.status(400).json({ error: 'Annulation trop tardive' });
    }

    await connection.execute(
      `UPDATE reservations 
       SET status = 'cancelled', cancelled_at = NOW() 
       WHERE id = ?`,
      [req.params.id]
    );

    await connection.execute(
      `UPDATE rooms r
       JOIN reservation_rooms rr ON r.id = rr.room_id
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

module.exports = router;
