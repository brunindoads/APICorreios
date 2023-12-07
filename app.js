const express = require('express');
const session = require('express-session');
const axios = require('axios');
const path = require('path')
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({extended: true}))

// Configuração da Sessão
app.use(session({
    secret: 'valdiviapokopika',
    resave: false,
    saveUninitialized: true
}));

// Middleware para interpretar o corpo das requisições como JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota inicial
app.get('/', (req, res) => {
    res.render('index', { title: 'Página Inicial', error: undefined });
});

// Rota de login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Verifica se o usuário existe (simulação, sem criptografia para ambiente de desenvolvimento)
        const user = await User.findOne({ username, password });

        if (user) {
            // Define a sessão do usuário
            req.session.user = user;
            res.redirect('/dashboard'); // Redireciona para a tela pós-login
        } else {
            res.render('index', { title: 'Página Inicial', error: 'Usuário ou senha incorretos' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro interno no servidor');
    }
});


// Rota de logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Middleware para verificar a sessão
const requireLogin = (req, res, next) => {
    if (req.session.user) {
        req.user = req.session.user; // Adicione o objeto user ao req para que esteja disponível em rotas subsequentes
        next(); // Permite o acesso à próxima rota
    } else {
        res.redirect('/'); // Redireciona para a tela de login se não houver sessão
    }
};

// Rota para a tela pós-login
app.get('/dashboard', requireLogin, (req, res) => {
    const user = req.user; // Use o objeto user armazenado em req
    res.render('dashboard', { title: 'Dashboard', user });
});


// Rota de cadastro
app.get('/signup', (req, res) => {
    res.render('signup', { title: 'Cadastre-se', error: undefined });
});

// Rota para processar o cadastro
app.post('/signup', async (req, res) => {
    const { name, email, username, password } = req.body;

    try {
        // Verifica se o usuário já existe
        const existingUser = await User.findOne({ username });

        if (existingUser) {
            res.render('signup', { title: 'Cadastre-se', error: 'Nome de usuário já em uso', name, email, username });
        } else {
            // Cria um novo usuário
            const newUser = new User({ name, email, username, password });
            await newUser.save();

            // Redireciona para a tela de login
            res.redirect('/');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro interno no servidor');
    }
});

// Rota para fornecer o conteúdo do arquivo signup.ejs
app.get('/signup-content', (req, res) => {
    res.render('signup', { title: 'Cadastre-se', error: undefined });
});


// Rota para rastreamento
app.post('/track', requireLogin, async (req, res) => {
    const { code } = req.body;
    console.log('Código de rastreamento:', code);
    
    try {
        // Construir a URL da API com o código de rastreio fornecido pelo usuário
        const apiUrl = `https://api.linketrack.com/track/json?user=08220202@aluno.osorio.ifrs.edu.br&token=fe20ada9459a20a737b8d20b945008af1ad65ce5500f57fd543b150419bce3d8&codigo=${encodeURIComponent(code)}`;
        
        console.log('URL da API:', apiUrl);

        // Fazer a chamada para a API usando o Axios
        const response = await axios.get(apiUrl);
        const trackingData = response.data;

        // Adicionar logs para depuração
        console.log('Dados de rastreamento:', trackingData);

        // Renderizar a página track.ejs com os dados de rastreamento
        res.render('track', { title: 'Rastreamento', trackingData });
    } catch (error) {
        console.error('Erro ao obter dados de rastreamento:', error);
        res.status(500).send('Erro interno ao obter dados de rastreamento');
    }
});

/// Rota para fornecer o conteúdo do arquivo fav.ejs
app.get('/fav-content', (req, res) => {
    const { code } = req.query; // Obtém o código da consulta

    // Passa o código para a renderização da página fav.ejs
    res.render('fav', { title: 'Favorite sua Encomenda', error: undefined, trackingData: { codigo: code } });
});

// Rota para fornecer o conteúdo do arquivo fav.ejs
app.get('/fav-content', (req, res) => {
    const { code } = req.query; // Obtém o código da consulta

    // Passa o código para a renderização da página fav.ejs
    res.render('fav', { title: 'Favorite sua Encomenda', error: undefined, trackingData: { codigo: code } });
});




// Rota para processar o cadastro da encomenda
app.post('/fav', requireLogin, async (req, res) => {
    const { code, description } = req.body;

    try {
        // Obtém o ID do usuário autenticado
        const userId = req.user._id;

        // Busca o usuário no banco de dados usando o ID
        const currentUser = await User.findById(userId);

        if (!currentUser) {
            console.error('Usuário não encontrado no banco de dados');
            return res.status(500).send('Erro interno no servidor');
        }

        // Verifica se a encomenda já está cadastrada
        const existingPackage = currentUser.packages.find(pkg => pkg.code === code);

        if (existingPackage) {
            return res.render('fav', { title: 'Favorite sua Encomenda', error: 'Encomenda já cadastrada', trackingData: { codigo: code } });
        }

        // Adiciona a encomenda ao array de pacotes do usuário
        currentUser.packages.push({ code, description });

        // Salva as alterações no banco de dados
        await currentUser.save();

        res.redirect('/packages'); // Redireciona para listagem
    } catch (error) {
        console.error('Erro ao processar o cadastro da encomenda:', error);
        res.status(500).send('Erro interno no servidor: ' + error.message);
    }
});

// Rota para listar as encomendas do usuário
app.get('/packages', requireLogin, async (req, res) => {
    try {
        const userId = req.user._id;
        const currentUser = await User.findById(userId);

        if (!currentUser) {
            console.error('Usuário não encontrado no banco de dados');
            return res.status(500).send('Erro interno no servidor');
        }

        const packages = currentUser.packages;
        res.render('packages', { title: 'Lista de Encomendas', packages });
    } catch (error) {
        console.error('Erro ao obter a lista de encomendas:', error);
        res.status(500).send('Erro interno no servidor: ' + error.message);
    }
});

// Rota para excluir uma encomenda
app.post('/delete', requireLogin, async (req, res) => {
    const { code } = req.body;

    try {
        const userId = req.user._id;

        // Encontre o usuário no banco de dados
        const currentUser = await User.findById(userId);

        if (!currentUser) {
            console.error('Usuário não encontrado no banco de dados');
            return res.status(500).send('Erro interno no servidor');
        }

        // Encontre e remova a encomenda pelo código
        const updatedPackages = currentUser.packages.filter(pkg => pkg.code !== code);
        currentUser.packages = updatedPackages;

        // Salve as alterações no banco de dados
        await currentUser.save();

        res.redirect('/packages'); // Redireciona para a lista de encomendas
    } catch (error) {
        console.error('Erro ao excluir a encomenda:', error);
        res.status(500).send('Erro interno no servidor: ' + error.message);
    }
});




// Conexao ao MongoDB Atlas
mongoose.connect('mongodb+srv://08220202:NsrSJhNaOHk5kMdG@cluster0.cyaxk7h.mongodb.net/apicorreios', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'Erro na conexão com o Banco de Dados:'));
db.once('open', () => {
    console.log('Conectado ao MongoDB com sucesso.');
});

const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    packages: [
        {
            code: { type: String, required: true },
            description: { type: String, required: true }
        }
    ]
});

const User = mongoose.model('User', userSchema, 'users');

module.exports = User;
// Fim da configuração do MongoDB Atlas

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
