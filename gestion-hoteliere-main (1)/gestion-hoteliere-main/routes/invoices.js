// routes/invoices.js - Routes pour la gestion des factures
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

// ✅ CORRECTION: Utiliser req.body au lieu de body

// GET /api/invoices - Récupérer toutes les factures
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    // Logique pour récupérer les factures
    // Remplacez par votre logique de base de données
    const invoices = [];
    
    logger.info(`Récupération des factures pour l'utilisateur ${req.user.id}`);
    
    res.json({
      success: true,
      data: invoices,
      count: invoices.length
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des factures:', error);
    next(error);
  }
});

// POST /api/invoices - Créer une nouvelle facture
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    // ✅ CORRECTION: Utilisation correcte de req.body
    const invoiceData = req.body;
    
    // Validation des données requises
    if (!invoiceData || Object.keys(invoiceData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Données de facture manquantes'
      });
    }
    
    // Validation des champs obligatoires
    const requiredFields = ['reservationId', 'amount'];
    const missingFields = requiredFields.filter(field => !invoiceData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Champs manquants: ${missingFields.join(', ')}`
      });
    }
    
    // Création de la facture
    const newInvoice = {
      id: Date.now(), // Remplacez par votre logique de génération d'ID
      ...invoiceData,
      userId: req.user.id,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Ici, vous sauvegarderez en base de données
    // const savedInvoice = await Invoice.create(newInvoice);
    
    logger.info(`Facture créée avec succès: ${newInvoice.id}`);
    
    res.status(201).json({
      success: true,
      message: 'Facture créée avec succès',
      data: newInvoice
    });
  } catch (error) {
    logger.error('Erreur lors de la création de la facture:', error);
    next(error);
  }
});

// GET /api/invoices/:id - Récupérer une facture par ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID de facture manquant'
      });
    }
    
    // Logique pour récupérer une facture par ID
    // const invoice = await Invoice.findById(id);
    const invoice = null; // Remplacez par votre logique
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Facture non trouvée'
      });
    }
    
    logger.info(`Facture récupérée: ${id}`);
    
    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de la facture:', error);
    next(error);
  }
});

// PUT /api/invoices/:id - Mettre à jour une facture
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body; // ✅ CORRECTION: req.body au lieu de body
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID de facture manquant'
      });
    }
    
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Données de mise à jour manquantes'
      });
    }
    
    // Logique pour mettre à jour une facture
    // const updatedInvoice = await Invoice.findByIdAndUpdate(id, updateData, { new: true });
    
    const updatedInvoice = {
      id: id,
      ...updateData,
      updatedAt: new Date()
    };
    
    logger.info(`Facture mise à jour: ${id}`);
    
    res.json({
      success: true,
      message: 'Facture mise à jour avec succès',
      data: updatedInvoice
    });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la facture:', error);
    next(error);
  }
});

// DELETE /api/invoices/:id - Supprimer une facture
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID de facture manquant'
      });
    }
    
    // Vérifier si la facture existe
    // const invoice = await Invoice.findById(id);
    const invoice = null; // Remplacez par votre logique
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Facture non trouvée'
      });
    }
    
    // Logique pour supprimer une facture
    // await Invoice.findByIdAndDelete(id);
    
    logger.info(`Facture supprimée: ${id}`);
    
    res.json({
      success: true,
      message: 'Facture supprimée avec succès',
      deletedId: id
    });
  } catch (error) {
    logger.error('Erreur lors de la suppression de la facture:', error);
    next(error);
  }
});

// GET /api/invoices/user/:userId - Récupérer les factures d'un utilisateur
router.get('/user/:userId', authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Vérifier que l'utilisateur peut accéder à ces factures
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé'
      });
    }
    
    // Logique pour récupérer les factures d'un utilisateur
    // const userInvoices = await Invoice.find({ userId });
    const userInvoices = []; // Remplacez par votre logique
    
    logger.info(`Factures récupérées pour l'utilisateur: ${userId}`);
    
    res.json({
      success: true,
      data: userInvoices,
      count: userInvoices.length
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des factures utilisateur:', error);
    next(error);
  }
});

module.exports = router;