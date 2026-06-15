const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/login
// O React vai enviar a matrícula e a senha para esta rota
router.post('/login', authController.login);

router.post('/registro', authController.registrar);

module.exports = router;