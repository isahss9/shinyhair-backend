async function verificarSessao() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "index.html";
        return;
    }
    try {
        const res = await fetch("https://shinyhair-backend-production.up.railway.app/api/sessao", {
            headers: { "Authorization": "Bearer " + token }
        });
        if (!res.ok) {
            localStorage.removeItem("token");
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
    localStorage.removeItem("token");
    localStorage.removeItem("nome");
    window.location.href = "index.html";
}

verificarSessao();
