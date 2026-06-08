// Verificação de sessão via API
async function verificarSessao() {
    try {
        const res = await fetch("/api/sessao");
        if (!res.ok) {
            window.location.href = "index.html";
        } else {
            const data = await res.json();
            const el = document.getElementById("usuarioNome");
            if (el) el.innerText = " " + data.nome;
        }
    } catch (err) {
        window.location.href = "index.html";
    }
}

async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "index.html";
}

verificarSessao();
