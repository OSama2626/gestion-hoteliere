const chai = require('chai');
const chaiHttp = require('chai-http');
const moment = require('moment');
const { app, server: expressServer } = require('../server'); // Import app and server
const { ROLES } = require('../utils/constants');
const { generateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Mock the database module
jest.mock('../config/database');
const db = require('../config/database'); // db will now be the mocked version

// Mock email
jest.mock('../utils/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));
const { sendEmail } = require('../utils/email');


chai.use(chaiHttp);
const expect = chai.expect;

describe('Agent Reservation Management API (/api/reservations)', () => {
  let adminToken;
  let receptionToken;
  let clientToken; // For testing unauthorized access

  let testAdminUser;
  let testReceptionUser;
  let testClientUser; // The client for whom reservations will be made
  let testHotel;
  let testRoomType;

  beforeAll(async () => {
    // Mock DB interactions (very basic for now, expand as needed)
    db.execute.mockImplementation(async (query, params) => {
      console.log(`[Test DB Mock] Query: ${query}`, params || '');
      if (query.startsWith('SELECT id, email, role FROM users WHERE id = ?')) {
        if (params[0] === testClientUser.id) return [[testClientUser]];
        if (params[0] === testAdminUser.id) return [[testAdminUser]];
        if (params[0] === testReceptionUser.id) return [[testReceptionUser]];
        return [[]]; // User not found
      }
      if (query.startsWith('SELECT r.id, rt.name as room_type_name, rr.base_price')) {
        // Mock room availability check - assume available for now
        return [[
          { id: 1, room_type_name: 'Standard Room', base_price: 100 },
          { id: 2, room_type_name: 'Standard Room', base_price: 100 }
        ]];
      }
      if (query.startsWith('INSERT INTO reservations')) {
        return [{ insertId: Math.floor(Math.random() * 1000) + 1 }];
      }
      if (query.startsWith('INSERT INTO reservation_rooms') || query.startsWith('INSERT INTO special_requests')) {
        return [{}]; // Assume success
      }
      if (query.startsWith('SELECT r.*,') && query.includes('FROM reservations r')) { // For GET /all
        // Basic mock for GET /all, refine later for filtering/pagination
        return [[
          { id: 1, reference_number: 'AGT123', user_id: testClientUser.id, hotel_id: testHotel.id, total_amount: 200, client_email: testClientUser.email, client_first_name: 'Test', client_last_name: 'Client', hotel_name: 'Test Hotel' }
        ]];
      }
      if (query.startsWith('SELECT COUNT(*) as total') && query.includes('FROM reservations r')) { // For GET /all count
         return [[{ total: 1 }]];
      }
      return Promise.resolve([[]]); // Default mock
    });

    // Create test users (in-memory, not DB)
    testAdminUser = { id: 1, email: 'admin.agent@test.com', role: ROLES.ADMIN, password_hash: await bcrypt.hash('password123', 10) };
    testReceptionUser = { id: 2, email: 'reception.agent@test.com', role: ROLES.RECEPTION, password_hash: await bcrypt.hash('password123', 10) };
    testClientUser = { id: 3, email: 'client.target@test.com', role: ROLES.CLIENT, password_hash: await bcrypt.hash('password123', 10), first_name: 'Target', last_name: 'Client' };

    adminToken = generateToken({ id: testAdminUser.id, role: testAdminUser.role });
    receptionToken = generateToken({ id: testReceptionUser.id, role: testReceptionUser.role });
    clientToken = generateToken({ id: testClientUser.id, role: testClientUser.role }); // For unauthorized tests

    // Mock Hotel and Room Type
    testHotel = { id: 1, name: 'Test Hotel' };
    testRoomType = { id: 1, name: 'Standard Room', base_price: 100 };
  });

  afterAll((done) => {
    // Close server if it was started by tests (shouldn't be if server.js is correct)
    if (expressServer && process.env.NODE_ENV !== 'test' && expressServer.close) {
        expressServer.close(done);
    } else {
        done();
    }
  });

  beforeEach(() => {
    // Reset mocks before each test if they are changed within tests
    db.execute.mockClear(); // Clears call counts etc.
    sendEmail.mockClear();
    // Re-apply default mock if it's too general or reset specific mocks
     db.execute.mockImplementation(async (query, params) => {
      console.log(`[Test DB Mock - beforeEach] Query: ${query}`, params || '');
      if (query.startsWith('SELECT id, email, role FROM users WHERE id = ?')) {
        if (params[0] === testClientUser.id) return [[testClientUser]];
        if (params[0] === testAdminUser.id) return [[testAdminUser]]; // For created_by_user_id if needed
        if (params[0] === testReceptionUser.id) return [[testReceptionUser]];
        return [[]];
      }
      if (query.startsWith('SELECT r.id, rt.name as room_type_name, rr.base_price')) {
        return [[
          { id: 1, room_type_name: testRoomType.name, base_price: testRoomType.base_price },
          { id: 2, room_type_name: testRoomType.name, base_price: testRoomType.base_price }
        ]];
      }
      if (query.startsWith('INSERT INTO reservations')) {
        return [{ insertId: 12345 }]; // Consistent insertId for simpler assertions
      }
      if (query.startsWith('INSERT INTO reservation_rooms') || query.startsWith('INSERT INTO special_requests')) {
        return [{}];
      }
      if (query.startsWith('SELECT r.*,') && query.includes('FROM reservations r')) {
        return [[
          { id: 1, reference_number: 'AGT123', user_id: testClientUser.id, hotel_id: testHotel.id, total_amount: 200, client_email: testClientUser.email, client_first_name: 'Target', client_last_name: 'Client', hotel_name: 'Test Hotel' }
        ]];
      }
      if (query.startsWith('SELECT COUNT(*) as total') && query.includes('FROM reservations r')) {
         return [[{ total: 1 }]];
      }
      return Promise.resolve([[]]);
    });
  });

  describe('POST /api/reservations/agent-create', () => {
    const checkIn = moment().add(1, 'days').format('YYYY-MM-DD');
    const checkOut = moment().add(3, 'days').format('YYYY-MM-DD');

    const validReservationData = {
      userId: testClientUser.id, // Will be dynamically set in tests
      hotelId: testHotel.id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      rooms: [{ roomTypeId: testRoomType.id, quantity: 1 }],
      specialRequests: [{ text: "Early check-in if possible" }]
    };

    beforeEach(() => {
        // Ensure userId is correctly set for each test if it's part of the object template
        validReservationData.userId = testClientUser.id;
    });

    it('should allow RECEPTION to create a reservation for a client', (done) => {
      chai.request(app)
        .post('/api/reservations/agent-create')
        .set('Authorization', `Bearer ${receptionToken}`)
        .send(validReservationData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body.message).to.equal('Réservation créée avec succès pour le client.');
          expect(res.body).to.have.property('reservationId');
          expect(res.body).to.have.property('referenceNumber');
          expect(sendEmail).to.have.been.calledOnce;
          expect(sendEmail.mock.calls[0][0]).to.equal(testClientUser.email); // Check recipient
          done();
        });
    });

    it('should allow ADMIN to create a reservation for a client', (done) => {
      chai.request(app)
        .post('/api/reservations/agent-create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validReservationData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          done();
        });
    });

    it('should NOT allow CLIENT to create a reservation via agent endpoint', (done) => {
      chai.request(app)
        .post('/api/reservations/agent-create')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(validReservationData)
        .end((err, res) => {
          expect(res).to.have.status(403); // Forbidden
          done();
        });
    });

    it('should return 404 if target userId does not exist', (done) => {
      // Override DB mock for this specific test
      db.execute.mockImplementationOnce(async (query, params) => {
        if (query.startsWith('SELECT id, email, role FROM users WHERE id = ?') && params[0] === 999) {
          return [[]]; // User not found
        }
        // Fallback to other mocks if needed, though not expected for this flow
        return Promise.resolve([[]]);
      });

      chai.request(app)
        .post('/api/reservations/agent-create')
        .set('Authorization', `Bearer ${receptionToken}`)
        .send({ ...validReservationData, userId: 999 })
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body.error).to.equal('Client avec ID 999 non trouvé.');
          done();
        });
    });

    it('should return 400 if target user is not a CLIENT', (done) => {
      db.execute.mockImplementationOnce(async (query, params) => {
        if (query.startsWith('SELECT id, email, role FROM users WHERE id = ?') && params[0] === testAdminUser.id) {
          return [[testAdminUser]]; // Return an admin user, not a client
        }
        return Promise.resolve([[]]);
      });

      chai.request(app)
        .post('/api/reservations/agent-create')
        .set('Authorization', `Bearer ${receptionToken}`)
        .send({ ...validReservationData, userId: testAdminUser.id }) // Target user is an admin
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.error).to.equal('User is not a client');
          done();
        });
    });

    it('should return 400 for invalid dates (e.g., checkOut before checkIn)', (done) => {
      chai.request(app)
        .post('/api/reservations/agent-create')
        .set('Authorization', `Bearer ${receptionToken}`)
        .send({ ...validReservationData, checkOutDate: moment().subtract(1, 'days').format('YYYY-MM-DD') })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.error).to.equal('Dates de réservation invalides.');
          done();
        });
    });

    it('should return 400 if rooms are not available', (done) => {
      // Override DB mock for room availability
      db.execute.mockImplementation(async (query, params) => {
        if (query.startsWith('SELECT id, email, role FROM users WHERE id = ?')) {
          return [[testClientUser]]; // Target client is valid
        }
        if (query.startsWith('SELECT r.id, rt.name as room_type_name, rr.base_price')) {
          return [[]]; // No rooms available
        }
        return Promise.resolve([[]]);
      });

      chai.request(app)
        .post('/api/reservations/agent-create')
        .set('Authorization', `Bearer ${receptionToken}`)
        .send(validReservationData)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.error).to.contain('Pas assez de chambres disponibles');
          done();
        });
    });
     it('should require hotelId', (done) => {
        const { hotelId, ...badData } = validReservationData;
        chai.request(app)
            .post('/api/reservations/agent-create')
            .set('Authorization', `Bearer ${receptionToken}`)
            .send(badData)
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body.errors).to.be.an('array').that.deep.includes({
                    type: 'field',
                    msg: 'Invalid value', // Or more specific message if your validator provides it
                    path: 'hotelId',
                    location: 'body'
                });
                done();
            });
    });
  });

  describe('GET /api/reservations/all', () => {
    it('should allow RECEPTION to fetch all reservations (basic)', (done) => {
      chai.request(app)
        .get('/api/reservations/all')
        .set('Authorization', `Bearer ${receptionToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('reservations').that.is.an('array');
          expect(res.body).to.have.property('pagination');
          if (res.body.reservations.length > 0) {
            expect(res.body.reservations[0]).to.have.property('client_email');
            expect(res.body.reservations[0]).to.have.property('hotel_name');
          }
          done();
        });
    });

    it('should allow ADMIN to fetch all reservations', (done) => {
      chai.request(app)
        .get('/api/reservations/all')
        .set('Authorization', `Bearer ${adminToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          done();
        });
    });

    it('should NOT allow CLIENT to fetch all reservations', (done) => {
      chai.request(app)
        .get('/api/reservations/all')
        .set('Authorization', `Bearer ${clientToken}`)
        .end((err, res) => {
          expect(res).to.have.status(403);
          done();
        });
    });

    it('should filter reservations by clientId', (done) => {
      const targetClientId = testClientUser.id;
      // Adjust mock to ensure it returns specific data for this client ID
      db.execute.mockImplementation(async (query, params) => {
        if (query.startsWith('SELECT r.*,') && params && params.includes(targetClientId)) {
          return [[
            { id: 1, reference_number: 'AGT123', user_id: targetClientId, hotel_id: testHotel.id, /* other fields */ }
          ]];
        }
        if (query.startsWith('SELECT COUNT(*) as total') && params && params.includes(targetClientId)) {
          return [[{ total: 1 }]];
        }
        return Promise.resolve([[]]); // Default empty
      });

      chai.request(app)
        .get(`/api/reservations/all?clientId=${targetClientId}`)
        .set('Authorization', `Bearer ${receptionToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.reservations).to.be.an('array');
          res.body.reservations.forEach(r => {
            expect(r.user_id).to.equal(targetClientId);
          });
          done();
        });
    });

    it('should filter reservations by status', (done) => {
        const status = 'confirmed';
        db.execute.mockImplementation(async (query, params) => {
            if (query.startsWith('SELECT r.*,') && params && params.includes(status)) {
                return [[ { id: 1, status: status /* other fields */ } ]];
            }
             if (query.startsWith('SELECT COUNT(*) as total') && params && params.includes(status)) {
                return [[{ total: 1 }]];
            }
            return Promise.resolve([[]]);
        });

        chai.request(app)
            .get(`/api/reservations/all?status=${status}`)
            .set('Authorization', `Bearer ${receptionToken}`)
            .end((err, res) => {
                expect(res).to.have.status(200);
                res.body.reservations.forEach(r => expect(r.status).to.equal(status));
                done();
            });
    });

    it('should handle pagination correctly (page and limit)', (done) => {
        // This test is more about checking if limit and offset are applied.
        // The mock needs to be aware of limit/offset if we were to check actual data slicing.
        // For now, just check if the call succeeds and pagination info is present.
        db.execute.mockImplementation(async(query, params) => {
            if (query.startsWith('SELECT r.*,')) {
                // Check if LIMIT and OFFSET are in the query string (not ideal, but simple for mock)
                // Or check params array for limit and offset values
                if (params.includes(5) && params.includes(5)) { // Assuming page 2, limit 5 -> offset 5
                     return [[ { id: 6, /* ... */} ]]; // Mock one record for page 2
                }
                return [[ {id:1}, {id:2}, {id:3}, {id:4}, {id:5} ]]; // Default page 1
            }
            if (query.startsWith('SELECT COUNT(*)')) {
                return [[{ total: 10 }]]; // Total 10 items, so 2 pages if limit is 5
            }
            return Promise.resolve([[]]);
        });

        chai.request(app)
            .get('/api/reservations/all?page=2&limit=5')
            .set('Authorization', `Bearer ${receptionToken}`)
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body.pagination).to.deep.include({
                    currentPage: 2,
                    itemsPerPage: 5,
                    totalPages: 2, // Based on total 10 items mock
                    totalItems: 10
                });
                // expect(res.body.reservations.length).to.equal(1); // if mock returns 1 item for page 2
                done();
            });
    });

  });

  describe('PUT /api/reservations/:id/agent-update', () => {
    let existingReservationId;
    const originalCheckIn = moment().add(5, 'days');
    const originalCheckOut = moment().add(7, 'days');

    beforeEach(async () => {
      // Reset mocks and set up a default "existing" reservation for update tests
      existingReservationId = 100; // Example ID
      const mockReservation = {
        id: existingReservationId,
        user_id: testClientUser.id,
        hotel_id: testHotel.id,
        check_in_date: originalCheckIn.format('YYYY-MM-DD HH:mm:ss'),
        check_out_date: originalCheckOut.format('YYYY-MM-DD HH:mm:ss'),
        total_amount: 200,
        status: 'confirmed',
        created_by_user_id: testReceptionUser.id,
        // joined fields for response
        client_email: testClientUser.email,
        client_first_name: testClientUser.first_name,
        client_last_name: testClientUser.last_name,
        hotel_name: testHotel.name
      };
      const mockReservationRooms = [
        { reservation_id: existingReservationId, room_type_id: testRoomType.id, rate_per_night: 100, quantity: 1 }
      ];

      db.execute.mockImplementation(async (query, params) => {
        console.log(`[Test DB Mock - UpdateSetup] Query: ${query}`, params || '');
        if (query.startsWith('SELECT * FROM reservations WHERE id = ?')) {
          if (params[0] === existingReservationId) return [[mockReservation]];
          return [[]];
        }
        if (query.startsWith('SELECT room_type_id, rate_per_night, COUNT(*) as quantity FROM reservation_rooms')) {
            if(params[0] === existingReservationId) return [mockReservationRooms];
            return [[]];
        }
        if (query.startsWith('UPDATE reservations SET')) {
          return [{ affectedRows: 1 }];
        }
        if (query.startsWith('DELETE FROM special_requests WHERE reservation_id = ?') ||
            query.startsWith('INSERT INTO special_requests')) {
          return [{}];
        }
         if (query.startsWith('SELECT r.*,') && query.includes('FROM reservations r') && query.includes('WHERE r.id = ?')) {
            // Simulate fetching the updated reservation for the response
            if (params[0] === existingReservationId) {
                const updatedReservation = { ...mockReservation };
                // Apply changes based on what might have been in req.body for the test
                if(this.currentTestUpdateData) { // 'this' might be tricky, consider passing data in
                    if(this.currentTestUpdateData.checkInDate) updatedReservation.check_in_date = moment(this.currentTestUpdateData.checkInDate).format('YYYY-MM-DD HH:mm:ss');
                    if(this.currentTestUpdateData.checkOutDate) updatedReservation.check_out_date = moment(this.currentTestUpdateData.checkOutDate).format('YYYY-MM-DD HH:mm:ss');
                    if(this.currentTestUpdateData.status) updatedReservation.status = this.currentTestUpdateData.status;
                    // Recalculate total if dates changed (simplified)
                    if (this.currentTestUpdateData.checkInDate || this.currentTestUpdateData.checkOutDate) {
                        const newNights = moment(updatedReservation.check_out_date).diff(moment(updatedReservation.check_in_date), 'days');
                        updatedReservation.total_amount = mockReservationRooms[0].rate_per_night * mockReservationRooms[0].quantity * newNights;
                    }
                }
                return [[updatedReservation]];
            }
            return [[]];
        }
        return Promise.resolve([[]]); // Default mock
      });
    });

    this.currentTestUpdateData = {}; // Helper to pass test-specific data to mock

    it('should allow RECEPTION to update checkInDate and checkOutDate', (done) => {
      const newCheckIn = moment(originalCheckIn).add(1, 'day').format('YYYY-MM-DD');
      const newCheckOut = moment(originalCheckOut).add(1, 'day').format('YYYY-MM-DD');
      this.currentTestUpdateData = { checkInDate: newCheckIn, checkOutDate: newCheckOut };

      chai.request(app)
        .put(`/api/reservations/${existingReservationId}/agent-update`)
        .set('Authorization', `Bearer ${receptionToken}`)
        .send({ checkInDate: newCheckIn, checkOutDate: newCheckOut })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.message).to.equal('Réservation mise à jour avec succès.');
          expect(res.body.reservation.check_in_date).to.include(newCheckIn);
          expect(res.body.reservation.check_out_date).to.include(newCheckOut);
          // Check if total_amount was recalculated (assuming 1 room at 100/night, original 2 nights = 200)
          // New duration is still 2 nights, so total should remain 200. If duration changed, this needs adjustment.
          // For this specific case where duration is same, total should be same.
          // If newCheckIn = originalCheckIn.add(1,'day') and newCheckOut = originalCheckOut.add(2,'days'), then duration is 3 nights.
          // const expectedNights = moment(newCheckOut).diff(moment(newCheckIn), 'days');
          // expect(res.body.reservation.total_amount).to.equal(100 * 1 * expectedNights);
          done();
        });
    });

    it('should allow ADMIN to update status and specialRequests', (done) => {
      const newStatus = 'modified_by_agent';
      const newSpecialRequests = [{ text: "Late arrival confirmed" }];
      this.currentTestUpdateData = { status: newStatus };


      chai.request(app)
        .put(`/api/reservations/${existingReservationId}/agent-update`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: newStatus, specialRequests: newSpecialRequests })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.reservation.status).to.equal(newStatus);
          // Verifying special requests would require mocking their retrieval or checking DB logs
          done();
        });
    });

    it('should return 404 if reservation not found', (done) => {
      chai.request(app)
        .put('/api/reservations/9999/agent-update') // Non-existent ID
        .set('Authorization', `Bearer ${receptionToken}`)
        .send({ status: 'confirmed' })
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body.error).to.equal('Réservation non trouvée.');
          done();
        });
    });

    it('should return 400 if trying to update rooms (not yet supported)', (done) => {
        chai.request(app)
            .put(`/api/reservations/${existingReservationId}/agent-update`)
            .set('Authorization', `Bearer ${receptionToken}`)
            .send({ rooms: [{ roomTypeId: 1, quantity: 2 }]})
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body.error).to.equal("La modification des chambres n'est pas encore prise en charge dans cette version.");
                done();
            });
    });

    it('should return 400 for invalid date formats or logic (checkOut before checkIn)', (done) => {
        chai.request(app)
            .put(`/api/reservations/${existingReservationId}/agent-update`)
            .set('Authorization', `Bearer ${receptionToken}`)
            .send({ checkInDate: moment().add(3,'days').format('YYYY-MM-DD'), checkOutDate: moment().add(1,'days').format('YYYY-MM-DD')})
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body.error).to.equal('Dates de réservation invalides après mise à jour.');
                done();
            });
    });

    it('should NOT allow CLIENT to update a reservation via agent endpoint', (done) => {
      chai.request(app)
        .put(`/api/reservations/${existingReservationId}/agent-update`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ status: "confirmed" })
        .end((err, res) => {
          expect(res).to.have.status(403);
          done();
        });
    });
  });

  describe('PATCH /api/reservations/:id/assign-room', () => {
    let existingReservationId;
    let existingReservationRoomId; // ID from reservation_rooms table
    let currentRoomIdInReservation; // The room_id currently in reservation_rooms for this entry
    let newAvailableRoomIdSameType;
    let newRoomDifferentType;
    let unavailableRoomId;

    beforeEach(() => {
        existingReservationId = 200;
        existingReservationRoomId = 1;
        currentRoomIdInReservation = 10;
        newAvailableRoomIdSameType = 11;
        newRoomDifferentType = 12;
        unavailableRoomId = 13;

        const mockReservation = {
            id: existingReservationId, hotel_id: testHotel.id, room_type_id: testRoomType.id,
            check_in_date: moment().add(1, 'days').format('YYYY-MM-DD HH:mm:ss'),
            check_out_date: moment().add(3, 'days').format('YYYY-MM-DD HH:mm:ss'),
            status: 'confirmed'
        };
        const mockReservationRoomEntry = {
            id: existingReservationRoomId, reservation_id: existingReservationId,
            room_id: currentRoomIdInReservation, room_type_id: testRoomType.id
        };
        const mockNewRoomSameType = { id: newAvailableRoomIdSameType, hotel_id: testHotel.id, room_type_id: testRoomType.id, is_available: true };
        const mockNewRoomOtherType = { id: newRoomDifferentType, hotel_id: testHotel.id, room_type_id: testRoomType.id + 1, is_available: true };
        const mockUnavailableRoom = { id: unavailableRoomId, hotel_id: testHotel.id, room_type_id: testRoomType.id, is_available: false };


        db.execute.mockImplementation(async (query, params) => {
            console.log(`[Test DB Mock - AssignRoom] Query: ${query}`, params || '');
            if (query.startsWith('SELECT * FROM reservations WHERE id = ?')) {
                return params[0] === existingReservationId ? [[mockReservation]] : [[]];
            }
            if (query.startsWith('SELECT * FROM reservation_rooms WHERE id = ? AND reservation_id = ?')) {
                return (params[0] === existingReservationRoomId && params[1] === existingReservationId) ? [[mockReservationRoomEntry]] : [[]];
            }
            if (query.startsWith('SELECT * FROM rooms WHERE id = ?')) {
                if (params[0] === newAvailableRoomIdSameType) return [[mockNewRoomSameType]];
                if (params[0] === newRoomDifferentType) return [[mockNewRoomOtherType]];
                if (params[0] === unavailableRoomId) return [[mockUnavailableRoom]]; // Though availability check is separate
                return [[]];
            }
            // Mock for availability check of the newRoomId
            if (query.includes('SELECT res.id FROM reservations res JOIN reservation_rooms rroom ON rroom.reservation_id = res.id WHERE rroom.room_id = ?')) {
                if (params[0] === unavailableRoomId) return [[{ id: 999 }]]; // Simulate conflicting reservation
                return [[]]; // Assume available for other rooms
            }
            if (query.startsWith('UPDATE reservation_rooms SET room_id = ?')) {
                return [{ affectedRows: 1 }];
            }
            return Promise.resolve([[]]);
        });
    });

    it('should allow RECEPTION to assign a new available room of the same type', (done) => {
        chai.request(app)
            .patch(`/api/reservations/${existingReservationId}/assign-room`)
            .set('Authorization', `Bearer ${receptionToken}`)
            .send({ assignments: [{ reservationRoomId: existingReservationRoomId, newRoomId: newAvailableRoomIdSameType }] })
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body.message).to.equal('Assignation des chambres mise à jour avec succès.');
                done();
            });
    });

    it('should NOT assign if new room is already assigned to the same reservation_room entry', (done) => {
        chai.request(app)
            .patch(`/api/reservations/${existingReservationId}/assign-room`)
            .set('Authorization', `Bearer ${receptionToken}`)
            .send({ assignments: [{ reservationRoomId: existingReservationRoomId, newRoomId: currentRoomIdInReservation }] })
            .end((err, res) => {
                expect(res).to.have.status(200); // Should still be success, but logs show it skipped.
                // Potentially check logs or have a more specific message if no actual change.
                done();
            });
    });

    it('should return 400 if new room is of a different type', (done) => {
        chai.request(app)
            .patch(`/api/reservations/${existingReservationId}/assign-room`)
            .set('Authorization', `Bearer ${receptionToken}`)
            .send({ assignments: [{ reservationRoomId: existingReservationRoomId, newRoomId: newRoomDifferentType }] })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body.error).to.contain('n\'est pas du même type que la chambre réservée originale');
                done();
            });
    });

    it('should return 400 if new room is not available (conflicts with another reservation)', (done) => {
        chai.request(app)
            .patch(`/api/reservations/${existingReservationId}/assign-room`)
            .set('Authorization', `Bearer ${receptionToken}`)
            .send({ assignments: [{ reservationRoomId: existingReservationRoomId, newRoomId: unavailableRoomId }] })
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body.error).to.contain('n\'est pas disponible pour les dates de la réservation');
                done();
            });
    });

    it('should return 404 if reservation_room_id does not exist for the reservation', (done) => {
        chai.request(app)
            .patch(`/api/reservations/${existingReservationId}/assign-room`)
            .set('Authorization', `Bearer ${receptionToken}`)
            .send({ assignments: [{ reservationRoomId: 999, newRoomId: newAvailableRoomIdSameType }] })
            .end((err, res) => {
                expect(res).to.have.status(404);
                expect(res.body.error).to.contain('Entrée de chambre réservée 999 non trouvée');
                done();
            });
    });
     it('should require assignments array', (done) => {
        chai.request(app)
            .patch(`/api/reservations/${existingReservationId}/assign-room`)
            .set('Authorization', `Bearer ${receptionToken}`)
            .send({}) // Missing assignments
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body.errors[0].path).to.equal('assignments');
                done();
            });
    });
  });
});
