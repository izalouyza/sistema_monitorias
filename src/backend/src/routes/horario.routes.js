const express = require('express');
// Tente mudar de '../database/db' para:
const pool = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authMiddleware);

function formatHorario(h) {
  return {
    id: h.id,
    monitorId: h.monitor_id,
    monitoriaId: h.monitoria_id,
    data: h.data instanceof Date ? h.data.toISOString().slice(0, 10) : h.data,
    horaInicio: h.hora_inicio ? h.hora_inicio.slice(0, 5) : h.hora_inicio,
    horaFim: h.hora_fim ? h.hora_fim.slice(0, 5) : h.hora_fim,
    sala: h.sala,
    bloco: h.bloco,
    linkOnline: h.link_online,
    modalidade: h.modalidade,
    vagas: h.vagas,
    vagasOcupadas: parseInt(h.vagas_ocupadas || 0),
  };
}

// GET /api/horarios  — todos (com vagas ocupadas calculadas)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT h.*,
        (SELECT COUNT(*) FROM agendamentos a
         WHERE a.horario_id = h.id AND a.status = 'confirmado') AS vagas_ocupadas
      FROM horarios h
      ORDER BY h.data DESC, h.hora_inicio
    `);
    res.json(result.rows.map(formatHorario));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar horários' });
  }
});

// POST /api/horarios  (monitor ou admin)
router.post('/', requireRole('monitor', 'admin'), async (req, res) => {
  const { monitoriaId, data, horaInicio, horaFim, sala, bloco, linkOnline, modalidade, vagas } = req.body;
  const monitorId = req.user.id;

  if (!monitoriaId || !data || !horaInicio || !horaFim || !modalidade)
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });

  try {
    const result = await pool.query(
      `INSERT INTO horarios (monitor_id, monitoria_id, data, hora_inicio, hora_fim, sala, bloco, link_online, modalidade, vagas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [monitorId, monitoriaId, data, horaInicio, horaFim, sala, bloco, linkOnline, modalidade, vagas || 5]
    );
    res.status(201).json(formatHorario({ ...result.rows[0], vagas_ocupadas: 0 }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar horário' });
  }
});

// PUT /api/horarios/:id
router.put('/:id', requireRole('monitor', 'admin'), async (req, res) => {
  const { monitoriaId, data, horaInicio, horaFim, sala, bloco, linkOnline, modalidade, vagas } = req.body;
  try {
    // Apenas o próprio monitor ou admin pode editar
    const existing = await pool.query('SELECT monitor_id FROM horarios WHERE id=$1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Horário não encontrado' });
    if (req.user.role !== 'admin' && existing.rows[0].monitor_id !== req.user.id)
      return res.status(403).json({ error: 'Acesso negado' });

    const result = await pool.query(
      `UPDATE horarios
       SET monitoria_id = COALESCE($1, monitoria_id),
           data         = COALESCE($2, data),
           hora_inicio  = COALESCE($3, hora_inicio),
           hora_fim     = COALESCE($4, hora_fim),
           sala         = COALESCE($5, sala),
           bloco        = COALESCE($6, bloco),
           link_online  = COALESCE($7, link_online),
           modalidade   = COALESCE($8, modalidade),
           vagas        = COALESCE($9, vagas)
       WHERE id = $10 RETURNING *`,
      [monitoriaId, data, horaInicio, horaFim, sala, bloco, linkOnline, modalidade, vagas, req.params.id]
    );

    const h = result.rows[0];
    const occ = await pool.query(
      "SELECT COUNT(*) AS c FROM agendamentos WHERE horario_id=$1 AND status='confirmado'", [h.id]
    );
    res.json(formatHorario({ ...h, vagas_ocupadas: occ.rows[0].c }));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar horário' });
  }
});

// DELETE /api/horarios/:id
router.delete('/:id', requireRole('monitor', 'admin'), async (req, res) => {
  try {
    const existing = await pool.query('SELECT monitor_id FROM horarios WHERE id=$1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Horário não encontrado' });
    if (req.user.role !== 'admin' && existing.rows[0].monitor_id !== req.user.id)
      return res.status(403).json({ error: 'Acesso negado' });

    await pool.query('DELETE FROM horarios WHERE id=$1', [req.params.id]);
    res.json({ message: 'Horário removido' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover horário' });
  }
});

module.exports = router;
