const express = require('express');
// Tente mudar de '../database/db' para:
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authMiddleware);

function formatAgend(a) {
  return {
    id: a.id,
    alunoId: a.aluno_id,
    horarioId: a.horario_id,
    monitoriaId: a.monitoria_id,
    data: a.data instanceof Date ? a.data.toISOString().slice(0, 10) : a.data,
    duvidaPrincipal: a.duvida_principal,
    status: a.status,
  };
}

// GET /api/agendamentos
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM agendamentos';
    const params = [];
    // Alunos veem apenas os próprios; monitores/professores/admin veem todos
    if (req.user.role === 'student') {
      query += ' WHERE aluno_id = $1';
      params.push(req.user.id);
    } else if (req.user.role === 'monitor') {
      // Ver agendamentos nos horários deste monitor
      query += ` WHERE horario_id IN (SELECT id FROM horarios WHERE monitor_id = $1)`;
      params.push(req.user.id);
    }
    query += ' ORDER BY data DESC';
    const result = await pool.query(query, params);
    res.json(result.rows.map(formatAgend));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar agendamentos' });
  }
});

// POST /api/agendamentos  (alunos e monitores agendando)
router.post('/', async (req, res) => {
  const { horarioId, monitoriaId, data, duvidaPrincipal } = req.body;
  const alunoId = req.user.id;

  if (!horarioId || !monitoriaId || !data)
    return res.status(400).json({ error: 'Campos obrigatórios: horarioId, monitoriaId, data' });

  try {
    // Verificar se já existe agendamento confirmado para este slot
    const dup = await pool.query(
      "SELECT id FROM agendamentos WHERE horario_id=$1 AND aluno_id=$2 AND status='confirmado'",
      [horarioId, alunoId]
    );
    if (dup.rowCount > 0)
      return res.status(409).json({ error: 'Você já tem um agendamento para este horário' });

    // Verificar vagas
    const horario = await pool.query('SELECT vagas FROM horarios WHERE id=$1', [horarioId]);
    if (!horario.rows[0]) return res.status(404).json({ error: 'Horário não encontrado' });

    const ocupadas = await pool.query(
      "SELECT COUNT(*) AS c FROM agendamentos WHERE horario_id=$1 AND status='confirmado'", [horarioId]
    );
    if (parseInt(ocupadas.rows[0].c) >= horario.rows[0].vagas)
      return res.status(409).json({ error: 'Horário com vagas esgotadas' });

    const result = await pool.query(
      `INSERT INTO agendamentos (aluno_id, horario_id, monitoria_id, data, duvida_principal)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [alunoId, horarioId, monitoriaId, data, duvidaPrincipal]
    );
    res.status(201).json(formatAgend(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

// PUT /api/agendamentos/:id  (aluno pode cancelar ou reagendar)
router.put('/:id', async (req, res) => {
  const { status, horarioId, data, duvidaPrincipal } = req.body;
  try {
    const existing = await pool.query('SELECT * FROM agendamentos WHERE id=$1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Agendamento não encontrado' });
    // Apenas o próprio aluno, o monitor do horário ou admin
    const agend = existing.rows[0];
    if (req.user.role !== 'admin' && req.user.id !== agend.aluno_id) {
      const monCheck = await pool.query('SELECT monitor_id FROM horarios WHERE id=$1', [agend.horario_id]);
      if (monCheck.rows[0]?.monitor_id !== req.user.id)
        return res.status(403).json({ error: 'Acesso negado' });
    }

    const result = await pool.query(
      `UPDATE agendamentos
       SET status           = COALESCE($1, status),
           horario_id       = COALESCE($2, horario_id),
           data             = COALESCE($3, data),
           duvida_principal = COALESCE($4, duvida_principal)
       WHERE id = $5 RETURNING *`,
      [status, horarioId, data, duvidaPrincipal, req.params.id]
    );
    res.json(formatAgend(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar agendamento' });
  }
});

module.exports = router;
