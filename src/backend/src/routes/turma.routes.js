const express = require('express');
// Tente mudar de '../database/db' para:
const pool = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authMiddleware);

// GET /api/turmas
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, u.name AS professor_nome
      FROM turmas t
      LEFT JOIN usuarios u ON u.id = t.professor_id
      ORDER BY t.nome_disciplina
    `);
    // Mapear para o formato esperado pelo frontend
    const turmas = result.rows.map(t => ({
      id: t.id,
      nomeDisciplina: t.nome_disciplina,
      codigo: t.codigo,
      professorId: t.professor_id,
      horario: t.horario,
      status: t.status,
    }));
    res.json(turmas);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar turmas' });
  }
});

// POST /api/turmas  (admin ou professor)
router.post('/', requireRole('admin', 'professor'), async (req, res) => {
  const { nomeDisciplina, codigo, professorId, horario, status } = req.body;
  if (!nomeDisciplina || !codigo)
    return res.status(400).json({ error: 'Nome e código são obrigatórios' });

  try {
    const result = await pool.query(
      `INSERT INTO turmas (nome_disciplina, codigo, professor_id, horario, status)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'ativa'))
       RETURNING *`,
      [nomeDisciplina, codigo, professorId, horario, status]
    );
    const t = result.rows[0];
    res.status(201).json({
      id: t.id, nomeDisciplina: t.nome_disciplina, codigo: t.codigo,
      professorId: t.professor_id, horario: t.horario, status: t.status
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar turma' });
  }
});

// PUT /api/turmas/:id
router.put('/:id', requireRole('admin', 'professor'), async (req, res) => {
  const { nomeDisciplina, codigo, professorId, horario, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE turmas
       SET nome_disciplina = COALESCE($1, nome_disciplina),
           codigo           = COALESCE($2, codigo),
           professor_id     = COALESCE($3, professor_id),
           horario          = COALESCE($4, horario),
           status           = COALESCE($5, status)
       WHERE id = $6 RETURNING *`,
      [nomeDisciplina, codigo, professorId, horario, status, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Turma não encontrada' });
    const t = result.rows[0];
    res.json({
      id: t.id, nomeDisciplina: t.nome_disciplina, codigo: t.codigo,
      professorId: t.professor_id, horario: t.horario, status: t.status
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar turma' });
  }
});

// DELETE /api/turmas/:id
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM turmas WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Turma não encontrada' });
    res.json({ message: 'Turma removida' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover turma' });
  }
});

module.exports = router;
