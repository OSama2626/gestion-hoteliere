const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

// GET /admin-summary (Admin Dashboard Summary)
router.get('/admin-summary',
  [
    authenticateToken,
    requireRole(['admin', 'hotel_manager'])
  ],
  async (req, res) => {
    try {
      const summary = {};

      // Total number of users
      const [userCount] = await db.promise().query('SELECT COUNT(*) as total FROM users');
      summary.total_users = userCount[0].total;

      // Total number of hotels
      const [hotelCount] = await db.promise().query('SELECT COUNT(*) as total FROM hotels');
      summary.total_hotels = hotelCount[0].total;

      // Total number of rooms
      const [roomCount] = await db.promise().query('SELECT COUNT(*) as total FROM rooms');
      summary.total_rooms = roomCount[0].total;

      // Total number of reservations (overall and by status)
      const [reservationStats] = await db.promise().query(`
        SELECT 
          COUNT(*) as total_reservations,
          SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_reservations,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_reservations,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_reservations,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_reservations
        FROM reservations
      `);
      summary.reservations = reservationStats[0];
      
      // Total revenue (sum of amounts from 'paid' invoices)
      // Assuming 'invoices' table has 'amount' and 'status' fields
      const [revenueResult] = await db.promise().query(
        "SELECT SUM(amount) as total_revenue FROM invoices WHERE status = 'paid'"
      );
      summary.total_revenue = revenueResult[0].total_revenue || 0;

      // Average occupancy rate (simplified: number of rooms in 'occupied' reservations today / total rooms)
      // This is a very simplified version. Real occupancy is more complex.
      // For this, we need to define what "occupied today" means.
      // Let's assume it means reservations that are active today (check_in <= today AND check_out >= today)
      // And that each such reservation occupies one room.
      const today = new Date().toISOString().slice(0, 10);
      const [occupiedRoomsCount] = await db.promise().query(
        `SELECT COUNT(DISTINCT room_id) as currently_occupied_rooms 
         FROM reservations 
         WHERE status = 'confirmed' AND DATE(check_in_date) <= ? AND DATE(check_out_date) >= ?`,
        [today, today]
      );
      if (summary.total_rooms > 0) {
        summary.average_occupancy_rate = (occupiedRoomsCount[0].currently_occupied_rooms / summary.total_rooms);
      } else {
        summary.average_occupancy_rate = 0;
      }
      summary.currently_occupied_rooms = occupiedRoomsCount[0].currently_occupied_rooms;


      // List of recent reservations (e.g., last 5)
      const [recentReservations] = await db.promise().query(`
        SELECT r.id, r.user_id, r.hotel_id, r.room_id, r.check_in_date, r.check_out_date, r.status, u.username 
        FROM reservations r
        JOIN users u ON r.user_id = u.id
        ORDER BY r.created_at DESC 
        LIMIT 5
      `);
      summary.recent_reservations = recentReservations;

      res.status(200).json(summary);
    } catch (error) {
      logger.error('Error fetching admin summary:', error);
      res.status(500).json({ message: 'Error fetching admin summary data' });
    }
  }
);

