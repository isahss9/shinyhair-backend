const API = "https://shinyhair-backend-production.up.railway.app";
const ADMIN_EMAIL = "isabss.0408@gmail.com";

let usuarioAtual = null;

function getToken() {
    return localStorage.getItem("token");
}

async function carregarUsuario() {
    const token = getToken();
    if (!token) {
        alert("Faça login para acessar o fórum.");
        window.location.href = "index.html";
        return;
    }
    try {
        const res = await fetch(`${API}/api/sessao`, {
            headers: { "Authorization": "Bearer " + token }
        });
        if (!res.ok) {
            alert("Faça login para acessar o fórum.");
            window.location.href = "index.html";
            return;
        }
        usuarioAtual = await res.json();
        carregarPosts();
    } catch (erro) {
        console.error(erro);
    }
}

async function criarPost() {
    const conteudo = document.getElementById("conteudoPost").value.trim();
    if (!conteudo) { alert("Digite algo."); return; }
    await fetch(`${API}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + getToken() },
        body: JSON.stringify({ conteudo })
    });
    document.getElementById("conteudoPost").value = "";
    carregarPosts();
}

async function carregarPosts() {
    const res = await fetch(`${API}/api/posts`);
    const posts = await res.json();
    const container = document.getElementById("postsContainer");
    container.innerHTML = "";
    posts.forEach(post => {
        const podeExcluir = usuarioAtual.email === ADMIN_EMAIL || usuarioAtual.id === post.usuario_id;
        let respostasHTML = "";
        post.respostas.forEach(resposta => {
            const excluirResposta = usuarioAtual.email === ADMIN_EMAIL || usuarioAtual.id === resposta.usuario_id;
            respostasHTML += `
                <div class="resposta">
                    <div class="post-topo"><span class="nome">${resposta.nome}</span></div>
                    <div>${resposta.conteudo}</div>
                    ${excluirResposta ? `<button class="btn-excluir" onclick="excluirResposta(${resposta.id})">Excluir</button>` : ""}
                </div>`;
        });
        container.innerHTML += `
            <div class="post">
                <div class="post-topo">
                    <span class="nome">${post.nome}</span>
                    <span class="data">${new Date(post.criado_em).toLocaleString("pt-BR")}</span>
                </div>
                <div class="post-conteudo">${post.conteudo}</div>
                <div class="interacoes">
                    <span onclick="curtirPost(${post.id})">❤️ ${post.curtidas || 0}</span>
                    <span>💬 ${post.respostas.length}</span>
                </div>
                <div class="acoes">
                    <button class="btn-responder" onclick="abrirResposta(${post.id})">Responder</button>
                    ${podeExcluir ? `<button class="btn-excluir" onclick="excluirPost(${post.id})">Excluir</button>` : ""}
                </div>
                <div id="resposta-${post.id}" class="form-resposta"></div>
                <div class="ver-respostas" onclick="toggleRespostas(${post.id})">Ver respostas (${post.respostas.length})</div>
                <div class="respostas" id="lista-respostas-${post.id}" style="display:none;">${respostasHTML}</div>
            </div>`;
    });
}

function abrirResposta(postId) {
    const area = document.getElementById(`resposta-${postId}`);
    area.innerHTML = `
        <textarea id="texto-${postId}" placeholder="Digite sua resposta"></textarea>
        <button onclick="enviarResposta(${postId})">Enviar resposta</button>`;
}

async function enviarResposta(postId) {
    const conteudo = document.getElementById(`texto-${postId}`).value.trim();
    if (!conteudo) return;
    await fetch(`${API}/api/respostas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + getToken() },
        body: JSON.stringify({ post_id: postId, conteudo })
    });
    carregarPosts();
}

async function excluirPost(id) {
    if (!confirm("Excluir postagem?")) return;
    await fetch(`${API}/api/posts/${id}`, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + getToken() }
    });
    carregarPosts();
}

async function excluirResposta(id) {
    if (!confirm("Excluir resposta?")) return;
    await fetch(`${API}/api/respostas/${id}`, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + getToken() }
    });
    carregarPosts();
}

function toggleRespostas(postId) {
    const lista = document.getElementById(`lista-respostas-${postId}`);
    lista.style.display = lista.style.display === "none" ? "block" : "none";
}

async function curtirPost(postId) {
    await fetch(`${API}/api/posts/${postId}/curtir`, {
        method: "POST",
        headers: { "Authorization": "Bearer " + getToken() }
    });
    carregarPosts();
}

carregarUsuario();
