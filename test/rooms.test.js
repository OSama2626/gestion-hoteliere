const request = require('supertest');
const app = require('../app'); // Assuming your Express app is exported from app.js or server.js
const db = new (require('../config/database'))().pool; // Direct access to the pool for setup/teardown
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Environment variables
require('dotenv').config(); // Ensure .env variables are loaded for tests

const JWT_SECRET = process.env.JWT_SECRET || 'testsecret'; // Use a test secret

let server;
let adminToken, managerToken, userToken;
let testHotelId, testRoomTypeId, testRoomId, testRateId;
let adminUserId, managerUserId, regularUserId;

// Helper function to generate JWT
const generateToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role, hotel_id: user.hotel_id }, JWT_SECRET, { expiresIn: '1h' });
};

beforeAll(async () => {
  // Start server
  server = app.listen(process.env.PORT || 3001); // Use a different port for testing if needed

  // Clear relevant tables (order matters due to foreign keys)
  await db.promise().query('DELETE FROM room_rates');
  await db.promise().query('DELETE FROM rooms');
  await db.promise().query('DELETE FROM room_types');
  await db.promise().query('DELETE FROM hotels');
  await db.promise().query('DELETE FROM users');
  
  // Seed a hotel
  const [hotelResult] = await db.promise().query(
    "INSERT INTO hotels (name, address, city, country, description, amenities, main_image_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ['Test Hotel Alpha', '123 Test St', 'Testville', 'Testland', 'A lovely test hotel', JSON.stringify(['pool', 'gym']), 'http://example.com/hotel.jpg']
  );
  testHotelId = hotelResult.insertId;

  // Seed users
  const adminPassword = await bcrypt.hash('password123', 10);
  const [adminResult] = await db.promise().query(
    "INSERT INTO users (username, email, password, role, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)",
    ['testadmin', 'admin@test.com', adminPassword, 'admin', 'Admin', 'User']
  );
  adminUserId = adminResult.insertId;
  adminToken = generateToken({ id: adminUserId, role: 'admin', hotel_id: null });

  const managerPassword = await bcrypt.hash('password123', 10);
  const [managerResult] = await db.promise().query(
    "INSERT INTO users (username, email, password, role, first_name, last_name, hotel_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ['testmanager', 'manager@test.com', managerPassword, 'hotel_manager', 'Manager', 'User', testHotelId]
  );
  managerUserId = managerResult.insertId;
  managerToken = generateToken({ id: managerUserId, role: 'hotel_manager', hotel_id: testHotelId });
  
  const userPassword = await bcrypt.hash('password123', 10);
  const [userResult] = await db.promise().query(
    "INSERT INTO users (username, email, password, role, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)",
    ['testuser', 'user@test.com', userPassword, 'user', 'Regular', 'User']
  );
  regularUserId = userResult.insertId;
  userToken = generateToken({ id: regularUserId, role: 'user', hotel_id: null });

});

afterAll(async () => {
  // Cleanup: Delete created data
  await db.promise().query('DELETE FROM room_rates');
  await db.promise().query('DELETE FROM rooms');
  await db.promise().query('DELETE FROM room_types');
  await db.promise().query('DELETE FROM hotels WHERE id = ?', [testHotelId]);
  await db.promise().query('DELETE FROM users WHERE id IN (?, ?, ?)', [adminUserId, managerUserId, regularUserId]);

  await db.end();
  server.close();
});


