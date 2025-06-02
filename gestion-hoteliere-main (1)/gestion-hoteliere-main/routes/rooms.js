const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { ROLES } = require('../utils/constants'); // Added ROLES
const logger = require('../utils/logger');
const { body, param, query, validationResult } = require('express-validator');

// POST / (Create Individual Room)
router.post('/',
  [
    authenticateToken,
    requireRole([ROLES.ADMIN, ROLES.HOTEL_MANAGER]),
    body('hotel_id').isInt().withMessage('Hotel ID must be an integer.'),
    body('room_type_id').isInt().withMessage('Room Type ID must be an integer.'),
    body('room_number').notEmpty().withMessage('Room number is required.').trim(),
    body('status').optional().isIn(['available', 'maintenance', 'occupied', 'cleaning']).withMessage('Invalid status.').default('available'),
    body('is_available').optional().isBoolean().withMessage('is_available must be a boolean.').default(true)
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { hotel_id, room_type_id, room_number, status, is_available } = req.body;

    try {
      // Check if room_number already exists for the given hotel_id
      const [existingRooms] = await db.promise().query(
        'SELECT id FROM rooms WHERE hotel_id = ? AND room_number = ?',
        [hotel_id, room_number]
      );

      if (existingRooms.length > 0) {
        return res.status(409).json({ message: `Room number ${room_number} already exists for this hotel.` });
      }

      // Insert the new room
      const [result] = await db.promise().query(
        'INSERT INTO rooms (hotel_id, room_type_id, room_number, status, is_available) VALUES (?, ?, ?, ?, ?)',
        [hotel_id, room_type_id, room_number, status, is_available]
      );
      const newRoomId = result.insertId;

      // Retrieve the newly created room along with hotel and room_type info (optional, but good for response)
      const [newRoom] = await db.promise().query(
        `SELECT r.*, h.name as hotel_name, rt.name as room_type_name 
         FROM rooms r
         JOIN hotels h ON r.hotel_id = h.id
         JOIN room_types rt ON r.room_type_id = rt.id
         WHERE r.id = ?`,
        [newRoomId]
      );

      if (newRoom.length === 0) {
        // This case should ideally not happen if insert was successful
        logger.error(`Failed to retrieve room with id ${newRoomId} after creation.`);
        return res.status(500).json({ message: 'Failed to create room, could not retrieve after insert.' });
      }

      res.status(201).json(newRoom[0]);
    } catch (error) {
      logger.error('Error creating room:', error);
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        // Check if it's hotel_id or room_type_id that's causing the issue
        // This requires checking the foreign key constraint name or message if available and specific
        // For a generic message:
        return res.status(400).json({ message: 'Invalid hotel_id or room_type_id: Referenced hotel or room type does not exist.' });
      }
      res.status(500).json({ message: 'Error creating room' });
    }
  }
);

