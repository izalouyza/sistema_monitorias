const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email]
    );
    const user = result.rows[0];
    if (!user)
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });

    if (user.status === 'inativo')
      return res.status(403).json({ error: 'Conta inativa. Contate o administrador.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// POST /api/auth/register  (auto-registro: apenas alunos)
router.post('/register', async (req, res) => {
  const { name, email, password, matricula } = req.body;

  if (!name || !email || !password || !matricula)
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });

  if (!email.endsWith('@alunos.ufersa.edu.br'))
    return res.status(400).json({ error: 'E-mail deve ser do domínio @alunos.ufersa.edu.br' });

  if (!/^\d{10}$/.test(matricula))
    return res.status(400).json({ error: 'Matrícula deve ter exatamente 10 dígitos' });

  if (password.length < 8)
    return res.status(400).json({ error: 'Senha deve ter ao menos 8 caracteres' });

  try {
    const existing = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1 OR matricula = $2',
      [email, matricula]
    );
    if (existing.rowCount > 0)
      return res.status(409).json({ error: 'E-mail ou matrícula já cadastrados' });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (name, email, password, role, matricula, status)
       VALUES ($1, $2, $3, 'student', $4, 'ativo')
       RETURNING id, name, email, role, matricula, status, created_at`,
      [name, email, hash, matricula]
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cadastrar usuário' });
  }
});

// GET /api/auth/me  (dados do usuário logado)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, matricula, siape, status FROM usuarios WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0])
      return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// PUT /api/auth/me  (atualizar perfil próprio)
router.put('/me', authMiddleware, async (req, res) => {
  const { name, email, matricula, currentPassword, newPassword } = req.body;
  try {
    const userResult = await pool.query('SELECT * FROM usuarios WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];

    // Verificar senha atual
    if (currentPassword) {
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid)
        return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    let hash = user.password;
    if (newPassword) {
      hash = await bcrypt.hash(newPassword, 10);
    }

    const result = await pool.query(
      `UPDATE usuarios
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           matricula = COALESCE($3, matricula),
           password = $4
       WHERE id = $5
       RETURNING id, name, email, role, matricula, siape, status`,
      [name, email, matricula, hash, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

module.exports = router;
