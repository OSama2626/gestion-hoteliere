// routes/hotels.js - Gestion des hôtels
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Added fs for file operations
const { body, validationResult, query, param } = require('express-validator'); // Added param
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
      // ... (assuming the rest of the POST route implementation here)
      // For brevity, the full POST route from the prompt is not repeated
      // but it would normally be here.
      // This placeholder indicates where the PUT route would be added relative to existing code.
      "INSERT INTO hotels (name, description, address, city, country, postal_code, phone, email, website, rating, amenities, manager_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [name, description, address, city, country, postalCode, phone, email, website, rating, amenities ? amenities.join(',') : null, managerId]
    );
    const hotelId = result.insertId;
    await connection.commit();
    res.status(201).json({ id: hotelId, name, message: 'Hôtel créé avec succès' });
  } catch (error) {
    if (connection) await connection.rollback();
    logger.error('Erreur création hôtel:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  } finally {
    if (connection) connection.release();
  }
});


// PUT /:id (Update Hotel)
router.put('/:id', 
  [
    authenticateToken,
    requireRole(['admin', 'hotel_manager']),
    param('id').isInt().withMessage('Hotel ID must be an integer.'),
    body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters.'),
    body('description').optional().trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters.'),
    body('address').optional().trim().isLength({ min: 5 }).withMessage('Address must be at least 5 characters.'),
    body('city').optional().trim().isLength({ min: 2 }).withMessage('City must be at least 2 characters.'),
    body('country').optional().trim().isLength({ min: 2 }).withMessage('Country must be at least 2 characters.'),
    body('postalCode').optional().trim().isString(),
    body('phone').optional().trim().isString(),
    body('email').optional().isEmail().withMessage('Invalid email format.'),
    body('website').optional().isURL().withMessage('Invalid URL format.'),
    body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5.'),
    body('amenities').optional().isArray().withMessage('Amenities must be an array of strings.'),
    body('manager_id').optional().isInt().withMessage('Manager ID must be an integer.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const hotelId = parseInt(req.params.id, 10);
    const { role: userRole, id: userId } = req.user;

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Fetch the hotel
      const [hotels] = await connection.execute('SELECT * FROM hotels WHERE id = ?', [hotelId]);
      if (hotels.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Hotel not found' });
      }
      const hotel = hotels[0];

      // Authorization check: Admin or assigned Hotel Manager
      if (userRole === 'hotel_manager' && hotel.manager_id !== userId) {
        await connection.rollback();
        return res.status(403).json({ message: 'Forbidden: You are not authorized to update this hotel.' });
      }

      // Manager_id update restriction
      if (req.body.manager_id && req.body.manager_id !== hotel.manager_id && userRole !== 'admin') {
        await connection.rollback();
        return res.status(403).json({ message: 'Forbidden: Only admins can change the manager ID.' });
      }
      
      // Build SET clause dynamically
      const updateFields = {};
      const allowedFields = ['name', 'description', 'address', 'city', 'country', 'postalCode', 'phone', 'email', 'website', 'rating', 'amenities', 'manager_id', 'is_active']; // Added is_active for completeness
      
      for (const key in req.body) {
        if (allowedFields.includes(key) && req.body[key] !== undefined) {
          if (key === 'amenities' && Array.isArray(req.body[key])) {
            updateFields[key] = req.body[key].join(',');
          } else if (key === 'manager_id' && userRole === 'admin') { // Ensure only admin can set manager_id
            updateFields[key] = req.body[key];
          } else if (key !== 'manager_id') { // Other fields
             updateFields[key] = req.body[key];
          }
        }
      }
      
      // Ensure manager_id is only processed if user is admin
      if (req.body.manager_id !== undefined && userRole !== 'admin') {
        delete updateFields.manager_id; // remove if non-admin tried to set it
      }


      if (Object.keys(updateFields).length === 0) {
        await connection.rollback();
        return res.status(400).json({ message: 'No valid fields provided for update.' });
      }

      updateFields.updated_at = new Date(); // Update the timestamp

      const setClause = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(updateFields), hotelId];

      await connection.execute(`UPDATE hotels SET ${setClause} WHERE id = ?`, values);
      await connection.commit();

      // Fetch the updated hotel data to return
      const [updatedHotels] = await db.execute( // Use db for final fetch, not connection to avoid issues if connection was released. Or re-use connection.
         `SELECT h.*, u.first_name as manager_first_name, u.last_name as manager_last_name
          FROM hotels h LEFT JOIN users u ON h.manager_id = u.id 
          WHERE h.id = ?`, [hotelId]);
      
      const updatedHotel = updatedHotels[0];
      // Format amenities for response
      if (updatedHotel.amenities && typeof updatedHotel.amenities === 'string') {
        updatedHotel.amenities = updatedHotel.amenities.split(',');
      } else if (!updatedHotel.amenities) {
        updatedHotel.amenities = [];
      }


      logger.info(`Hotel with ID ${hotelId} updated successfully by user ${userId}.`);
      res.status(200).json(updatedHotel);

    } catch (error) {
      if (connection) await connection.rollback();
      logger.error(`Error updating hotel ${hotelId}:`, error);
      res.status(500).json({ message: 'Error updating hotel' });
    } finally {
      if (connection) connection.release();
    }
  }
);

