const express = require('express');
const router = express.Router();
const agendamentoController = require('../controllers/agendamentoController');
const { verificarToken } = require('../middlewares/authMiddleware');

// POST /api/agendamentos (Aluno marca o atendimento)
router.post('/', verificarToken, agendamentoController.agendarAtendimento);

// PUT /api/agendamentos/:id_agendamento/cancelar (Aluno cancela a sua vaga)
router.put('/:id_agendamento/cancelar', verificarToken, agendamentoController.cancelarAgendamento);

module.exports = router;