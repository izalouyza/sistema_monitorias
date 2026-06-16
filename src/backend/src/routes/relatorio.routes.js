// relatorio.routes.js
const express = require('express');
// Tente mudar de '../database/db' para:
const pool = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authMiddleware);

function fmt(r) {
  return {
    id: r.id, monitorId: r.monitor_id, monitoriaId: r.monitoria_id,
    titulo: r.titulo, descricao: r.descricao, filename: r.filename,
    fileContent: r.file_content, fileType: r.file_type, fileSize: r.file_size,
    uploadedAt: r.uploaded_at instanceof Date ? r.uploaded_at.toISOString().slice(0,10) : r.uploaded_at,
  };
}

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM relatorios ORDER BY uploaded_at DESC');
    res.json(result.rows.map(fmt));
  } catch (err) { res.status(500).json({ error: 'Erro ao listar relatórios' }); }
});

router.post('/', requireRole('monitor', 'admin'), async (req, res) => {
  const { monitoriaId, titulo, descricao, filename, fileContent, fileType, fileSize } = req.body;
  if (!titulo || !monitoriaId) return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  try {
    const result = await pool.query(
      `INSERT INTO relatorios (monitor_id, monitoria_id, titulo, descricao, filename, file_content, file_type, file_size)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.id, monitoriaId, titulo, descricao, filename, fileContent, fileType, fileSize]
    );
    res.status(201).json(fmt(result.rows[0]));
  } catch (err) { res.status(500).json({ error: 'Erro ao criar relatório' }); }
});

router.put('/:id', requireRole('monitor', 'admin'), async (req, res) => {
  const { titulo, descricao, filename, fileContent, fileType, fileSize } = req.body;
  try {
    const ex = await pool.query('SELECT monitor_id FROM relatorios WHERE id=$1', [req.params.id]);
    if (!ex.rows[0]) return res.status(404).json({ error: 'Relatório não encontrado' });
    if (req.user.role !== 'admin' && ex.rows[0].monitor_id !== req.user.id)
      return res.status(403).json({ error: 'Acesso negado' });
    const result = await pool.query(
      `UPDATE relatorios SET titulo=COALESCE($1,titulo), descricao=COALESCE($2,descricao),
       filename=COALESCE($3,filename), file_content=COALESCE($4,file_content),
       file_type=COALESCE($5,file_type), file_size=COALESCE($6,file_size)
       WHERE id=$7 RETURNING *`,
      [titulo, descricao, filename, fileContent, fileType, fileSize, req.params.id]
    );
    res.json(fmt(result.rows[0]));
  } catch (err) { res.status(500).json({ error: 'Erro ao atualizar relatório' }); }
});

router.delete('/:id', requireRole('monitor', 'admin'), async (req, res) => {
  try {
    const ex = await pool.query('SELECT monitor_id FROM relatorios WHERE id=$1', [req.params.id]);
    if (!ex.rows[0]) return res.status(404).json({ error: 'Relatório não encontrado' });
    if (req.user.role !== 'admin' && ex.rows[0].monitor_id !== req.user.id)
      return res.status(403).json({ error: 'Acesso negado' });
    await pool.query('DELETE FROM relatorios WHERE id=$1', [req.params.id]);
    res.json({ message: 'Relatório removido' });
  } catch (err) { res.status(500).json({ error: 'Erro ao remover relatório' }); }
});

module.exports = router;