// DELETE /rates/:rateId (Delete Room Rate)
router.delete('/rates/:rateId',
  [
    authenticateToken,
    requireRole([ROLES.ADMIN, ROLES.HOTEL_MANAGER]),
    param('rateId').isInt().withMessage('Rate ID must be an integer.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rateId } = req.params;

    try {
      const [result] = await db.promise().query('DELETE FROM room_rates WHERE id = ?', [rateId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Room rate not found' });
      }

      res.status(200).json({ message: 'Room rate deleted successfully' });
    } catch (error) {
      logger.error(`Error deleting room rate ${rateId}:`, error);
      res.status(500).json({ message: 'Error deleting room rate' });
    }
  }
);

// GET /rates/hotel/:hotelId/type/:roomTypeId (Get Room Rates)
router.get('/rates/hotel/:hotelId/type/:roomTypeId',
  [
    authenticateToken,
    param('hotelId').isInt().withMessage('Hotel ID must be an integer.'),
    param('roomTypeId').isInt().withMessage('Room Type ID must be an integer.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { hotelId, roomTypeId } = req.params;

    try {
      const [rates] = await db.promise().query(
        'SELECT * FROM room_rates WHERE hotel_id = ? AND room_type_id = ? ORDER BY start_date ASC',
        [hotelId, roomTypeId]
      );

      // It's not an error if no rates are found, return an empty array.
      res.status(200).json(rates);
    } catch (error) {
      logger.error(`Error fetching rates for hotel ${hotelId}, room type ${roomTypeId}:`, error);
      res.status(500).json({ message: 'Error fetching room rates' });
    }
  }
);

// ROOM RATE MANAGEMENT (/rates)

// POST /rates (Create/Update Room Rate)
router.post('/rates',
  [
    authenticateToken,
    requireRole([ROLES.ADMIN, ROLES.HOTEL_MANAGER]),
    body('hotel_id').isInt().withMessage('Hotel ID must be an integer.'),
    body('room_type_id').isInt().withMessage('Room Type ID must be an integer.'),
    body('base_price').isNumeric().withMessage('Base price must be a numeric value.'),
    body('weekend_price').optional().isNumeric().withMessage('Weekend price must be a numeric value.'),
    body('holiday_price').optional().isNumeric().withMessage('Holiday price must be a numeric value.'),
    body('start_date').optional().isISO8601().toDate().withMessage('Invalid start date format.'),
    body('end_date').optional().isISO8601().toDate().withMessage('Invalid end date format.')
      .custom((value, { req }) => {
        if (req.body.start_date && !value) {
          throw new Error('End date is required when start date is provided.');
        }
        if (req.body.start_date && value <= req.body.start_date) {
          throw new Error('End date must be after start date.');
        }
        return true;
      })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      hotel_id, room_type_id, base_price,
      weekend_price, holiday_price, start_date, end_date
    } = req.body;

    try {
      // Upsert logic for general rates (no dates)
      if (!start_date && !end_date) {
        const [existingRate] = await db.promise().query(
          'SELECT * FROM room_rates WHERE hotel_id = ? AND room_type_id = ? AND start_date IS NULL AND end_date IS NULL',
          [hotel_id, room_type_id]
        );

        if (existingRate.length > 0) {
          // Update existing general rate
          const rateId = existingRate[0].id;
          await db.promise().query(
            'UPDATE room_rates SET base_price = ?, weekend_price = ?, holiday_price = ? WHERE id = ?',
            [base_price, weekend_price, holiday_price, rateId]
          );
          const [updatedRate] = await db.promise().query('SELECT * FROM room_rates WHERE id = ?', [rateId]);
          return res.status(200).json(updatedRate[0]);
        }
      }

      // Insert new rate (either date-specific or a new general rate)
      const [result] = await db.promise().query(
        'INSERT INTO room_rates (hotel_id, room_type_id, base_price, weekend_price, holiday_price, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [hotel_id, room_type_id, base_price, weekend_price, holiday_price, start_date || null, end_date || null]
      );
      const newRateId = result.insertId;
      const [newRate] = await db.promise().query('SELECT * FROM room_rates WHERE id = ?', [newRateId]);
      res.status(201).json(newRate[0]);

    } catch (error) {
      logger.error('Error creating/updating room rate:', error);
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({ message: 'Invalid hotel_id or room_type_id: Referenced hotel or room type does not exist.' });
      }
      res.status(500).json({ message: 'Error processing room rate' });
    }
  }
);

// DELETE /:roomId (Delete Room)
router.delete('/:roomId',
  [
    authenticateToken,
    requireRole([ROLES.ADMIN, ROLES.HOTEL_MANAGER]),
    param('roomId').isInt().withMessage('Room ID must be an integer.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { roomId } = req.params;

    try {
      // Conceptional: Check for active reservations before deleting.
      // For now, just a log. In a real system, this would involve querying a reservations table.
      // const [activeReservations] = await db.promise().query('SELECT id FROM reservations WHERE room_id = ? AND status IN (...)', [roomId]);
      // if (activeReservations.length > 0) {
      //   logger.warn(`Attempt to delete room ${roomId} which has active reservations.`);
      //   return res.status(400).json({ message: 'Cannot delete room with active reservations. Please resolve reservations first.' });
      // }
      logger.warn(`Room ${roomId} delete request: Check for active reservations is conceptual and not implemented in this version.`);


      const [result] = await db.promise().query('DELETE FROM rooms WHERE id = ?', [roomId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Room not found' });
      }

      res.status(200).json({ message: 'Room deleted successfully' });
    } catch (error) {
      logger.error(`Error deleting room ${roomId}:`, error);
      // ER_ROW_IS_REFERENCED_2: Foreign key constraint fails
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        logger.error(`Failed to delete room ${roomId} due to foreign key constraints. It might be referenced in bookings or other records.`);
        return res.status(400).json({ message: 'Cannot delete room: it is referenced by other records (e.g., reservations). Please resolve these dependencies first.' });
      }
      res.status(500).json({ message: 'Error deleting room' });
    }
  }
);

// PUT /:roomId (Update Room)
router.put('/:roomId',
  [
    authenticateToken,
    requireRole([ROLES.ADMIN, ROLES.HOTEL_MANAGER]),
    param('roomId').isInt().withMessage('Room ID must be an integer.'),
    body('room_number').optional().notEmpty().withMessage('Room number cannot be empty.').trim(),
    body('room_type_id').optional().isInt().withMessage('Room Type ID must be an integer.'),
    body('status').optional().isIn(['available', 'maintenance', 'occupied', 'cleaning']).withMessage('Invalid status.'),
    body('is_available').optional().isBoolean().withMessage('is_available must be a boolean.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { roomId } = req.params;
    const { room_number, room_type_id, status, is_available } = req.body;

    // Check if at least one field is provided for update
    if (room_number === undefined && room_type_id === undefined && status === undefined && is_available === undefined) {
      return res.status(400).json({ message: 'No fields provided for update. Supply at least one field to change.' });
    }

    try {
      // First, check if the room exists
      const [currentRoomArr] = await db.promise().query('SELECT * FROM rooms WHERE id = ?', [roomId]);
      if (currentRoomArr.length === 0) {
        return res.status(404).json({ message: 'Room not found' });
      }
      const currentRoom = currentRoomArr[0];

      // If room_number is being changed, check for uniqueness within the same hotel_id
      if (room_number && room_number !== currentRoom.room_number) {
        const [existingRooms] = await db.promise().query(
          'SELECT id FROM rooms WHERE hotel_id = ? AND room_number = ? AND id != ?',
          [currentRoom.hotel_id, room_number, roomId]
        );
        if (existingRooms.length > 0) {
          return res.status(409).json({ message: `Room number ${room_number} already exists for this hotel.` });
        }
      }

      const updateFields = {};
      if (room_number !== undefined) updateFields.room_number = room_number;
      if (room_type_id !== undefined) updateFields.room_type_id = room_type_id;
      if (status !== undefined) updateFields.status = status;
      if (is_available !== undefined) updateFields.is_available = is_available;
      
      if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ message: "No valid fields to update provided or values are the same as current." });
      }

      const setClauses = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(updateFields), roomId];

      const [result] = await db.promise().query(
        `UPDATE rooms SET ${setClauses} WHERE id = ?`,
        values
      );

      if (result.affectedRows === 0) {
        // This might happen if values provided are the same as current ones,
        // but the check for `Object.keys(updateFields).length === 0` and initial existence check
        // should prevent this unless there's a concurrent update or the DB doesn't report changes for same values.
        return res.status(404).json({ message: 'Room not found or no changes made' });
      }

      // Retrieve the updated room with all details
      const [updatedRoom] = await db.promise().query(
        `SELECT r.*, h.name as hotel_name, rt.name as room_type_name 
         FROM rooms r
         JOIN hotels h ON r.hotel_id = h.id
         JOIN room_types rt ON r.room_type_id = rt.id
         WHERE r.id = ?`,
        [roomId]
      );

      res.status(200).json(updatedRoom[0]);
    } catch (error) {
      logger.error(`Error updating room ${roomId}:`, error);
      if (error.code === 'ER_NO_REFERENCED_ROW_2' && error.sqlMessage.includes('room_type_id')) {
        return res.status(400).json({ message: 'Invalid room_type_id: Referenced room type does not exist.' });
      }
      res.status(500).json({ message: 'Error updating room' });
    }
  }
);

