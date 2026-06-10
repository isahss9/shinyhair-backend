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
        res.json({ id: req.session.usuario.id, 
            nome: req.session.usuario.nome, 
            email: req.session.usuario.email });

    } else {
        res.status(401).json({ mensagem: "Não autenticado." });
    }
});

app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({ mensagem: "Logout realizado." });
    });
});

const ADMIN_EMAIL = "isabss.0408@gmail.com";

/* CRIAR POST */
app.post("/api/posts", async (req, res) => {

    if (!req.session.usuario) {
        return res.status(401).json({ mensagem: "Não autenticado" });
    }

    const { conteudo } = req.body;

    try {

        await db.execute(
            `INSERT INTO posts (usuario_id, conteudo)
             VALUES (?, ?)`,
            [req.session.usuario.id, conteudo]
        );

        res.json({ sucesso: true });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            mensagem: "Erro ao criar postagem"
        });
    }
});


/* LISTAR POSTS */
app.get("/api/posts", async (req, res) => {

    try {

        const [posts] = await db.execute(`
            SELECT
                posts.*,
                usuarios.nome
            FROM posts
            INNER JOIN usuarios
                ON usuarios.id = posts.usuario_id
            ORDER BY posts.criado_em DESC
        `);

        for (let post of posts) {

            const [curtidas] = await db.execute(
    `SELECT COUNT(*) total
     FROM curtidas_posts
     WHERE post_id=?`,
    [post.id]
);

post.curtidas =
    curtidas[0].total;

            const [respostas] = await db.execute(`
                SELECT
                    respostas.*,
                    usuarios.nome
                FROM respostas
                INNER JOIN usuarios
                    ON usuarios.id = respostas.usuario_id
                WHERE post_id = ?
                ORDER BY respostas.criado_em ASC
            `, [post.id]);

            post.respostas = respostas;
        }

        res.json(posts);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            mensagem: "Erro ao buscar posts"
        });
    }
});


/* RESPONDER POST */
app.post("/api/respostas", async (req, res) => {

    if (!req.session.usuario) {
        return res.status(401).json({ mensagem: "Não autenticado" });
    }

    const { post_id, conteudo } = req.body;

    try {

        await db.execute(
            `INSERT INTO respostas
            (post_id, usuario_id, conteudo)
            VALUES (?, ?, ?)`,
            [
                post_id,
                req.session.usuario.id,
                conteudo
            ]
        );

        res.json({ sucesso: true });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            mensagem: "Erro ao responder"
        });
    }
});


/* EXCLUIR POST */
app.delete("/api/posts/:id", async (req, res) => {

    if (!req.session.usuario) {
        return res.status(401).json({ mensagem: "Não autenticado" });
    }

    try {

        const [rows] = await db.execute(
            "SELECT * FROM posts WHERE id = ?",
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                mensagem: "Post não encontrado"
            });
        }

        const post = rows[0];

        const admin =
            req.session.usuario.email === ADMIN_EMAIL;

        const dono =
            req.session.usuario.id === post.usuario_id;

        if (!admin && !dono) {
            return res.status(403).json({
                mensagem: "Sem permissão"
            });
        }

        await db.execute(
            "DELETE FROM posts WHERE id = ?",
            [req.params.id]
        );

        res.json({ sucesso: true });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            mensagem: "Erro ao excluir"
        });
    }
});


/* EXCLUIR RESPOSTA */
app.delete("/api/respostas/:id", async (req, res) => {

    if (!req.session.usuario) {
        return res.status(401).json({ mensagem: "Não autenticado" });
    }

    try {

        const [rows] = await db.execute(
            "SELECT * FROM respostas WHERE id = ?",
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                mensagem: "Resposta não encontrada"
            });
        }

        const resposta = rows[0];

        const admin =
            req.session.usuario.email === ADMIN_EMAIL;

        const dono =
            req.session.usuario.id === resposta.usuario_id;

        if (!admin && !dono) {
            return res.status(403).json({
                mensagem: "Sem permissão"
            });
        }

        await db.execute(
            "DELETE FROM respostas WHERE id = ?",
            [req.params.id]
        );

        res.json({ sucesso: true });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            mensagem: "Erro ao excluir resposta"
        });
    }
});

/* CURTIR POST */

app.post("/api/posts/:id/curtir", async (req,res)=>{

    if(!req.session.usuario){
        return res.status(401).json({
            mensagem:"Não autenticado"
        });
    }

    try{

        const usuarioId =
            req.session.usuario.id;

        const postId =
            req.params.id;

        const [curtida] =
            await db.execute(
                `SELECT * FROM curtidas_posts
                 WHERE post_id=? AND usuario_id=?`,
                [postId, usuarioId]
            );

        if(curtida.length > 0){

            await db.execute(
                `DELETE FROM curtidas_posts
                 WHERE post_id=? AND usuario_id=?`,
                [postId, usuarioId]
            );

        }else{

            await db.execute(
                `INSERT INTO curtidas_posts
                (post_id,usuario_id)
                VALUES (?,?)`,
                [postId, usuarioId]
            );
        }

        res.json({
            sucesso:true
        });

    }catch(err){

        console.error(err);

        res.status(500).json({
            mensagem:"Erro ao curtir"
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});