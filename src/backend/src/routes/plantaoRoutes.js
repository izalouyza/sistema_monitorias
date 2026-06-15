const express = require('express');
const router = express.Router();
const plantaoController = require('../controllers/plantaoController');
const { verificarToken, verificarPerfilMonitor } = require('../middlewares/authMiddleware');

// GET /api/plantoes (Qualquer utilizador autenticado pode ver os horários)
router.get('/', plantaoController.listarPlantoes);

// POST /api/plantoes (Restrito: Só passa se o token for de um monitor)
router.post('/', verificarToken, verificarPerfilMonitor, plantaoController.criarPlantao);

module.exports = router;