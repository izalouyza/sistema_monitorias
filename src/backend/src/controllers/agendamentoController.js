const pool = require('../config/db');

// Aluno agendando monitoria (UC-04)
exports.agendarAtendimento = async (req, res) => {
    const { id_plantao, id_aluno, data_atendimento } = req.body;

    try {
        // 1. Checa quantas vagas existem e quantos já agendaram
        const plantaoQuery = await pool.query(
            'SELECT limite_vagas FROM PLANTAO_HORARIO WHERE id_plantao = $1',
            [id_plantao]
        );
        const limiteVagas = plantaoQuery.rows[0].limite_vagas;

        const contagemQuery = await pool.query(
            "SELECT count(*) FROM AGENDAMENTO WHERE id_plantao_fk = $1 AND data_atendimento = $2 AND status_agendamento = 'confirmado'",
            [id_plantao, data_atendimento]
        );
        const vagasOcupadas = parseInt(contagemQuery.rows[0].count);

        // 2. Regra de Negócio: Impede superlotação
        if (vagasOcupadas >= limiteVagas) {
            return res.status(400).json({ erro: 'Infelizmente, não há mais vagas para este horário.' });
        }

        // 3. Efetua a reserva
        const insertQuery = `
            INSERT INTO AGENDAMENTO (id_plantao_fk, id_aluno_fk, data_atendimento, status_agendamento)
            VALUES ($1, $2, $3, 'confirmado') RETURNING *
        `;
        const result = await pool.query(insertQuery, [id_plantao, id_aluno, data_atendimento]);

        res.status(201).json({
            mensagem: 'Agendamento confirmado com sucesso!',
            agendamento: result.rows[0]
        });

    } catch (err) {
        console.error('Erro ao agendar:', err);
        res.status(500).json({ erro: 'Erro interno ao processar o agendamento.' });
    }
};

// Cancelar Agendamento (UC-05)
exports.cancelarAgendamento = async (req, res) => {
    const { id_agendamento } = req.params;

    try {
        await pool.query(
            "UPDATE AGENDAMENTO SET status_agendamento = 'cancelado_aluno', data_cancelamento = NOW() WHERE id_agendamento = $1",
            [id_agendamento]
        );
        res.json({ mensagem: 'Agendamento cancelado com sucesso. A vaga foi liberada.' });
    } catch (err) {
        console.error('Erro ao cancelar:', err);
        res.status(500).json({ erro: 'Erro ao cancelar o agendamento.' });
    }
};