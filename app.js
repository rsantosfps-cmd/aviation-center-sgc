/*======================================================
    AVIATION CENTER SGC
    app.js
    Versão 1.0
======================================================*/

document.addEventListener("DOMContentLoaded", iniciarSistema);

/*======================================================
    INICIALIZAÇÃO
======================================================*/

function iniciarSistema(){

    iniciarMenu();

    iniciarModais();

    carregarDashboard();

    console.log("Aviation Center iniciado.");

}

/*======================================================
    MENU LATERAL
======================================================*/

function iniciarMenu(){

    const botoes=document.querySelectorAll(".menu-item");

    const paginas=document.querySelectorAll(".page");

    botoes.forEach(botao=>{

        botao.addEventListener("click",()=>{

            botoes.forEach(btn=>btn.classList.remove("active"));

            paginas.forEach(pg=>pg.classList.remove("active-page"));

            botao.classList.add("active");

            const pagina=document.getElementById(
                botao.dataset.page
            );

            if(pagina){

                pagina.classList.add("active-page");

            }

        });

    });

}

/*======================================================
    MODAIS
======================================================*/

function abrirModal(id){

    const modal=document.getElementById(id);

    if(modal){

        modal.classList.add("show");

    }

}

function fecharModal(id){

    const modal=document.getElementById(id);

    if(modal){

        modal.classList.remove("show");

    }

}

function iniciarModais(){

    /* Instrumentos */

    conectarModal(

        "btnNovoInstrumentoCadastro",

        "modalInstrumento",

        "fecharModal",

        "cancelarInstrumento"

    );

    /* Clientes */

    conectarModal(

        "btnNovoCliente",

        "modalCliente",

        "fecharModalCliente",

        "cancelarCliente"

    );

    /* Aeronaves */

    conectarModal(

        "btnNovaAeronave",

        "modalAeronave",

        "fecharModalAeronave",

        "cancelarAeronave"

    );

    /* Equipamentos */

    conectarModal(

        "btnNovoEquipamento",

        "modalEquipamento",

        "fecharModalEquipamento",

        "cancelarEquipamento"

    );

}

function conectarModal(

    botaoAbrir,

    modal,

    fechar,

    cancelar

){

    const abrir=document.getElementById(botaoAbrir);

    const fecharBtn=document.getElementById(fechar);

    const cancelarBtn=document.getElementById(cancelar);

    if(abrir){

        abrir.onclick=()=>abrirModal(modal);

    }

    if(fecharBtn){

        fecharBtn.onclick=()=>fecharModal(modal);

    }

    if(cancelarBtn){

        cancelarBtn.onclick=()=>fecharModal(modal);

    }

}

/*======================================================
    DASHBOARD
======================================================*/

function carregarDashboard(){

    atualizarCard(

        "totalInstrumentos",

        obterLista("instrumentos").length

    );

}

function atualizarCard(id,valor){

    const elemento=document.getElementById(id);

    if(elemento){

        elemento.textContent=valor;

    }

}

/*======================================================
    LOCAL STORAGE
======================================================*/

function obterLista(chave){

    return JSON.parse(

        localStorage.getItem(chave)

    ) || [];

}

function salvarLista(chave,dados){

    localStorage.setItem(

        chave,

        JSON.stringify(dados)

    );

}

/*======================================================
    UTILITÁRIOS
======================================================*/

function gerarID(prefixo){

    return prefixo+"-"+Date.now();

}

function limparFormulario(form){

    form.querySelectorAll("input").forEach(input=>{

        input.value="";

    });

    form.querySelectorAll("textarea").forEach(text=>{

        text.value="";

    });

    form.querySelectorAll("select").forEach(select=>{

        select.selectedIndex=0;

    });

}

/*======================================================
    FIM DA PARTE 1
======================================================*/
/*======================================================
    CRUD - INSTRUMENTOS
======================================================*/

let instrumentos = obterLista("instrumentos");

let instrumentoEditando = null;

document.addEventListener("DOMContentLoaded",()=>{

    iniciarInstrumentos();

});

function iniciarInstrumentos(){

    atualizarTabelaInstrumentos();

    const salvar=document.getElementById("salvarInstrumento");

    if(salvar){

        salvar.onclick=salvarInstrumento;

    }

    const pesquisa=document.getElementById("pesquisaInstrumento");

    if(pesquisa){

        pesquisa.addEventListener("keyup",filtrarInstrumentos);

    }

}

