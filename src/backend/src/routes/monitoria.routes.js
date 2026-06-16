const express = require('express');
// Tente mudar de '../database/db' para:
const pool = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authMiddleware);

// Helper: busca turmaIds e monitorIds de uma monitoria
async function getRelations(monitoriaId, client) {
  const p = client || pool;
  const [turmas, monitores] = await Promise.all([
    p.query('SELECT turma_id FROM monitoria_turmas WHERE monitoria_id = $1', [monitoriaId]),
    p.query('SELECT monitor_id FROM monitoria_monitores WHERE monitoria_id = $1', [monitoriaId]),
  ]);
  return {
    turmaIds: turmas.rows.map(r => r.turma_id),
    monitorIds: monitores.rows.map(r => r.monitor_id),
  };
}

// Formata linha do banco para o formato do frontend
async function formatMon(row) {
  const rel = await getRelations(row.id);
  return {
    id: row.id,
    semestre: row.semestre,
    status: row.status,
    turmaIds: rel.turmaIds,
    monitorIds: rel.monitorIds,
  };
}

// GET /api/monitorias
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM monitorias ORDER BY created_at DESC');
    const monitorias = await Promise.all(result.rows.map(formatMon));
    res.json(monitorias);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar monitorias' });
  }
});

// POST /api/monitorias  (admin)
router.post('/', requireRole('admin'), async (req, res) => {
  const { semestre, status, turmaIds = [], monitorIds = [] } = req.body;
  if (!semestre) return res.status(400).json({ error: 'Semestre é obrigatório' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const mon = await client.query(
      `INSERT INTO monitorias (semestre, status) VALUES ($1, COALESCE($2,'ativa')) RETURNING *`,
      [semestre, status]
    );
    const monId = mon.rows[0].id;

    for (const tid of turmaIds)
      await client.query('INSERT INTO monitoria_turmas VALUES ($1,$2) ON CONFLICT DO NOTHING', [monId, tid]);
    for (const mid of monitorIds) {
      await client.query('INSERT INTO monitoria_monitores VALUES ($1,$2) ON CONFLICT DO NOTHING', [monId, mid]);
      // Promover aluno para monitor se necessário
      await client.query("UPDATE usuarios SET role='monitor' WHERE id=$1 AND role='student'", [mid]);
    }

    await client.query('COMMIT');
    res.status(201).json(await formatMon(mon.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar monitoria' });
  } finally {
    client.release();
  }
});

// PUT /api/monitorias/:id  (admin)
router.put('/:id', requireRole('admin'), async (req, res) => {
  const { semestre, status, turmaIds, monitorIds } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const mon = await client.query(
      `UPDATE monitorias SET semestre=COALESCE($1,semestre), status=COALESCE($2,status)
       WHERE id=$3 RETURNING *`,
      [semestre, status, req.params.id]
    );
    if (!mon.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Monitoria não encontrada' }); }

    if (turmaIds !== undefined) {
      await client.query('DELETE FROM monitoria_turmas WHERE monitoria_id=$1', [req.params.id]);
      for (const tid of turmaIds)
        await client.query('INSERT INTO monitoria_turmas VALUES ($1,$2)', [req.params.id, tid]);
    }

    if (monitorIds !== undefined) {
      // Rebaixar monitores antigos que não fazem mais parte de nenhuma monitoria
      const oldMons = await client.query('SELECT monitor_id FROM monitoria_monitores WHERE monitoria_id=$1', [req.params.id]);
      await client.query('DELETE FROM monitoria_monitores WHERE monitoria_id=$1', [req.params.id]);
      for (const mid of monitorIds) {
        await client.query('INSERT INTO monitoria_monitores VALUES ($1,$2)', [req.params.id, mid]);
        await client.query("UPDATE usuarios SET role='monitor' WHERE id=$1 AND role='student'", [mid]);
      }
      // Rebaixar quem saiu e não está em outra monitoria
      for (const { monitor_id } of oldMons.rows) {
        if (!monitorIds.includes(monitor_id)) {
          const still = await client.query('SELECT 1 FROM monitoria_monitores WHERE monitor_id=$1', [monitor_id]);
          if (still.rowCount === 0)
            await client.query("UPDATE usuarios SET role='student' WHERE id=$1 AND siape IS NULL", [monitor_id]);
        }
      }
    }

    await client.query('COMMIT');
    res.json(await formatMon(mon.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar monitoria' });
  } finally {
    client.release();
  }
});

// DELETE /api/monitorias/:id  (admin)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM monitorias WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Monitoria não encontrada' });
    res.json({ message: 'Monitoria removida' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover monitoria' });
  }
});

module.exports = router;
