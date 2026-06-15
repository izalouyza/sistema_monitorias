const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// 1. LOGIN: Busca usuário pela matrícula ou e-mail
exports.login = async (req, res) => {
    const { matricula, senha } = req.body;

    try {
        // Busca o usuário na tabela 'users'
        const result = await pool.query(
            'SELECT id, name, email, password, role FROM users WHERE matricula = $1',
            [matricula]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ erro: 'Matrícula não encontrada.' });
        }

        const usuario = result.rows[0];

        // Validação simples de senha (para MVP)
        // DICA: Em produção, use bcrypt.compare() aqui
        if (usuario.password !== senha) {
            return res.status(401).json({ erro: 'Senha incorreta.' });
        }

        const token = jwt.sign(
            { id: usuario.id, role: usuario.role },
            process.env.JWT_SECRET || 'chave_secreta_projeto_es_2026',
            { expiresIn: '8h' }
        );

        res.json({
            mensagem: 'Login realizado com sucesso!',
            token,
            usuario: {
                id: usuario.id,
                name: usuario.name,
                email: usuario.email,
                role: usuario.role
            }
        });

    } catch (err) {
        console.error('Erro no login:', err);
        res.status(500).json({ erro: 'Erro interno no servidor.' });
    }
};

// 2. REGISTRO: Cria novo aluno na tabela 'users'
exports.registrar = async (req, res) => {
    const { matricula, nome, senha, perfil, email } = req.body;
    
    try {
        // Gera um UUID para o ID (conforme seu banco pede id VARCHAR(36))
        const id = crypto.randomUUID();

        // Query de inserção
        const query = `
            INSERT INTO users (id, name, email, password, role, matricula, status) 
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        
        // Perfil padrão 'student', status padrão 'ativo'
        await pool.query(query, [id, nome, email, senha, perfil || 'student', matricula, 'ativo']);
        
        res.status(201).json({ 
            mensagem: 'Usuário cadastrado com sucesso!', 
            id 
        });
    } catch (err) {
        console.error('Erro ao registrar:', err);
        // Verifica se é erro de duplicidade (matrícula já existe)
        if (err.code === '23505') {
            return res.status(400).json({ erro: 'Matrícula ou e-mail já cadastrado.' });
        }
        res.status(500).json({ erro: 'Erro ao salvar usuário no banco.' });
    }
};