function salvarInstrumento(){

    const instrumento={

        id:

        document.getElementById("idInterno").value ||

        gerarID("INS"),

        nome:

        document.getElementById("nomeInstrumento").value,

        fabricante:

        document.getElementById("fabricante").value,

        modelo:

        document.getElementById("modeloInstrumento").value,

        pn:

        document.getElementById("partNumber").value,

        sn:

        document.getElementById("serialNumber").value,

        prefixo:

        document.getElementById("prefixoInstrumento").value,

        cliente:

        document.getElementById("clienteInstrumento").value,

        ultima:

        document.getElementById("ultimaCalibracao").value,

        proxima:

        document.getElementById("proximaCalibracao").value,

        status:

        document.getElementById("statusInstrumento").value,

        localizacao:

        document.getElementById("localizacao").value,

        observacoes:

        document.getElementById("observacoesInstrumento").value

    };

    if(instrumento.nome===""){

        alert("Informe o nome do instrumento.");

        return;

    }

    if(instrumentoEditando!==null){

        instrumentos[instrumentoEditando]=instrumento;

        instrumentoEditando=null;

    }else{

        instrumentos.push(instrumento);

    }

    salvarLista("instrumentos",instrumentos);

    atualizarTabelaInstrumentos();

    carregarDashboard();

    fecharModal("modalInstrumento");

}

function atualizarTabelaInstrumentos(){

    const tbody=document.getElementById("listaInstrumentos");

    if(!tbody) return;

    tbody.innerHTML="";

    if(instrumentos.length===0){

        tbody.innerHTML=`
        <tr>
        <td colspan="12">
        Nenhum instrumento cadastrado.
        </td>
        </tr>
        `;

        return;

    }

    instrumentos.forEach((item,index)=>{

        tbody.innerHTML+=`

<tr>

<td>${item.id}</td>

<td>${item.nome}</td>

<td>${item.fabricante}</td>

<td>${item.modelo}</td>

<td>${item.pn}</td>

<td>${item.sn}</td>

<td>${item.prefixo}</td>

<td>${item.cliente}</td>

<td>${formatarData(item.ultima)}</td>

<td>${formatarData(item.proxima)}</td>

<td>

<span class="${classeStatus(item.status)}">

${item.status}

</span>

</td>

<td>

<button onclick="editarInstrumento(${index})">

✏️

</button>

<button onclick="excluirInstrumento(${index})">

🗑️

</button>

</td>

</tr>

`;

    });

}

function editarInstrumento(index){

    instrumentoEditando=index;

    const i=instrumentos[index];

    document.getElementById("idInterno").value=i.id;
    document.getElementById("nomeInstrumento").value=i.nome;
    document.getElementById("fabricante").value=i.fabricante;
    document.getElementById("modeloInstrumento").value=i.modelo;
    document.getElementById("partNumber").value=i.pn;
    document.getElementById("serialNumber").value=i.sn;
    document.getElementById("prefixoInstrumento").value=i.prefixo;
    document.getElementById("clienteInstrumento").value=i.cliente;
    document.getElementById("ultimaCalibracao").value=i.ultima;
    document.getElementById("proximaCalibracao").value=i.proxima;
    document.getElementById("statusInstrumento").value=i.status;
    document.getElementById("localizacao").value=i.localizacao;
    document.getElementById("observacoesInstrumento").value=i.observacoes;

    abrirModal("modalInstrumento");

}

function excluirInstrumento(index){

    if(!confirm("Excluir este instrumento?")) return;

    instrumentos.splice(index,1);

    salvarLista("instrumentos",instrumentos);

    atualizarTabelaInstrumentos();

    carregarDashboard();

}

function filtrarInstrumentos(){

    const texto=this.value.toLowerCase();

    const linhas=document.querySelectorAll("#listaInstrumentos tr");

    linhas.forEach(linha=>{

        linha.style.display=

        linha.innerText.toLowerCase().includes(texto)

        ? ""

        : "none";

    });

}

function formatarData(data){

    if(!data) return "-";

    return new Date(data).toLocaleDateString("pt-BR");

}

