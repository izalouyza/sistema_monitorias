const express = require('express');
// Tente mudar de '../database/db' para:
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authMiddleware);

function fmt(n) {
  return {
    id: n.id, toUserId: n.to_user_id, title: n.title, body: n.body,
    agendamentoId: n.agendamento_id, read: n.read,
    at: n.created_at instanceof Date ? n.created_at.toISOString() : n.created_at,
  };
}

// GET /api/notificacoes  — notificações do usuário logado
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notificacoes WHERE to_user_id=$1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(result.rows.map(fmt));
  } catch (err) { res.status(500).json({ error: 'Erro ao listar notificações' }); }
});

// POST /api/notificacoes  (backend/admin cria notificações)
router.post('/', async (req, res) => {
  const { toUserId, title, body, agendamentoId } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO notificacoes (to_user_id, title, body, agendamento_id)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [toUserId, title, body, agendamentoId || null]
    );
    res.status(201).json(fmt(result.rows[0]));
  } catch (err) { res.status(500).json({ error: 'Erro ao criar notificação' }); }
});

// PATCH /api/notificacoes/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE notificacoes SET read=true WHERE id=$1 AND to_user_id=$2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Notificação não encontrada' });
    res.json(fmt(result.rows[0]));
  } catch (err) { res.status(500).json({ error: 'Erro ao marcar como lida' }); }
});

// PATCH /api/notificacoes/read-all
router.patch('/read-all', async (req, res) => {
  try {
    await pool.query('UPDATE notificacoes SET read=true WHERE to_user_id=$1', [req.user.id]);
    res.json({ message: 'Todas marcadas como lidas' });
  } catch (err) { res.status(500).json({ error: 'Erro ao marcar notificações' }); }
});

module.exports = router;