// GET /:roomId (Get Specific Room)
router.get('/:roomId',
  [
    authenticateToken,
    param('roomId').isInt().withMessage('Room ID must be an integer.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { roomId } = req.params;

    try {
      const [room] = await db.promise().query(
        `SELECT r.*, h.name as hotel_name, rt.name as room_type_name 
         FROM rooms r
         JOIN hotels h ON r.hotel_id = h.id
         JOIN room_types rt ON r.room_type_id = rt.id
         WHERE r.id = ?`,
        [roomId]
      );

      if (room.length === 0) {
        return res.status(404).json({ message: 'Room not found' });
      }

      res.status(200).json(room[0]);
    } catch (error) {
      logger.error(`Error fetching room ${roomId}:`, error);
      res.status(500).json({ message: 'Error fetching room' });
    }
  }
);

// GET /hotel/:hotelId (List Rooms for a Hotel)
router.get('/hotel/:hotelId',
  [
    authenticateToken,
    param('hotelId').isInt().withMessage('Hotel ID must be an integer.'),
    query('room_type_id').optional().isInt().withMessage('Room Type ID must be an integer.'),
    query('status').optional().isIn(['available', 'maintenance', 'occupied', 'cleaning']).withMessage('Invalid status filter.'),
    query('is_available').optional().isBoolean().withMessage('is_available filter must be a boolean.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { hotelId } = req.params;
    const { room_type_id, status, is_available } = req.query;

    let sql = `
      SELECT r.*, rt.name as room_type_name 
      FROM rooms r
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE r.hotel_id = ?
    `;
    const params = [hotelId];

    if (room_type_id) {
      sql += ' AND r.room_type_id = ?';
      params.push(room_type_id);
    }
    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }
    if (is_available !== undefined) {
      // Convert 'true'/'false' string from query to boolean
      const isAvailableBoolean = (is_available === 'true' || is_available === true);
      sql += ' AND r.is_available = ?';
      params.push(isAvailableBoolean);
    }

    try {
      const [rooms] = await db.promise().query(sql, params);
      // It's not an error if a hotel has no rooms or no rooms match filters, return an empty array.
      res.status(200).json(rooms);
    } catch (error) {
      logger.error(`Error fetching rooms for hotel ${hotelId}:`, error);
      res.status(500).json({ message: 'Error fetching rooms' });
    }
  }
);

// POST /types (Create Room Type)
router.post('/types',
  [
    authenticateToken,
    requireRole([ROLES.ADMIN, ROLES.HOTEL_MANAGER]),
    body('hotel_id').isInt().withMessage('Hotel ID must be an integer.'),
    body('name').notEmpty().withMessage('Name is required.'),
    body('capacity').isInt({ gt: 0 }).withMessage('Capacity must be a positive integer.'),
    body('description').optional().isString(),
    body('amenities').optional().isArray()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { hotel_id, name, description, capacity, amenities } = req.body;
    const amenitiesString = amenities ? amenities.join(',') : null;

    try {
      const [result] = await db.promise().query(
        'INSERT INTO room_types (hotel_id, name, description, capacity, amenities) VALUES (?, ?, ?, ?, ?)',
        [hotel_id, name, description, capacity, amenitiesString]
      );
      const newRoomTypeId = result.insertId;
      const [rows] = await db.promise().query('SELECT * FROM room_types WHERE id = ?', [newRoomTypeId]);
      if (rows.length === 0) {
        return res.status(500).json({ message: 'Failed to create or retrieve room type after creation' });
      }
      res.status(201).json(rows[0]);
    } catch (error) {
      logger.error('Error creating room type:', error);
      // Check for foreign key constraint error for hotel_id
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({ message: 'Invalid hotel_id: Hotel does not exist.' });
      }
      res.status(500).json({ message: 'Error creating room type' });
    }
  }
);

