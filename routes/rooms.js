const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('Liste des chambres');
});

module.exports = router;