// GET /hotel-summary/:hotelId (Hotel Manager Dashboard Summary)
router.get('/hotel-summary/:hotelId',
  [
    authenticateToken,
    requireRole(['admin', 'hotel_manager']), // Admin can also access this for any hotel
    (req, res, next) => { // Custom middleware to check hotelId for manager
      const { role, hotel_id: managerHotelId } = req.user;
      const requestedHotelId = parseInt(req.params.hotelId, 10);

      if (isNaN(requestedHotelId)) {
        return res.status(400).json({ message: 'Hotel ID must be an integer.'});
      }

      if (role === 'hotel_manager' && managerHotelId !== requestedHotelId) {
        return res.status(403).json({ message: 'Forbidden: You do not have access to this hotel\'s summary.' });
      }
      // If admin, or if managerHotelId matches requestedHotelId, proceed
      next();
    }
  ],
  async (req, res) => {
    const hotelId = parseInt(req.params.hotelId, 10);

    try {
      const summary = {};
      const today = new Date().toISOString().slice(0, 10);

      // Check if hotel exists
      const [hotelExists] = await db.promise().query('SELECT id FROM hotels WHERE id = ?', [hotelId]);
      if (hotelExists.length === 0) {
        return res.status(404).json({ message: 'Hotel not found' });
      }

      // Total rooms in this hotel
      const [roomCount] = await db.promise().query('SELECT COUNT(*) as total FROM rooms WHERE hotel_id = ?', [hotelId]);
      summary.total_rooms_in_hotel = roomCount[0].total;

      // Current occupancy for this hotel (simplified)
      const [occupiedRoomsCount] = await db.promise().query(
        `SELECT COUNT(DISTINCT room_id) as currently_occupied_rooms 
         FROM reservations 
         WHERE hotel_id = ? AND status = 'confirmed' AND DATE(check_in_date) <= ? AND DATE(check_out_date) >= ?`,
        [hotelId, today, today]
      );
      if (summary.total_rooms_in_hotel > 0) {
        summary.current_occupancy_rate_hotel = (occupiedRoomsCount[0].currently_occupied_rooms / summary.total_rooms_in_hotel);
      } else {
        summary.current_occupancy_rate_hotel = 0;
      }
      summary.currently_occupied_rooms_hotel = occupiedRoomsCount[0].currently_occupied_rooms;

      // Number of reservations for this hotel (by status)
      const [reservationStatsHotel] = await db.promise().query(`
        SELECT 
          COUNT(*) as total_reservations,
          SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_reservations,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_reservations,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_reservations,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_reservations
        FROM reservations
        WHERE hotel_id = ?
      `, [hotelId]);
      summary.reservations_hotel = reservationStatsHotel[0];

      // Revenue for this hotel (sum of amounts from 'paid' invoices linked to reservations for this hotel)
      const [revenueResultHotel] = await db.promise().query(
        `SELECT SUM(i.amount) as hotel_revenue 
         FROM invoices i
         JOIN reservations r ON i.reservation_id = r.id
         WHERE r.hotel_id = ? AND i.status = 'paid'`,
        [hotelId]
      );
      summary.hotel_revenue = revenueResultHotel[0].hotel_revenue || 0;

      // Recent bookings for this hotel (e.g., last 5)
      const [recentBookingsHotel] = await db.promise().query(`
        SELECT r.id, r.user_id, r.room_id, r.check_in_date, r.check_out_date, r.status, u.username 
        FROM reservations r
        JOIN users u ON r.user_id = u.id
        WHERE r.hotel_id = ?
        ORDER BY r.created_at DESC 
        LIMIT 5
      `, [hotelId]);
      summary.recent_bookings_hotel = recentBookingsHotel;

      res.status(200).json(summary);
    } catch (error) {
      logger.error(`Error fetching hotel summary for hotel ${hotelId}:`, error);
      res.status(500).json({ message: 'Error fetching hotel summary data' });
    }
  }
);

// GET /user-summary (User Dashboard Summary)
router.get('/user-summary',
  authenticateToken, // No specific role needed, just an authenticated user
  async (req, res) => {
    const { id: userId } = req.user; // Get user ID from the token

    try {
      const summary = {};
      const today = new Date().toISOString().slice(0, 10);

      // Total number of their reservations (overall and by status)
      const [reservationStats] = await db.promise().query(`
        SELECT 
          COUNT(*) as total_reservations,
          SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_reservations,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_reservations,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_reservations,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_reservations
        FROM reservations
        WHERE user_id = ?
      `, [userId]);
      summary.reservations = reservationStats[0];

      // Number of upcoming reservations
      const [upcomingReservationsCount] = await db.promise().query(`
        SELECT COUNT(*) as total
        FROM reservations
        WHERE user_id = ? AND DATE(check_in_date) >= ? AND status IN ('confirmed', 'pending')
      `, [userId, today]);
      summary.upcoming_reservations_count = upcomingReservationsCount[0].total;

      // Number of past reservations
      const [pastReservationsCount] = await db.promise().query(`
        SELECT COUNT(*) as total
        FROM reservations
        WHERE user_id = ? AND DATE(check_out_date) < ? AND status = 'completed'
      `, [userId, today]);
      summary.past_reservations_count = pastReservationsCount[0].total;

      // Total amount spent (from their 'paid' invoices)
      const [spentResult] = await db.promise().query(
        "SELECT SUM(amount) as total_spent FROM invoices WHERE user_id = ? AND status = 'paid'",
        [userId]
      );
      summary.total_spent = spentResult[0].total_spent || 0;

      // List of their recent/upcoming reservations (e.g., last 5, mixed, ordered by check_in_date)
      const [recentUpcomingReservations] = await db.promise().query(`
        SELECT r.id, r.hotel_id, r.room_id, r.check_in_date, r.check_out_date, r.status, h.name as hotel_name
        FROM reservations r
        JOIN hotels h ON r.hotel_id = h.id
        WHERE r.user_id = ?
        ORDER BY CASE
            WHEN DATE(r.check_in_date) >= ? THEN 0  -- Upcoming first
            ELSE 1                               -- Then past
        END, 
        r.check_in_date DESC 
        LIMIT 5
      `, [userId, today]);
      summary.recent_upcoming_reservations = recentUpcomingReservations;

      res.status(200).json(summary);
    } catch (error) {
      logger.error(`Error fetching user summary for user ${userId}:`, error);
      res.status(500).json({ message: 'Error fetching user summary data' });
    }
  }
);

module.exports = router;
