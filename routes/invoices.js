const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('Liste des factures');
});

module.exports = router;
