const jwt = require('jsonwebtoken');

// 1. Middleware Geral: Verifica se o usuário está logado (Tem o Token JWT)
exports.verificarToken = (req, res, next) => {
    // Puxa o token do cabeçalho da requisição (padrão: "Bearer <token>")
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ erro: 'Acesso negado. Token não fornecido.' });
    }

    const token = authHeader.split(' ')[1]; // Separa a palavra "Bearer" do token em si

    try {
        // Valida o token com a mesma chave secreta usada no login
        const decodificado = jwt.verify(token, process.env.JWT_SECRET || 'chave_secreta_padrao');
        
        // Salva os dados do usuário na requisição para os Controllers poderem usar depois
        req.usuario = decodificado;
        
        next(); // Tudo certo! Pode passar para o Controller.
    } catch (err) {
        return res.status(403).json({ erro: 'Token inválido ou expirado. Faça login novamente.' });
    }
};

// 2. Middleware Específico: Verifica se o usuário logado é realmente um Monitor
exports.verificarPerfilMonitor = (req, res, next) => {
    // O req.usuario foi preenchido pelo middleware verificarToken ali em cima
    if (!req.usuario || req.usuario.perfil !== 'monitor') {
        return res.status(403).json({ 
            erro: 'Acesso restrito. Apenas monitores podem realizar esta ação.' 
        });
    }
    
    next(); // É um monitor validado, pode prosseguir!
};

// 3. Middleware Específico: Verifica se o usuário é Professor ou Coordenador (Para relatórios futuros)
exports.verificarPerfilGestao = (req, res, next) => {
    if (!req.usuario || (req.usuario.perfil !== 'professor' && req.usuario.perfil !== 'coordenador')) {
        return res.status(403).json({ 
            erro: 'Acesso restrito à Coordenação e Professores Orientadores.' 
        });
    }
    
    next();
};