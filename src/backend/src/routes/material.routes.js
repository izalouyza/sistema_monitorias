const express = require('express');
// Tente mudar de '../database/db' para:
const pool = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authMiddleware);

function fmt(m) {
  return {
    id: m.id, monitorId: m.monitor_id, monitoriaId: m.monitoria_id,
    horarioId: m.horario_id, titulo: m.titulo, descricao: m.descricao,
    filename: m.filename, fileContent: m.file_content, fileType: m.file_type,
    fileSize: m.file_size,
    uploadedAt: m.uploaded_at instanceof Date ? m.uploaded_at.toISOString().slice(0,10) : m.uploaded_at,
  };
}

// GET /api/materiais
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM materiais ORDER BY uploaded_at DESC');
    res.json(result.rows.map(fmt));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar materiais' });
  }
});

// POST /api/materiais  (monitor)
router.post('/', requireRole('monitor', 'admin'), async (req, res) => {
  const { monitoriaId, horarioId, titulo, descricao, filename, fileContent, fileType, fileSize } = req.body;
  if (!titulo || !monitoriaId) return res.status(400).json({ error: 'Título e monitoria são obrigatórios' });
  if (fileSize && fileSize > 20 * 1024 * 1024) return res.status(400).json({ error: 'Arquivo excede o limite de 20MB' });
  try {
    const result = await pool.query(
      `INSERT INTO materiais (monitor_id, monitoria_id, horario_id, titulo, descricao, filename, file_content, file_type, file_size)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, monitoriaId, horarioId || null, titulo, descricao, filename, fileContent, fileType, fileSize]
    );
    res.status(201).json(fmt(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar material' });
  }
});

// PUT /api/materiais/:id
router.put('/:id', requireRole('monitor', 'admin'), async (req, res) => {
  const { titulo, descricao, filename, fileContent, fileType, fileSize } = req.body;
  try {
    const ex = await pool.query('SELECT monitor_id FROM materiais WHERE id=$1', [req.params.id]);
    if (!ex.rows[0]) return res.status(404).json({ error: 'Material não encontrado' });
    if (req.user.role !== 'admin' && ex.rows[0].monitor_id !== req.user.id)
      return res.status(403).json({ error: 'Acesso negado' });

    const result = await pool.query(
      `UPDATE materiais SET titulo=COALESCE($1,titulo), descricao=COALESCE($2,descricao),
       filename=COALESCE($3,filename), file_content=COALESCE($4,file_content),
       file_type=COALESCE($5,file_type), file_size=COALESCE($6,file_size)
       WHERE id=$7 RETURNING *`,
      [titulo, descricao, filename, fileContent, fileType, fileSize, req.params.id]
    );
    res.json(fmt(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar material' });
  }
});

// DELETE /api/materiais/:id
router.delete('/:id', requireRole('monitor', 'admin'), async (req, res) => {
  try {
    const ex = await pool.query('SELECT monitor_id FROM materiais WHERE id=$1', [req.params.id]);
    if (!ex.rows[0]) return res.status(404).json({ error: 'Material não encontrado' });
    if (req.user.role !== 'admin' && ex.rows[0].monitor_id !== req.user.id)
      return res.status(403).json({ error: 'Acesso negado' });
    await pool.query('DELETE FROM materiais WHERE id=$1', [req.params.id]);
    res.json({ message: 'Material removido' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover material' });
  }
});

module.exports = router;