// DELETE /types/:typeId (Delete Room Type)
router.delete('/types/:typeId',
  [
    authenticateToken,
    requireRole([ROLES.ADMIN, ROLES.HOTEL_MANAGER])
  ],
  async (req, res) => {
    const { typeId } = req.params;

    if (isNaN(parseInt(typeId))) {
        return res.status(400).json({ message: 'Room Type ID must be an integer.' });
    }

    // Optional: Check for related rooms before deleting
    try {
      const [rooms] = await db.promise().query('SELECT id FROM rooms WHERE room_type_id = ?', [typeId]);
      if (rooms.length > 0) {
        logger.warn(`Attempt to delete room type ${typeId} which has ${rooms.length} associated room(s).`);
        // Depending on policy, could return 400 here:
        // return res.status(400).json({ message: 'Cannot delete room type with active rooms. Please reassign or delete rooms first.' });
      }
    } catch (error) {
      logger.error('Error checking for associated rooms:', error);
      // Not necessarily a fatal error for the delete operation itself, but good to log.
    }

    try {
      const [result] = await db.promise().query('DELETE FROM room_types WHERE id = ?', [typeId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Room type not found' });
      }

      res.status(200).json({ message: 'Room type deleted successfully' });
    } catch (error) {
      logger.error('Error deleting room type:', error);
      // Check for foreign key constraint violations if rooms are not checked/handled before
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
          return res.status(400).json({ message: 'Cannot delete room type: it is currently in use by existing rooms. Please reassign or delete those rooms first.' });
      }
      res.status(500).json({ message: 'Error deleting room type' });
    }
  }
);