function classeStatus(status){

    switch(status){

        case "Em dia":

            return "status-ok";

        case "Próximo do vencimento":

            return "status-warning";

        case "Vencido":

            return "status-danger";

        default:

            return "";

    }

}
/*======================================================
    CRUD - CLIENTES
======================================================*/

let clientes = obterLista("clientes");

let clienteEditando = null;

document.addEventListener("DOMContentLoaded",()=>{

    iniciarClientes();

});

function iniciarClientes(){

    atualizarTabelaClientes();

    atualizarSelectClientes();

    const salvar=document.getElementById("salvarCliente");

    if(salvar){

        salvar.onclick=salvarCliente;

    }

    const pesquisa=document.getElementById("pesquisaCliente");

    if(pesquisa){

        pesquisa.addEventListener("keyup",filtrarClientes);

    }

}

function salvarCliente(){

    const cliente={

        id:document.getElementById("idCliente").value || gerarID("CLI"),

        nome:document.getElementById("nomeCliente").value,

        contato:document.getElementById("contatoCliente").value,

        telefone:document.getElementById("telefoneCliente").value,

        email:document.getElementById("emailCliente").value,

        cidade:document.getElementById("cidadeCliente").value,

        estado:document.getElementById("estadoCliente").value,

        observacoes:document.getElementById("observacoesCliente").value

    };

    if(cliente.nome===""){

        alert("Informe o nome do cliente.");

        return;

    }

    if(clienteEditando!==null){

        clientes[clienteEditando]=cliente;

        clienteEditando=null;

    }else{

        clientes.push(cliente);

    }

    salvarLista("clientes",clientes);

    atualizarTabelaClientes();

    atualizarSelectClientes();

    fecharModal("modalCliente");

}

function atualizarTabelaClientes(){

    const tbody=document.getElementById("listaClientes");

    if(!tbody) return;

    tbody.innerHTML="";

    if(clientes.length===0){

        tbody.innerHTML=`
        <tr>
            <td colspan="7">
                Nenhum cliente cadastrado.
            </td>
        </tr>
        `;

        return;

    }

    clientes.forEach((cliente,index)=>{

        tbody.innerHTML+=`

<tr>

<td>${cliente.id}</td>

<td>${cliente.nome}</td>

<td>${cliente.contato}</td>

<td>${cliente.telefone}</td>

<td>${cliente.email}</td>

<td>${cliente.cidade}/${cliente.estado}</td>

<td>

<button onclick="editarCliente(${index})">

✏️

</button>

<button onclick="excluirCliente(${index})">

🗑️

</button>

</td>

</tr>

`;

    });

}

function editarCliente(index){

    clienteEditando=index;

    const c=clientes[index];

    document.getElementById("idCliente").value=c.id;
    document.getElementById("nomeCliente").value=c.nome;
    document.getElementById("contatoCliente").value=c.contato;
    document.getElementById("telefoneCliente").value=c.telefone;
    document.getElementById("emailCliente").value=c.email;
    document.getElementById("cidadeCliente").value=c.cidade;
    document.getElementById("estadoCliente").value=c.estado;
    document.getElementById("observacoesCliente").value=c.observacoes;

    abrirModal("modalCliente");

}

function excluirCliente(index){

    if(!confirm("Deseja excluir este cliente?")) return;

    clientes.splice(index,1);

    salvarLista("clientes",clientes);

    atualizarTabelaClientes();

    atualizarSelectClientes();

}

function filtrarClientes(){

    const texto=this.value.toLowerCase();

    const linhas=document.querySelectorAll("#listaClientes tr");

    linhas.forEach(linha=>{

        linha.style.display=

        linha.innerText.toLowerCase().includes(texto)

        ? ""

        : "none";

    });

}

function atualizarSelectClientes(){

    const selects=[

        document.getElementById("clienteInstrumento"),

        document.getElementById("clienteHistorico")

    ];

    selects.forEach(select=>{

        if(!select) return;

        const valorAtual=select.value;

        select.innerHTML='<option value="">Selecione</option>';

        clientes.forEach(cliente=>{

            select.innerHTML+=`

<option value="${cliente.nome}">

${cliente.nome}

</option>

`;

        });

        select.value=valorAtual;

    });

}
/*======================================================
    CRUD - AERONAVES
======================================================*/

