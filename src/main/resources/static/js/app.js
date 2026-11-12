/* ==========================================================
   Sistema de Chamados – front-end
   Consome a API REST em /clientes. Não acessa o banco direto:
   tudo passa pelo Controller -> Service -> Repository.
   Telas (mapa de telas): Painel, Clientes (lista, novo,
   editar, detalhe). Categorias, Técnicos e Chamados entram
   nas próximas etapas.
   ========================================================== */

const API_CLIENTES = "/clientes";
const conteudo = document.getElementById("conteudo");

/* ---------- Utilitários ---------- */

/** Evita que dados digitados virem HTML na página. */
function esc(texto) {
    return String(texto ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

/** 7 -> "#0007" (número do cliente no estilo de chamado) */
function numero(id) {
    return "#" + String(id).padStart(4, "0");
}

/**
 * Chama a API e devolve { ok, status, dados }.
 * Se a aplicação estiver fora do ar, lança erro de conexão.
 */
async function api(metodo, url, corpo) {
    const opcoes = { method: metodo, headers: { Accept: "application/json" } };
    if (corpo !== undefined) {
        opcoes.headers["Content-Type"] = "application/json";
        opcoes.body = JSON.stringify(corpo);
    }

    let resposta;
    try {
        resposta = await fetch(url, opcoes);
    } catch (e) {
        marcarApi(false);
        throw new Error("CONEXAO");
    }
    marcarApi(true);

    const texto = await resposta.text();
    const dados = texto ? JSON.parse(texto) : null;
    return { ok: resposta.ok, status: resposta.status, dados };
}

function marcarApi(online) {
    const status = document.getElementById("api-status");
    status.dataset.estado = online ? "online" : "offline";
    document.getElementById("api-status-texto").textContent =
        online ? "API conectada" : "API fora do ar";
}

function avisar(mensagem, tipo = "sucesso") {
    const aviso = document.createElement("div");
    aviso.className = "aviso" + (tipo === "erro" ? " erro" : "");
    aviso.textContent = mensagem;
    const avisos = document.getElementById("avisos");
    avisos.appendChild(aviso);
    while (avisos.children.length > 3) avisos.firstElementChild.remove();
    setTimeout(() => aviso.remove(), 3500);
}

function ir(rota) {
    location.hash = rota;
}

function telaSemConexao() {
    conteudo.innerHTML = `
        <div class="cabecalho"><div><h1>Sem conexão com a API</h1>
        <p>Não foi possível falar com o servidor. Confira se a aplicação está rodando
        (<code>.\\mvnw spring-boot:run</code>) e recarregue a página.</p></div></div>
        <button class="botao principal" type="button" onclick="location.reload()">Tentar de novo</button>`;
}

/* ---------- Tela: Painel ---------- */

async function telaPainel() {
    document.title = "Painel · Sistema de Chamados";
    conteudo.innerHTML = `<p class="carregando">Carregando painel…</p>`;

    const r = await api("GET", API_CLIENTES);
    const total = r.ok ? r.dados.length : 0;

    conteudo.innerHTML = `
        <div class="cabecalho">
            <div>
                <h1>Central de chamados</h1>
                <p>Cadastre e consulte os clientes que abrem chamados. As demais áreas
                são liberadas conforme as próximas etapas do projeto.</p>
            </div>
        </div>

        <div class="resumo">
            <section class="resumo-clientes" aria-labelledby="titulo-clientes">
                <h2 id="titulo-clientes">Clientes cadastrados</h2>
                <p class="resumo-total">${total}</p>
                <div class="acoes">
                    <a class="botao principal" href="#/clientes/novo">Cadastrar cliente</a>
                    <a class="botao" href="#/clientes">Ver todos</a>
                </div>
            </section>

            <section class="etapas" aria-labelledby="titulo-etapas">
                <h2 id="titulo-etapas">Andamento do sistema</h2>
                <ol>
                    <li class="feito">Clientes</li>
                    <li>Categorias</li>
                    <li>Técnicos</li>
                    <li>Chamados</li>
                    <li>Status, atribuição e comentários</li>
                </ol>
            </section>
        </div>`;
}

/* ---------- Tela: Lista de clientes ---------- */

async function telaLista() {
    document.title = "Clientes · Sistema de Chamados";
    conteudo.innerHTML = `<p class="carregando">Carregando clientes…</p>`;

    const r = await api("GET", API_CLIENTES);
    const clientes = r.ok ? r.dados : [];

    conteudo.innerHTML = `
        <div class="cabecalho">
            <div>
                <h1>Clientes</h1>
                <p>Quem pode abrir chamados no sistema.</p>
            </div>
            <a class="botao principal" href="#/clientes/novo">Cadastrar cliente</a>
        </div>
        ${clientes.length ? `
        <div class="barra-lista">
            <input class="entrada busca" id="busca" type="search"
                   placeholder="Buscar por nome, e-mail ou telefone" aria-label="Buscar clientes">
            <span class="contagem" id="contagem"></span>
        </div>
        <ul class="lista" id="lista"></ul>` : `
        <div class="vazio">
            <h2>Nenhum cliente cadastrado</h2>
            <p>Cadastre o primeiro cliente para começar a registrar chamados.</p>
            <a class="botao principal" href="#/clientes/novo">Cadastrar cliente</a>
        </div>`}`;

    if (!clientes.length) return;

    const busca = document.getElementById("busca");
    const desenhar = () => {
        const termo = busca.value.trim().toLowerCase();
        const filtrados = clientes.filter(c =>
            [c.nome, c.email, c.telefone].some(v => (v || "").toLowerCase().includes(termo)));

        document.getElementById("contagem").textContent =
            filtrados.length === 1 ? "1 cliente" : `${filtrados.length} clientes`;

        document.getElementById("lista").innerHTML = filtrados.length
            ? filtrados.map(c => `
                <li class="canhoto">
                    <a class="canhoto-numero" href="#/clientes/${c.id}" aria-label="Cliente ${numero(c.id)}">${numero(c.id)}</a>
                    <div class="canhoto-dados">
                        <a class="canhoto-nome" href="#/clientes/${c.id}">${esc(c.nome)}</a>
                        <div class="canhoto-contato">
                            <span>${esc(c.email)}</span>
                            <span>${c.telefone ? esc(c.telefone) : "Sem telefone"}</span>
                        </div>
                    </div>
                    <div class="canhoto-acoes">
                        <a class="botao pequeno" href="#/clientes/${c.id}/editar">Editar</a>
                        <button class="botao pequeno perigo" type="button"
                                data-excluir="${c.id}" data-nome="${esc(c.nome)}">Excluir</button>
                    </div>
                </li>`).join("")
            : `<li class="vazio"><p>Nenhum cliente encontrado para “${esc(busca.value)}”.</p></li>`;
    };

    busca.addEventListener("input", desenhar);
    document.getElementById("lista").addEventListener("click", e => {
        const botao = e.target.closest("[data-excluir]");
        if (botao) confirmarExclusao(botao.dataset.excluir, botao.dataset.nome);
    });
    desenhar();
}

/* ---------- Tela: Detalhe ---------- */

async function telaDetalhe(id) {
    conteudo.innerHTML = `<p class="carregando">Carregando cliente…</p>`;
    const r = await api("GET", `${API_CLIENTES}/${id}`);

    if (r.status === 404) return telaNaoEncontrado(r.dados?.erro);

    const c = r.dados;
    document.title = `${c.nome} · Sistema de Chamados`;
    conteudo.innerHTML = `
        <a class="voltar" href="#/clientes">← Voltar para clientes</a>
        <div class="cabecalho"><div><h1>${esc(c.nome)}</h1></div></div>

        <div class="ficha">
            <span class="canhoto-numero">${numero(c.id)}</span>
            <dl>
                <dt>Nome</dt><dd>${esc(c.nome)}</dd>
                <dt>E-mail</dt><dd>${esc(c.email)}</dd>
                <dt>Telefone</dt><dd>${c.telefone ? esc(c.telefone) : "Não informado"}</dd>
            </dl>
        </div>

        <div class="acoes">
            <a class="botao principal" href="#/clientes/${c.id}/editar">Editar cliente</a>
            <button class="botao perigo" type="button" id="excluir">Excluir cliente</button>
        </div>`;

    document.getElementById("excluir")
        .addEventListener("click", () => confirmarExclusao(c.id, c.nome));
}

/* ---------- Tela: Formulário (novo e editar) ---------- */

async function telaFormulario(id) {
    const editando = id !== undefined;
    let cliente = { nome: "", email: "", telefone: "" };

    if (editando) {
        conteudo.innerHTML = `<p class="carregando">Carregando cliente…</p>`;
        const r = await api("GET", `${API_CLIENTES}/${id}`);
        if (r.status === 404) return telaNaoEncontrado(r.dados?.erro);
        cliente = r.dados;
    }

    document.title = (editando ? "Editar cliente" : "Novo cliente") + " · Sistema de Chamados";
    const voltar = editando ? `#/clientes/${id}` : "#/clientes";

    // novalidate: quem valida é a API (Bean Validation), e a tela mostra o retorno dela
    conteudo.innerHTML = `
        <a class="voltar" href="${voltar}">← Voltar</a>
        <div class="cabecalho"><div>
            <h1>${editando ? "Editar cliente" : "Novo cliente"}</h1>
            <p>${editando ? `Alterando o cadastro ${numero(id)}.` : "Preencha os dados de quem vai abrir chamados."}</p>
        </div></div>

        <form class="formulario" id="form-cliente" novalidate>
            <div class="alerta" id="alerta" role="alert"></div>

            <div class="campo" data-campo="nome">
                <label for="nome">Nome</label>
                <input class="entrada" id="nome" name="nome" autocomplete="name" value="${esc(cliente.nome)}">
                <span class="campo-erro" id="erro-nome"></span>
            </div>

            <div class="campo" data-campo="email">
                <label for="email">E-mail</label>
                <input class="entrada" id="email" name="email" type="email" autocomplete="email" value="${esc(cliente.email)}">
                <span class="campo-erro" id="erro-email"></span>
            </div>

            <div class="campo" data-campo="telefone">
                <label for="telefone">Telefone <span class="dica">(opcional)</span></label>
                <input class="entrada" id="telefone" name="telefone" type="tel" autocomplete="tel"
                       placeholder="47999999999" value="${esc(cliente.telefone)}">
                <span class="campo-erro" id="erro-telefone"></span>
            </div>

            <div class="acoes">
                <button class="botao principal" type="submit" id="salvar">
                    ${editando ? "Salvar alterações" : "Cadastrar cliente"}
                </button>
                <a class="botao" href="${voltar}">Cancelar</a>
            </div>
        </form>`;

    const form = document.getElementById("form-cliente");
    form.nome.focus();

    form.addEventListener("submit", async e => {
        e.preventDefault();
        limparErros();

        const corpo = {
            nome: form.nome.value.trim(),
            email: form.email.value.trim(),
            telefone: form.telefone.value.trim() || null
        };

        const botao = document.getElementById("salvar");
        botao.disabled = true;
        try {
            const r = editando
                ? await api("PUT", `${API_CLIENTES}/${id}`, corpo)
                : await api("POST", API_CLIENTES, corpo);

            if (r.ok) {
                avisar(editando ? "Alterações salvas" : "Cliente cadastrado");
                ir(`/clientes/${r.dados.id}`);
                return;
            }
            mostrarErros(r);
        } catch {
            document.getElementById("alerta").textContent =
                "Não foi possível falar com a API. Confira se a aplicação está rodando.";
        } finally {
            botao.disabled = false;
        }
    });
}

function limparErros() {
    document.getElementById("alerta").textContent = "";
    document.querySelectorAll(".campo").forEach(campo => {
        campo.classList.remove("invalido");
        campo.querySelector(".campo-erro").textContent = "";
        campo.querySelector(".entrada").removeAttribute("aria-invalid");
    });
}

function erroNoCampo(nome, mensagem) {
    const campo = document.querySelector(`.campo[data-campo="${nome}"]`);
    if (!campo) return false;
    const atual = campo.querySelector(".campo-erro");
    atual.textContent = atual.textContent ? `${atual.textContent} ${mensagem}` : mensagem;
    campo.classList.add("invalido");
    campo.querySelector(".entrada").setAttribute("aria-invalid", "true");
    return true;
}

/** Traduz a ErroResposta da API (400, 404, 409) para mensagens na tela. */
function mostrarErros(r) {
    const erro = r.dados || {};

    if (r.status === 400 && erro.detalhes?.length) {
        // detalhes vêm no formato "campo: mensagem"
        erro.detalhes.forEach(d => {
            const [campo, ...resto] = d.split(":");
            if (!erroNoCampo(campo.trim(), resto.join(":").trim())) {
                document.getElementById("alerta").textContent = d;
            }
        });
    } else if (r.status === 409) {
        erroNoCampo("email", erro.erro);
    } else if (r.status === 404) {
        avisar(erro.erro || "Cliente não encontrado", "erro");
        ir("/clientes");
        return;
    } else {
        document.getElementById("alerta").textContent =
            erro.erro || `A API respondeu com erro ${r.status}.`;
    }

    const primeiro = document.querySelector(".campo.invalido .entrada");
    if (primeiro) primeiro.focus();
}

/* ---------- Exclusão ---------- */

function confirmarExclusao(id, nome) {
    const dialogo = document.getElementById("dialogo-excluir");
    document.getElementById("dialogo-texto").textContent =
        `O cadastro ${numero(id)} de ${nome} será removido. Essa ação não pode ser desfeita.`;
    dialogo.returnValue = "";
    dialogo.showModal();

    dialogo.addEventListener("close", async () => {
        if (dialogo.returnValue !== "confirmar") return;
        try {
            const r = await api("DELETE", `${API_CLIENTES}/${id}`);
            if (r.status === 204) {
                avisar("Cliente excluído");
            } else {
                avisar(r.dados?.erro || "Não foi possível excluir o cliente", "erro");
            }
        } catch {
            avisar("Não foi possível falar com a API", "erro");
        }
        if (location.hash === "#/clientes") telaLista();
        else ir("/clientes");
    }, { once: true });
}

/* ---------- Tela: não encontrado ---------- */

function telaNaoEncontrado(mensagem) {
    document.title = "Não encontrado · Sistema de Chamados";
    conteudo.innerHTML = `
        <div class="vazio">
            <h2>${esc(mensagem || "Página não encontrada")}</h2>
            <p>O endereço pode estar errado ou o cadastro foi excluído.</p>
            <a class="botao principal" href="#/clientes">Ver clientes</a>
        </div>`;
}

/* ---------- Rotas ---------- */

const rotas = [
    { padrao: /^\/?$/,                     menu: "painel",   tela: () => telaPainel() },
    { padrao: /^\/clientes$/,              menu: "clientes", tela: () => telaLista() },
    { padrao: /^\/clientes\/novo$/,        menu: "clientes", tela: () => telaFormulario() },
    { padrao: /^\/clientes\/(\d+)$/,       menu: "clientes", tela: m => telaDetalhe(m[1]) },
    { padrao: /^\/clientes\/(\d+)\/editar$/, menu: "clientes", tela: m => telaFormulario(m[1]) }
];

async function navegar() {
    const caminho = location.hash.replace(/^#/, "");
    const rota = rotas.find(r => r.padrao.test(caminho));

    document.querySelectorAll(".menu-item[data-rota]").forEach(item => {
        const ativo = rota && item.dataset.rota === rota.menu;
        item.classList.toggle("ativo", ativo);
        if (ativo) item.setAttribute("aria-current", "page");
        else item.removeAttribute("aria-current");
    });

    try {
        if (rota) await rota.tela(caminho.match(rota.padrao));
        else telaNaoEncontrado();
    } catch (e) {
        if (e.message === "CONEXAO") telaSemConexao();
        else throw e;
    }
    // leva o foco do teclado para a nova tela (exceto quando um campo já recebeu foco)
    if (!conteudo.contains(document.activeElement)) conteudo.focus({ preventScroll: true });
    window.scrollTo(0, 0);
}

window.addEventListener("hashchange", navegar);
navegar();
