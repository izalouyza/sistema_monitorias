const express = require('express');
const bcrypt = require('bcryptjs');
// Tente mudar de '../database/db' para:
const pool = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authMiddleware);

// GET /api/users  — lista todos (admin) ou filtra por role
router.get('/', async (req, res) => {
  try {
    const { role } = req.query;
    let query = 'SELECT id, name, email, role, matricula, siape, status, created_at FROM usuarios';
    const params = [];
    if (role) {
      query += ' WHERE role = $1';
      params.push(role);
    }
    query += ' ORDER BY name';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// POST /api/users  — criar professor, monitor ou admin (somente admin)
router.post('/', requireRole('admin'), async (req, res) => {
  const { name, email, password, role, matricula, siape, status } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ error: 'Campos obrigatórios: name, email, password, role' });

  try {
    const exists = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (exists.rowCount > 0)
      return res.status(409).json({ error: 'E-mail já cadastrado' });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (name, email, password, role, matricula, siape, status)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'ativo'))
       RETURNING id, name, email, role, matricula, siape, status`,
      [name, email, hash, role, matricula, siape, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// PUT /api/users/:id  — atualizar (admin ou próprio usuário)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  // Apenas admin pode editar outros; qualquer um pode editar a si mesmo
  if (req.user.role !== 'admin' && req.user.id !== id)
    return res.status(403).json({ error: 'Acesso negado' });

  const { name, email, role, matricula, siape, status, password } = req.body;
  try {
    let hash;
    if (password) hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `UPDATE usuarios
       SET name      = COALESCE($1, name),
           email     = COALESCE($2, email),
           role      = COALESCE($3, role),
           matricula = COALESCE($4, matricula),
           siape     = COALESCE($5, siape),
           status    = COALESCE($6, status),
           password  = COALESCE($7, password)
       WHERE id = $8
       RETURNING id, name, email, role, matricula, siape, status`,
      [name, email, role, matricula, siape, status, hash, id]
    );
    if (!result.rows[0])
      return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// DELETE /api/users/:id  (somente admin)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0])
      return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ message: 'Usuário removido' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover usuário' });
  }
});

module.exports = router;