// PUT /:id/amenities (Update Hotel Amenities)
router.put('/:id/amenities',
  [
    authenticateToken,
    requireRole(['admin', 'hotel_manager']),
    param('id').isInt().withMessage('Hotel ID must be an integer.'),
    body('amenities').isArray().withMessage('Amenities must be an array.'),
    body('amenities.*').isString().trim().notEmpty().withMessage('Each amenity must be a non-empty string.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const hotelId = parseInt(req.params.id, 10);
    const newAmenitiesArray = req.body.amenities;
    const { role: userRole, id: userId, hotel_id: managerHotelId } = req.user;

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Fetch the hotel
      const [hotels] = await connection.execute('SELECT id, manager_id FROM hotels WHERE id = ?', [hotelId]);
      if (hotels.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Hotel not found.' });
      }
      const hotel = hotels[0];

      // 2. Authorization check
      if (userRole === 'hotel_manager' && hotel.manager_id !== userId && managerHotelId !== hotelId) {
        await connection.rollback();
        return res.status(403).json({ message: 'Forbidden: You are not authorized to update amenities for this hotel.' });
      }

      // 3. Convert amenities array to comma-separated string
      const amenitiesString = newAmenitiesArray.join(',');
      const newUpdatedAt = new Date();

      // 4. Update amenities and updated_at timestamp
      const [updateResult] = await connection.execute(
        'UPDATE hotels SET amenities = ?, updated_at = ? WHERE id = ?',
        [amenitiesString, newUpdatedAt, hotelId]
      );

      if (updateResult.affectedRows === 0) {
        // Should not happen if the hotel was found, but as a safeguard
        await connection.rollback();
        logger.error(`Failed to update amenities for hotel ${hotelId} after initial checks.`);
        return res.status(500).json({ message: 'Failed to update hotel amenities. Please try again.' });
      }

      await connection.commit();

      // 5. Fetch and return the updated hotel object
      const [updatedHotels] = await db.execute( // Use db for final fetch
        `SELECT h.*, u.first_name as manager_first_name, u.last_name as manager_last_name
         FROM hotels h LEFT JOIN users u ON h.manager_id = u.id 
         WHERE h.id = ?`, [hotelId]
      );
      const updatedHotel = updatedHotels[0];
      if (updatedHotel.amenities && typeof updatedHotel.amenities === 'string') {
        updatedHotel.amenities = updatedHotel.amenities.split(',').filter(a => a); // filter empty strings if amenitiesString was empty
      } else {
        updatedHotel.amenities = [];
      }
      
      logger.info(`Amenities for hotel ${hotelId} updated successfully by user ${userId}.`);
      res.status(200).json(updatedHotel);

    } catch (error) {
      if (connection) await connection.rollback();
      logger.error(`Error updating amenities for hotel ${hotelId}:`, error);
      res.status(500).json({ message: 'Error updating hotel amenities.' });
    } finally {
      if (connection) connection.release();
    }
  }
);

