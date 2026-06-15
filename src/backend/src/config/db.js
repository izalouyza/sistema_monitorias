const { Pool } = require('pg');
require('dotenv').config();

// Cria um pool de conexões utilizando as variáveis do .env
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Testa a conexão assim que o arquivo é lido
pool.connect((err, client, release) => {
    if (err) {
        console.error('Erro ao conectar no PostgreSQL:', err.stack);
    } else {
        console.log('Conectado ao banco de dados [UfersaMentor] com sucesso!');
    }
    if (release) release(); // Libera o cliente de volta para o pool
});

// Monitora erros inesperados para o servidor não "cair" do nada
pool.on('error', (err, client) => {
    console.error('Erro inesperado no cliente do banco de dados', err);
});

module.exports = pool;