let aeronaves = obterLista("aeronaves");
let aeronaveEditando = null;

document.addEventListener("DOMContentLoaded", () => {
    iniciarAeronaves();
});

function iniciarAeronaves(){

    atualizarTabelaAeronaves();

    atualizarSelectAeronaves();

    const salvar = document.getElementById("salvarAeronave");

    if(salvar){
        salvar.onclick = salvarAeronave;
    }

    const pesquisa = document.getElementById("pesquisaAeronave");

    if(pesquisa){
        pesquisa.addEventListener("keyup", filtrarAeronaves);
    }

}

function salvarAeronave(){

    const aeronave={

        id: gerarID("AER"),

        prefixo: document.getElementById("prefixoAeronave").value,

        fabricante: document.getElementById("fabricanteAeronave").value,

        modelo: document.getElementById("modeloAeronave").value,

        msn: document.getElementById("msnAeronave").value,

        operador: document.getElementById("operadorAeronave").value,

        tipo: document.getElementById("tipoAeronave").value,

        ano: document.getElementById("anoFabricacao").value,

        horas: document.getElementById("horasTotais").value,

        motor: document.getElementById("motorAeronave").value,

        registro: document.getElementById("registroAnac").value,

        base: document.getElementById("baseOperacional").value,

        status: document.getElementById("statusAeronave").value,

        observacoes: document.getElementById("obsAeronave").value

    };

    if(aeronave.prefixo===""){
        alert("Informe o prefixo.");
        return;
    }

    if(aeronaveEditando!==null){

        aeronaves[aeronaveEditando]=aeronave;
        aeronaveEditando=null;

    }else{

        aeronaves.push(aeronave);

    }

    salvarLista("aeronaves",aeronaves);

    atualizarTabelaAeronaves();

    atualizarSelectAeronaves();

    fecharModal("modalAeronave");

}

function atualizarTabelaAeronaves(){

    const tbody=document.getElementById("listaAeronaves");

    if(!tbody) return;

    tbody.innerHTML="";

    if(aeronaves.length===0){

        tbody.innerHTML=`
        <tr>
            <td colspan="8">
                Nenhuma aeronave cadastrada.
            </td>
        </tr>
        `;

        return;

    }

    aeronaves.forEach((item,index)=>{

        tbody.innerHTML+=`

<tr>

<td>${item.prefixo}</td>

<td>${item.fabricante}</td>

<td>${item.modelo}</td>

<td>${item.msn}</td>

<td>${item.operador}</td>

<td>${item.horas}</td>

<td>

<span class="${classeStatusAeronave(item.status)}">

${item.status}

</span>

</td>

<td>

<button onclick="editarAeronave(${index})">

✏️

</button>

<button onclick="excluirAeronave(${index})">

🗑️

</button>

</td>

</tr>

`;

    });

}

function editarAeronave(index){

    aeronaveEditando=index;

    const a=aeronaves[index];

    document.getElementById("prefixoAeronave").value=a.prefixo;
    document.getElementById("fabricanteAeronave").value=a.fabricante;
    document.getElementById("modeloAeronave").value=a.modelo;
    document.getElementById("msnAeronave").value=a.msn;
    document.getElementById("operadorAeronave").value=a.operador;
    document.getElementById("tipoAeronave").value=a.tipo;
    document.getElementById("anoFabricacao").value=a.ano;
    document.getElementById("horasTotais").value=a.horas;
    document.getElementById("motorAeronave").value=a.motor;
    document.getElementById("registroAnac").value=a.registro;
    document.getElementById("baseOperacional").value=a.base;
    document.getElementById("statusAeronave").value=a.status;
    document.getElementById("obsAeronave").value=a.observacoes;

    abrirModal("modalAeronave");

}

function excluirAeronave(index){

    if(!confirm("Deseja excluir esta aeronave?")) return;

    aeronaves.splice(index,1);

    salvarLista("aeronaves",aeronaves);

    atualizarTabelaAeronaves();

    atualizarSelectAeronaves();

}

function filtrarAeronaves(){

    const texto=this.value.toLowerCase();

    const linhas=document.querySelectorAll("#listaAeronaves tr");

    linhas.forEach(linha=>{

        linha.style.display=

        linha.innerText.toLowerCase().includes(texto)

        ? ""

        : "none";

    });

}

