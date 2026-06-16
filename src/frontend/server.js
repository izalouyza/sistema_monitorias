const express = require('express');
const cors = require('cors');
require('dotenv').config();

// IMPORTANTE: Importe o pool de conexão que você configurou no seu config/db.js
const pool = require('./src/config/db'); 

const app = express();

// Middlewares globais
app.use(cors()); // Permite que o seu React (front) fale com o Node (back)
app.use(express.json()); // Essencial para entender os dados JSON que o React envia

// Importação das Rotas
const authRoutes = require('./src/routes/authRoutes');
const plantaoRoutes = require('./src/routes/plantaoRoutes');
const agendamentoRoutes = require('./src/routes/agendamentoRoutes');

// Definição dos Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/plantoes', plantaoRoutes);
app.use('/api/agendamentos', agendamentoRoutes);

// Rota para listar todos os usuários (Persistência real no PostgreSQL)
app.get('/api/usuarios', async (req, res) => {
    try {
        // Busca na sua tabela 'users' criada no banco
        const result = await pool.query('SELECT id, name, email, role, matricula FROM users');
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar usuários:', err);
        res.status(500).json({ erro: 'Erro ao buscar usuários no banco de dados' });
    }
});

// Rota de teste
app.get('/api/status', (req, res) => {
    res.json({ mensagem: 'API do Sistema de Monitorias UFERSA online e pronta!' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Servidor rodando com sucesso na porta ${PORT}`);
});