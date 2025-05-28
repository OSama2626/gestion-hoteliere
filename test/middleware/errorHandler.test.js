// Mock logger from utils/logger
const mockLoggerError = jest.fn();
jest.mock('../../utils/logger', () => ({ // Adjusted path for utils/logger
  error: mockLoggerError,
  // Mock other logger methods if your errorHandler uses them (e.g., info, warn)
  // For now, assuming only logger.error is used by errorHandler
}));

const { errorHandler } = require('../../middleware/errorHandler'); // Adjusted path

describe('Global Error Handler (errorHandler)', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    // Reset mocks for each test
    mockLoggerError.mockClear();

    mockReq = {
      path: '/test-path',
      method: 'GET',
      ip: '127.0.0.1',
      user: { id: 'testUserId123' }, // Mock user object
      body: { testBodyParam: 'value' }, // Mock request body
      query: { testQueryParam: 'value' }, // Mock request query
    };
    mockRes = {
      status: jest.fn().mockReturnThis(), // Allows chaining res.status().json()
      json: jest.fn(),
      headersSent: false, // Simulate headers not sent initially
    };
    mockNext = jest.fn(); // Mock next function in middleware chain
  });

  it('should handle generic error with default 500 status and message', () => {
    const genericError = new Error('A generic server error occurred.');
    // genericError.stack = 'Error: A generic server error occurred.\n    at <anonymous>:1:7'; // Example stack

    errorHandler(genericError, mockReq, mockRes, mockNext);

    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    expect(mockLoggerError).toHaveBeenCalledWith(expect.objectContaining({
      message: genericError.message,
      stack: expect.any(String), // Check that stack is logged
      path: mockReq.path,
      method: mockReq.method,
      ip: mockReq.ip,
      user: mockReq.user.id,
      body: mockReq.body,
      query: mockReq.query,
    }));

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Une erreur interne est survenue.', // Default message from errorHandler
    });
    // Ensure stack is not in the response
    const responseJson = mockRes.json.mock.calls[0][0];
    expect(responseJson).not.toHaveProperty('stack');
  });

  it('should use err.statusCode and err.message if provided', () => {
    const customError = { message: 'Resource Not Found Here', statusCode: 404 };
    // customError.stack = 'Error: Resource Not Found Here\n    at someFile.js:10:5';

    errorHandler(customError, mockReq, mockRes, mockNext);

    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    expect(mockLoggerError).toHaveBeenCalledWith(expect.objectContaining({
      message: customError.message,
      // stack: customError.stack, // If stack is provided on error, it should be logged
    }));

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: customError.message,
    });
  });

  it('should handle express-validator style errors', () => {
    const validationError = {
      message: 'Validation Failed for Input',
      statusCode: 400, // Or 422, depending on how it's set before errorHandler
      errors: [{ field: 'email', msg: 'Invalid email format provided.' }],
    };
    // validationError.stack = 'Error: Validation Failed...\n    at validationMiddleware.js:25:12';

    errorHandler(validationError, mockReq, mockRes, mockNext);
    
    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    expect(mockLoggerError).toHaveBeenCalledWith(expect.objectContaining({
      message: validationError.message,
    }));

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: validationError.message,
      errors: validationError.errors,
    });
  });

  it('should handle JsonWebTokenError with 401 status and specific message', () => {
    const jwtError = { name: 'JsonWebTokenError', message: 'jwt malformed or invalid signature' };
    // jwtError.stack = 'JsonWebTokenError: jwt malformed...\n    at ...';
    
    errorHandler(jwtError, mockReq, mockRes, mockNext);

    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    expect(mockLoggerError).toHaveBeenCalledWith(expect.objectContaining({
      message: jwtError.message,
    }));
    
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Token invalide ou malformé.', // Specific message from errorHandler
    });
  });

  it('should handle TokenExpiredError with 401 status and specific message', () => {
    const expiredError = { name: 'TokenExpiredError', message: 'jwt expired' };
    // expiredError.stack = 'TokenExpiredError: jwt expired...\n    at ...';

    errorHandler(expiredError, mockReq, mockRes, mockNext);
    
    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    expect(mockLoggerError).toHaveBeenCalledWith(expect.objectContaining({
      message: expiredError.message,
    }));

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Token expiré.', // Specific message from errorHandler
    });
  });
  
  it('should handle UnauthorizedError with 401 status and specific message', () => {
    const unauthorizedError = { name: 'UnauthorizedError', message: 'No authorization token was found' };
    // unauthorizedError.stack = 'UnauthorizedError: No authorization token...\n    at ...';

    errorHandler(unauthorizedError, mockReq, mockRes, mockNext);
    
    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    expect(mockLoggerError).toHaveBeenCalledWith(expect.objectContaining({
      message: unauthorizedError.message,
    }));

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: unauthorizedError.message, // errorHandler uses err.message for UnauthorizedError if available
    });
  });

  it('should handle SequelizeValidationError with 422 status and formatted errors', () => {
    const sequelizeError = {
      name: 'SequelizeValidationError',
      message: 'Validation error',
      errors: [
        { message: 'User.email cannot be null', type: 'notNull Violation', path: 'email', value: null }
      ]
    };
    // sequelizeError.stack = 'SequelizeValidationError: Validation error...\n    at ...';
    
    errorHandler(sequelizeError, mockReq, mockRes, mockNext);

    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    expect(mockRes.status).toHaveBeenCalledWith(422);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: sequelizeError.message,
      errors: expect.arrayContaining([
        expect.objectContaining({
          message: 'User.email cannot be null',
          type: 'notNull Violation',
          path: 'email',
          value: null
        })
      ])
    });
  });
  
  it('should handle SequelizeDatabaseError with 500 status and generic DB error message', () => {
    const dbError = { 
        name: 'SequelizeDatabaseError', 
        message: 'Some detailed SQL error that should not go to client',
        parent: { code: 'ER_SOME_CODE' } // Example parent error from DB driver
    };
    // dbError.stack = 'SequelizeDatabaseError: Some detailed SQL error...\n    at ...';

    errorHandler(dbError, mockReq, mockRes, mockNext);

    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Erreur de base de données.', 
    });
  });

  it('should not send stack trace in production environment', () => {
    process.env.NODE_ENV = 'production';
    const errorWithStack = new Error('Error with stack');
    errorWithStack.stack = 'Error: Error with stack\n    at repl:1:7';

    errorHandler(errorWithStack, mockReq, mockRes, mockNext);
    
    expect(mockLoggerError).toHaveBeenCalledWith(expect.objectContaining({
      stack: 'Stack trace hidden in production', // As per current errorHandler implementation
    }));
    const responseJson = mockRes.json.mock.calls[0][0];
    expect(responseJson).not.toHaveProperty('stack');
    
    process.env.NODE_ENV = 'test'; // Reset NODE_ENV
  });

  it('should log stack trace in development environment', () => {
    process.env.NODE_ENV = 'development';
    const errorWithStack = new Error('Error with stack for dev');
    errorWithStack.stack = 'DEV STACK: Error: Error with stack for dev\n    at repl:1:7';

    errorHandler(errorWithStack, mockReq, mockRes, mockNext);
    
    expect(mockLoggerError).toHaveBeenCalledWith(expect.objectContaining({
      stack: errorWithStack.stack,
    }));
    const responseJson = mockRes.json.mock.calls[0][0];
    expect(responseJson).not.toHaveProperty('stack'); // Stack is never sent in response
    
    process.env.NODE_ENV = 'test'; // Reset NODE_ENV
  });
  
  it('should correctly use err.statusCode even if it is a string if valid', () => {
    const customError = { message: 'Bad Request String Code', statusCode: '400' };
    errorHandler(customError, mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Bad Request String Code' });
  });

  it('should default to 500 if err.statusCode is not a valid error code range', () => {
    const customError = { message: 'Invalid Status Code', statusCode: 200 }; // 200 is not an error code
    errorHandler(customError, mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Une erreur interne est survenue.' });
  });
});
