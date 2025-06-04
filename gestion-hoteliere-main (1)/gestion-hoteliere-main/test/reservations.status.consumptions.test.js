const chai = require('chai');
const chaiHttp = require('chai-http');
const moment = require('moment');
const { app, server: expressServer } = require('../server');
const { ROLES } = require('../utils/constants');
const { generateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

jest.mock('../config/database');
const db = require('../config/database');

chai.use(chaiHttp);
const expect = chai.expect;

describe('Reservation Status (Check-in/Check-out) and Consumptions API', () => {
  let adminToken;
  let receptionToken;
  let clientToken;

  let testAdminUser;
  let testReceptionUser;
  let testClientUser;
  let testReservationId;

  beforeAll(async () => {
    testAdminUser = { id: 1, email: 'admin.status@test.com', role: ROLES.ADMIN, password_hash: await bcrypt.hash('password123', 10) };
    testReceptionUser = { id: 2, email: 'reception.status@test.com', role: ROLES.RECEPTION, password_hash: await bcrypt.hash('password123', 10) };
    testClientUser = { id: 3, email: 'client.status@test.com', role: ROLES.CLIENT, password_hash: await bcrypt.hash('password123', 10) };

    adminToken = generateToken({ id: testAdminUser.id, role: testAdminUser.role });
    receptionToken = generateToken({ id: testReceptionUser.id, role: testReceptionUser.role });
    clientToken = generateToken({ id: testClientUser.id, role: testClientUser.role });

    testReservationId = 101;
  });

  afterAll((done) => {
    if (expressServer && process.env.NODE_ENV !== 'test' && expressServer.close) {
        expressServer.close(done);
    } else {
        done();
    }
  });

  beforeEach(() => {
    db.execute.mockReset(); // Reset mocks for each test
  });

  describe('PATCH /api/reservations/:id/check-in', () => {
    it('should allow RECEPTION to check-in a confirmed reservation', (done) => {
      const mockReservation = {
        id: testReservationId, status: 'confirmed',
        check_in_date: moment().format('YYYY-MM-DD HH:mm:ss')
      };
      db.execute.mockImplementation(async (query, params) => {
        if (query.startsWith('SELECT * FROM reservations WHERE id = ?')) return [[mockReservation]];
        if (query.startsWith('UPDATE reservations SET status = ?')) return [{ affectedRows: 1 }];
        return Promise.resolve([[]]);
      });

      chai.request(app)
        .patch(`/api/reservations/${testReservationId}/check-in`)
        .set('Authorization', `Bearer ${receptionToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.message).to.equal('Check-in effectué avec succès.');
          expect(res.body.reservation.status).to.equal('checked_in');
          expect(res.body.reservation).to.have.property('actual_check_in_time');
          done();
        });
    });

    it('should allow ADMIN to check-in a modified_by_agent reservation', (done) => {
      const mockReservation = {
        id: testReservationId, status: 'modified_by_agent',
        check_in_date: moment().format('YYYY-MM-DD HH:mm:ss')
      };
       db.execute.mockImplementation(async (query, params) => {
        if (query.startsWith('SELECT * FROM reservations WHERE id = ?')) return [[mockReservation]];
        if (query.startsWith('UPDATE reservations SET status = ?')) return [{ affectedRows: 1 }];
        return Promise.resolve([[]]);
      });

      chai.request(app)
        .patch(`/api/reservations/${testReservationId}/check-in`)
        .set('Authorization', `Bearer ${adminToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.reservation.status).to.equal('checked_in');
          done();
        });
    });

    it('should return 400 if reservation status is not "confirmed" or "modified_by_agent"', (done) => {
      db.execute.mockResolvedValueOnce([[{ id: testReservationId, status: 'checked_out' }]]);
      chai.request(app)
        .patch(`/api/reservations/${testReservationId}/check-in`)
        .set('Authorization', `Bearer ${receptionToken}`)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.error).to.contain('La réservation doit être confirmée pour le check-in.');
          done();
        });
    });

    it('should return 404 if reservation not found', (done) => {
      db.execute.mockResolvedValueOnce([[]]); // No reservation found
      chai.request(app)
        .patch(`/api/reservations/999/check-in`)
        .set('Authorization', `Bearer ${receptionToken}`)
        .end((err, res) => {
          expect(res).to.have.status(404);
          done();
        });
    });

    it('should NOT allow CLIENT to check-in a reservation', (done) => {
      chai.request(app)
        .patch(`/api/reservations/${testReservationId}/check-in`)
        .set('Authorization', `Bearer ${clientToken}`)
        .end((err, res) => {
          expect(res).to.have.status(403);
          done();
        });
    });

    // Optional: Test for check-in date validation (e.g. trying to check-in too early)
    // This requires careful mocking of reservation.check_in_date
    it('should WARN if checking in before scheduled check-in date (but still allow)', (done) => {
        const futureCheckInDate = moment().add(2, 'days').format('YYYY-MM-DD HH:mm:ss');
        const mockReservation = {
            id: testReservationId, status: 'confirmed',
            check_in_date: futureCheckInDate
        };
        db.execute.mockImplementation(async (query, params) => {
            if (query.startsWith('SELECT * FROM reservations WHERE id = ?')) return [[mockReservation]];
            if (query.startsWith('UPDATE reservations SET status = ?')) return [{ affectedRows: 1 }];
            return Promise.resolve([[]]);
        });

        chai.request(app)
            .patch(`/api/reservations/${testReservationId}/check-in`)
            .set('Authorization', `Bearer ${receptionToken}`)
            .end((err, res) => {
                expect(res).to.have.status(200); // Still succeeds
                // Check logs or a specific warning message if the API were to return one
                done();
            });
    });
  });

  describe('PATCH /api/reservations/:id/check-out', () => {
    it('should allow RECEPTION to check-out a "checked_in" reservation', (done) => {
      db.execute.mockImplementation(async (query, params) => {
        if (query.startsWith('SELECT * FROM reservations WHERE id = ?')) return [[{ id: testReservationId, status: 'checked_in' }]];
        if (query.startsWith('UPDATE reservations SET status = ?')) return [{ affectedRows: 1 }];
        return Promise.resolve([[]]);
      });
      chai.request(app)
        .patch(`/api/reservations/${testReservationId}/check-out`)
        .set('Authorization', `Bearer ${receptionToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.message).to.equal('Check-out effectué avec succès.');
          expect(res.body.reservation.status).to.equal('checked_out');
          expect(res.body.reservation).to.have.property('actual_check_out_time');
          done();
        });
    });

    it('should return 400 if reservation status is not "checked_in"', (done) => {
      db.execute.mockResolvedValueOnce([[{ id: testReservationId, status: 'confirmed' }]]);
      chai.request(app)
        .patch(`/api/reservations/${testReservationId}/check-out`)
        .set('Authorization', `Bearer ${receptionToken}`)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.error).to.contain("La réservation doit être en statut 'checked_in' pour le check-out.");
          done();
        });
    });
  });

  describe('POST /api/reservations/:id/consumptions', () => {
    const consumptionData = {
      item_name: 'Mini-bar: Water',
      quantity: 2,
      price_per_unit: '2.50',
      item_description: 'Bottled water from mini-bar'
    };

    it('should allow RECEPTION to add consumption to a "checked_in" reservation', (done) => {
      db.execute.mockImplementation(async (query, params) => {
        if (query.startsWith('SELECT status FROM reservations WHERE id = ?')) return [[{ status: 'checked_in' }]];
        if (query.startsWith('INSERT INTO consumption_items')) return [{ insertId: 1 }];
        if (query.startsWith('SELECT * FROM consumption_items WHERE id = ?')) return [[{id: 1, ...consumptionData, total_price: 5.00}]];
        return Promise.resolve([[]]);
      });

      chai.request(app)
        .post(`/api/reservations/${testReservationId}/consumptions`)
        .set('Authorization', `Bearer ${receptionToken}`)
        .send(consumptionData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.include(consumptionData);
          expect(res.body).to.have.property('id');
          expect(res.body.total_price).to.equal('5.00'); // Assuming mock calculation or db returns it
          done();
        });
    });

    it('should return 400 if reservation is not "checked_in" when adding consumption', (done) => {
      db.execute.mockResolvedValueOnce([[{ status: 'confirmed' }]]); // Reservation not checked_in
       chai.request(app)
        .post(`/api/reservations/${testReservationId}/consumptions`)
        .set('Authorization', `Bearer ${receptionToken}`)
        .send(consumptionData)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.error).to.equal('Les consommations ne peuvent être ajoutées qu\'aux réservations en statut \'checked_in\'.');
          done();
        });
    });

    it('should return 400 for invalid consumption data (e.g., missing item_name)', (done) => {
        const {item_name, ...invalidData} = consumptionData;
        chai.request(app)
            .post(`/api/reservations/${testReservationId}/consumptions`)
            .set('Authorization', `Bearer ${receptionToken}`)
            .send(invalidData)
            .end((err, res) => {
                expect(res).to.have.status(400);
                expect(res.body.errors).to.be.an('array');
                expect(res.body.errors[0].path).to.equal('item_name');
                done();
            });
    });
  });

  describe('GET /api/reservations/:id/consumptions', () => {
    it('should allow RECEPTION to list consumptions for any reservation', (done) => {
      db.execute.mockImplementation(async (query, params) => {
        if (query.startsWith('SELECT user_id FROM reservations WHERE id = ?')) return [[{ user_id: testClientUser.id }]];
        if (query.startsWith('SELECT * FROM consumption_items WHERE reservation_id = ?')) return [[{ item_name: 'Water', total_price: 5.00 }]];
        return Promise.resolve([[]]);
      });
      chai.request(app)
        .get(`/api/reservations/${testReservationId}/consumptions`)
        .set('Authorization', `Bearer ${receptionToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an('array');
          // expect(res.body.length).to.be.greaterThan(0); // If mock returns items
          done();
        });
    });

    it('should allow CLIENT to list consumptions for their own reservation', (done) => {
      db.execute.mockImplementation(async (query, params) => {
        if (query.startsWith('SELECT user_id FROM reservations WHERE id = ?')) return [[{ user_id: testClientUser.id }]]; // Reservation belongs to testClientUser
        if (query.startsWith('SELECT * FROM consumption_items WHERE reservation_id = ?')) return [[{ item_name: 'Water', total_price: 5.00 }]];
        return Promise.resolve([[]]);
      });
      chai.request(app)
        .get(`/api/reservations/${testReservationId}/consumptions`)
        .set('Authorization', `Bearer ${clientToken}`) // Authenticated as testClientUser
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an('array');
          done();
        });
    });

    it('should NOT allow CLIENT to list consumptions for another user\'s reservation', (done) => {
      const anotherClientsReservationId = testReservationId + 1;
      // Mock DB: reservation exists but belongs to another user (e.g., user_id 999)
      db.execute.mockResolvedValueOnce([[{ user_id: 999 }]]);
      chai.request(app)
        .get(`/api/reservations/${anotherClientsReservationId}/consumptions`)
        .set('Authorization', `Bearer ${clientToken}`) // Authenticated as testClientUser (id 3)
        .end((err, res) => {
          expect(res).to.have.status(403);
          expect(res.body.error).to.equal('Accès non autorisé aux consommations de cette réservation.');
          done();
        });
    });

    it('should return 404 if reservation not found when listing consumptions', (done) => {
      db.execute.mockResolvedValueOnce([[]]); // No reservation found
      chai.request(app)
        .get(`/api/reservations/999/consumptions`)
        .set('Authorization', `Bearer ${receptionToken}`)
        .end((err, res) => {
          expect(res).to.have.status(404);
          done();
        });
    });
  });
});
