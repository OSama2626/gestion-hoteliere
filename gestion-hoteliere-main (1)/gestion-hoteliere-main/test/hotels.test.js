const request = require('supertest');
const app = require('../app'); // Assuming your Express app is exported from app.js
const db = new (require('../config/database'))().pool; // Direct access for setup/teardown
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'hotels');

let server;
let adminToken, managerToken, managerToken2, userToken;
let adminUserId, managerUserId, managerUserId2, regularUserId;
let testHotelId1, testHotelId2; // Hotel 1 for managerUserId, Hotel 2 for other tests
let testImageId1, testImageId2; // For image tests

// Helper to generate JWT
const generateToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role, hotel_id: user.hotel_id }, JWT_SECRET, { expiresIn: '1h' });
};

// Helper to clear uploads directory
const clearUploadsDir = () => {
  if (fs.existsSync(UPLOADS_DIR)) {
    fs.readdirSync(UPLOADS_DIR).forEach(file => {
      // Add a check to ensure we only delete test files if possible, e.g., by prefix or known names
      // For now, deleting all files in this test-specific directory
      try {
        fs.unlinkSync(path.join(UPLOADS_DIR, file));
      } catch (err) {
        console.error("Error deleting test file:", err);
      }
    });
  }
};

beforeAll(async () => {
  server = app.listen(process.env.PORT || 3002); // Use a different port for testing

  // Ensure uploads directory exists
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  clearUploadsDir(); // Clear it before tests start

  // Clear relevant tables
  await db.promise().query('SET FOREIGN_KEY_CHECKS = 0');
  await db.promise().query('TRUNCATE TABLE hotel_images');
  await db.promise().query('TRUNCATE TABLE rooms'); // Rooms might reference hotels via room_types
  await db.promise().query('TRUNCATE TABLE room_types'); // Room types reference hotels
  await db.promise().query('TRUNCATE TABLE room_rates'); // Rates reference hotels/room_types
  await db.promise().query('TRUNCATE TABLE hotels');
  await db.promise().query('TRUNCATE TABLE users');
  await db.promise().query('SET FOREIGN_KEY_CHECKS = 1');

  // Seed Users
  const adminPassword = await bcrypt.hash('password123', 10);
  let [adminResult] = await db.promise().query(
    "INSERT INTO users (username, email, password, role, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)",
    ['hoteladmin', 'h.admin@test.com', adminPassword, 'admin', 'Hotel', 'Admin']
  );
  adminUserId = adminResult.insertId;
  adminToken = generateToken({ id: adminUserId, role: 'admin', hotel_id: null });

  const managerPassword = await bcrypt.hash('password123', 10);
  let [managerResult] = await db.promise().query(
    "INSERT INTO users (username, email, password, role, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)",
    ['hotelmanager1', 'h.manager1@test.com', managerPassword, 'hotel_manager', 'Hotel', 'Manager1']
  );
  managerUserId = managerResult.insertId;
  // managerToken will be generated after their hotel is created and they are assigned

  let [managerResult2] = await db.promise().query(
    "INSERT INTO users (username, email, password, role, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)",
    ['hotelmanager2', 'h.manager2@test.com', managerPassword, 'hotel_manager', 'Hotel', 'Manager2']
  );
  managerUserId2 = managerResult2.insertId;
   managerToken2 = generateToken({ id: managerUserId2, role: 'hotel_manager', hotel_id: null }); // Initially unassigned

  const userPassword = await bcrypt.hash('password123', 10);
  let [userResult] = await db.promise().query(
    "INSERT INTO users (username, email, password, role, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)",
    ['hoteluser', 'h.user@test.com', userPassword, 'user', 'Hotel', 'User']
  );
  regularUserId = userResult.insertId;
  userToken = generateToken({ id: regularUserId, role: 'user', hotel_id: null });

  // Seed Hotels
  let [hotelResult1] = await db.promise().query(
    "INSERT INTO hotels (name, address, city, country, description, manager_id, amenities, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ['Manager Hotel 1', '1 Manager Rd', 'Manageville', 'Testland', 'Hotel for Manager 1', managerUserId, 'wifi,pool', true]
  );
  testHotelId1 = hotelResult1.insertId;
  await db.promise().query("UPDATE users SET hotel_id = ? WHERE id = ?", [testHotelId1, managerUserId]); // Assign hotel to manager
  managerToken = generateToken({ id: managerUserId, role: 'hotel_manager', hotel_id: testHotelId1 });


  let [hotelResult2] = await db.promise().query(
    "INSERT INTO hotels (name, address, city, country, description, manager_id, amenities, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ['Admin Test Hotel 2', '2 Admin Ave', 'AdminCity', 'Testland', 'Hotel for Admin tests', adminUserId, 'gym,spa', true]
  );
  testHotelId2 = hotelResult2.insertId;
  
  // Seed an image for testHotelId1 for update/delete tests
  const [imageResult1] = await db.promise().query(
    "INSERT INTO hotel_images (hotel_id, image_url, alt_text, display_order) VALUES (?, ?, ?, ?)",
    [testHotelId1, '/uploads/hotels/initial-test-image1.jpg', 'Initial Test Image 1', 1]
  );
  testImageId1 = imageResult1.insertId;
  // Create a dummy file for it to simulate existing upload for deletion test
  if (!fs.existsSync(path.join(UPLOADS_DIR, 'initial-test-image1.jpg'))) {
    fs.writeFileSync(path.join(UPLOADS_DIR, 'initial-test-image1.jpg'), 'dummy content');
  }


  const [imageResult2] = await db.promise().query(
    "INSERT INTO hotel_images (hotel_id, image_url, alt_text, display_order) VALUES (?, ?, ?, ?)",
    [testHotelId1, '/uploads/hotels/initial-test-image2.jpg', 'Initial Test Image 2', 0]
  );
  testImageId2 = imageResult2.insertId;
  if (!fs.existsSync(path.join(UPLOADS_DIR, 'initial-test-image2.jpg'))) {
    fs.writeFileSync(path.join(UPLOADS_DIR, 'initial-test-image2.jpg'), 'dummy content');
  }

});

