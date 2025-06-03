// server.js - Point d'entrée principal de l'application API
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();


const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
app.set('trust proxy', 1); // Trust the first hop

// Sécurité
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Limitation du nombre de requêtes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Parsing des données
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging des requêtes
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// ✅ Étape de test : commenter toutes les routes pour les tester une par une

try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ authRoutes chargé');
} catch (err) {
  console.error('❌ ERREUR dans authRoutes:', err.message);
}

try {
  const userRoutes = require('./routes/users');
  app.use('/api/users', userRoutes);
  console.log('✅ userRoutes chargé');
} catch (err) {
  console.error('❌ ERREUR dans userRoutes:', err.message);
}

try {
  const hotelRoutes = require('./routes/hotels');
  app.use('/api/hotels', hotelRoutes);
  console.log('✅ hotelRoutes chargé');
} catch (err) {
  console.error('❌ ERREUR dans hotelRoutes:', err.message);
}

try {
  const reservationRoutes = require('./routes/reservations');
  app.use('/api/reservations', reservationRoutes);
  console.log('✅ reservationRoutes chargé');
} catch (err) {
  console.error('❌ ERREUR dans reservationRoutes:', err.message);
}

try {
  const roomRoutes = require('./routes/rooms');
  app.use('/api/rooms', roomRoutes);
  console.log('✅ roomRoutes chargé');
} catch (err) {
  console.error('❌ ERREUR dans roomRoutes:', err.message);
}

try {
  const invoiceRoutes = require('./routes/invoices');
  app.use('/api/invoices', invoiceRoutes);
  console.log('✅ invoiceRoutes chargé');
} catch (err) {
  console.error('❌ ERREUR dans invoiceRoutes:', err.message);
}

try {
  const dashboardRoutes = require('./routes/dashboard');
  app.use('/api/dashboard', dashboardRoutes);
  console.log('✅ dashboardRoutes chargé');
} catch (err) {
  console.error('❌ ERREUR dans dashboardRoutes:', err.message);
}

// Route de test (health check)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Middleware de gestion d'erreurs
app.use(errorHandler);

// Lancement du serveur
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  logger.info(`🚀 Serveur démarré sur le port ${PORT}`);
});
