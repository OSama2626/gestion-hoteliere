// middleware/errorHandler.js

function errorHandler(err, req, res, next) {
  console.error('❌ Middleware erreur:', err);
  res.status(500).json({
    error: err.message || 'Erreur interne du serveur'
  });
}

module.exports = { errorHandler };