// PUT /:id/images/:imageId (Update Image Details)
router.put('/:id/images/:imageId',
  [
    authenticateToken,
    requireRole(['admin', 'hotel_manager']),
    param('id').isInt().withMessage('Hotel ID must be an integer.'),
    param('imageId').isInt().withMessage('Image ID must be an integer.'),
    body('alt_text').optional().isString().trim().withMessage('Alt text must be a string.'),
    body('display_order').optional().isInt().withMessage('Display order must be an integer.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const hotelId = parseInt(req.params.id, 10);
    const imageId = parseInt(req.params.imageId, 10);
    const { alt_text, display_order } = req.body;
    const { role: userRole, id: userId, hotel_id: managerHotelId } = req.user;

    if (alt_text === undefined && display_order === undefined) {
      return res.status(400).json({ message: 'No fields provided for update (alt_text or display_order).' });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Check if hotel exists
      const [hotels] = await connection.execute('SELECT id, manager_id FROM hotels WHERE id = ?', [hotelId]);
      if (hotels.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Hotel not found.' });
      }
      const hotel = hotels[0];

      // Authorization for hotel manager
      if (userRole === 'hotel_manager' && hotel.manager_id !== userId && managerHotelId !== hotelId) {
        await connection.rollback();
        return res.status(403).json({ message: 'Forbidden: You are not authorized to update images for this hotel.' });
      }

      // Fetch the image record
      const [images] = await connection.execute('SELECT id, hotel_id FROM hotel_images WHERE id = ?', [imageId]);
      if (images.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Image not found.' });
      }
      const image = images[0];

      // Verify image belongs to the specified hotel
      if (image.hotel_id !== hotelId) {
        await connection.rollback();
        return res.status(404).json({ message: 'Image not associated with this hotel.' });
      }

      const updateFields = {};
      if (alt_text !== undefined) updateFields.alt_text = alt_text;
      if (display_order !== undefined) updateFields.display_order = display_order;
      
      if (Object.keys(updateFields).length === 0) {
         // Should be caught by the initial check, but as a safeguard
        await connection.rollback();
        return res.status(400).json({ message: 'No valid fields to update.' });
      }

      const setClause = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(updateFields), imageId];

      const [updateResult] = await connection.execute(
        `UPDATE hotel_images SET ${setClause} WHERE id = ?`,
        values
      );

      if (updateResult.affectedRows === 0) {
        // Could happen if data is same, or image deleted concurrently.
        // Fetch to confirm. If image is there, it means data was same.
        const [checkImage] = await connection.execute('SELECT * FROM hotel_images WHERE id = ?', [imageId]);
        if(checkImage.length > 0) {
             await connection.commit(); // Commit as no actual change was needed, but operation is 'successful'
             return res.status(200).json(checkImage[0]);
        }
        await connection.rollback();
        return res.status(404).json({ message: 'Image not found or no changes made.' });
      }
      
      await connection.commit();
      
      // Fetch and return the updated image object
      const [updatedImages] = await db.execute('SELECT * FROM hotel_images WHERE id = ?', [imageId]); // Use db for final fresh fetch
      logger.info(`Image ${imageId} for hotel ${hotelId} updated successfully by user ${userId}.`);
      res.status(200).json(updatedImages[0]);

    } catch (error) {
      if (connection) await connection.rollback();
      logger.error(`Error updating image ${imageId} for hotel ${hotelId}:`, error);
      res.status(500).json({ message: 'Error updating image details.' });
    } finally {
      if (connection) connection.release();
    }
  }
);