describe('Room Type Management (/rooms/types)', () => {
  const newRoomType = {
    hotel_id: null, // Will be set to testHotelId
    name: 'Deluxe Suite',
    description: 'A spacious suite with ocean view.',
    capacity: 2,
    amenities: ['wifi', 'tv', 'minibar']
  };

  beforeEach(() => {
    newRoomType.hotel_id = testHotelId; // Ensure hotel_id is set correctly before each test
  });
  
  // POST /rooms/types - Create Room Type
  it('should create a new room type as admin', async () => {
    const res = await request(app)
      .post('/api/rooms/types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newRoomType);
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe(newRoomType.name);
    expect(res.body.hotel_id).toBe(testHotelId);
    testRoomTypeId = res.body.id; // Save for later tests
  });

  it('should create a new room type as hotel_manager for their hotel', async () => {
    const managerRoomType = { ...newRoomType, name: "Manager's Suite", hotel_id: testHotelId };
    const res = await request(app)
      .post('/api/rooms/types')
      .set('Authorization', `Bearer ${managerToken}`)
      .send(managerRoomType);
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe(managerRoomType.name);
    // We'll need another room type ID for manager-specific tests if we want to keep them separate
    // For now, this just tests creation, the previous testRoomTypeId will be used for subsequent tests.
  });

  it('should fail to create room type with missing name', async () => {
    const { name, ...incompleteRoomType } = newRoomType;
    const res = await request(app)
      .post('/api/rooms/types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(incompleteRoomType);
    expect(res.statusCode).toEqual(400);
    expect(res.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ msg: 'Name is required.' })
    ]));
  });
  
  it('should fail to create room type with invalid hotel_id (non-existent)', async () => {
    const invalidHotelRoomType = { ...newRoomType, hotel_id: 99999 };
    const res = await request(app)
      .post('/api/rooms/types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(invalidHotelRoomType);
    expect(res.statusCode).toEqual(400); // or 500 if FK constraint not handled as validation
    expect(res.body.message).toContain('Invalid hotel_id');
  });

  it('should fail to create room type as regular user (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/rooms/types')
      .set('Authorization', `Bearer ${userToken}`)
      .send(newRoomType);
    expect(res.statusCode).toEqual(403);
  });

  it('should fail to create room type without token (401 Unauthorized)', async () => {
    const res = await request(app)
      .post('/api/rooms/types')
      .send(newRoomType);
    expect(res.statusCode).toEqual(401);
  });

  // GET /rooms/types/hotel/:hotelId - List Room Types for a Hotel
  it('should list room types for a hotel for any authenticated user', async () => {
    const res = await request(app)
      .get(`/api/rooms/types/hotel/${testHotelId}`)
      .set('Authorization', `Bearer ${userToken}`); // Even a regular user can list
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1); // Should have at least the one created
    expect(res.body.some(rt => rt.id === testRoomTypeId)).toBe(true);
  });

  it('should return empty array for a hotel with no room types', async () => {
    const [anotherHotel] = await db.promise().query(
        "INSERT INTO hotels (name, address, city, country) VALUES (?, ?, ?, ?)",
        ['Empty Hotel', '0 Nowhere St', 'Nullsville', 'Voidland']
    );
    const emptyHotelId = anotherHotel.insertId;
    const res = await request(app)
      .get(`/api/rooms/types/hotel/${emptyHotelId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
    await db.promise().query('DELETE FROM hotels WHERE id = ?', [emptyHotelId]);
  });

  // GET /rooms/types/:typeId - Get Specific Room Type
  it('should get a specific room type by ID for any authenticated user', async () => {
    const res = await request(app)
      .get(`/api/rooms/types/${testRoomTypeId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id', testRoomTypeId);
    expect(res.body.name).toBe(newRoomType.name);
  });

  it('should return 404 for a non-existent room type ID', async () => {
    const res = await request(app)
      .get(`/api/rooms/types/99999`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(404);
  });

  // PUT /rooms/types/:typeId - Update Room Type
  it('should update a room type as admin', async () => {
    const updatedData = { name: 'Ultra Deluxe Suite', capacity: 3 };
    const res = await request(app)
      .put(`/api/rooms/types/${testRoomTypeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updatedData);
    expect(res.statusCode).toEqual(200);
    expect(res.body.name).toBe(updatedData.name);
    expect(res.body.capacity).toBe(updatedData.capacity);
  });

  it('should update a room type as hotel_manager for their hotel', async () => {
    // First, hotel_manager creates a room type for their hotel
    const managerRoomTypeData = { hotel_id: testHotelId, name: 'Manager Special', capacity: 2, description: 'Managed by me' };
    let managerRoomTypeRes = await request(app)
      .post('/api/rooms/types')
      .set('Authorization', `Bearer ${managerToken}`)
      .send(managerRoomTypeData);
    expect(managerRoomTypeRes.statusCode).toEqual(201);
    const managerRoomTypeId = managerRoomTypeRes.body.id;

    const updatedData = { name: 'Manager Special Updated', amenities: ['jacuzzi'] };
    const res = await request(app)
      .put(`/api/rooms/types/${managerRoomTypeId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send(updatedData);
    expect(res.statusCode).toEqual(200);
    expect(res.body.name).toBe(updatedData.name);
    expect(res.body.amenities).toContain('jacuzzi');
    
    // Cleanup this specific room type
    await db.promise().query('DELETE FROM room_types WHERE id = ?', [managerRoomTypeId]);
  });
  
  it('should fail to update room type as regular user (403 Forbidden)', async () => {
    const updatedData = { name: 'User Attempt Update' };
    const res = await request(app)
      .put(`/api/rooms/types/${testRoomTypeId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send(updatedData);
    expect(res.statusCode).toEqual(403);
  });

  it('should return 404 when trying to update a non-existent room type', async () => {
    const updatedData = { name: 'No Such Room Type' };
    const res = await request(app)
      .put(`/api/rooms/types/99999`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updatedData);
    expect(res.statusCode).toEqual(404);
  });

  // DELETE /rooms/types/:typeId - Delete Room Type
  it('should fail to delete room type as regular user (403 Forbidden)', async () => {
    const res = await request(app)
      .delete(`/api/rooms/types/${testRoomTypeId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(403);
  });

  it('should delete a room type as admin', async () => {
    // Create a temporary room type to delete
    const tempRoomType = { ...newRoomType, name: 'To Be Deleted Suite' };
    let createRes = await request(app)
      .post('/api/rooms/types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(tempRoomType);
    expect(createRes.statusCode).toEqual(201);
    const tempId = createRes.body.id;

    const res = await request(app)
      .delete(`/api/rooms/types/${tempId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toBe('Room type deleted successfully');

    // Verify it's gone
    const getRes = await request(app)
      .get(`/api/rooms/types/${tempId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.statusCode).toEqual(404);
  });
  
  it('should return 404 when trying to delete a non-existent room type', async () => {
    const res = await request(app)
      .delete(`/api/rooms/types/99999`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toEqual(404);
  });

  // This test for deleting the main testRoomTypeId should be last for Room Types
  // or ensure it's recreated if other tests need it
   it('should delete the main testRoomTypeId as admin (cleanup for next suite)', async () => {
    if (!testRoomTypeId) {
      // In case the initial creation failed or was cleaned up, create it again
      const recreateRes = await request(app)
        .post('/api/rooms/types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newRoomType);
      expect(recreateRes.statusCode).toEqual(201);
      testRoomTypeId = recreateRes.body.id;
    }
    const res = await request(app)
      .delete(`/api/rooms/types/${testRoomTypeId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toEqual(200);

    // Set testRoomTypeId to null so subsequent tests for individual rooms know it needs to be created
    testRoomTypeId = null; 
  });

});

// Placeholder for Individual Rooms and Room Rates tests
describe('Individual Room Management (/rooms)', () => {
  let currentTestRoomTypeId; // Use a specific variable for this suite's room type
  const newRoomData = {
    hotel_id: null, // Will be set to testHotelId
    room_type_id: null, // Will be set to currentTestRoomTypeId
    room_number: '101',
    status: 'available',
    is_available: true
  };

  beforeAll(async () => {
    // Ensure a room type exists for creating rooms
    const roomTypeData = {
        hotel_id: testHotelId,
        name: 'Standard Room for Testing Rooms',
        description: 'A room type for individual room tests.',
        capacity: 2,
        amenities: ['wifi', 'tv']
    };
    const res = await request(app)
      .post('/api/rooms/types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(roomTypeData);
    expect(res.statusCode).toEqual(201);
    currentTestRoomTypeId = res.body.id;
    newRoomData.room_type_id = currentTestRoomTypeId;
    newRoomData.hotel_id = testHotelId;
  });

  afterAll(async () => {
    // Clean up the room type created for this suite
    if (currentTestRoomTypeId) {
      await db.promise().query('DELETE FROM room_types WHERE id = ?', [currentTestRoomTypeId]);
    }
    // Rooms themselves should be cleaned by the main afterAll or specific delete tests
  });

  // POST /rooms - Create Individual Room
  it('should create a new individual room as admin', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newRoomData);
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.room_number).toBe(newRoomData.room_number);
    expect(res.body.hotel_id).toBe(testHotelId);
    expect(res.body.room_type_id).toBe(currentTestRoomTypeId);
    testRoomId = res.body.id; // Save for later tests
  });

  it('should create a new individual room as hotel_manager for their hotel', async () => {
    const managerRoomData = { ...newRoomData, room_number: '102', hotel_id: testHotelId, room_type_id: currentTestRoomTypeId };
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${managerToken}`)
      .send(managerRoomData);
    expect(res.statusCode).toEqual(201);
    expect(res.body.room_number).toBe(managerRoomData.room_number);
     // Clean up this specific room to avoid conflicts
    await db.promise().query('DELETE FROM rooms WHERE id = ?', [res.body.id]);
  });
  
  it('should fail to create a room with a duplicate room number for the same hotel', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newRoomData); // Sending the same data as the first successful test
    expect(res.statusCode).toEqual(409);
    expect(res.body.message).toContain('already exists for this hotel');
  });

  it('should fail to create room with invalid room_type_id', async () => {
    const invalidRoomData = { ...newRoomData, room_number: '103', room_type_id: 99999 };
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(invalidRoomData);
    expect(res.statusCode).toEqual(400); // FK constraint
    expect(res.body.message).toContain('Invalid hotel_id or room_type_id');
  });

  it('should fail to create room as regular user (403 Forbidden)', async () => {
    const userRoomData = { ...newRoomData, room_number: '104' };
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${userToken}`)
      .send(userRoomData);
    expect(res.statusCode).toEqual(403);
  });

  // GET /rooms/hotel/:hotelId - List Rooms for a Hotel
  it('should list rooms for a hotel for any authenticated user', async () => {
    const res = await request(app)
      .get(`/api/rooms/hotel/${testHotelId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some(room => room.id === testRoomId)).toBe(true);
  });

  it('should list rooms for a hotel with room_type_id filter', async () => {
    const res = await request(app)
      .get(`/api/rooms/hotel/${testHotelId}?room_type_id=${currentTestRoomTypeId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach(room => {
      expect(room.room_type_id).toBe(currentTestRoomTypeId);
    });
  });
  
  it('should list rooms for a hotel with status filter', async () => {
    // Create a room with a different status to test filter
    const maintenanceRoomData = { ...newRoomData, room_number: 'Maint-01', status: 'maintenance' };
    let maintRoomRes = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(maintenanceRoomData);
    expect(maintRoomRes.statusCode).toEqual(201);
    const maintRoomId = maintRoomRes.body.id;

    const res = await request(app)
      .get(`/api/rooms/hotel/${testHotelId}?status=maintenance`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    res.body.forEach(room => {
      expect(room.status).toBe('maintenance');
    });
    await db.promise().query('DELETE FROM rooms WHERE id = ?', [maintRoomId]);
  });


  // GET /rooms/:roomId - Get Specific Room
  it('should get a specific room by ID for any authenticated user', async () => {
    const res = await request(app)
      .get(`/api/rooms/${testRoomId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id', testRoomId);
    expect(res.body.room_number).toBe(newRoomData.room_number);
  });

  it('should return 404 for a non-existent room ID', async () => {
    const res = await request(app)
      .get(`/api/rooms/99999`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(404);
  });

  // PUT /rooms/:roomId - Update Room
  it('should update a room as admin', async () => {
    const updatedData = { room_number: '101-Updated', status: 'cleaning' };
    const res = await request(app)
      .put(`/api/rooms/${testRoomId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updatedData);
    expect(res.statusCode).toEqual(200);
    expect(res.body.room_number).toBe(updatedData.room_number);
    expect(res.body.status).toBe(updatedData.status);
  });

  it('should fail to update room with a duplicate room number for the same hotel', async () => {
    // Create another room first
    const anotherRoomData = { ...newRoomData, room_number: '105' };
    const createRes = await request(app).post('/api/rooms').set('Authorization', `Bearer ${adminToken}`).send(anotherRoomData);
    expect(createRes.statusCode).toEqual(201);
    const anotherRoomId = createRes.body.id;

    // Try to update testRoomId to '105' which is now taken
    const res = await request(app)
      .put(`/api/rooms/${testRoomId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ room_number: '105' });
    expect(res.statusCode).toEqual(409);
    
    await db.promise().query('DELETE FROM rooms WHERE id = ?', [anotherRoomId]);
  });

  it('should fail to update room as regular user (403 Forbidden)', async () => {
    const res = await request(app)
      .put(`/api/rooms/${testRoomId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'occupied' });
    expect(res.statusCode).toEqual(403);
  });

  // DELETE /rooms/:roomId - Delete Room
  it('should fail to delete room as regular user (403 Forbidden)', async () => {
    const res = await request(app)
      .delete(`/api/rooms/${testRoomId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(403);
  });

  it('should delete a room as admin', async () => {
     // Create a temporary room to delete
    const tempRoomData = { ...newRoomData, room_number: 'DEL-01' };
    let createRes = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(tempRoomData);
    expect(createRes.statusCode).toEqual(201);
    const tempId = createRes.body.id;

    const res = await request(app)
      .delete(`/api/rooms/${tempId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toBe('Room deleted successfully');

    const getRes = await request(app).get(`/api/rooms/${tempId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.statusCode).toEqual(404);
  });
  
  // This test for deleting the main testRoomId should be last for this suite
   it('should delete the main testRoomId as admin (cleanup for next suite)', async () => {
    if (!testRoomId) {
      // Recreate if it was deleted or creation failed
      const recreateRes = await request(app).post('/api/rooms').set('Authorization', `Bearer ${adminToken}`).send(newRoomData);
      expect(recreateRes.statusCode).toEqual(201);
      testRoomId = recreateRes.body.id;
    }
    const res = await request(app)
      .delete(`/api/rooms/${testRoomId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toEqual(200);
    testRoomId = null; 
  });
});

describe('Room Rate Management (/rooms/rates)', () => {
  let currentTestRoomTypeIdForRates; // Separate room type for rate tests
  const newRateData = {
    hotel_id: null, // Will be set to testHotelId
    room_type_id: null, // Will be set to currentTestRoomTypeIdForRates
    base_price: 100.00,
    weekend_price: 120.00,
    holiday_price: 150.00
  };
  const dateSpecificRateData = {
    hotel_id: null,
    room_type_id: null,
    base_price: 200.00,
    start_date: '2024-12-20',
    end_date: '2024-12-26'
  };


  beforeAll(async () => {
    // Ensure a room type exists for creating rates
    const roomTypeData = {
        hotel_id: testHotelId,
        name: 'Rate Test Room Type',
        description: 'A room type for rate tests.',
        capacity: 2,
        amenities: ['wifi']
    };
    const res = await request(app)
      .post('/api/rooms/types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(roomTypeData);
    expect(res.statusCode).toEqual(201);
    currentTestRoomTypeIdForRates = res.body.id;
    newRateData.room_type_id = currentTestRoomTypeIdForRates;
    newRateData.hotel_id = testHotelId;
    dateSpecificRateData.room_type_id = currentTestRoomTypeIdForRates;
    dateSpecificRateData.hotel_id = testHotelId;
  });

  afterAll(async () => {
    // Clean up the room type created for this suite
    if (currentTestRoomTypeIdForRates) {
      await db.promise().query('DELETE FROM room_types WHERE id = ?', [currentTestRoomTypeIdForRates]);
    }
    // Rates themselves should be cleaned by the main afterAll or specific delete tests
  });

  // POST /rooms/rates - Create/Update Room Rate
  it('should create a new general room rate as admin', async () => {
    const res = await request(app)
      .post('/api/rooms/rates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newRateData);
    expect(res.statusCode).toEqual(201); // First time, so 201
    expect(res.body).toHaveProperty('id');
    expect(res.body.base_price).toBe(String(newRateData.base_price)); // DB might return numeric as string
    testRateId = res.body.id; // Save for later
  });

  it('should update an existing general room rate as admin (upsert)', async () => {
    const updatedRateData = { ...newRateData, base_price: 110.00 };
    const res = await request(app)
      .post('/api/rooms/rates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updatedRateData);
    expect(res.statusCode).toEqual(200); // Second time for same general rate, so 200
    expect(res.body.id).toBe(testRateId);
    expect(res.body.base_price).toBe(String(updatedRateData.base_price));
  });

  it('should create a new date-specific room rate as admin', async () => {
    const res = await request(app)
      .post('/api/rooms/rates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(dateSpecificRateData);
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.base_price).toBe(String(dateSpecificRateData.base_price));
    expect(res.body.start_date).toContain(dateSpecificRateData.start_date);
     // Clean up this specific rate
    await db.promise().query('DELETE FROM room_rates WHERE id = ?', [res.body.id]);
  });
  
  it('should fail to create rate with missing base_price', async () => {
    const { base_price, ...invalidRate } = newRateData;
    const res = await request(app)
      .post('/api/rooms/rates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...invalidRate, start_date: '2025-01-01', end_date: '2025-01-05' }); // make it date specific to avoid upsert
    expect(res.statusCode).toEqual(400);
    expect(res.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ msg: 'Base price must be a numeric value.' })
    ]));
  });

  it('should fail to create rate as regular user (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/rooms/rates')
      .set('Authorization', `Bearer ${userToken}`)
      .send(newRateData);
    expect(res.statusCode).toEqual(403);
  });

  // GET /rooms/rates/hotel/:hotelId/type/:roomTypeId - Get Room Rates
  it('should list room rates for a hotel and room type (any authenticated user)', async () => {
    const res = await request(app)
      .get(`/api/rooms/rates/hotel/${testHotelId}/type/${currentTestRoomTypeIdForRates}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some(rate => rate.id === testRateId)).toBe(true);
  });

  it('should return empty array if no rates exist for hotel/room_type', async () => {
    // Create a temporary room type with no rates
    const tempRTData = { hotel_id: testHotelId, name: 'No Rate RT', capacity: 1 };
    const rtRes = await request(app).post('/api/rooms/types').set('Authorization', `Bearer ${adminToken}`).send(tempRTData);
    expect(rtRes.statusCode).toEqual(201);
    const tempRTId = rtRes.body.id;

    const res = await request(app)
      .get(`/api/rooms/rates/hotel/${testHotelId}/type/${tempRTId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);

    await db.promise().query('DELETE FROM room_types WHERE id = ?', [tempRTId]);
  });

  // DELETE /rooms/rates/:rateId - Delete Room Rate
  it('should fail to delete rate as regular user (403 Forbidden)', async () => {
    const res = await request(app)
      .delete(`/api/rooms/rates/${testRateId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toEqual(403);
  });

  it('should delete a room rate as admin', async () => {
    // Create a temporary rate to delete
    const tempRateData = { ...newRateData, base_price: 50.00, hotel_id: testHotelId, room_type_id: currentTestRoomTypeIdForRates };
     // Make it date specific to avoid upsert logic finding the main testRateId
    tempRateData.start_date = "2025-02-01";
    tempRateData.end_date = "2025-02-05";

    let createRes = await request(app)
      .post('/api/rooms/rates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(tempRateData);
    expect(createRes.statusCode).toEqual(201);
    const tempId = createRes.body.id;

    const res = await request(app)
      .delete(`/api/rooms/rates/${tempId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toBe('Room rate deleted successfully');

    // Verify it's gone by trying to fetch it (or check list length, but direct check is better if GET by id existed)
    // Since there's no GET /rates/:id, we check if it's in the list
    const listRes = await request(app)
      .get(`/api/rooms/rates/hotel/${testHotelId}/type/${currentTestRoomTypeIdForRates}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.body.some(rate => rate.id === tempId)).toBe(false);
  });
  
  it('should return 404 when trying to delete a non-existent room rate', async () => {
    const res = await request(app)
      .delete(`/api/rooms/rates/99999`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toEqual(404);
  });
  
  // Delete the main testRateId as cleanup
  it('should delete the main testRateId as admin', async () => {
    if (!testRateId) {
        // Recreate if needed
        const recreateRes = await request(app).post('/api/rooms/rates').set('Authorization', `Bearer ${adminToken}`).send(newRateData);
        expect(recreateRes.statusCode).toBeLessThanOrEqual(201); // 200 or 201
        testRateId = recreateRes.body.id;
    }
    const res = await request(app)
      .delete(`/api/rooms/rates/${testRateId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toEqual(200);
    testRateId = null;
  });

});

// Note: More complex scenarios like manager trying to edit types for other hotels,
// or deleting room types that have rooms associated (if prevented by FK or logic)
// can be added for deeper testing.
// The test for manager updating their own hotel's room type is a good start.
// The JWT_SECRET and database connection details should ideally be from environment variables.
// The `app` needs to be correctly imported. If server.js directly starts listening,
// it needs to be refactored to export the app for testing. I've assumed `app.js` exports the app.
// Added --detectOpenHandles to jest script in package.json as a precaution.
// Need to ensure the API paths in requests match the actual routes (e.g. /api/rooms/types)
