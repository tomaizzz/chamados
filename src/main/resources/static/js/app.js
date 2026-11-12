/* ==========================================================
   Sistema de Chamados – front-end
   Consome a API REST do próprio Spring Boot (mesma origem).
   A tela nunca fala com o banco: tudo passa por
   Controller -> Service -> Repository.
   ========================================================== */

const conteudo = document.getElementById("conteudo");

const ROTULOS = {
    status: { ABERTO: "Aberto", EM_ATENDIMENTO: "Em atendimento", AGUARDANDO_CLIENTE: "Aguardando cliente", FECHADO: "Fechado" },
    prioridade: { BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta", CRITICA: "Crítica" },
    perfil: { ADMIN: "Administrador", TECNICO: "Técnico" }
};

/* ---------- Utilitários ---------- */

/** Evita que dados digitados virem HTML na página. */
function esc(texto) {
    return String(texto ?? "")
        .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

/** 7 -> "#0007" (número no estilo de chamado impresso) */
const numero = id => "#" + String(id).padStart(4, "0");

const chip = (tipo, valor) =>
    `<span class="chip ${esc(valor)}">${esc(ROTULOS[tipo][valor] ?? valor)}</span>`;

function quando(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const opcoesEnum = tipo => Object.entries(ROTULOS[tipo]).map(([valor, texto]) => ({ valor, texto }));
const opcoesLista = lista => lista.map(i => ({ valor: String(i.id), texto: i.nome }));

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
    let dados = null;
    try { dados = texto ? JSON.parse(texto) : null; } catch { dados = null; }
    return { ok: resposta.ok, status: resposta.status, dados };
}

/** Para leituras: devolve os dados ou lança erro com a mensagem da API. */
async function ler(url) {
    const r = await api("GET", url);
    if (!r.ok) {
        const erro = new Error(r.dados?.erro || `A API respondeu com erro ${r.status}`);
        erro.status = r.status;
        throw erro;
    }
    return r.dados;
}

function marcarApi(online) {
    const status = document.getElementById("api-status");
    status.dataset.estado = online ? "online" : "offline";
    document.getElementById("api-status-texto").textContent = online ? "API conectada" : "API fora do ar";
}

function avisar(mensagem, tipo = "sucesso") {
    const aviso = document.createElement("div");
    aviso.className = "aviso" + (tipo === "erro" ? " erro" : "");
    aviso.textContent = mensagem;
    const avisos = document.getElementById("avisos");
    avisos.appendChild(aviso);
    while (avisos.children.length > 3) avisos.firstElementChild.remove();
    setTimeout(() => aviso.remove(), tipo === "erro" ? 6000 : 3500);
}

const ir = rota => { location.hash = rota; };
const carregando = texto => { conteudo.innerHTML = `<p class="carregando">${texto}</p>`; };
const titulo = t => { document.title = t + " · Sistema de Chamados"; };

/** Diálogo de confirmação. Resolve true se a pessoa confirmar. */
function confirmar({ tituloDialogo, texto, botao }) {
    const dialogo = document.getElementById("dialogo-confirmar");
    document.getElementById("dialogo-titulo").textContent = tituloDialogo;
    document.getElementById("dialogo-texto").textContent = texto;
    document.getElementById("dialogo-botao").textContent = botao;
    dialogo.returnValue = "";
    dialogo.showModal();
    return new Promise(resolver => {
        dialogo.addEventListener("close", () => resolver(dialogo.returnValue === "confirmar"), { once: true });
    });
}

/** Exclusão padrão com confirmação; 409 (ex.: cliente com chamados) vira aviso. */
async function excluir({ url, tituloDialogo, texto, botao, feito, depois }) {
    if (!await confirmar({ tituloDialogo, texto, botao })) return;
    const r = await api("DELETE", url);
    if (r.status === 204) {
        avisar(feito);
        depois();
    } else {
        avisar(r.dados?.erro || "Não foi possível excluir", "erro");
    }
}

/* ---------- Formulário genérico ---------- */

/**
 * Desenha um formulário e envia para a API.
 * campos: { nome, rotulo, tipo, opcoes, opcional, vazio, numero, dica }
 * Os erros da API (ErroResposta) aparecem no campo certo.
 */
function formulario({ cabecalho, subtitulo, voltar, campos, valores = {}, textoBotao, campoConflito, enviar, sucesso }) {
    const campoHtml = c => {
        const v = valores[c.nome] ?? "";
        let entrada;
        if (c.tipo === "textarea") {
            entrada = `<textarea class="entrada" id="${c.nome}" name="${c.nome}">${esc(v)}</textarea>`;
        } else if (c.tipo === "select") {
            entrada = `<select class="entrada" id="${c.nome}" name="${c.nome}">
                <option value="">${esc(c.vazio || "Selecione")}</option>
                ${c.opcoes.map(o => `<option value="${esc(o.valor)}" ${String(v) === String(o.valor) ? "selected" : ""}>${esc(o.texto)}</option>`).join("")}
            </select>`;
        } else {
            entrada = `<input class="entrada" id="${c.nome}" name="${c.nome}" type="${c.tipo || "text"}"
                        value="${esc(v)}" ${c.placeholder ? `placeholder="${esc(c.placeholder)}"` : ""}>`;
        }
        return `
            <div class="campo" data-campo="${c.nome}">
                <label for="${c.nome}">${esc(c.rotulo)}${c.opcional ? ' <span class="dica">(opcional)</span>' : ""}</label>
                ${entrada}
                ${c.dica ? `<span class="dica">${esc(c.dica)}</span>` : ""}
                <span class="campo-erro" id="erro-${c.nome}"></span>
            </div>`;
    };

    // novalidate: quem valida é a API (Bean Validation); a tela só mostra o retorno
    conteudo.innerHTML = `
        <a class="voltar" href="${voltar}">← Voltar</a>
        <div class="cabecalho"><div>
            <h1>${esc(cabecalho)}</h1>
            ${subtitulo ? `<p>${esc(subtitulo)}</p>` : ""}
        </div></div>
        <form class="formulario" id="formulario" novalidate>
            <div class="alerta" id="alerta" role="alert"></div>
            ${campos.map(campoHtml).join("")}
            <div class="acoes">
                <button class="botao principal" type="submit" id="salvar">${esc(textoBotao)}</button>
                <a class="botao" href="${voltar}">Cancelar</a>
            </div>
        </form>`;

    const form = document.getElementById("formulario");
    form.elements[campos[0].nome].focus();

    form.addEventListener("submit", async e => {
        e.preventDefault();
        limparErros();
        const corpo = {};
        campos.forEach(c => {
            const bruto = form.elements[c.nome].value.trim();
            corpo[c.nome] = bruto === "" ? null : (c.numero ? Number(bruto) : bruto);
        });
        const botao = document.getElementById("salvar");
        botao.disabled = true;
        try {
            const r = await enviar(corpo);
            if (r.ok) return sucesso(r.dados);
            mostrarErros(r, campoConflito);
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
        const erro = campo.querySelector(".campo-erro");
        if (erro) erro.textContent = "";
        campo.querySelector(".entrada")?.removeAttribute("aria-invalid");
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

/** Traduz a ErroResposta da API (400, 404, 409) em mensagens na tela. */
function mostrarErros(r, campoConflito) {
    const erro = r.dados || {};
    const alerta = document.getElementById("alerta");
    if (r.status === 400 && erro.detalhes?.length) {
        // detalhes vêm no formato "campo: mensagem"
        erro.detalhes.forEach(d => {
            const [campo, ...resto] = d.split(":");
            if (!erroNoCampo(campo.trim(), resto.join(":").trim())) {
                alerta.textContent = alerta.textContent ? `${alerta.textContent} ${d}` : d;
            }
        });
    } else if (r.status === 409 && campoConflito && erroNoCampo(campoConflito, erro.erro)) {
        // ex.: e-mail ou nome repetido
    } else {
        alerta.textContent = erro.erro || `A API respondeu com erro ${r.status}.`;
    }
    const primeiro = document.querySelector(".campo.invalido .entrada");
    if (primeiro) primeiro.focus();
}

/* ---------- Componentes de lista ---------- */

function canhotoChamado(c) {
    return `
        <li class="canhoto ${c.status === "FECHADO" ? "fechado" : ""}">
            <a class="canhoto-numero" href="#/chamados/${c.id}" aria-label="Chamado ${numero(c.id)}">${numero(c.id)}</a>
            <div class="canhoto-dados">
                <a class="canhoto-titulo" href="#/chamados/${c.id}">${esc(c.titulo)}</a>
                <div class="canhoto-contato">
                    <span>${esc(c.clienteNome)}</span>
                    <span>${esc(c.categoriaNome)}</span>
                    <span>${c.tecnicoNome ? esc(c.tecnicoNome) : "Sem técnico"}</span>
                </div>
            </div>
            <div class="canhoto-etiquetas">
                ${chip("prioridade", c.prioridade)} ${chip("status", c.status)}
                <span class="canhoto-data">${quando(c.dataAbertura)}</span>
            </div>
        </li>`;
}

const listaChamados = (lista, vazio) => lista.length
    ? `<ul class="lista">${lista.map(canhotoChamado).join("")}</ul>`
    : `<div class="vazio"><p>${vazio}</p></div>`;

/* ==========================================================
   PAINEL
   ========================================================== */

async function telaPainel() {
    titulo("Painel");
    carregando("Carregando painel…");
    const [resumo, recentes] = await Promise.all([ler("/chamados/resumo"), ler("/chamados?size=5")]);
    const maior = Math.max(1, ...Object.values(resumo.porPrioridade));

    conteudo.innerHTML = `
        <div class="cabecalho">
            <div>
                <h1>Central de chamados</h1>
                <p>${resumo.totalChamados === 1 ? "1 chamado registrado" : `${resumo.totalChamados} chamados registrados`}.
                   Clique em um status para ver a fila filtrada.</p>
            </div>
            <a class="botao principal" href="#/chamados/novo">Abrir chamado</a>
        </div>

        <div class="fila">
            ${Object.entries(resumo.porStatus).map(([s, n]) => `
                <a class="fila-item ${s}" href="#/chamados" data-filtro-status="${s}">
                    <strong>${n}</strong><span>${ROTULOS.status[s]}</span>
                </a>`).join("")}
        </div>

        <div class="grade-painel">
            <section class="quadro" aria-labelledby="t-prio">
                <h2 id="t-prio">Chamados por prioridade</h2>
                <div class="barras">
                    ${Object.entries(resumo.porPrioridade).map(([p, n]) => `
                        <div class="barra-linha ${p}">
                            <span>${ROTULOS.prioridade[p]}</span>
                            <span class="barra-trilho"><i style="width:${n / maior * 100}%"></i></span>
                            <b>${n}</b>
                        </div>`).join("")}
                </div>
            </section>
            <section class="quadro" aria-labelledby="t-cad">
                <h2 id="t-cad">Cadastros</h2>
                <dl class="cadastros">
                    <div><dt><a href="#/clientes">Clientes</a></dt><dd>${resumo.clientes}</dd></div>
                    <div><dt><a href="#/categorias">Categorias</a></dt><dd>${resumo.categorias}</dd></div>
                    <div><dt><a href="#/tecnicos">Técnicos</a></dt><dd>${resumo.tecnicos}</dd></div>
                </dl>
            </section>
        </div>

        <section class="quadro" aria-labelledby="t-rec">
            <div class="quadro-topo"><h2 id="t-rec">Chamados mais recentes</h2><a href="#/chamados">Ver todos</a></div>
            ${listaChamados(recentes.conteudo, "Nenhum chamado ainda. Abra o primeiro pelo botão Abrir chamado.")}
        </section>`;

    conteudo.querySelectorAll("[data-filtro-status]").forEach(a =>
        a.addEventListener("click", () => {
            filtros.status = a.dataset.filtroStatus;
            filtros.prioridade = "";
            filtros.clienteId = "";
            filtros.pagina = 0;
        }));
}

/* ==========================================================
   CHAMADOS
   ========================================================== */

const filtros = { status: "", prioridade: "", clienteId: "", pagina: 0 };
const TAMANHO_PAGINA = 10;
let clientePreSelecionado = "";

async function telaChamados() {
    titulo("Chamados");
    carregando("Carregando chamados…");
    const clientes = await ler("/clientes");

    const select = (id, rotulo, opcoes, valor) => `
        <div class="campo">
            <label for="${id}">${rotulo}</label>
            <select class="entrada" id="${id}">
                <option value="">Todos</option>
                ${opcoes.map(o => `<option value="${esc(o.valor)}" ${String(valor) === String(o.valor) ? "selected" : ""}>${esc(o.texto)}</option>`).join("")}
            </select>
        </div>`;

    conteudo.innerHTML = `
        <div class="cabecalho">
            <div><h1>Chamados</h1><p>Do mais recente para o mais antigo.</p></div>
            <a class="botao principal" href="#/chamados/novo">Abrir chamado</a>
        </div>
        <div class="filtros">
            ${select("f-status", "Status", opcoesEnum("status"), filtros.status)}
            ${select("f-prioridade", "Prioridade", opcoesEnum("prioridade"), filtros.prioridade)}
            ${select("f-cliente", "Cliente", opcoesLista(clientes), filtros.clienteId)}
            <button class="botao" type="button" id="limpar">Limpar filtros</button>
        </div>
        <div id="resultado"></div>`;

    const recarregar = () => carregarPagina().catch(tratarErroTela);
    [["f-status", "status"], ["f-prioridade", "prioridade"], ["f-cliente", "clienteId"]].forEach(([id, chave]) =>
        document.getElementById(id).addEventListener("change", e => {
            filtros[chave] = e.target.value;
            filtros.pagina = 0;
            recarregar();
        }));
    document.getElementById("limpar").addEventListener("click", () => {
        Object.assign(filtros, { status: "", prioridade: "", clienteId: "", pagina: 0 });
        telaChamados().catch(tratarErroTela);
    });
    await carregarPagina();
}

async function carregarPagina() {
    const q = new URLSearchParams({ page: filtros.pagina, size: TAMANHO_PAGINA });
    if (filtros.status) q.set("status", filtros.status);
    if (filtros.prioridade) q.set("prioridade", filtros.prioridade);
    if (filtros.clienteId) q.set("clienteId", filtros.clienteId);
    const r = await ler("/chamados?" + q);
    const total = Math.max(r.totalPaginas, 1);
    const filtrando = filtros.status || filtros.prioridade || filtros.clienteId;

    document.getElementById("resultado").innerHTML = `
        ${listaChamados(r.conteudo, filtrando ? "Nenhum chamado com esses filtros." : "Nenhum chamado aberto ainda.")}
        <div class="paginacao">
            <span>${r.totalElementos === 1 ? "1 chamado" : `${r.totalElementos} chamados`} · página ${r.pagina + 1} de ${total}</span>
            <div class="acoes">
                <button class="botao pequeno" type="button" id="anterior" ${r.pagina <= 0 ? "disabled" : ""}>Anterior</button>
                <button class="botao pequeno" type="button" id="proxima" ${r.pagina + 1 >= total ? "disabled" : ""}>Próxima</button>
            </div>
        </div>`;

    document.getElementById("anterior").addEventListener("click", () => { filtros.pagina--; carregarPagina().catch(tratarErroTela); });
    document.getElementById("proxima").addEventListener("click", () => { filtros.pagina++; carregarPagina().catch(tratarErroTela); });
}

async function telaFormularioChamado(id) {
    const editando = id !== undefined;
    carregando("Carregando formulário…");
    const [clientes, categorias, tecnicos, atual] = await Promise.all([
        ler("/clientes"), ler("/categorias"), ler("/tecnicos"),
        editando ? ler(`/chamados/${id}`) : Promise.resolve(null)
    ]);
    titulo(editando ? "Editar chamado" : "Abrir chamado");

    if (atual && atual.status === "FECHADO") {
        avisar("Chamado fechado não pode ser alterado", "erro");
        return ir(`/chamados/${id}`);
    }
    if (!clientes.length || !categorias.length) {
        conteudo.innerHTML = `
            <a class="voltar" href="#/chamados">← Voltar</a>
            <div class="vazio">
                <h2>Falta cadastro para abrir chamados</h2>
                <p>Todo chamado precisa de um cliente e de uma categoria.
                   ${!clientes.length ? "Ainda não há clientes." : ""} ${!categorias.length ? "Ainda não há categorias." : ""}</p>
                <div class="acoes" style="justify-content:center">
                    ${!clientes.length ? '<a class="botao principal" href="#/clientes/novo">Cadastrar cliente</a>' : ""}
                    ${!categorias.length ? '<a class="botao principal" href="#/categorias/nova">Cadastrar categoria</a>' : ""}
                </div>
            </div>`;
        return;
    }

    const valores = atual
        ? { ...atual, clienteId: atual.clienteId, categoriaId: atual.categoriaId, tecnicoId: atual.tecnicoId ?? "" }
        : { clienteId: clientePreSelecionado };
    clientePreSelecionado = "";

    formulario({
        cabecalho: editando ? `Editar chamado ${numero(id)}` : "Abrir chamado",
        subtitulo: editando ? "O status muda pelas ações do chamado, não por aqui." : "O chamado nasce com status Aberto e a data de hoje.",
        voltar: editando ? `#/chamados/${id}` : "#/chamados",
        valores,
        textoBotao: editando ? "Salvar alterações" : "Abrir chamado",
        campos: [
            { nome: "titulo", rotulo: "Título", placeholder: "Ex.: Impressora do financeiro não imprime" },
            { nome: "descricao", rotulo: "Descrição", tipo: "textarea" },
            { nome: "prioridade", rotulo: "Prioridade", tipo: "select", opcoes: opcoesEnum("prioridade") },
            { nome: "clienteId", rotulo: "Cliente", tipo: "select", numero: true, opcoes: opcoesLista(clientes), vazio: "Selecione o cliente" },
            { nome: "categoriaId", rotulo: "Categoria", tipo: "select", numero: true, opcoes: opcoesLista(categorias), vazio: "Selecione a categoria" },
            { nome: "tecnicoId", rotulo: "Técnico", tipo: "select", numero: true, opcional: true, vazio: "Sem técnico por enquanto",
              opcoes: tecnicos.map(t => ({ valor: String(t.id), texto: `${t.nome} (${ROTULOS.perfil[t.perfil]})` })) }
        ],
        enviar: corpo => editando ? api("PUT", `/chamados/${id}`, corpo) : api("POST", "/chamados", corpo),
        sucesso: c => { avisar(editando ? "Alterações salvas" : `Chamado ${numero(c.id)} aberto`); ir(`/chamados/${c.id}`); }
    });
}

async function telaDetalheChamado(id) {
    carregando("Carregando chamado…");
    const [c, tecnicos] = await Promise.all([ler(`/chamados/${id}`), ler("/tecnicos")]);
    const fechado = c.status === "FECHADO";
    titulo(`${numero(c.id)} ${c.titulo}`);

    conteudo.innerHTML = `
        <a class="voltar" href="#/chamados">← Voltar para chamados</a>
        <div class="cabecalho">
            <div>
                <h1>${esc(c.titulo)}</h1>
                <div class="etiquetas">${chip("status", c.status)} ${chip("prioridade", c.prioridade)}</div>
            </div>
            <div class="acoes">
                ${fechado ? "" : `<a class="botao" href="#/chamados/${c.id}/editar">Editar</a>`}
                <button class="botao perigo" type="button" id="excluir">Excluir</button>
            </div>
        </div>

        <div class="detalhe-grade">
            <div class="ficha larga">
                <span class="canhoto-numero">${numero(c.id)}</span>
                <dl>
                    <dt>Cliente</dt><dd><a href="#/clientes/${c.clienteId}">${esc(c.clienteNome)}</a></dd>
                    <dt>Categoria</dt><dd>${esc(c.categoriaNome)}</dd>
                    <dt>Técnico</dt><dd>${c.tecnicoNome ? esc(c.tecnicoNome) : "Ninguém atribuído"}</dd>
                    <dt>Aberto em</dt><dd>${quando(c.dataAbertura)}</dd>
                    <dt>Fechado em</dt><dd>${quando(c.dataFechamento)}</dd>
                    <dt>Descrição</dt><dd class="descricao">${esc(c.descricao)}</dd>
                </dl>
            </div>

            <section class="quadro" aria-labelledby="t-acoes">
                <h2 id="t-acoes">Andamento</h2>
                ${fechado ? `<p class="travado">Chamado fechado em ${quando(c.dataFechamento)}. Ele não pode mais ser alterado nem receber comentários.</p>` : `
                <div>
                    <p class="etapa" style="margin-bottom:.5rem">Mudar status para</p>
                    <div class="acoes-status">
                        ${c.proximosStatus.map(s => `
                            <button class="botao pequeno ${s === "FECHADO" ? "perigo" : ""}" type="button" data-status="${s}">
                                ${s === "FECHADO" ? "Fechar chamado" : ROTULOS.status[s]}
                            </button>`).join("")}
                    </div>
                </div>
                <div>
                    <label class="etapa" for="sel-tecnico" style="display:block;margin-bottom:.5rem">${c.tecnicoNome ? "Trocar técnico" : "Atribuir técnico"}</label>
                    ${tecnicos.length ? `
                    <div class="linha-atribuir">
                        <select class="entrada" id="sel-tecnico">
                            <option value="">Selecione</option>
                            ${tecnicos.map(t => `<option value="${t.id}" ${t.id === c.tecnicoId ? "selected" : ""}>${esc(t.nome)} (${ROTULOS.perfil[t.perfil]})</option>`).join("")}
                        </select>
                        <button class="botao" type="button" id="atribuir">Atribuir</button>
                    </div>` : `<p class="travado">Nenhum técnico cadastrado. <a href="#/tecnicos/novo">Cadastrar técnico</a></p>`}
                </div>`}
            </section>
        </div>

        <section class="secao" aria-labelledby="t-hist">
            <h2 id="t-hist">Comentários (${c.comentarios.length})</h2>
            <div class="quadro">
                ${c.comentarios.length ? `<ul class="historico">${c.comentarios.map(m => `
                    <li><small>${esc(m.autor)} · ${quando(m.data)}</small><p>${esc(m.texto)}</p></li>`).join("")}</ul>`
                    : `<p class="etapa">Nenhum comentário ainda.</p>`}
                ${fechado ? "" : `
                <form id="form-comentario" novalidate style="display:grid;gap:1rem;max-width:36rem">
                    <div class="alerta" id="alerta" role="alert"></div>
                    <div class="campo" data-campo="autor">
                        <label for="autor">Autor</label>
                        <input class="entrada" id="autor" name="autor">
                        <span class="campo-erro"></span>
                    </div>
                    <div class="campo" data-campo="texto">
                        <label for="texto">Comentário</label>
                        <textarea class="entrada" id="texto" name="texto"></textarea>
                        <span class="campo-erro"></span>
                    </div>
                    <div><button class="botao principal" type="submit">Adicionar comentário</button></div>
                </form>`}
            </div>
        </section>`;

    const recarregar = () => telaDetalheChamado(id).catch(tratarErroTela);

    document.getElementById("excluir").addEventListener("click", () => excluir({
        url: `/chamados/${c.id}`,
        tituloDialogo: `Excluir o chamado ${numero(c.id)}?`,
        texto: `"${c.titulo}" e os comentários dele serão removidos. Essa ação não pode ser desfeita.`,
        botao: "Excluir chamado",
        feito: "Chamado excluído",
        depois: () => ir("/chamados")
    }));

    conteudo.querySelectorAll("[data-status]").forEach(b => b.addEventListener("click", async () => {
        const novo = b.dataset.status;
        if (novo === "FECHADO" && !await confirmar({
            tituloDialogo: `Fechar o chamado ${numero(c.id)}?`,
            texto: "Depois de fechado, o chamado não pode mais ser alterado nem receber comentários.",
            botao: "Fechar chamado"
        })) return;
        const r = await api("PATCH", `/chamados/${c.id}/status`, { status: novo });
        if (r.ok) { avisar(`Status alterado para ${ROTULOS.status[novo]}`); recarregar(); }
        else avisar(r.dados?.erro || "Não foi possível mudar o status", "erro");
    }));

    document.getElementById("atribuir")?.addEventListener("click", async () => {
        const tecnicoId = Number(document.getElementById("sel-tecnico").value);
        if (!tecnicoId) return avisar("Selecione um técnico", "erro");
        const r = await api("PATCH", `/chamados/${c.id}/atribuir`, { tecnicoId });
        if (r.ok) { avisar(`Técnico ${r.dados.tecnicoNome} atribuído`); recarregar(); }
        else avisar(r.dados?.erro || "Não foi possível atribuir o técnico", "erro");
    });

    document.getElementById("form-comentario")?.addEventListener("submit", async e => {
        e.preventDefault();
        limparErros();
        const f = e.target;
        const r = await api("POST", `/chamados/${c.id}/comentarios`,
            { autor: f.autor.value.trim(), texto: f.texto.value.trim() });
        if (r.ok) { avisar("Comentário adicionado"); recarregar(); }
        else mostrarErros(r);
    });
}

/* ==========================================================
   CLIENTES
   ========================================================== */

async function telaClientes() {
    titulo("Clientes");
    carregando("Carregando clientes…");
    const clientes = await ler("/clientes");

    conteudo.innerHTML = `
        <div class="cabecalho">
            <div><h1>Clientes</h1><p>Quem abre chamados no sistema.</p></div>
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
            <p>Cadastre o primeiro cliente para começar a abrir chamados.</p>
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
                        <button class="botao pequeno perigo" type="button" data-excluir="${c.id}" data-nome="${esc(c.nome)}">Excluir</button>
                    </div>
                </li>`).join("")
            : `<li class="vazio"><p>Nenhum cliente encontrado para “${esc(busca.value)}”.</p></li>`;
    };
    busca.addEventListener("input", desenhar);
    document.getElementById("lista").addEventListener("click", e => {
        const b = e.target.closest("[data-excluir]");
        if (b) excluirCliente(b.dataset.excluir, b.dataset.nome, () => telaClientes().catch(tratarErroTela));
    });
    desenhar();
}

function excluirCliente(id, nome, depois) {
    return excluir({
        url: `/clientes/${id}`,
        tituloDialogo: "Excluir cliente?",
        texto: `O cadastro ${numero(id)} de ${nome} será removido. Clientes com chamados não podem ser excluídos.`,
        botao: "Excluir cliente",
        feito: "Cliente excluído",
        depois
    });
}

async function telaDetalheCliente(id) {
    carregando("Carregando cliente…");
    const [c, chamados] = await Promise.all([ler(`/clientes/${id}`), ler(`/clientes/${id}/chamados?size=50`)]);
    titulo(c.nome);

    conteudo.innerHTML = `
        <a class="voltar" href="#/clientes">← Voltar para clientes</a>
        <div class="cabecalho">
            <div><h1>${esc(c.nome)}</h1></div>
            <div class="acoes">
                <a class="botao" href="#/clientes/${c.id}/editar">Editar</a>
                <button class="botao perigo" type="button" id="excluir">Excluir</button>
            </div>
        </div>
        <div class="ficha">
            <span class="canhoto-numero">${numero(c.id)}</span>
            <dl>
                <dt>Nome</dt><dd>${esc(c.nome)}</dd>
                <dt>E-mail</dt><dd>${esc(c.email)}</dd>
                <dt>Telefone</dt><dd>${c.telefone ? esc(c.telefone) : "Não informado"}</dd>
            </dl>
        </div>
        <section class="secao" aria-labelledby="t-cham">
            <div class="cabecalho" style="margin-bottom:.9rem">
                <h2 id="t-cham">Chamados do cliente (${chamados.totalElementos})</h2>
                <button class="botao principal" type="button" id="abrir">Abrir chamado para ${esc(c.nome)}</button>
            </div>
            ${listaChamados(chamados.conteudo, "Este cliente ainda não abriu chamados.")}
        </section>`;

    document.getElementById("excluir").addEventListener("click", () =>
        excluirCliente(c.id, c.nome, () => ir("/clientes")));
    document.getElementById("abrir").addEventListener("click", () => {
        clientePreSelecionado = String(c.id);
        ir("/chamados/novo");
    });
}

async function telaFormularioCliente(id) {
    const editando = id !== undefined;
    const atual = editando ? await ler(`/clientes/${id}`) : {};
    titulo(editando ? "Editar cliente" : "Novo cliente");
    formulario({
        cabecalho: editando ? "Editar cliente" : "Novo cliente",
        subtitulo: editando ? `Alterando o cadastro ${numero(id)}.` : "Preencha os dados de quem vai abrir chamados.",
        voltar: editando ? `#/clientes/${id}` : "#/clientes",
        valores: atual,
        textoBotao: editando ? "Salvar alterações" : "Cadastrar cliente",
        campoConflito: "email",
        campos: [
            { nome: "nome", rotulo: "Nome" },
            { nome: "email", rotulo: "E-mail", tipo: "email" },
            { nome: "telefone", rotulo: "Telefone", tipo: "tel", opcional: true, placeholder: "47999999999" }
        ],
        enviar: corpo => editando ? api("PUT", `/clientes/${id}`, corpo) : api("POST", "/clientes", corpo),
        sucesso: c => { avisar(editando ? "Alterações salvas" : "Cliente cadastrado"); ir(`/clientes/${c.id}`); }
    });
}

/* ==========================================================
   CATEGORIAS E TÉCNICOS (listas em tabela)
   ========================================================== */

function tabela({ colunas, linhas }) {
    return `
        <div class="tabela-moldura">
            <table class="tabela">
                <thead><tr>${colunas.map(c => `<th scope="col">${c}</th>`).join("")}<th><span class="dica">Ações</span></th></tr></thead>
                <tbody>${linhas.join("")}</tbody>
            </table>
        </div>`;
}

async function telaCategorias() {
    titulo("Categorias");
    carregando("Carregando categorias…");
    const categorias = await ler("/categorias");
    conteudo.innerHTML = `
        <div class="cabecalho">
            <div><h1>Categorias</h1><p>Tipos de problema usados para organizar os chamados.</p></div>
            <a class="botao principal" href="#/categorias/nova">Cadastrar categoria</a>
        </div>
        ${categorias.length ? tabela({
            colunas: ["Nome", "Descrição"],
            linhas: categorias.map(c => `
                <tr>
                    <td><b>${esc(c.nome)}</b></td>
                    <td class="suave">${c.descricao ? esc(c.descricao) : "—"}</td>
                    <td class="acoes-celula">
                        <a class="botao pequeno" href="#/categorias/${c.id}/editar">Editar</a>
                        <button class="botao pequeno perigo" type="button" data-excluir="${c.id}" data-nome="${esc(c.nome)}">Excluir</button>
                    </td>
                </tr>`)
        }) : `<div class="vazio"><h2>Nenhuma categoria cadastrada</h2>
                <p>Crie categorias como Rede, Hardware ou Acesso para classificar os chamados.</p>
                <a class="botao principal" href="#/categorias/nova">Cadastrar categoria</a></div>`}`;

    conteudo.querySelectorAll("[data-excluir]").forEach(b => b.addEventListener("click", () => excluir({
        url: `/categorias/${b.dataset.excluir}`,
        tituloDialogo: "Excluir categoria?",
        texto: `A categoria ${b.dataset.nome} será removida. Categorias usadas em chamados não podem ser excluídas.`,
        botao: "Excluir categoria",
        feito: "Categoria excluída",
        depois: () => telaCategorias().catch(tratarErroTela)
    })));
}

async function telaFormularioCategoria(id) {
    const editando = id !== undefined;
    const atual = editando ? await ler(`/categorias/${id}`) : {};
    titulo(editando ? "Editar categoria" : "Nova categoria");
    formulario({
        cabecalho: editando ? "Editar categoria" : "Nova categoria",
        voltar: "#/categorias",
        valores: atual,
        textoBotao: editando ? "Salvar alterações" : "Cadastrar categoria",
        campoConflito: "nome",
        campos: [
            { nome: "nome", rotulo: "Nome", placeholder: "Ex.: Rede" },
            { nome: "descricao", rotulo: "Descrição", tipo: "textarea", opcional: true }
        ],
        enviar: corpo => editando ? api("PUT", `/categorias/${id}`, corpo) : api("POST", "/categorias", corpo),
        sucesso: () => { avisar(editando ? "Alterações salvas" : "Categoria cadastrada"); ir("/categorias"); }
    });
}

async function telaTecnicos() {
    titulo("Técnicos");
    carregando("Carregando técnicos…");
    const tecnicos = await ler("/tecnicos");
    conteudo.innerHTML = `
        <div class="cabecalho">
            <div><h1>Técnicos</h1><p>Quem atende os chamados.</p></div>
            <a class="botao principal" href="#/tecnicos/novo">Cadastrar técnico</a>
        </div>
        ${tecnicos.length ? tabela({
            colunas: ["Nome", "E-mail", "Perfil"],
            linhas: tecnicos.map(t => `
                <tr>
                    <td><b>${esc(t.nome)}</b></td>
                    <td class="suave">${esc(t.email)}</td>
                    <td>${chip("perfil", t.perfil)}</td>
                    <td class="acoes-celula">
                        <a class="botao pequeno" href="#/tecnicos/${t.id}/editar">Editar</a>
                        <button class="botao pequeno perigo" type="button" data-excluir="${t.id}" data-nome="${esc(t.nome)}">Excluir</button>
                    </td>
                </tr>`)
        }) : `<div class="vazio"><h2>Nenhum técnico cadastrado</h2>
                <p>Cadastre quem vai atender os chamados.</p>
                <a class="botao principal" href="#/tecnicos/novo">Cadastrar técnico</a></div>`}`;

    conteudo.querySelectorAll("[data-excluir]").forEach(b => b.addEventListener("click", () => excluir({
        url: `/tecnicos/${b.dataset.excluir}`,
        tituloDialogo: "Excluir técnico?",
        texto: `${b.dataset.nome} será removido. Técnicos com chamados atribuídos não podem ser excluídos.`,
        botao: "Excluir técnico",
        feito: "Técnico excluído",
        depois: () => telaTecnicos().catch(tratarErroTela)
    })));
}

async function telaFormularioTecnico(id) {
    const editando = id !== undefined;
    const atual = editando ? await ler(`/tecnicos/${id}`) : {};
    titulo(editando ? "Editar técnico" : "Novo técnico");
    formulario({
        cabecalho: editando ? "Editar técnico" : "Novo técnico",
        voltar: "#/tecnicos",
        valores: atual,
        textoBotao: editando ? "Salvar alterações" : "Cadastrar técnico",
        campoConflito: "email",
        campos: [
            { nome: "nome", rotulo: "Nome" },
            { nome: "email", rotulo: "E-mail", tipo: "email" },
            { nome: "perfil", rotulo: "Perfil", tipo: "select", opcoes: opcoesEnum("perfil") }
        ],
        enviar: corpo => editando ? api("PUT", `/tecnicos/${id}`, corpo) : api("POST", "/tecnicos", corpo),
        sucesso: () => { avisar(editando ? "Alterações salvas" : "Técnico cadastrado"); ir("/tecnicos"); }
    });
}

/* ==========================================================
   ERROS E ROTAS
   ========================================================== */

function telaNaoEncontrado(mensagem) {
    titulo("Não encontrado");
    conteudo.innerHTML = `
        <div class="vazio">
            <h2>${esc(mensagem || "Página não encontrada")}</h2>
            <p>O endereço pode estar errado ou o cadastro foi excluído.</p>
            <a class="botao principal" href="#/">Ir para o painel</a>
        </div>`;
}

function telaSemConexao() {
    titulo("Sem conexão");
    conteudo.innerHTML = `
        <div class="cabecalho"><div><h1>Sem conexão com a API</h1>
        <p>Não foi possível falar com o servidor. Confira se a aplicação está rodando
        (<code>.\\mvnw spring-boot:run</code>) e tente de novo.</p></div></div>
        <button class="botao principal" type="button" onclick="location.reload()">Tentar de novo</button>`;
}

function tratarErroTela(e) {
    if (e.message === "CONEXAO") return telaSemConexao();
    if (e.status === 404) return telaNaoEncontrado(e.message);
    titulo("Erro");
    conteudo.innerHTML = `<div class="vazio"><h2>Algo deu errado</h2><p>${esc(e.message)}</p>
        <a class="botao principal" href="#/">Ir para o painel</a></div>`;
}

const rotas = [
    { padrao: /^\/?$/,                         menu: "painel",     tela: () => telaPainel() },
    { padrao: /^\/chamados$/,                  menu: "chamados",   tela: () => telaChamados() },
    { padrao: /^\/chamados\/novo$/,            menu: "chamados",   tela: () => telaFormularioChamado() },
    { padrao: /^\/chamados\/(\d+)$/,           menu: "chamados",   tela: m => telaDetalheChamado(m[1]) },
    { padrao: /^\/chamados\/(\d+)\/editar$/,   menu: "chamados",   tela: m => telaFormularioChamado(m[1]) },
    { padrao: /^\/clientes$/,                  menu: "clientes",   tela: () => telaClientes() },
    { padrao: /^\/clientes\/novo$/,            menu: "clientes",   tela: () => telaFormularioCliente() },
    { padrao: /^\/clientes\/(\d+)$/,           menu: "clientes",   tela: m => telaDetalheCliente(m[1]) },
    { padrao: /^\/clientes\/(\d+)\/editar$/,   menu: "clientes",   tela: m => telaFormularioCliente(m[1]) },
    { padrao: /^\/categorias$/,                menu: "categorias", tela: () => telaCategorias() },
    { padrao: /^\/categorias\/nova$/,          menu: "categorias", tela: () => telaFormularioCategoria() },
    { padrao: /^\/categorias\/(\d+)\/editar$/, menu: "categorias", tela: m => telaFormularioCategoria(m[1]) },
    { padrao: /^\/tecnicos$/,                  menu: "tecnicos",   tela: () => telaTecnicos() },
    { padrao: /^\/tecnicos\/novo$/,            menu: "tecnicos",   tela: () => telaFormularioTecnico() },
    { padrao: /^\/tecnicos\/(\d+)\/editar$/,   menu: "tecnicos",   tela: m => telaFormularioTecnico(m[1]) }
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
        tratarErroTela(e);
    }
    // leva o foco do teclado para a nova tela (exceto quando um campo já recebeu foco)
    if (!conteudo.contains(document.activeElement)) conteudo.focus({ preventScroll: true });
    window.scrollTo(0, 0);
}

window.addEventListener("hashchange", navegar);
navegar();