// DELETE /:id/images/:imageId (Delete a Specific Hotel Image)
router.delete('/:id/images/:imageId',
  [
    authenticateToken,
    requireRole(['admin', 'hotel_manager']),
    param('id').isInt().withMessage('Hotel ID must be an integer.'),
    param('imageId').isInt().withMessage('Image ID must be an integer.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const hotelId = parseInt(req.params.id, 10);
    const imageId = parseInt(req.params.imageId, 10);
    const { role: userRole, id: userId, hotel_id: managerHotelId } = req.user;
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Check if hotel exists
      const [hotels] = await connection.execute('SELECT id, manager_id FROM hotels WHERE id = ?', [hotelId]);
      if (hotels.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Hotel not found.' });
      }
      const hotel = hotels[0];

      // Authorization for hotel manager
      if (userRole === 'hotel_manager' && hotel.manager_id !== userId && managerHotelId !== hotelId) {
        await connection.rollback();
        return res.status(403).json({ message: 'Forbidden: You are not authorized to delete images for this hotel.' });
      }

      // Fetch the image record
      const [images] = await connection.execute('SELECT id, hotel_id, image_url FROM hotel_images WHERE id = ?', [imageId]);
      if (images.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Image not found.' });
      }
      const image = images[0];

      // Verify image belongs to the specified hotel
      if (image.hotel_id !== hotelId) {
        await connection.rollback();
        return res.status(404).json({ message: 'Image not associated with this hotel.' });
      }

      // Delete physical file
      const imagePath = path.join(__dirname, '..', image.image_url); // Assumes image_url starts with /uploads
      try {
        if (fs.existsSync(imagePath)) {
          await fs.promises.unlink(imagePath);
          logger.info(`Successfully deleted physical file: ${imagePath}`);
        } else {
          logger.warn(`Physical file not found for image ${imageId} at path ${imagePath}, but proceeding with DB deletion.`);
        }
      } catch (fileError) {
        // Log error but still attempt DB deletion as per requirement
        logger.error(`Error deleting physical file ${imagePath}:`, fileError);
      }
      
      // Delete image record from database
      const [deleteResult] = await connection.execute('DELETE FROM hotel_images WHERE id = ?', [imageId]);
      if (deleteResult.affectedRows === 0) {
        // This should ideally not happen if the fetch was successful, but as a safeguard
        await connection.rollback();
        logger.warn(`Image record ${imageId} was not found during delete, though fetched earlier.`);
        return res.status(404).json({ message: 'Image not found during delete operation.' });
      }

      await connection.commit();
      logger.info(`Image ${imageId} for hotel ${hotelId} deleted successfully by user ${userId}.`);
      res.status(200).json({ message: 'Image deleted successfully.' });

    } catch (error) {
      if (connection) await connection.rollback();
      logger.error(`Error deleting image ${imageId} for hotel ${hotelId}:`, error);
      res.status(500).json({ message: 'Error deleting image.' });
    } finally {
      if (connection) connection.release();
    }
  }
);

// GET /:id/images (List Images for a Hotel)
router.get('/:id/images',
  [
    authenticateToken, // Any authenticated user can view images
    param('id').isInt().withMessage('Hotel ID must be an integer.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const hotelId = parseInt(req.params.id, 10);

    try {
      // Check if hotel exists
      const [hotels] = await db.execute('SELECT id FROM hotels WHERE id = ?', [hotelId]);
      if (hotels.length === 0) {
        return res.status(404).json({ message: 'Hotel not found. Cannot list images.' });
      }

      const [images] = await db.execute(
        'SELECT id, hotel_id, image_url, alt_text, display_order FROM hotel_images WHERE hotel_id = ? ORDER BY display_order ASC, id ASC',
        [hotelId]
      );

      res.status(200).json(images);
    } catch (error) {
      logger.error(`Error fetching images for hotel ${hotelId}:`, error);
      res.status(500).json({ message: 'Error fetching hotel images.' });
    }
  }
);

// HOTEL IMAGE MANAGEMENT

// POST /:id/images (Upload Images for a Hotel)
router.post('/:id/images',
  [
    authenticateToken,
    requireRole(['admin', 'hotel_manager']),
    param('id').isInt().withMessage('Hotel ID must be an integer.')
  ],
  async (req, res, next) => { // Custom middleware to check hotel existence and authorization before multer processes files
    const hotelId = parseInt(req.params.id, 10);
    const { role: userRole, id: userId, hotel_id: managerHotelId } = req.user;

    try {
      const [hotels] = await db.execute('SELECT id, manager_id FROM hotels WHERE id = ?', [hotelId]);
      if (hotels.length === 0) {
        return res.status(404).json({ message: 'Hotel not found. Cannot upload images.' });
      }
      const hotel = hotels[0];

      if (userRole === 'hotel_manager' && hotel.manager_id !== userId && managerHotelId !== hotelId) {
         // Check if manager_id from hotel table matches the authenticated user's ID,
        // OR if the hotel_id in the user's token (if they are a manager for a specific hotel) matches the hotelId from param.
        return res.status(403).json({ message: 'Forbidden: You are not authorized to upload images for this hotel.' });
      }
      
      req.hotel = hotel; // Pass hotel to the next middleware (upload handler)
      next();
    } catch (error) {
      logger.error(`Error checking hotel ${hotelId} for image upload:`, error);
      return res.status(500).json({ message: 'Error verifying hotel before image upload.' });
    }
  },
  upload.array('images', 10), // Multer middleware after authorization
  async (req, res) => {
    const hotelId = parseInt(req.params.id, 10);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No image files provided.' });
    }

    const { alt_texts, display_orders } = req.body; // These are expected to be arrays if provided

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const uploadedImageObjects = [];

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const imageUrl = `/uploads/hotels/${file.filename}`;
        const altText = alt_texts && alt_texts[i] ? alt_texts[i] : null;
        const displayOrder = display_orders && display_orders[i] ? parseInt(display_orders[i], 10) : 0;

        if (isNaN(displayOrder)) {
            logger.warn(`Invalid display_order value for file ${file.originalname}, defaulting to 0.`);
            displayOrder = 0;
        }

        const [result] = await connection.execute(
          'INSERT INTO hotel_images (hotel_id, image_url, alt_text, display_order) VALUES (?, ?, ?, ?)',
          [hotelId, imageUrl, altText, displayOrder]
        );
        uploadedImageObjects.push({
          id: result.insertId,
          hotel_id: hotelId,
          image_url: imageUrl,
          alt_text: altText,
          display_order: displayOrder
        });
      }

      await connection.commit();
      logger.info(`${req.files.length} images uploaded for hotel ${hotelId} by user ${req.user.id}.`);
      res.status(201).json(uploadedImageObjects);

    } catch (error) {
      if (connection) await connection.rollback();
      logger.error(`Error saving images for hotel ${hotelId}:`, error);
      // If files were uploaded but DB failed, attempt to delete them
      req.files.forEach(file => {
        fs.unlink(file.path, err => {
          if (err) logger.error(`Failed to delete orphaned file ${file.path} after DB error:`, err);
        });
      });
      res.status(500).json({ message: 'Error saving image information.' });
    } finally {
      if (connection) connection.release();
    }
  }
);

