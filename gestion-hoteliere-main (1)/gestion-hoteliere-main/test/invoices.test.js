const chai = require('chai');
const chaiHttp = require('chai-http');
const moment = require('moment');
const { app, server: expressServer } = require('../server');
const { ROLES } = require('../utils/constants');
const { generateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

jest.mock('../config/database');
const db = require('../config/database');

// Mock email utility
jest.mock('../utils/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));
const { sendEmail } = require('../utils/email');


chai.use(chaiHttp);
const expect = chai.expect;

describe('Billing and Invoicing API', () => {
  let adminToken;
  let receptionToken;
  let clientToken;
  let otherClientToken;

  let testAdminUser;
  let testReceptionUser;
  let testClientUser; // Owns the reservation/invoice
  let testOtherClientUser; // For auth tests

  let testReservationId;
  let testHotel;
  let testRoomType;
  let mockReservationData;
  let mockConsumptionItemsData;

  const TAX_RATE = 0.10; // Must match the one in reservations.js

  beforeAll(async () => {
    testAdminUser = { id: 1, email: 'admin.invoice@test.com', role: ROLES.ADMIN, password_hash: await bcrypt.hash('password123', 10) };
    testReceptionUser = { id: 2, email: 'reception.invoice@test.com', role: ROLES.RECEPTION, password_hash: await bcrypt.hash('password123', 10) };
    testClientUser = { id: 3, email: 'client.invoice@test.com', role: ROLES.CLIENT, first_name: 'Client', last_name: 'User', company_name: 'Client Inc.', password_hash: await bcrypt.hash('password123', 10) };
    testOtherClientUser = { id: 4, email: 'other.client.invoice@test.com', role: ROLES.CLIENT, password_hash: await bcrypt.hash('password123', 10) };

    adminToken = generateToken({ id: testAdminUser.id, role: testAdminUser.role });
    receptionToken = generateToken({ id: testReceptionUser.id, role: testReceptionUser.role });
    clientToken = generateToken({ id: testClientUser.id, role: testClientUser.role });
    otherClientToken = generateToken({ id: testOtherClientUser.id, role: testOtherClientUser.role });

    testReservationId = 1;
    testHotel = { id: 1, name: 'Test Hotel Invoicing', address: '123 Test St' };
    testRoomType = { id: 1, name: 'Deluxe Room' };

    mockReservationData = {
      id: testReservationId,
      user_id: testClientUser.id,
      hotel_id: testHotel.id,
      reference_number: 'RES-INV-001',
      check_in_date: moment().subtract(3, 'days').format('YYYY-MM-DD HH:mm:ss'),
      check_out_date: moment().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
      total_amount: 200.00, // Assuming this is pre-calculated room charges for 2 nights at 100
      status: 'checked_out', // A status suitable for invoicing
      client_first_name: testClientUser.first_name,
      client_last_name: testClientUser.last_name,
      client_email: testClientUser.email,
      client_company: testClientUser.company_name,
      hotel_name: testHotel.name,
      hotel_address: testHotel.address
    };

    mockConsumptionItemsData = [
      { reservation_id: testReservationId, item_name: 'Mini Bar: Water', quantity: 2, price_per_unit: 2.50, total_price: 5.00 },
      { reservation_id: testReservationId, item_name: 'Laundry Service', quantity: 1, price_per_unit: 20.00, total_price: 20.00 },
    ];
  });

  afterAll((done) => {
    if (expressServer && process.env.NODE_ENV !== 'test' && expressServer.close) {
        expressServer.close(done);
    } else {
        done();
    }
  });

  beforeEach(() => {
    db.execute.mockReset();
    sendEmail.mockClear();
  });

  describe('POST /api/reservations/:reservationId/invoice (Generate/Retrieve Invoice)', () => {
    it('should generate a new invoice if one does not exist', (done) => {
      let createdInvoiceId = 0;
      db.execute.mockImplementation(async (query, params) => {
        console.log(`[Test DB Mock - GenerateInvoice] Query: ${query}`, params || '');
        if (query.includes('SELECT * FROM invoices WHERE reservation_id = ?')) { // Check existing
          return [[]]; // No existing invoice
        }
        if (query.includes('SELECT r.*,')) { // Fetch reservation details
          return [[mockReservationData]];
        }
        if (query.includes('SELECT * FROM consumption_items WHERE reservation_id = ?')) {
          return [mockConsumptionItemsData];
        }
        if (query.includes('SELECT rr.rate_per_night, rr.room_id, rt.name as room_type_name')) { // Reservation room details
            return [[ { rate_per_night: 100, room_id: 1, room_type_name: 'Deluxe Room', quantity: 1 }, { rate_per_night: 100, room_id: 2, room_type_name: 'Deluxe Room', quantity: 1 } ]]; // 2 rooms, 1 night each, or 1 room for 2 nights
        }
        if (query.startsWith('INSERT INTO invoices')) {
          createdInvoiceId = Math.floor(Math.random() * 1000) + 1;
          return [{ insertId: createdInvoiceId }];
        }
        if (query.startsWith('INSERT INTO invoice_items')) {
          return [{}]; // Assume success
        }
        if (query.startsWith('SELECT * FROM invoices WHERE id = ?')) { // Fetch final invoice
          const subtotalRooms = 2 * 100.00; // 2 nights @ 100
          const subtotalConsumptions = 5.00 + 20.00;
          const subtotalBeforeTax = subtotalRooms + subtotalConsumptions;
          const taxes = subtotalBeforeTax * TAX_RATE;
          const totalDue = subtotalBeforeTax + taxes;
          return [[{
            id: createdInvoiceId, reservation_id: testReservationId, client_id: testClientUser.id,
            subtotal_room_charges: subtotalRooms, subtotal_consumption_charges: subtotalConsumptions,
            taxes_amount: taxes, total_amount_due: totalDue, status: 'draft'
            // ... other fields
          }]];
        }
        if (query.startsWith('SELECT * FROM invoice_items WHERE invoice_id = ?')) { // Fetch final items
            return [[
                { item_type: 'room', total_price: 200.00 },
                { item_type: 'consumption', total_price: 5.00 },
                { item_type: 'consumption', total_price: 20.00 },
                { item_type: 'tax', total_price: (200+25)*TAX_RATE }
            ]];
        }
        return Promise.resolve([[]]);
      });

      chai.request(app)
        .post(`/api/reservations/${testReservationId}/invoice`)
        .set('Authorization', `Bearer ${receptionToken}`)
        .send()
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('id');
          expect(res.body.reservation_id).to.equal(testReservationId);
          expect(res.body.status).to.equal('draft');
          expect(res.body.subtotal_room_charges).to.equal('200.00');
          expect(res.body.subtotal_consumption_charges).to.equal('25.00');
          const expectedTaxes = (200.00 + 25.00) * TAX_RATE;
          expect(res.body.taxes_amount).to.equal(expectedTaxes.toFixed(2));
          expect(res.body.total_amount_due).to.equal((225.00 + expectedTaxes).toFixed(2));
          expect(res.body.items).to.be.an('array').with.lengthOf(4); // Room, 2 consumptions, 1 tax
          done();
        });
    });

    it('should return an existing invoice if one is found', (done) => {
      const existingInvoice = { id: 55, reservation_id: testReservationId, status: 'paid', total_amount_due: '250.00', items: [{description: 'Pre-existing'}] };
      db.execute.mockImplementation(async (query, params) => {
        if (query.includes('SELECT * FROM invoices WHERE reservation_id = ?')) {
          return [[existingInvoice]]; // Found existing
        }
         if (query.startsWith('SELECT * FROM invoice_items WHERE invoice_id = ?')) {
            return [[{description: 'Pre-existing item'}]];
        }
        return Promise.resolve([[]]);
      });
      chai.request(app)
        .post(`/api/reservations/${testReservationId}/invoice`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send()
        .end((err, res) => {
          expect(res).to.have.status(200); // OK, not 201
          expect(res.body.id).to.equal(55);
          expect(res.body.status).to.equal('paid');
          done();
        });
    });

    it('should return 404 if reservation not found for invoice generation', (done) => {
        db.execute.mockImplementation(async (query, params) => {
            if (query.includes('SELECT * FROM invoices WHERE reservation_id = ?')) return [[]]; // No existing invoice
            if (query.includes('SELECT r.*,')) return [[]]; // Reservation not found
            return Promise.resolve([[]]);
        });
        chai.request(app)
            .post(`/api/reservations/9999/invoice`)
            .set('Authorization', `Bearer ${receptionToken}`)
            .send()
            .end((err, res) => {
                expect(res).to.have.status(404);
                expect(res.body.error).to.equal('Réservation non trouvée.');
                done();
            });
    });
  });

  describe('GET /api/invoices (List Invoices)', () => {
    it('should allow RECEPTION to list invoices with basic pagination', (done) => {
      const mockInvoicesList = [
        { id: 1, invoice_reference_number: 'INV-001', client_id: testClientUser.id, total_amount_due: 100, status: 'draft' },
        { id: 2, invoice_reference_number: 'INV-002', client_id: testOtherClientUser.id, total_amount_due: 150, status: 'paid' }
      ];
      db.execute.mockImplementation(async (query, params) => {
        if (query.startsWith('SELECT i.*,')) return [mockInvoicesList];
        if (query.startsWith('SELECT COUNT(*)')) return [[{ total: mockInvoicesList.length }]];
        return Promise.resolve([[]]);
      });
      chai.request(app)
        .get('/api/invoices?page=1&limit=10')
        .set('Authorization', `Bearer ${receptionToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('invoices').that.is.an('array').with.lengthOf(2);
          expect(res.body).to.have.property('pagination');
          expect(res.body.pagination.totalItems).to.equal(2);
          done();
        });
    });
    // Add tests for filtering by clientId, status, dateFrom, dateTo
  });

  describe('GET /api/invoices/:invoiceId (Get Invoice Details)', () => {
    const mockInvoiceId = 77;
    const mockInvoiceDetail = {
        id: mockInvoiceId, reservation_id: testReservationId, client_id: testClientUser.id,
        total_amount_due: 225.00, status: 'draft'
    };
    const mockInvoiceItemsDetail = [ { description: 'Room charges', total_price: 200.00 }, {description: 'Tax', total_price: 25.00 }];

    it('should allow ADMIN to get any invoice details', (done) => {
      db.execute.mockImplementation(async (query, params) => {
        if (query.startsWith('SELECT * FROM invoices WHERE id = ?')) return [[mockInvoiceDetail]];
        if (query.startsWith('SELECT * FROM invoice_items WHERE invoice_id = ?')) return [mockInvoiceItemsDetail];
        return Promise.resolve([[]]);
      });
      chai.request(app)
        .get(`/api/invoices/${mockInvoiceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.id).to.equal(mockInvoiceId);
          expect(res.body).to.have.property('items').that.is.an('array').with.lengthOf(2);
          done();
        });
    });

    it('should allow CLIENT to get their own invoice details', (done) => {
       db.execute.mockImplementation(async (query, params) => {
        if (query.startsWith('SELECT * FROM invoices WHERE id = ?')) return [[mockInvoiceDetail]]; // mockInvoiceDetail belongs to testClientUser
        if (query.startsWith('SELECT * FROM invoice_items WHERE invoice_id = ?')) return [mockInvoiceItemsDetail];
        return Promise.resolve([[]]);
      });
      chai.request(app)
        .get(`/api/invoices/${mockInvoiceId}`)
        .set('Authorization', `Bearer ${clientToken}`) // testClientUser's token
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.id).to.equal(mockInvoiceId);
          done();
        });
    });

    it('should NOT allow CLIENT to get another client\'s invoice details', (done) => {
       db.execute.mockImplementation(async (query, params) => {
        // mockInvoiceDetail belongs to testClientUser (id 3), but we are authed as otherClientToken (id 4)
        if (query.startsWith('SELECT * FROM invoices WHERE id = ?')) return [[mockInvoiceDetail]];
        return Promise.resolve([[]]);
      });
      chai.request(app)
        .get(`/api/invoices/${mockInvoiceId}`)
        .set('Authorization', `Bearer ${otherClientToken}`)
        .end((err, res) => {
          expect(res).to.have.status(403);
          expect(res.body.error).to.equal('Accès non autorisé à cette facture.');
          done();
        });
    });
     it('should return 404 if invoice not found', (done) => {
      db.execute.mockResolvedValueOnce([[]]); // Invoice not found
      chai.request(app)
        .get('/api/invoices/8888')
        .set('Authorization', `Bearer ${adminToken}`)
        .end((err, res) => {
          expect(res).to.have.status(404);
          done();
        });
    });
  });

  describe('POST /api/invoices/:invoiceId/send-email (Stub)', () => {
    it('should return success for agent trying to send email (stubbed)', (done) => {
        const mockInvoiceId = 77;
        db.execute.mockResolvedValueOnce([[{id: mockInvoiceId, client_email: 'test@example.com', invoice_reference_number: 'INV-001'}]]);
        chai.request(app)
            .post(`/api/invoices/${mockInvoiceId}/send-email`)
            .set('Authorization', `Bearer ${receptionToken}`)
            .send()
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body.message).to.contain('serait envoyée');
                // Check sendEmail mock was not called if it's truly stubbed in route
                // or ensure it was called if route calls it.
                // For now, the route logs and returns success without actual send.
                done();
            });
    });
  });

  describe('GET /api/invoices/:invoiceId/download-pdf (Stub)', () => {
    it('should return 501 Not Implemented for PDF download', (done) => {
        const mockInvoiceId = 77;
        db.execute.mockResolvedValueOnce([[{id: mockInvoiceId, client_id: testClientUser.id}]]); // For auth check
        chai.request(app)
            .get(`/api/invoices/${mockInvoiceId}/download-pdf`)
            .set('Authorization', `Bearer ${receptionToken}`)
            .end((err, res) => {
                expect(res).to.have.status(501);
                expect(res.body.message).to.contain('n\'est pas encore implémentée');
                done();
            });
    });
  });
});
