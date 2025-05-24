const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('Statistiques du dashboard');
});

module.exports = router;
