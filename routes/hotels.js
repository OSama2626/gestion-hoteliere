// routes/hotels.js - Gestion des hôtels
const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult, query } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Configuration multer pour les images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/hotels/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'));
    }
  }
});

// Lister tous les hôtels (public)
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('city').optional().trim(),
  query('country').optional().trim(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('rating').optional().isFloat({ min: 0, max: 5 }),
  query('amenities').optional().trim()
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { city, country, minPrice, maxPrice, rating, amenities } = req.query;

    let whereClause = 'WHERE h.is_active = TRUE';
    let params = [];

    if (city) {
      whereClause += ' AND h.city LIKE ?';
      params.push(`%${city}%`);
    }

    if (country) {
      whereClause += ' AND h.country LIKE ?';
      params.push(`%${country}%`);
    }

    if (minPrice) {
      whereClause += ' AND EXISTS (SELECT 1 FROM room_rates rr WHERE rr.hotel_id = h.id AND rr.base_price >= ?)';
      params.push(minPrice);
    }

    if (maxPrice) {
      whereClause += ' AND EXISTS (SELECT 1 FROM room_rates rr WHERE rr.hotel_id = h.id AND rr.base_price <= ?)';
      params.push(maxPrice);
    }

    if (rating) {
      whereClause += ' AND h.rating >= ?';
      params.push(rating);
    }

    if (amenities) {
      const amenityList = amenities.split(',').map(a => a.trim());
      whereClause += ' AND (';
      const amenityConditions = amenityList.map(() => 'h.amenities LIKE ?').join(' OR ');
      whereClause += amenityConditions + ')';
      amenityList.forEach(amenity => params.push(`%${amenity}%`));
    }

    const [hotels] = await db.execute(
      `SELECT h.*, u.first_name as manager_first_name, u.last_name as manager_last_name,
       GROUP_CONCAT(DISTINCT hi.image_url) as images,
       (SELECT MIN(rr.base_price) FROM room_rates rr WHERE rr.hotel_id = h.id) as min_price,
       (SELECT MAX(rr.base_price) FROM room_rates rr WHERE rr.hotel_id = h.id) as max_price
       FROM hotels h
       LEFT JOIN users u ON h.manager_id = u.id
       LEFT JOIN hotel_images hi ON h.id = hi.hotel_id
       ${whereClause}
       GROUP BY h.id
       ORDER BY h.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [countResult] = await db.execute(
      `SELECT COUNT(DISTINCT h.id) as total FROM hotels h ${whereClause}`,
      params
    );

    // Formater les données
    const formattedHotels = hotels.map(hotel => ({
      ...hotel,
      images: hotel.images ? hotel.images.split(',') : [],
      amenities: hotel.amenities ? hotel.amenities.split(',') : []
    }));

    res.json({
      hotels: formattedHotels,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(countResult[0].total / limit),
        totalItems: countResult[0].total,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    logger.error('Erreur récupération hôtels:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Obtenir un hôtel spécifique (public)
router.get('/:id', async (req, res) => {
  try {
    const [hotels] = await db.execute(
      `SELECT h.*, u.first_name as manager_first_name, u.last_name as manager_last_name,
       u.email as manager_email, u.phone as manager_phone
       FROM hotels h
       LEFT JOIN users u ON h.manager_id = u.id
       WHERE h.id = ? AND h.is_active = TRUE`,
      [req.params.id]
    );

    if (hotels.length === 0) {
      return res.status(404).json({ error: 'Hôtel non trouvé' });
    }

    const hotel = hotels[0];

    // Récupérer les images
    const [images] = await db.execute(
      'SELECT image_url, alt_text FROM hotel_images WHERE hotel_id = ? ORDER BY display_order',
      [hotel.id]
    );

    // Récupérer les types de chambres et tarifs
    const [roomTypes] = await db.execute(
      `SELECT rt.*, rr.base_price, rr.weekend_price, rr.holiday_price,
       COUNT(r.id) as available_rooms
       FROM room_types rt
       LEFT JOIN room_rates rr ON rt.id = rr.room_type_id AND rr.hotel_id = ?
       LEFT JOIN rooms r ON rt.id = r.room_type_id AND r.hotel_id = ? AND r.is_available = TRUE
       WHERE rt.hotel_id = ?
       GROUP BY rt.id`,
      [hotel.id, hotel.id, hotel.id]
    );

    res.json({
      ...hotel,
      amenities: hotel.amenities ? hotel.amenities.split(',') : [],
      images,
      roomTypes
    });

  } catch (error) {
    logger.error('Erreur récupération hôtel:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Créer un nouvel hôtel (admin/manager)
router.post('/', authenticateToken, requireRole(['admin', 'hotel_manager']), [
  body('name').trim().isLength({ min: 2 }),
  body('description').trim().isLength({ min: 10 }),
  body('address').trim().isLength({ min: 5 }),
  body('city').trim().isLength({ min: 2 }),
  body('country').trim().isLength({ min: 2 }),
  body('phone').trim().optional(),
  body('email').isEmail().optional(),
  body('website').isURL().optional(),
  body('rating').isFloat({ min: 0, max: 5 }).optional(),
  body('amenities').isArray().optional()
], async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name, description, address, city, country, postalCode,
      phone, email, website, rating, amenities
    } = req.body;

    const managerId = req.user.role === 'admin' ? req.body.managerId || req.user.id : req.user.id;

    const [result] = await connection.execute(