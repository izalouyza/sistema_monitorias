// chamada.routes.js
const express = require('express');
// Tente mudar de '../database/db' para:
const pool = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authMiddleware);

// GET /api/chamadas
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM chamadas ORDER BY data DESC');
    const rows = result.rows.map(c => ({
      id: c.id,
      alunoId: c.aluno_id,
      horarioId: c.horario_id,
      data: c.data instanceof Date ? c.data.toISOString().slice(0, 10) : c.data,
      presente: c.presente,
    }));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar chamadas' });
  }
});

// POST /api/chamadas  (monitor registra presença)
router.post('/', requireRole('monitor', 'admin'), async (req, res) => {
  const { alunoId, horarioId, data, presente } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO chamadas (aluno_id, horario_id, data, presente)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (aluno_id, horario_id, data)
       DO UPDATE SET presente = $4
       RETURNING *`,
      [alunoId, horarioId, data, presente ?? true]
    );
    const c = result.rows[0];
    res.status(201).json({
      id: c.id, alunoId: c.aluno_id, horarioId: c.horario_id,
      data: c.data instanceof Date ? c.data.toISOString().slice(0, 10) : c.data,
      presente: c.presente,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar chamada' });
  }
});

// PATCH /api/chamadas/:id  (toggle presença)
router.patch('/:id', requireRole('monitor', 'admin'), async (req, res) => {
  const { presente } = req.body;
  try {
    const result = await pool.query(
      'UPDATE chamadas SET presente=$1 WHERE id=$2 RETURNING *',
      [presente, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Chamada não encontrada' });
    const c = result.rows[0];
    res.json({
      id: c.id, alunoId: c.aluno_id, horarioId: c.horario_id,
      data: c.data instanceof Date ? c.data.toISOString().slice(0, 10) : c.data,
      presente: c.presente,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar chamada' });
  }
});

module.exports = router;
