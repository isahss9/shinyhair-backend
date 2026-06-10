const ADMIN_EMAIL = "isabss.0408@gmail.com";

let usuarioAtual = null;

async function carregarUsuario() {
    try {
        const res = await fetch("/api/sessao");

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

    const conteudo = document
        .getElementById("conteudoPost")
        .value
        .trim();

    if (!conteudo) {
        alert("Digite algo.");
        return;
    }

    await fetch("/api/posts", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            conteudo
        })
    });

    document.getElementById("conteudoPost").value = "";

    carregarPosts();
}

async function carregarPosts() {

    const res = await fetch("/api/posts");

    const posts = await res.json();

    const container =
        document.getElementById("postsContainer");

    container.innerHTML = "";

    posts.forEach(post => {

        const podeExcluir =
            usuarioAtual.email === ADMIN_EMAIL ||
            usuarioAtual.id === post.usuario_id;

        let respostasHTML = "";

        post.respostas.forEach(resposta => {

            const excluirResposta =
                usuarioAtual.email === ADMIN_EMAIL ||
                usuarioAtual.id === resposta.usuario_id;

            respostasHTML += `
                <div class="resposta">

                    <div class="post-topo">
                        <span class="nome">${resposta.nome}</span>
                    </div>

                    <div>
                        ${resposta.conteudo}
                    </div>

                    ${
                        excluirResposta
                        ?
                        `
                        <button
                            class="btn-excluir"
                            onclick="excluirResposta(${resposta.id})">
                            Excluir
                        </button>
                        `
                        :
                        ""
                    }

                </div>
            `;
        });

        container.innerHTML += `
            <div class="post">

                <div class="post-topo">

                    <span class="nome">
                        ${post.nome}
                    </span>

                    <span class="data">
                        ${new Date(post.criado_em)
                            .toLocaleString("pt-BR")}
                    </span>

                </div>

                <div class="post-conteudo">
                    ${post.conteudo}
                </div>

                <div class="acoes">

                    <button
                        class="btn-responder"
                        onclick="abrirResposta(${post.id})">
                        Responder
                    </button>

                    ${
                        podeExcluir
                        ?
                        `
                        <button
                            class="btn-excluir"
                            onclick="excluirPost(${post.id})">
                            Excluir
                        </button>
                        `
                        :
                        ""
                    }

                </div>

                <div
                    id="resposta-${post.id}"
                    class="form-resposta">
                </div>

                <div class="respostas">
                    ${respostasHTML}
                </div>

            </div>
        `;
    });
}

function abrirResposta(postId) {

    const area =
        document.getElementById(
            `resposta-${postId}`
        );

    area.innerHTML = `
        <textarea
            id="texto-${postId}"
            placeholder="Digite sua resposta">
        </textarea>

        <button
            onclick="enviarResposta(${postId})">
            Enviar resposta
        </button>
    `;
}

async function enviarResposta(postId) {

    const conteudo =
        document.getElementById(
            `texto-${postId}`
        ).value.trim();

    if (!conteudo) {
        return;
    }

    await fetch("/api/respostas", {
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({
            post_id:postId,
            conteudo
        })
    });

    carregarPosts();
}

async function excluirPost(id){

    if(!confirm("Excluir postagem?")){
        return;
    }

    await fetch(`/api/posts/${id}`,{
        method:"DELETE"
    });

    carregarPosts();
}

async function excluirResposta(id){

    if(!confirm("Excluir resposta?")){
        return;
    }

    await fetch(`/api/respostas/${id}`,{
        method:"DELETE"
    });

    carregarPosts();
}

carregarUsuario();