require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const turmaRoutes = require('./routes/turma.routes');
const monitoriaRoutes = require('./routes/monitoria.routes');
const horarioRoutes = require('./routes/horario.routes');
const agendamentoRoutes = require('./routes/agendamento.routes');
const chamadaRoutes = require('./routes/chamada.routes');
const materialRoutes = require('./routes/material.routes');
const relatorioRoutes = require('./routes/relatorio.routes');
const notificacaoRoutes = require('./routes/notificacao.routes');


const app = express();

// ── Middlewares ──
app.use(cors());
app.use(express.json({ limit: '25mb' })); // suporta upload base64 de até 25MB

// ── Rotas ──
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/turmas', turmaRoutes);
app.use('/api/monitorias', monitoriaRoutes);
app.use('/api/horarios', horarioRoutes);
app.use('/api/agendamentos', agendamentoRoutes);
app.use('/api/chamadas', chamadaRoutes);
app.use('/api/materiais', materialRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/notificacoes', notificacaoRoutes);


// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Adicione esta rota no seu server.js
app.get('/api/usuarios', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, role, matricula, password FROM users');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// ── Error handler ──
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`SGM Backend rodando na porta ${PORT}`);
});
