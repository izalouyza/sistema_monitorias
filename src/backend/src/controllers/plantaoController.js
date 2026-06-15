const pool = require('../config/db');

// Para o Aluno (UC-03): Buscar plantões disponíveis
exports.listarPlantoes = async (req, res) => {
    try {
        // Faz um SELECT unindo a tabela de plantões com monitorias, disciplinas e usuários
        const query = `
            SELECT 
                p.id_plantao, p.dia_semana, p.horario_inicio, p.horario_fim, p.local_atendimento, p.limite_vagas,
                d.nome_disciplina, u.nome AS nome_monitor
            FROM PLANTAO_HORARIO p
            JOIN MONITORIA m ON p.id_monitoria_fk = m.id_monitoria
            JOIN DISCIPLINA d ON m.id_disciplina_fk = d.id_disciplina
            JOIN USUARIO u ON m.id_monitor_fk = u.id_usuario
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao listar plantões:', err);
        res.status(500).json({ erro: 'Erro ao buscar horários de monitoria.' });
    }
};

// Para o Monitor (UC-06): Cadastrar novo bloco de horário
exports.criarPlantao = async (req, res) => {
    const { id_monitoria, dia_semana, horario_inicio, horario_fim, local_atendimento, limite_vagas } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO PLANTAO_HORARIO 
            (id_monitoria_fk, dia_semana, horario_inicio, horario_fim, local_atendimento, limite_vagas) 
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [id_monitoria, dia_semana, horario_inicio, horario_fim, local_atendimento, limite_vagas]
        );
        
        res.status(201).json({
            mensagem: 'Plantão cadastrado com sucesso!',
            plantao: result.rows[0]
        });
    } catch (err) {
        console.error('Erro ao criar plantão:', err);
        res.status(500).json({ erro: 'Erro ao salvar o horário no banco de dados.' });
    }
};