function atualizarSelectAeronaves(){

    const selects=[

        document.getElementById("aeronaveHistorico")

    ];

    selects.forEach(select=>{

        if(!select) return;

        const atual=select.value;

        select.innerHTML='<option value="">Selecione</option>';

        aeronaves.forEach(a=>{

            select.innerHTML+=`

<option value="${a.prefixo}">

${a.prefixo} - ${a.modelo}

</option>

`;

        });

        select.value=atual;

    });

}

function classeStatusAeronave(status){

    switch(status){

        case "Operacional":

            return "status-ok";

/*======================================================
    CRUD - EQUIPAMENTOS PADRÃO
======================================================*/

let equipamentos = obterLista("equipamentos");
let equipamentoEditando = null;

document.addEventListener("DOMContentLoaded", () => {
    iniciarEquipamentos();
});

function iniciarEquipamentos(){

    atualizarTabelaEquipamentos();

    atualizarDashboardEquipamentos();

    const salvar = document.getElementById("salvarEquipamento");

    if(salvar){
        salvar.onclick = salvarEquipamento;
    }

    const pesquisa = document.getElementById("pesquisaEquipamento");

    if(pesquisa){
        pesquisa.addEventListener("keyup", filtrarEquipamentos);
    }

}

function salvarEquipamento(){

    const equipamento={

        id: equipamentoEditando !== null
            ? equipamentos[equipamentoEditando].id
            : gerarID("EQP"),

        nome: document.getElementById("nomeEquipamento").value.trim(),

        fabricante: document.getElementById("fabricanteEquipamento").value.trim(),

        modelo: document.getElementById("modeloEquipamento").value.trim(),

        serie: document.getElementById("serieEquipamento").value.trim(),

        patrimonio: document.getElementById("patrimonioEquipamento").value.trim(),

        certificado: document.getElementById("certificadoEquipamento").value.trim(),

        laboratorio: document.getElementById("laboratorioEquipamento").value.trim(),

        ultima: document.getElementById("ultimaCalEquipamento").value,

        proxima: document.getElementById("proximaCalEquipamento").value,

        status: calcularStatusEquipamento(
            document.getElementById("proximaCalEquipamento").value
        ),

        observacoes: document.getElementById("obsEquipamento").value

    };

    if(equipamento.nome===""){

        alert("Informe o nome do equipamento.");

        return;

    }

    if(equipamentoEditando!==null){

        equipamentos[equipamentoEditando]=equipamento;

        equipamentoEditando=null;

    }else{

        equipamentos.push(equipamento);

    }

    salvarLista("equipamentos",equipamentos);

    atualizarTabelaEquipamentos();

    atualizarDashboardEquipamentos();

    fecharModal("modalEquipamento");

}

function atualizarTabelaEquipamentos(){

    const tbody=document.getElementById("listaEquipamentos");

    if(!tbody) return;

    tbody.innerHTML="";

    if(equipamentos.length===0){

        tbody.innerHTML=`
        <tr>
            <td colspan="9">
                Nenhum equipamento cadastrado.
            </td>
        </tr>
        `;

        return;

    }

    equipamentos.forEach((eq,index)=>{

        tbody.innerHTML+=`

<tr>

<td>${eq.nome}</td>

<td>${eq.fabricante}</td>

<td>${eq.modelo}</td>

<td>${eq.serie}</td>

<td>${eq.certificado}</td>

<td>${formatarData(eq.ultima)}</td>

<td>${formatarData(eq.proxima)}</td>

<td>

<span class="${classeStatus(eq.status)}">

${eq.status}

</span>

</td>

<td>

<button onclick="editarEquipamento(${index})">

✏️

</button>

<button onclick="excluirEquipamento(${index})">

🗑️

</button>

</td>

</tr>

`;

    });

}

function editarEquipamento(index){

    equipamentoEditando=index;

    const eq=equipamentos[index];

    document.getElementById("nomeEquipamento").value=eq.nome;
    document.getElementById("fabricanteEquipamento").value=eq.fabricante;
    document.getElementById("modeloEquipamento").value=eq.modelo;
    document.getElementById("serieEquipamento").value=eq.serie;
    document.getElementById("patrimonioEquipamento").value=eq.patrimonio;
    document.getElementById("certificadoEquipamento").value=eq.certificado;
    document.getElementById("laboratorioEquipamento").value=eq.laboratorio;
    document.getElementById("ultimaCalEquipamento").value=eq.ultima;
    document.getElementById("proximaCalEquipamento").value=eq.proxima;
    document.getElementById("obsEquipamento").value=eq.observacoes;

    abrirModal("modalEquipamento");

}

function excluirEquipamento(index){

    if(!confirm("Excluir este equipamento?")) return;

    equipamentos.splice(index,1);

    salvarLista("equipamentos",equipamentos);

    atualizarTabelaEquipamentos();

    atualizarDashboardEquipamentos();

}

function filtrarEquipamentos(){

    const texto=this.value.toLowerCase();

    document.querySelectorAll("#listaEquipamentos tr").forEach(linha=>{

        linha.style.display=

        linha.innerText.toLowerCase().includes(texto)

        ? ""

        : "none";

    });

}

function calcularStatusEquipamento(data){

    if(!data) return "Sem calibração";

    const hoje=new Date();

    const validade=new Date(data);

    const dias=Math.ceil((validade-hoje)/(1000*60*60*24));

    if(dias<0) return "Vencido";

    if(dias<=30) return "Próximo do vencimento";

    return "Em dia";

}

function atualizarDashboardEquipamentos(){

    atualizarCard("totalEquipamentos",equipamentos.length);

    atualizarCard(

        "equipamentosOk",

        equipamentos.filter(e=>e.status==="Em dia").length

    );

    atualizarCard(

        "equipamentosVencendo",

        equipamentos.filter(e=>e.status==="Próximo do vencimento").length

    );

    atualizarCard(

        "equipamentosVencidos",

        equipamentos.filter(e=>e.status==="Vencido").length

    );

}        case "Em manutenção":

            return "status-warning";

        case "Inativo":

            return "status-danger";

        default:

            return "";

    }

}
/*======================================================
    SESSÕES DE CALIBRAÇÃO
======================================================*/

