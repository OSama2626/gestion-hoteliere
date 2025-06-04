const chai = require('chai');
const chaiHttp = require('chai-http');
const { app, server: expressServer } = require('../server'); // Import app and the actual server instance
// Mock the database module
jest.mock('../config/database');
const db = require('../config/database'); // db will now be the mocked version
const { ROLES } = require('../utils/constants');
const { generateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

chai.use(chaiHttp);
const expect = chai.expect;

// Close server after all tests are done to prevent Jest from hanging
afterAll((done) => {
  if (expressServer && expressServer.close) {
    expressServer.close(done);
  } else {
    done(); // If server wasn't started or no close method
  }
});

describe('User Management API (/api/users)', () => {
  let adminToken;
  let receptionToken;
  let clientToken;
  let managerToken;

  let testAdminUser;
  let testReceptionUser;
  let testClientUser1;
  let testClientUser2;
  let testManagerUser;

  before(async () => {
    // Mock database interactions
    // Reset mocks before each test if needed, or configure them per test
    db.execute.mockReset();

    // Setup mock return values for user creation in the 'before' block
    // These are simplified; you'd need to match query patterns if your mock is more complex
    let userIdCounter = 1;
    // Simplified global mock. Specific tests will override this.
    db.execute.mockImplementation(async (query, params) => {
      console.log(`Mock DB Execute: Query: ${query}, Params: ${JSON.stringify(params)}`); // Log query
      if (query.startsWith('INSERT INTO users')) {
        return Promise.resolve([{ insertId: userIdCounter++ }]);
      }
      if (query.startsWith('SELECT')) {
        // Default for SELECT: return empty array for main result, and [{total: 0}] for count if applicable.
        // This helps avoid 'cannot read property 'length' of undefined' or similar if a test doesn't mock perfectly.
        if (query.includes('COUNT(*)')) {
          return Promise.resolve([[{ total: 0 }]]);
        }
        return Promise.resolve([[]]);
      }
      return Promise.resolve([{}]); // Default for other types like DELETE, UPDATE
    });

    // Create users for testing roles (these are now just JS objects, not DB entries)
    testAdminUser = { id: userIdCounter++, email: 'admin@test.com', role: ROLES.ADMIN, firstName: 'Admin', lastName: 'User' };
    testReceptionUser = { id: userIdCounter++, email: 'reception@test.com', role: ROLES.RECEPTION, firstName: 'Reception', lastName: 'User' };
    testClientUser1 = { id: userIdCounter++, email: 'client1@test.com', role: ROLES.CLIENT, firstName: 'Client', lastName: 'One' };
    testClientUser2 = { id: userIdCounter++, email: 'client2@test.com', role: ROLES.CLIENT, firstName: 'Client', lastName: 'Two', phone: '1234567890' };
    testManagerUser = { id: userIdCounter++, email: 'manager@test.com', role: ROLES.HOTEL_MANAGER, firstName: 'Manager', lastName: 'User' };

    adminToken = generateToken({ id: testAdminUser.id, role: testAdminUser.role });
    receptionToken = generateToken({ id: testReceptionUser.id, role: testReceptionUser.role });
    clientToken = generateToken({ id: testClientUser1.id, role: testClientUser1.role });
    managerToken = generateToken({ id: testManagerUser.id, role: testManagerUser.role });

    // Mock email sending if necessary
    // sinon.stub(emailUtils, 'sendEmail').resolves();
  });

  after(async () => {
    // No need to clean up DB as it's mocked.
    // await db.end(); // No actual pool to close
  });

  describe('POST /api/users/create-client', () => {
    beforeEach(() => {
        // Reset and configure mocks for each test in this suite if necessary
        db.execute.mockReset();

        // Default mock for successful user creation
        db.execute.mockImplementation(async (query, params) => {
            if (query.startsWith('SELECT id FROM users WHERE email = ?')) {
                // For the positive test cases, assume email does not exist yet
                if (params[0] === 'newclient.admin@test.com' || params[0] === 'newclient.reception@test.com') {
                    return [[]]; // Email not found
                }
                // For the duplicate email test case
                if (params[0] === testClientUser1.email) {
                    return [[{ id: testClientUser1.id }]]; // Email found
                }
                return [[]];
            }
            if (query.startsWith('INSERT INTO users')) {
                return [{ insertId: 99 }]; // Mocked insertId
            }
            if (query.startsWith('SELECT id, email, first_name, last_name, phone, user_type, company_name, role, is_active, created_at FROM users WHERE id = ?')) {
                // Return the details of the "created" user
                return [[{
                    id: 99, // Must match insertId
                    email: 'newclient.admin@test.com', // Or dynamically get from params if route passes it
                    firstName: 'New', lastName: 'ClientAdmin', role: ROLES.CLIENT
                }]];
            }
            return [[]];
        });
    });

    it('should allow ADMIN to create a new client', (done) => {
      const newClientData = {
        email: 'newclient.admin@test.com', // This email will be "not found" by the mock
        firstName: 'New',
        lastName: 'ClientAdmin',
        phone: '1112223333',
        userType: 'Individual',
        companyName: 'Test Co Admin'
      };
      chai.request(app) // Use app directly
        .post('/api/users/create-client')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newClientData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.be.an('object');
          expect(res.body.message).to.equal('Client créé avec succès.');
          expect(res.body.client).to.include({ email: newClientData.email, role: ROLES.CLIENT });
          expect(res.body.client).to.not.have.property('password_hash');
          // TODO: Verify email was "sent" (e.g. check sendEmail stub call / mock)
          // For now, we assume if the API call is successful, the email part in the route worked.
          done();
        });
    });

    it('should allow RECEPTION to create a new client', (done) => {
      const newClientData = {
        email: 'newclient.reception@test.com', // Will be "not found" by mock
        firstName: 'New',
        lastName: 'ClientReception',
        phone: '4445556666',
        userType: 'Corporate'
      };
       // Adjust mock for this specific email if needed, or ensure general mock handles it
      db.execute.mockImplementation(async (query, params) => {
        if (query.startsWith('SELECT id FROM users WHERE email = ?')) {
            return [[]]; // Email not found for this test case
        }
        if (query.startsWith('INSERT INTO users')) {
            return [{ insertId: 100 }]; // Mocked insertId for this test
        }
        if (query.startsWith('SELECT id, email, first_name, last_name, phone, user_type, company_name, role, is_active, created_at FROM users WHERE id = ?')) {
            return [[{
                id: 100, email: newClientData.email,
                firstName: newClientData.firstName, lastName: newClientData.lastName,
                role: ROLES.CLIENT
            }]];
        }
        return [[]];
      });

      chai.request(app) // Use app directly
        .post('/api/users/create-client')
        .set('Authorization', `Bearer ${receptionToken}`)
        .send(newClientData)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body.message).to.equal('Client créé avec succès.');
          expect(res.body.client).to.include({ email: newClientData.email, role: ROLES.CLIENT });
          done();
        });
    });

    it('should NOT allow CLIENT to create a new client', (done) => {
      const newClientData = { email: 'fail.client@test.com', firstName: 'Fail', lastName: 'Client' };
      chai.request(app) // Use app directly
        .post('/api/users/create-client')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(newClientData)
        .end((err, res) => {
          expect(res).to.have.status(403); // Forbidden
          done();
        });
    });

    it('should NOT allow HOTEL_MANAGER to create a new client', (done) => {
      const newClientData = { email: 'fail.manager@test.com', firstName: 'Fail', lastName: 'Manager' };
      chai.request(app) // Use app directly
        .post('/api/users/create-client')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(newClientData)
        .end((err, res) => {
          expect(res).to.have.status(403); // Forbidden
          done();
        });
    });

    it('should return 409 if email already exists', (done) => {
      const newClientData = {
        email: testClientUser1.email, // Existing email, mock should return a user for this
        firstName: 'Duplicate',
        lastName: 'EmailTest'
      };
      // Ensure mock returns existing user for this email
      db.execute.mockImplementation(async (query, params) => {
        if (query.startsWith('SELECT id FROM users WHERE email = ?') && params[0] === testClientUser1.email) {
            return [[{ id: testClientUser1.id }]]; // Email found
        }
        return [[]];
      });

      chai.request(app) // Use app directly
        .post('/api/users/create-client')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newClientData)
        .end((err, res) => {
          expect(res).to.have.status(409);
          expect(res.body.error).to.equal('Un utilisateur avec cet email existe déjà.');
          done();
        });
    });

    it('should return 400 for invalid input (e.g., missing first name)', (done) => {
      const newClientData = {
        email: 'invalid.input@test.com',
        // Missing firstName
        lastName: 'InputValidation'
      };
      chai.request(app) // Use app directly
        .post('/api/users/create-client')
        .set('Authorization', `Bearer ${receptionToken}`)
        .send(newClientData)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.errors).to.be.an('array');
          expect(res.body.errors[0].param).to.equal('firstName');
          done();
        });
    });
  });

  describe('GET /api/users (List Users)', () => {
    beforeEach(() => {
        db.execute.mockReset(); // Reset mocks for this suite
    });

    it('ADMIN should be able to list all users, including different roles', (done) => {
      // Mock DB to return a list of diverse users for Admin
      const mockUsers = [
          { ...testAdminUser, password_hash: undefined }, // Ensure password hash is not sent
          { ...testReceptionUser, password_hash: undefined },
          { ...testClientUser1, password_hash: undefined },
          { ...testManagerUser, password_hash: undefined },
      ];
      db.execute.mockImplementation(async (query) => {
          if (query.includes('SELECT COUNT(*) as total FROM users')) {
              return [[{ total: mockUsers.length }]];
          }
          if (query.includes('SELECT id, email, first_name, last_name, phone, user_type, company_name, role, is_active, created_at, updated_at FROM users')) {
              return [mockUsers];
          }
          return [[]];
      });

      chai.request(app) // Use app directly
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.users).to.be.an('array');
          // Expecting admin, reception, client1, client2, manager, and the 2 created by admin/reception in previous tests
          expect(res.body.users.length).to.equal(4);
          const rolesFound = new Set(res.body.users.map(u => u.role));
          expect(rolesFound).to.include(ROLES.ADMIN);
          expect(rolesFound).to.include(ROLES.RECEPTION);
          expect(rolesFound).to.include(ROLES.CLIENT);
          expect(rolesFound).to.include(ROLES.HOTEL_MANAGER);
          done();
        });
    });

    it('ADMIN should be able to filter users by role (e.g., CLIENT)', (done) => {
      chai.request(app) // Use app directly
        .get(`/api/users?role=${ROLES.CLIENT}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.users).to.be.an('array');
          expect(res.body.users.length).to.be.greaterThan(0);
          res.body.users.forEach(user => {
            expect(user.role).to.equal(ROLES.CLIENT);
          });
          done();
        });
    });

    it('ADMIN should be able to search users by email', (done) => {
      const managerEmail = testManagerUser.email;
      db.execute.mockImplementation(async (query, params) => {
          if (query.includes('SELECT COUNT(*) as total FROM users WHERE 1=1 AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)')) {
              return [[{ total: 1 }]];
          }
          if (query.includes('SELECT id, email, first_name, last_name, phone, user_type, company_name, role, is_active, created_at, updated_at FROM users WHERE 1=1 AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)')) {
              if (params.includes(`%${managerEmail}%`)) {
                return [[{...testManagerUser, password_hash: undefined }]];
              }
              return [[]];
          }
          return [[]];
      });

      chai.request(app) // Use app directly
        .get(`/api/users?search=${managerEmail}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.users).to.be.an('array').with.lengthOf(1);
          expect(res.body.users[0].email).to.equal(managerEmail);
          done();
        });
    });

    it('RECEPTION should only be able to list CLIENT role users', (done) => {
      const mockClientUsers = [
          { ...testClientUser1, password_hash: undefined },
          { ...testClientUser2, password_hash: undefined },
      ];
       db.execute.mockImplementation(async (query) => {
          if (query.includes('SELECT COUNT(*) as total FROM users WHERE 1=1 AND role = ?')) {
              return [[{ total: mockClientUsers.length }]];
          }
          // Note: The query from the route is `SELECT ... FROM users WHERE 1=1 AND role = ? ...`
          if (query.includes('SELECT id, email, first_name, last_name, phone, user_type, company_name, role, is_active, created_at, updated_at FROM users WHERE 1=1 AND role = ?')) {
              return [mockClientUsers];
          }
          return [[]];
      });
      chai.request(app) // Use app directly
        .get('/api/users')
        .set('Authorization', `Bearer ${receptionToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.users).to.be.an('array');
          expect(res.body.users.length).to.equal(mockClientUsers.length);
          res.body.users.forEach(user => {
            expect(user.role).to.equal(ROLES.CLIENT);
          });
          const rolesFound = new Set(res.body.users.map(u => u.role));
          expect(rolesFound).to.not.include(ROLES.ADMIN);
          done();
        });
    });

    it('RECEPTION trying to filter by ADMIN role should still only get CLIENTs', (done) => {
      // Mock should still only return clients because the route logic forces role=CLIENT for reception
      const mockClientUsers = [{ ...testClientUser1, password_hash: undefined }];
      db.execute.mockImplementation(async (query, params) => {
          // req.user.role is RECEPTION, so 'AND role = ?' with ROLES.CLIENT is added
          // The query will be '... WHERE 1=1 AND role = ? AND role = ? ...' (first ? is CLIENT, second is ADMIN from query param)
          // This will realistically return 0 results unless a user is both CLIENT and ADMIN (not possible)
          // Or, the query optimization in the route might only apply the first role filter for reception.
          // The current route logic: if (req.user.role === ROLES.RECEPTION) { whereClause += ' AND role = ?'; params.push(ROLES.CLIENT); }
          // else if (role) { whereClause += ' AND role = ?'; params.push(role); }
          // So the query will indeed have `AND role = 'client'` and the `?role=admin` from query string will be ignored.
          if (query.includes('WHERE 1=1 AND role = ?')) {
            if(params.includes(ROLES.CLIENT)) { // This check ensures the mock responds to the reception-forced query
              if (query.includes('SELECT COUNT(*)')) return [[{ total: mockClientUsers.length }]];
              return [mockClientUsers];
            }
          }
          return [[], [{total: 0}]]; // Default empty
      });

      chai.request(app) // Use app directly
        .get(`/api/users?role=${ROLES.ADMIN}`) // Reception trying to filter by ADMIN
        .set('Authorization', `Bearer ${receptionToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.users).to.be.an('array');
          res.body.users.forEach(user => {
            expect(user.role).to.equal(ROLES.CLIENT);
          });
          done();
        });
    });

    it('RECEPTION should be able to search CLIENTS by email', (done) => {
      const clientEmail = testClientUser2.email;
      const expectedClient = [{ ...testClientUser2, password_hash: undefined }];
      db.execute.mockImplementation(async (query, params) => {
          // Query will be: SELECT ... FROM users WHERE 1=1 AND role = ? AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)
          if (query.includes('WHERE 1=1 AND role = ? AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)')) {
              if (params.includes(ROLES.CLIENT) && params.includes(`%${clientEmail}%`)) {
                  if (query.includes('SELECT COUNT(*)')) return [[{ total: 1 }]];
                  return [expectedClient];
              }
          }
          return [[], [{total: 0}]];
      });

      chai.request(app) // Use app directly
        .get(`/api/users?search=${clientEmail}`)
        .set('Authorization', `Bearer ${receptionToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.users).to.be.an('array').with.lengthOf(1);
          expect(res.body.users[0].email).to.equal(clientEmail);
          expect(res.body.users[0].role).to.equal(ROLES.CLIENT);
          done();
        });
    });

    it('RECEPTION search for a non-CLIENT email should return empty list', (done) => {
      const adminEmail = testAdminUser.email;
      db.execute.mockImplementation(async (query, params) => {
          if (query.includes('WHERE 1=1 AND role = ? AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)')) {
             if (params.includes(ROLES.CLIENT) && params.includes(`%${adminEmail}%`)) {
                  if (query.includes('SELECT COUNT(*)')) return [[{ total: 0 }]];
                  return [[]]; // No client matches this admin email
              }
          }
          return [[], [{total: 0}]];
      });
      chai.request(app) // Use app directly
        .get(`/api/users?search=${adminEmail}`)
        .set('Authorization', `Bearer ${receptionToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.users).to.be.an('array').that.is.empty;
          done();
        });
    });

    it('CLIENT should NOT be able to list users', (done) => {
      chai.request(app) // Use app directly
        .get('/api/users')
        .set('Authorization', `Bearer ${clientToken}`)
        .end((err, res) => {
          expect(res).to.have.status(403);
          done();
        });
    });

    it('HOTEL_MANAGER should NOT be able to list users', (done) => {
      chai.request(app) // Use app directly
        .get('/api/users')
        .set('Authorization', `Bearer ${managerToken}`)
        .end((err, res) => {
          expect(res).to.have.status(403);
          done();
        });
    });
  });
});

// Placeholder for actual generateToken if not available from auth.js
// Placeholder for actual generateToken if not available from auth.js
// This is a simplified example. Your actual token generation might be more complex.
// const jwt = require('jsonwebtoken');
// function generateToken(payload) {
// return jwt.sign(payload, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });
// }
// Make sure JWT_SECRET is defined in your .env for tests or use a default
// const bcrypt = require('bcryptjs'); // Already required above, ensure it's available in this scope if generateToken is moved
// const jwt = require('jsonwebtoken'); // No longer needed here as generateToken is imported

// If generateToken is not exported from middleware/auth.js, define it here or import appropriately
// For this example, let's assume it's defined here for simplicity if not exported.
// Ensure this matches the actual signature and secret used in your application.
// const generateToken = (user) => {
// return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'fallback_secret_for_testing', { expiresIn: '1h' });
// };

// Ensure this is at the end or managed correctly if server needs to be started/stopped for tests
// For chai-http, it typically handles server lifecycle if 'server.js' exports the app.
// if (require.main === module) {
//   server.listen(3001); // Or some other port for testing
// }