// DELETE /:id (Soft Delete Hotel - Admin only)
router.delete('/:id',
  [
    authenticateToken,
    requireRole(['admin']),
    param('id').isInt().withMessage('Hotel ID must be an integer.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const hotelId = parseInt(req.params.id, 10);
    const { id: adminUserId } = req.user;
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Fetch the hotel
      const [hotels] = await connection.execute('SELECT * FROM hotels WHERE id = ?', [hotelId]);
      if (hotels.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Hotel not found' });
      }
      const hotel = hotels[0];

      // 2. Check if already inactive
      if (!hotel.is_active) {
        await connection.rollback();
        return res.status(200).json({ message: 'Hotel is already deactivated.' });
      }

      // 3. Logging Dependencies (Warnings)
      // Check for active rooms
      const [activeRooms] = await connection.execute(
        'SELECT COUNT(*) as count FROM rooms WHERE hotel_id = ?', // Assuming all rooms in a hotel to be deactivated should be considered
        [hotelId]
      );
      if (activeRooms[0].count > 0) {
        logger.warn(`Hotel ${hotelId} has ${activeRooms[0].count} associated room(s). These will become inaccessible if not reassigned.`);
      }

      // Check for current/future reservations
      const today = new Date().toISOString().slice(0, 10);
      const [activeReservations] = await connection.execute(
        `SELECT COUNT(*) as count FROM reservations 
         WHERE hotel_id = ? AND status IN ('confirmed', 'pending', 'checked_in') AND DATE(check_out_date) >= ?`,
        [hotelId, today]
      );
      if (activeReservations[0].count > 0) {
        logger.warn(`Hotel ${hotelId} has ${activeReservations[0].count} current or future reservation(s). Deactivating the hotel might affect these bookings.`);
      }
      
      // 4. Update hotel's is_active status and updated_at
      const newUpdatedAt = new Date();
      const [updateResult] = await connection.execute(
        'UPDATE hotels SET is_active = FALSE, updated_at = ? WHERE id = ?',
        [newUpdatedAt, hotelId]
      );

      if (updateResult.affectedRows === 0) {
        // Should not happen if previous check passed, but as a safeguard
        await connection.rollback();
        logger.error(`Failed to deactivate hotel ${hotelId} after initial checks.`);
        return res.status(500).json({ message: 'Failed to deactivate hotel. Please try again.' });
      }

      await connection.commit();
      logger.info(`Hotel with ID ${hotelId} deactivated successfully by admin ${adminUserId}.`);
      res.status(200).json({ message: 'Hotel deactivated successfully.' });

    } catch (error) {
      if (connection) await connection.rollback();
      logger.error(`Error deactivating hotel ${hotelId}:`, error);
      res.status(500).json({ message: 'Error deactivating hotel' });
    } finally {
      if (connection) connection.release();
    }
  }
);

module.exports = router;