let sessoes = obterLista("sessoes");
let sessaoAtual = null;

document.addEventListener("DOMContentLoaded", () => {
    iniciarSessoes();
});

function iniciarSessoes(){

    atualizarListasSessoes();

    atualizarResumoSessao();

    const salvarRascunho = document.getElementById("salvarRascunho");
    const finalizar = document.getElementById("finalizarSessao");

    if(salvarRascunho){
        salvarRascunho.onclick = () => salvarSessao(false);
    }

    if(finalizar){
        finalizar.onclick = () => salvarSessao(true);
    }

    /* Atualiza resumo em tempo real */
    ["os","cliente","aeronave","prefixo","tecnico"]
    .forEach(id => {
        const campo = document.getElementById(id);
        if(campo){
            campo.addEventListener("input", atualizarResumoSessao);
        }
    });

}

/*======================================================
    RESUMO LATERAL
======================================================*/

function atualizarResumoSessao(){

    definirTexto("rOS", valorCampo("os"));
    definirTexto("rCliente", valorCampo("cliente"));
    definirTexto("rAeronave", valorCampo("aeronave"));
    definirTexto("rPrefixo", valorCampo("prefixo"));
    definirTexto("rTecnico", valorCampo("tecnico"));

}

function valorCampo(id){
    const campo = document.getElementById(id);
    return campo && campo.value ? campo.value : "---";
}

function definirTexto(id, valor){
    const el = document.getElementById(id);
    if(el) el.textContent = valor;
}

/*======================================================
    SALVAR SESSÃO
======================================================*/

