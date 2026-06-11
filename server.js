const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const db = require("./db");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors({
    origin: [
        "https://shinyhair.vercel.app",
        "http://localhost:3000"
    ],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const JWT_SECRET = process.env.SESSION_SECRET || "shinyhair_secret";

function autenticar(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ mensagem: "Não autenticado" });
    try {
        req.usuario = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ mensagem: "Token inválido" });
    }
}

const ADMIN_EMAIL = "isabss.0408@gmail.com";

app.post("/api/cadastro", async (req, res) => {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ mensagem: "Preencha todos os campos." });
    try {
        const hash = await bcrypt.hash(senha, 10);
        await db.execute("INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)", [nome, email, hash]);
        res.status(201).json({ mensagem: "Cadastro realizado com sucesso!" });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ mensagem: "Email já cadastrado." });
        res.status(500).json({ mensagem: "Erro interno no servidor." });
    }
});

app.post("/api/login", async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ mensagem: "Preencha todos os campos." });
    try {
        const [rows] = await db.execute("SELECT * FROM usuarios WHERE email = ?", [email]);
        if (rows.length === 0) return res.status(401).json({ mensagem: "Email ou senha incorretos." });
        const usuario = rows[0];
        const ok = await bcrypt.compare(senha, usuario.senha);
        if (!ok) return res.status(401).json({ mensagem: "Email ou senha incorretos." });
        const token = jwt.sign({ id: usuario.id, nome: usuario.nome, email: usuario.email }, JWT_SECRET, { expiresIn: "7d" });
        res.json({ mensagem: "Login realizado com sucesso!", nome: usuario.nome, token });
    } catch (err) {
        res.status(500).json({ mensagem: "Erro interno no servidor." });
    }
});

app.get("/api/sessao", autenticar, (req, res) => {
    res.json({ id: req.usuario.id, nome: req.usuario.nome, email: req.usuario.email });
});

app.post("/api/logout", (req, res) => {
    res.json({ mensagem: "Logout realizado." });
});

app.post("/api/posts", autenticar, async (req, res) => {
    const { conteudo } = req.body;
    try {
        await db.execute("INSERT INTO posts (usuario_id, conteudo) VALUES (?, ?)", [req.usuario.id, conteudo]);
        res.json({ sucesso: true });
    } catch (err) {
        res.status(500).json({ mensagem: "Erro ao criar postagem" });
    }
});

app.get("/api/posts", async (req, res) => {
    try {
        const [posts] = await db.execute(`
            SELECT posts.*, usuarios.nome FROM posts
            INNER JOIN usuarios ON usuarios.id = posts.usuario_id
            ORDER BY posts.criado_em DESC
        `);
        for (let post of posts) {
            const [curtidas] = await db.execute("SELECT COUNT(*) total FROM curtidas_posts WHERE post_id=?", [post.id]);
            post.curtidas = curtidas[0].total;
            const [respostas] = await db.execute(`
                SELECT respostas.*, usuarios.nome FROM respostas
                INNER JOIN usuarios ON usuarios.id = respostas.usuario_id
                WHERE post_id = ? ORDER BY respostas.criado_em ASC
            `, [post.id]);
            post.respostas = respostas;
        }
        res.json(posts);
    } catch (err) {
        res.status(500).json({ mensagem: "Erro ao buscar posts" });
    }
});

app.post("/api/respostas", autenticar, async (req, res) => {
    const { post_id, conteudo } = req.body;
    try {
        await db.execute("INSERT INTO respostas (post_id, usuario_id, conteudo) VALUES (?, ?, ?)", [post_id, req.usuario.id, conteudo]);
        res.json({ sucesso: true });
    } catch (err) {
        res.status(500).json({ mensagem: "Erro ao responder" });
    }
});

app.delete("/api/posts/:id", autenticar, async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT * FROM posts WHERE id = ?", [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ mensagem: "Post não encontrado" });
        const post = rows[0];
        if (req.usuario.email !== ADMIN_EMAIL && req.usuario.id !== post.usuario_id) return res.status(403).json({ mensagem: "Sem permissão" });
        await db.execute("DELETE FROM posts WHERE id = ?", [req.params.id]);
        res.json({ sucesso: true });
    } catch (err) {
        res.status(500).json({ mensagem: "Erro ao excluir" });
    }
});

app.delete("/api/respostas/:id", autenticar, async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT * FROM respostas WHERE id = ?", [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ mensagem: "Resposta não encontrada" });
        const resposta = rows[0];
        if (req.usuario.email !== ADMIN_EMAIL && req.usuario.id !== resposta.usuario_id) return res.status(403).json({ mensagem: "Sem permissão" });
        await db.execute("DELETE FROM respostas WHERE id = ?", [req.params.id]);
        res.json({ sucesso: true });
    } catch (err) {
        res.status(500).json({ mensagem: "Erro ao excluir resposta" });
    }
});

app.post("/api/posts/:id/curtir", autenticar, async (req, res) => {
    try {
        const [curtida] = await db.execute("SELECT * FROM curtidas_posts WHERE post_id=? AND usuario_id=?", [req.params.id, req.usuario.id]);
        if (curtida.length > 0) {
            await db.execute("DELETE FROM curtidas_posts WHERE post_id=? AND usuario_id=?", [req.params.id, req.usuario.id]);
        } else {
            await db.execute("INSERT INTO curtidas_posts (post_id, usuario_id) VALUES (?, ?)", [req.params.id, req.usuario.id]);
        }
        res.json({ sucesso: true });
    } catch (err) {
        res.status(500).json({ mensagem: "Erro ao curtir" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
