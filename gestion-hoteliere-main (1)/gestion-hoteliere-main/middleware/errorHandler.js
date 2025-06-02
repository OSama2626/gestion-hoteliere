// middleware/errorHandler.js
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  // Log the error with more details
  // In a production environment, you might want to limit the verbosity of err.stack
  // or only log it for certain types of errors.
  logger.error({
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : 'Stack trace hidden in production', // Log stack for server-side debugging
    path: req.path,
    method: req.method,
    ip: req.ip,
    // Add other relevant request info if needed (e.g., req.user if available)
    user: req.user ? req.user.id : 'Guest', // Example of logging user info
    body: req.body, // Be cautious logging request bodies, they might contain sensitive data
    query: req.query,
  });

  let statusCode = err.statusCode && Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode < 600
    ? err.statusCode
    : 500;

  let responseBody = {
    message: 'Une erreur interne est survenue.', // Default server error message in French
  };

  // Handling express-validator like errors (if they are passed as err.errors)
  if (err.errors && Array.isArray(err.errors)) {
    // If statusCode is already set by a previous middleware (e.g. validation middleware setting 400 or 422)
    // and it's a client error, use it. Otherwise, default to 400.
    if (!(statusCode >= 400 && statusCode < 500)) {
        statusCode = 400; 
    }
    responseBody.message = err.message || 'Erreur de validation.'; // Validation error message in French
    responseBody.errors = err.errors;
  } else if (statusCode >= 400 && statusCode < 500 && err.message) {
    // For client errors (4xx), use the error message if available and not a validation array error
    responseBody.message = err.message;
  }
  // else, for 500 errors, the default "Une erreur interne est survenue." is used.

  // Handling specific error names for more tailored responses
  if (err.name === 'UnauthorizedError') { // Typically from express-jwt if not configured properly
    statusCode = 401;
    responseBody.message = err.message || 'Non autorisé.'; // Unauthorized message in French
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    responseBody.message = 'Token invalide ou malformé.'; // Invalid token message in French
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    responseBody.message = 'Token expiré.'; // Expired token message in French
  } else if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    // Example for Sequelize validation errors
    statusCode = 422; // Unprocessable Entity
    responseBody.message = err.message || 'Erreur de validation des données.';
    if (err.errors && err.errors.length > 0) {
      responseBody.errors = err.errors.map(e => ({
        message: e.message,
        type: e.type,
        path: e.path,
        value: e.value,
      }));
    }
  } else if (err.name === 'SequelizeDatabaseError') {
    // Generic database error, avoid sending specifics to client
    // StatusCode is likely 500 already, but can ensure
    statusCode = 500;
    responseBody.message = 'Erreur de base de données.'; // Database error message in French
  }
  
  // Ensure stack trace is not sent to client, especially in production
  if (process.env.NODE_ENV !== 'development' && responseBody.stack) {
    delete responseBody.stack;
  }
  if (process.env.NODE_ENV !== 'development' && responseBody.errors) {
    // For validation errors, we might want to show them, but ensure no sensitive details from db leak.
    // The current mapping for SequelizeValidationError is an example of sanitizing.
  }


  res.status(statusCode).json(responseBody);
}

module.exports = { errorHandler };