function salvarSessao(finalizada=false){

    const equipamentoSelecionado =
        document.getElementById("equipamentoPadrao")?.value || "";

    /* Verifica equipamento vencido */
    const equipamento = equipamentos.find(e => e.nome === equipamentoSelecionado);

    if(equipamento && equipamento.status === "Vencido"){

        alert(
            "O equipamento padrão selecionado está com a calibração vencida."
        );

        return;

    }

    const sessao = {

        id: sessaoAtual || gerarID("SES"),

        os: valorCampo("os"),

        data: document.getElementById("data")?.value || "",

        cliente: valorCampo("cliente"),

        aeronave: valorCampo("aeronave"),

        modelo: valorCampo("modelo"),

        prefixo: valorCampo("prefixo"),

        tecnico: valorCampo("tecnico"),

        equipamento: equipamentoSelecionado,

        instrumentos: instrumentos.map(i => i.id),

        status: finalizada ? "Finalizada" : "Em andamento",

        criadoEm: new Date().toISOString()

    };

    const indice = sessoes.findIndex(s => s.id === sessao.id);

    if(indice >= 0){

        sessoes[indice] = sessao;

    }else{

        sessoes.push(sessao);

    }

    salvarLista("sessoes", sessoes);

    sessaoAtual = sessao.id;

    atualizarListasSessoes();

    atualizarDashboardSessoes();

    atualizarHistorico();

    alert(finalizada
        ? "Sessão finalizada com sucesso."
        : "Rascunho salvo com sucesso."
    );

}

/*======================================================
    LISTAS
======================================================*/

function atualizarListasSessoes(){

    preencherTabelaSessoes(
        "listaEmAndamento",
        sessoes.filter(s => s.status === "Em andamento")
    );

    preencherTabelaSessoes(
        "listaFinalizadas",
        sessoes.filter(s => s.status === "Finalizada")
    );

}

function preencherTabelaSessoes(id, lista){

    const tbody = document.getElementById(id);

    if(!tbody) return;

    tbody.innerHTML = "";

    if(lista.length === 0){

        tbody.innerHTML = `
        <tr>
            <td colspan="4">Nenhuma sessão encontrada.</td>
        </tr>`;

        return;

    }

    lista.forEach(sessao => {

        tbody.innerHTML += `
        <tr>
            <td>${sessao.os}</td>
            <td>${sessao.cliente}</td>
            <td>${sessao.prefixo}</td>
            <td>
                <span class="${classeStatusSessao(sessao.status)}">
                    ${sessao.status}
                </span>
            </td>
        </tr>`;

    });

}

function classeStatusSessao(status){

    return status === "Finalizada"
        ? "status-ok"
        : "status-warning";

}

/*======================================================
    DASHBOARD
======================================================*/

function atualizarDashboardSessoes(){

    atualizarCard(
        "dashboardSessoes",
        sessoes.filter(s => s.status === "Em andamento").length
    );

    atualizarCard(
        "dashboardFinalizadas",
        sessoes.filter(s => s.status === "Finalizada").length
    );

}

/*======================================================
    HISTÓRICO
======================================================*/

function atualizarHistorico(){

    const tbody = document.getElementById("listaHistorico");

    if(!tbody) return;

    tbody.innerHTML = "";

    if(sessoes.length === 0){

        tbody.innerHTML = `
        <tr>
            <td colspan="9">
                Nenhuma sessão registrada.
            </td>
        </tr>`;

        return;

    }

    sessoes.forEach(sessao => {

        tbody.innerHTML += `
        <tr>
            <td>${sessao.os}</td>
            <td>${formatarData(sessao.data)}</td>
            <td>${sessao.cliente}</td>
            <td>${sessao.prefixo}</td>
            <td>${sessao.aeronave}</td>
            <td>${sessao.tecnico}</td>
            <td>${sessao.instrumentos.length}</td>
            <td>
                <span class="${classeStatusSessao(sessao.status)}">
                    ${sessao.status}
                </span>
            </td>
            <td>
                <button onclick="abrirSessao('${sessao.id}')">
                    📂
                </button>
            </td>
        </tr>`;

    });

}

/*======================================================
    ABRIR SESSÃO
======================================================*/

function abrirSessao(id){

    const sessao = sessoes.find(s => s.id === id);

    if(!sessao) return;

    sessaoAtual = sessao.id;

    document.getElementById("os").value = sessao.os;
    document.getElementById("data").value = sessao.data;
    document.getElementById("cliente").value = sessao.cliente;
    document.getElementById("aeronave").value = sessao.aeronave;
    document.getElementById("modelo").value = sessao.modelo;
    document.getElementById("prefixo").value = sessao.prefixo;
    document.getElementById("tecnico").value = sessao.tecnico;

    atualizarResumoSessao();

    document.querySelectorAll(".page").forEach(p => {
        p.classList.remove("active-page");
    });

    document.getElementById("sessao").classList.add("active-page");

}