afterAll(async () => {
  clearUploadsDir(); // Clear uploads after tests

  await db.promise().query('SET FOREIGN_KEY_CHECKS = 0');
  await db.promise().query('TRUNCATE TABLE hotel_images');
  await db.promise().query('TRUNCATE TABLE rooms');
  await db.promise().query('TRUNCATE TABLE room_types');
  await db.promise().query('TRUNCATE TABLE room_rates');
  await db.promise().query('TRUNCATE TABLE hotels');
  await db.promise().query('TRUNCATE TABLE users');
  await db.promise().query('SET FOREIGN_KEY_CHECKS = 1');

  await db.end();
  server.close();
});

// --- Test Suites Below ---

describe('Hotel Update (PUT /api/hotels/:id)', () => {
  it('should allow admin to update any hotel', async () => {
    const updatedData = { name: 'Admin Updated Hotel Name', city: 'NewCity' };
    const res = await request(app)
      .put(`/api/hotels/${testHotelId1}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updatedData);
    expect(res.statusCode).toEqual(200);
    expect(res.body.name).toBe(updatedData.name);
    expect(res.body.city).toBe(updatedData.city);
  });

  it('should allow hotel manager to update their own hotel', async () => {
    const updatedData = { description: 'Manager updated description for their hotel.' };
    const res = await request(app)
      .put(`/api/hotels/${testHotelId1}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send(updatedData);
    expect(res.statusCode).toEqual(200);
    expect(res.body.description).toBe(updatedData.description);
  });

  it('should forbid hotel manager from updating another manager\'s hotel', async () => {
    const updatedData = { name: 'Manager Trespass Attempt' };
    const res = await request(app)
      .put(`/api/hotels/${testHotelId2}`) // testHotelId2 is managed by admin in seed
      .set('Authorization', `Bearer ${managerToken}`) // managerToken is for testHotelId1
      .send(updatedData);
    expect(res.statusCode).toEqual(403);
  });
  
  it('should allow admin to change manager_id', async () => {
    const res = await request(app)
      .put(`/api/hotels/${testHotelId1}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ manager_id: managerUserId2 });
    expect(res.statusCode).toEqual(200);
    expect(res.body.manager_id).toBe(managerUserId2);
    // Revert for other tests
    await request(app).put(`/api/hotels/${testHotelId1}`).set('Authorization', `Bearer ${adminToken}`).send({ manager_id: managerUserId });
  });

  it('should forbid hotel manager from changing manager_id', async () => {
    const res = await request(app)
      .put(`/api/hotels/${testHotelId1}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ manager_id: managerUserId2 });
    expect(res.statusCode).toEqual(403);
  });

  it('should fail with invalid data (e.g., rating out of bounds)', async () => {
    const res = await request(app)
      .put(`/api/hotels/${testHotelId1}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rating: 6 });
    expect(res.statusCode).toEqual(400);
    expect(res.body.errors[0].msg).toContain('Rating must be between 0 and 5');
  });
  
  it('should return 404 for updating non-existent hotel', async () => {
    const res = await request(app)
      .put(`/api/hotels/99999`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: "Ghost Hotel" });
    expect(res.statusCode).toEqual(404);
  });
});

describe('Hotel Delete (DELETE /api/hotels/:id)', () => {
  let hotelToDeleteId;
  beforeEach(async () => { // Create a fresh hotel for each delete test
    const [result] = await db.promise().query(
      "INSERT INTO hotels (name, address, city, country, description, manager_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ['Hotel For Deletion', '1 Delete Ln', 'Deleteville', 'Testland', 'To be deleted', adminUserId, true]
    );
    hotelToDeleteId = result.insertId;
  });

  afterEach(async () => { // Ensure cleanup even if a test fails
    if (hotelToDeleteId) {
        await db.promise().query("DELETE FROM hotels WHERE id = ?", [hotelToDeleteId]);
        hotelToDeleteId = null;
    }
  });

  it('should allow admin to soft-delete a hotel', async () => {
    const res = await request(app)
      .delete(`/api/hotels/${hotelToDeleteId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toContain('deactivated successfully');

    const [hotelCheck] = await db.promise().query("SELECT is_active FROM hotels WHERE id = ?", [hotelToDeleteId]);
    expect(hotelCheck[0].is_active).toBe(0); // 0 for false in MySQL boolean
  });

  it('should handle deleting an already deactivated hotel gracefully', async () => {
    await request(app).delete(`/api/hotels/${hotelToDeleteId}`).set('Authorization', `Bearer ${adminToken}`); // First delete
    const res = await request(app) // Second delete
      .delete(`/api/hotels/${hotelToDeleteId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toContain('already deactivated');
  });

  it('should forbid non-admin from deleting a hotel', async () => {
    const res = await request(app)
      .delete(`/api/hotels/${hotelToDeleteId}`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.statusCode).toEqual(403);
  });
  
  it('should return 404 for deleting non-existent hotel', async () => {
    const res = await request(app)
      .delete(`/api/hotels/99999`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toEqual(404);
  });
  
  // Mock logger.warn to test dependency warnings
  it('should log warnings for dependencies when deleting a hotel', async () => {
    const mockLoggerWarn = jest.spyOn(require('../utils/logger'), 'warn');
    // Seed a room for the hotel to trigger the warning
    const [roomTypeRes] = await db.promise().query("INSERT INTO room_types (hotel_id, name, capacity) VALUES (?,?,?)", [hotelToDeleteId, "Test Room Type", 2]);
    const roomTypeId = roomTypeRes.insertId;
    await db.promise().query("INSERT INTO rooms (hotel_id, room_type_id, room_number) VALUES (?,?,?)", [hotelToDeleteId, roomTypeId, "101"]);

    await request(app)
      .delete(`/api/hotels/${hotelToDeleteId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(mockLoggerWarn).toHaveBeenCalledWith(expect.stringContaining(`associated room(s)`));
    // Add reservation check if needed
    mockLoggerWarn.mockRestore();
    await db.promise().query("DELETE FROM rooms WHERE hotel_id = ?", [hotelToDeleteId]);
    await db.promise().query("DELETE FROM room_types WHERE hotel_id = ?", [hotelToDeleteId]);
  });
});

describe('Hotel Image Management (/api/hotels/:id/images)', () => {
  // POST /:id/images
  it('should allow admin to upload images to a hotel', async () => {
    const res = await request(app)
      .post(`/api/hotels/${testHotelId2}/images`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('images', path.join(__dirname, 'test-image.png')) // Ensure you have a test-image.png in test/
      .field('alt_texts[]', 'Admin Upload Alt Text')
      .field('display_orders[]', '1');
    expect(res.statusCode).toEqual(201);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('image_url');
    expect(res.body[0].alt_text).toBe('Admin Upload Alt Text');
    // Store one of these image_urls for cleanup
    if (res.body[0] && res.body[0].image_url) {
      // fs.unlinkSync(path.join(__dirname, '..', res.body[0].image_url)); // Cleanup the uploaded file
    }
  });

  it('should allow hotel manager to upload images to their hotel', async () => {
     const res = await request(app)
      .post(`/api/hotels/${testHotelId1}/images`)
      .set('Authorization', `Bearer ${managerToken}`)
      .attach('images', path.join(__dirname, 'test-image.png'))
      .field('alt_texts[]', 'Manager Upload Alt Text');
    expect(res.statusCode).toEqual(201);
    expect(res.body[0].hotel_id).toBe(testHotelId1);
    // if (res.body[0] && res.body[0].image_url) {
    //   fs.unlinkSync(path.join(__dirname, '..', res.body[0].image_url));
    // }
  });
  
  it('should forbid hotel manager from uploading to another hotel', async () => {
    const res = await request(app)
      .post(`/api/hotels/${testHotelId2}/images`)
      .set('Authorization', `Bearer ${managerToken}`) // managerToken is for testHotelId1
      .attach('images', path.join(__dirname, 'test-image.png'));
    expect(res.statusCode).toEqual(403);
  });

  // GET /:id/images
  it('should allow any authenticated user to list images for a hotel', async () => {
    const res = await request(app)
      .get(`/api/hotels/${testHotelId1}/images`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2); // From beforeAll seed
  });

  // PUT /:id/images/:imageId
  it('should allow admin to update image details', async () => {
    const updatedDetails = { alt_text: 'Updated by Admin', display_order: 5 };
    const res = await request(app)
      .put(`/api/hotels/${testHotelId1}/images/${testImageId1}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updatedDetails);
    expect(res.statusCode).toEqual(200);
    expect(res.body.alt_text).toBe(updatedDetails.alt_text);
    expect(res.body.display_order).toBe(updatedDetails.display_order);
  });

  it('should allow manager to update image details for their hotel', async () => {
    const updatedDetails = { alt_text: 'Updated by Manager' };
     const res = await request(app)
      .put(`/api/hotels/${testHotelId1}/images/${testImageId2}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send(updatedDetails);
    expect(res.statusCode).toEqual(200);
    expect(res.body.alt_text).toBe(updatedDetails.alt_text);
  });

  // DELETE /:id/images/:imageId
  it('should allow admin to delete an image', async () => {
    // Create a temp image for this specific test
    const [tmpImgResult] = await db.promise().query(
        "INSERT INTO hotel_images (hotel_id, image_url, alt_text, display_order) VALUES (?, ?, ?, ?)",
        [testHotelId1, '/uploads/hotels/temp-delete-image.jpg', 'Temp Delete Image', 10]
    );
    const tmpImageId = tmpImgResult.insertId;
    fs.writeFileSync(path.join(UPLOADS_DIR, 'temp-delete-image.jpg'), 'delete me');

    const res = await request(app)
      .delete(`/api/hotels/${testHotelId1}/images/${tmpImageId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toContain('deleted successfully');
    expect(fs.existsSync(path.join(UPLOADS_DIR, 'temp-delete-image.jpg'))).toBe(false);
  });
  
   it('should allow manager to delete an image from their hotel', async () => {
    // Create another temp image
    const [tmpImgResult] = await db.promise().query(
        "INSERT INTO hotel_images (hotel_id, image_url, alt_text, display_order) VALUES (?, ?, ?, ?)",
        [testHotelId1, '/uploads/hotels/manager-delete-image.jpg', 'Manager Delete Image', 11]
    );
    const tmpImageId = tmpImgResult.insertId;
    fs.writeFileSync(path.join(UPLOADS_DIR, 'manager-delete-image.jpg'), 'delete me');
    
    const res = await request(app)
      .delete(`/api/hotels/${testHotelId1}/images/${tmpImageId}`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.statusCode).toEqual(200);
    expect(fs.existsSync(path.join(UPLOADS_DIR, 'manager-delete-image.jpg'))).toBe(false);
  });
});

describe('Hotel Amenity Management (PUT /api/hotels/:id/amenities)', () => {
  it('should allow admin to update amenities', async () => {
    const newAmenities = { amenities: ['updated_pool', 'updated_gym', 'sauna'] };
    const res = await request(app)
      .put(`/api/hotels/${testHotelId2}/amenities`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newAmenities);
    expect(res.statusCode).toEqual(200);
    expect(res.body.amenities).toEqual(expect.arrayContaining(newAmenities.amenities));
  });

  it('should allow hotel manager to update amenities for their hotel', async () => {
    const newAmenities = { amenities: ['wifi_updated', 'breakfast_included'] };
    const res = await request(app)
      .put(`/api/hotels/${testHotelId1}/amenities`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send(newAmenities);
    expect(res.statusCode).toEqual(200);
    expect(res.body.amenities).toEqual(expect.arrayContaining(newAmenities.amenities));
  });
  
  it('should allow updating with an empty array to remove all amenities', async () => {
    const newAmenities = { amenities: [] };
    const res = await request(app)
      .put(`/api/hotels/${testHotelId1}/amenities`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send(newAmenities);
    expect(res.statusCode).toEqual(200);
    expect(res.body.amenities).toEqual([]);
  });

  it('should fail with invalid data (not an array)', async () => {
    const res = await request(app)
      .put(`/api/hotels/${testHotelId1}/amenities`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ amenities: "not-an-array" });
    expect(res.statusCode).toEqual(400);
    expect(res.body.errors[0].msg).toContain('Amenities must be an array');
  });
  
  it('should fail with invalid data (array items not strings)', async () => {
    const res = await request(app)
      .put(`/api/hotels/${testHotelId1}/amenities`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ amenities: ["valid", 123] });
    expect(res.statusCode).toEqual(400);
    expect(res.body.errors[0].msg).toContain('Each amenity must be a non-empty string');
  });
});

// Create a dummy test-image.png file if it doesn't exist for upload tests
if (!fs.existsSync(path.join(__dirname, 'test-image.png'))) {
  fs.writeFileSync(path.join(__dirname, 'test-image.png'), 'dummy png content for testing uploads');
}

// Create a dummy test-file.txt for invalid upload test
if (!fs.existsSync(path.join(__dirname, 'test-file.txt'))) {
  fs.writeFileSync(path.join(__dirname, 'test-file.txt'), 'dummy text content for testing uploads');
}


describe('Hotel Creation (POST /api/hotels)', () => {
  const newHotelData = {
    name: 'Brand New Test Hotel',
    description: 'A fantastic new hotel for testing purposes.',
    address: '123 Test St',
    city: 'Testville',
    country: 'Testland',
    postalCode: 'T3S T1N',
    phone: '123-456-7890',
    email: 'newhotel@test.com',
    website: 'http://newhotel.test.com',
    rating: 4.5,
    amenities: ['wifi', 'parking', 'gym']
  };

  let createdHotelId;

  afterEach(async () => {
    if (createdHotelId) {
      await db.promise().query('DELETE FROM hotels WHERE id = ?', [createdHotelId]);
      createdHotelId = null;
    }
  });

  it('should allow admin to create a new hotel and assign a manager', async () => {
    const res = await request(app)
      .post('/api/hotels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...newHotelData, managerId: managerUserId2 }); // Admin assigns managerUserId2

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    createdHotelId = res.body.id;
    expect(res.body.name).toBe(newHotelData.name);
    expect(res.body.message).toBe('Hôtel créé avec succès');

    // Verify in DB
    const [hotels] = await db.promise().query('SELECT * FROM hotels WHERE id = ?', [createdHotelId]);
    expect(hotels.length).toBe(1);
    expect(hotels[0].manager_id).toBe(managerUserId2);
    expect(hotels[0].city).toBe(newHotelData.city);
  });

  it('should allow hotel_manager to create a new hotel and be auto-assigned', async () => {
    // managerToken2 is for a manager not yet assigned to a hotel in beforeAll
    const res = await request(app)
      .post('/api/hotels')
      .set('Authorization', `Bearer ${managerToken2}`)
      .send({ ...newHotelData, name: "Manager's New Hotel" });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    createdHotelId = res.body.id;
    expect(res.body.name).toBe("Manager's New Hotel");

    // Verify in DB
    const [hotels] = await db.promise().query('SELECT * FROM hotels WHERE id = ?', [createdHotelId]);
    expect(hotels.length).toBe(1);
    expect(hotels[0].manager_id).toBe(managerUserId2); // Should be auto-assigned
  });

  it('should return 400 if required fields are missing', async () => {
    const { name, ...incompleteData } = newHotelData; // Missing name
    const res = await request(app)
      .post('/api/hotels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(incompleteData);

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('errors');
    // Check if the error for 'name' is present
    const nameError = res.body.errors.find(e => e.path === 'name' || (e.param === 'name')); // express-validator v6 vs v7
    expect(nameError).toBeDefined();
  });
  
  const requiredFields = ['name', 'description', 'address', 'city', 'country'];
  for (const field of requiredFields) {
    it(`should return 400 if required field '${field}' is missing`, async () => {
      const testData = { ...newHotelData };
      delete testData[field];
      const res = await request(app)
        .post('/api/hotels')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testData);
      expect(res.statusCode).toEqual(400);
      expect(res.body.errors.some(e => e.path === field || e.param === field)).toBe(true);
    });
  }


  it('should forbid creation by a regular user', async () => {
    const res = await request(app)
      .post('/api/hotels')
      .set('Authorization', `Bearer ${userToken}`) // regularUserToken
      .send(newHotelData);

    expect(res.statusCode).toEqual(403);
  });
});

describe('Hotel Listing (GET /api/hotels)', () => {
  // testHotelId1 (Manager Hotel 1, active) and testHotelId2 (Admin Test Hotel 2, active) are seeded
  // Seed one more active and one inactive hotel for thorough testing
  let testHotelId3Active, testHotelId4Inactive;

  beforeAll(async () => {
    const [hotel3Res] = await db.promise().query(
      "INSERT INTO hotels (name, address, city, country, description, manager_id, amenities, is_active, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ['Active Hotel Three', '3 Test Rd', 'Testville', 'Testland', 'Another active hotel', adminUserId, 'wifi', true, 4.0]
    );
    testHotelId3Active = hotel3Res.insertId;

    const [hotel4Res] = await db.promise().query(
      "INSERT INTO hotels (name, address, city, country, description, manager_id, amenities, is_active, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ['Inactive Hotel Four', '4 Test Rd', 'Testville', 'Testland', 'An inactive hotel', adminUserId, 'parking', false, 3.5]
    );
    testHotelId4Inactive = hotel4Res.insertId;
  });

  afterAll(async () => {
    if (testHotelId3Active) await db.promise().query('DELETE FROM hotels WHERE id = ?', [testHotelId3Active]);
    if (testHotelId4Inactive) await db.promise().query('DELETE FROM hotels WHERE id = ?', [testHotelId4Inactive]);
  });

  it('should list only active hotels without query parameters', async () => {
    const res = await request(app).get('/api/hotels');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('hotels');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.hotels)).toBe(true);
    
    const hotelIds = res.body.hotels.map(h => h.id);
    expect(hotelIds).toContain(testHotelId1);
    expect(hotelIds).toContain(testHotelId2);
    expect(hotelIds).toContain(testHotelId3Active);
    expect(hotelIds).not.toContain(testHotelId4Inactive);

    res.body.hotels.forEach(hotel => {
      expect(hotel.is_active).toBe(1); // is_active is true (1 in DB)
      expect(hotel.amenities).toBeInstanceOf(Array); // Should be an array
      expect(hotel.images).toBeInstanceOf(Array); // Should be an array
    });
  });

  it('should handle pagination correctly', async () => {
    // Assuming at least 3 active hotels are seeded (testHotelId1, testHotelId2, testHotelId3Active)
    const resPage1 = await request(app).get('/api/hotels?limit=2&page=1');
    expect(resPage1.statusCode).toEqual(200);
    expect(resPage1.body.hotels.length).toBe(2);
    expect(resPage1.body.pagination.currentPage).toBe(1);
    expect(resPage1.body.pagination.itemsPerPage).toBe(2);
    // Total active hotels are 3 from initial seed + 1 added in this suite's beforeAll
    expect(resPage1.body.pagination.totalItems).toBe(3); 
    expect(resPage1.body.pagination.totalPages).toBe(Math.ceil(3/2));


    const resPage2 = await request(app).get('/api/hotels?limit=2&page=2');
    expect(resPage2.statusCode).toEqual(200);
    expect(resPage2.body.hotels.length).toBe(1); // Remaining hotel
    expect(resPage2.body.pagination.currentPage).toBe(2);
  });

  it('should filter by city', async () => {
    const res = await request(app).get('/api/hotels?city=Testville');
    expect(res.statusCode).toEqual(200);
    res.body.hotels.forEach(hotel => {
      expect(hotel.city).toBe('Testville');
    });
    // Ensure 'Manager Hotel 1' from Manageville is not present
    const managevilleHotel = res.body.hotels.find(h => h.id === testHotelId1);
    expect(managevilleHotel).toBeUndefined();
  });
  
  it('should filter by rating (minRating)', async () => {
    // testHotelId1 (Manager Hotel 1) has NULL rating in seed
    // testHotelId2 (Admin Test Hotel 2) has NULL rating in seed
    // testHotelId3Active has rating 4.0
    // testHotelId4Inactive has rating 3.5 (but is inactive)
    // Let's update testHotelId1 to have a rating
    await db.promise().query('UPDATE hotels SET rating = ? WHERE id = ?', [3.0, testHotelId1]);
    await db.promise().query('UPDATE hotels SET rating = ? WHERE id = ?', [4.8, testHotelId2]);


    const res = await request(app).get('/api/hotels?rating=4.0'); // Hotels with rating >= 4.0
    expect(res.statusCode).toEqual(200);
    expect(res.body.hotels.length).toBeGreaterThanOrEqual(2); // testHotelId3Active (4.0) and testHotelId2 (4.8)
    res.body.hotels.forEach(hotel => {
      expect(hotel.rating).toBeGreaterThanOrEqual(4.0);
    });
    // Revert rating for testHotelId1 if other tests depend on it being NULL
    await db.promise().query('UPDATE hotels SET rating = NULL WHERE id = ?', [testHotelId1]);
    await db.promise().query('UPDATE hotels SET rating = NULL WHERE id = ?', [testHotelId2]);
  });

  it('should filter by amenities (single amenity)', async () => {
    // testHotelId1 has 'wifi,pool'
    // testHotelId3Active has 'wifi'
    const res = await request(app).get('/api/hotels?amenities=pool');
    expect(res.statusCode).toEqual(200);
    let foundPoolHotel = false;
    res.body.hotels.forEach(hotel => {
        if(hotel.id === testHotelId1){
            expect(hotel.amenities).toContain('pool');
            foundPoolHotel = true;
        }
    });
    expect(foundPoolHotel).toBe(true);
    // Check that testHotelId3Active (only wifi) is not in the list if only "pool" is queried.
    const onlyWifiHotel = res.body.hotels.find(h => h.id === testHotelId3Active && !h.amenities.includes('pool'));
    if(onlyWifiHotel) { // if testHotelId3Active is returned (e.g. because it's the only one and filter is OR)
        expect(onlyWifiHotel.amenities).not.toContain('pool'); // this would fail if it was an AND query
    }
  });
});

describe('Get Specific Hotel (GET /api/hotels/:id)', () => {
  it('should fetch an existing, active hotel successfully', async () => {
    const res = await request(app).get(`/api/hotels/${testHotelId1}`); // testHotelId1 is active
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id', testHotelId1);
    expect(res.body.name).toBe('Manager Hotel 1');
    expect(res.body.is_active).toBe(1); // is_active is true
    expect(res.body).toHaveProperty('manager_first_name'); // Check for manager details
    expect(res.body).toHaveProperty('images'); // Should have images array
    expect(res.body).toHaveProperty('roomTypes'); // Should have roomTypes array
    expect(res.body.amenities).toBeInstanceOf(Array);
    expect(res.body.images).toBeInstanceOf(Array);
  });

  it('should return 404 for a non-existent hotel', async () => {
    const res = await request(app).get('/api/hotels/999999');
    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty('error', 'Hôtel non trouvé');
  });

  it('should return 404 for an inactive hotel', async () => {
    // testHotelId4Inactive is seeded as inactive
    const res = await request(app).get(`/api/hotels/${testHotelId4Inactive}`);
    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty('error', 'Hôtel non trouvé'); // Assuming inactive hotels are treated as not found for public
  });
});


describe('Hotel Image Upload - Invalid File Type', () => {
  it('should return 415 if a non-image file is uploaded', async () => {
    const res = await request(app)
      .post(`/api/hotels/${testHotelId1}/images`)
      .set('Authorization', `Bearer ${managerToken}`) // Manager of testHotelId1
      .attach('images', path.join(__dirname, 'test-file.txt')) // Upload a .txt file
      .field('alt_texts[]', 'Invalid File Upload');
      
    expect(res.statusCode).toEqual(415);
    expect(res.body).toHaveProperty('message'); // Error message from multer fileFilter via global errorHandler
    expect(res.body.message).toContain('Type de fichier non supporté. Seules les images sont autorisées.');
  });
});
