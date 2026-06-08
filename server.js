const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");
const db = require("./db");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use(express.static(path.join(__dirname, "public")));

app.post("/api/cadastro", async (req, res) => {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) {
        return res.status(400).json({ mensagem: "Preencha todos os campos." });
    }
    try {
        const hash = await bcrypt.hash(senha, 10);
        await db.execute(
            "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)",
            [nome, email, hash]
        );
        res.status(201).json({ mensagem: "Cadastro realizado com sucesso!" });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ mensagem: "Email já cadastrado." });
        }
        res.status(500).json({ mensagem: "Erro interno no servidor." });
    }
});

app.post("/api/login", async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) {
        return res.status(400).json({ mensagem: "Preencha todos os campos." });
    }
    try {
        const [rows] = await db.execute(
            "SELECT * FROM usuarios WHERE email = ?",
            [email]
        );
        if (rows.length === 0) {
            return res.status(401).json({ mensagem: "Email ou senha incorretos." });
        }
        const usuario = rows[0];
        const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
        if (!senhaCorreta) {
            return res.status(401).json({ mensagem: "Email ou senha incorretos." });
        }
        req.session.usuario = { id: usuario.id, nome: usuario.nome, email: usuario.email };
        res.json({ mensagem: "Login realizado com sucesso!", nome: usuario.nome });
    } catch (err) {
        res.status(500).json({ mensagem: "Erro interno no servidor." });
    }
});

app.get("/api/sessao", (req, res) => {
    if (req.session.usuario) {
        res.json({ nome: req.session.usuario.nome, email: req.session.usuario.email });
    } else {
        res.status(401).json({ mensagem: "Não autenticado." });
    }
});

app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({ mensagem: "Logout realizado." });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});