// PUT /types/:typeId (Update Room Type)
router.put('/types/:typeId',
  [
    authenticateToken,
    requireRole([ROLES.ADMIN, ROLES.HOTEL_MANAGER]),
    body('name').optional().notEmpty().withMessage('Name cannot be empty.'),
    body('capacity').optional().isInt({ gt: 0 }).withMessage('Capacity must be a positive integer.'),
    body('description').optional().isString(),
    body('amenities').optional().isArray()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { typeId } = req.params;
    if (isNaN(parseInt(typeId))) {
        return res.status(400).json({ message: 'Room Type ID must be an integer.' });
    }

    const { name, description, capacity, amenities } = req.body;

    // Check if at least one field is provided for update
    if (!name && !description && capacity === undefined && !amenities) {
      return res.status(400).json({ message: 'No fields provided for update.' });
    }

    const updateFields = {};
    if (name) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (capacity !== undefined) updateFields.capacity = capacity;
    if (amenities) updateFields.amenities = amenities.join(',');

    const setClauses = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updateFields), typeId];

    if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ message: "No valid fields to update provided." });
    }

    try {
      const [result] = await db.promise().query(
        `UPDATE room_types SET ${setClauses} WHERE id = ?`,
        values
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Room type not found or no changes made' });
      }

      const [rows] = await db.promise().query('SELECT * FROM room_types WHERE id = ?', [typeId]);
      res.status(200).json(rows[0]);
    } catch (error) {
      logger.error('Error updating room type:', error);
      res.status(500).json({ message: 'Error updating room type' });
    }
  }
);

// GET /types/:typeId (Get Specific Room Type)
router.get('/types/:typeId',
  authenticateToken,
  async (req, res) => {
    const { typeId } = req.params;

    if (isNaN(parseInt(typeId))) {
        return res.status(400).json({ message: 'Room Type ID must be an integer.' });
    }

    try {
      const [rows] = await db.promise().query('SELECT * FROM room_types WHERE id = ?', [typeId]);
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Room type not found' });
      }
      res.status(200).json(rows[0]);
    } catch (error) {
      logger.error('Error fetching room type:', error);
      res.status(500).json({ message: 'Error fetching room type' });
    }
  }
);

// GET /types/hotel/:hotelId (List Room Types for a Hotel)
router.get('/types/hotel/:hotelId',
  authenticateToken,
  async (req, res) => {
    const { hotelId } = req.params;

    if (isNaN(parseInt(hotelId))) {
        return res.status(400).json({ message: 'Hotel ID must be an integer.' });
    }

    try {
      const [rows] = await db.promise().query('SELECT * FROM room_types WHERE hotel_id = ?', [hotelId]);
      if (rows.length === 0) {
        // It's not an error if a hotel has no room types, return an empty array.
        return res.status(200).json([]);
      }
      res.status(200).json(rows);
    } catch (error) {
      logger.error('Error fetching room types for hotel:', error);
      res.status(500).json({ message: 'Error fetching room types' });
    }
  }
);

module.exports = router;
