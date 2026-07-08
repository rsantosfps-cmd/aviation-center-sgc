// ===================================================
// AVIATION CENTER SGC
// app.js - Sprint 2
// ===================================================

console.clear();
console.log("Aviation Center SGC iniciado.");

document.addEventListener("DOMContentLoaded", iniciarSistema);

function iniciarSistema() {

    configurarMenu();

    configurarPesquisa();

    configurarBotaoNovo();

}

// ===========================================
// MENU
// ===========================================

function configurarMenu() {

    const menus = document.querySelectorAll(".sidebar li");

    menus.forEach(item => {

        item.addEventListener("click", function () {

            menus.forEach(menu => {

                menu.classList.remove("active");

            });

            this.classList.add("active");

            abrirModulo(this.innerText);

        });

    });

}

// ===========================================
// MÓDULOS
// ===========================================

function abrirModulo(nome) {

    nome = nome.toLowerCase();

    if (nome.includes("dashboard")) {

        console.log("Dashboard aberto");

    }

    else if (nome.includes("instrumentos")) {

        console.log("Instrumentos aberto");

        alert("Sprint 3\n\nCadastro de Instrumentos será aberto aqui.");

    }

    else if (nome.includes("sess")) {

        alert("Módulo Sessões");

    }

    else if (nome.includes("aeronaves")) {

        alert("Módulo Aeronaves");

    }

    else if (nome.includes("clientes")) {

        alert("Módulo Clientes");

    }

    else if (nome.includes("equipamentos")) {

        alert("Módulo Equipamentos");

    }

    else if (nome.includes("hist")) {

        alert("Módulo Histórico");

    }

    else if (nome.includes("auditoria")) {

        alert("Módulo Auditoria");

    }

    else if (nome.includes("relatórios")) {

        alert("Módulo Relatórios");

    }

    else if (nome.includes("config")) {

        alert("Configurações");

    }

}

// ===========================================
// PESQUISA
// ===========================================

function configurarPesquisa() {

    const campo = document.querySelector("input");

    if (!campo) return;

    campo.addEventListener("keyup", function () {

        console.log("Pesquisar:", this.value);

    });

}

// ===========================================
// BOTÃO NOVO INSTRUMENTO
// ===========================================

function configurarBotaoNovo() {

    const botao = document.querySelector("button");

    if (!botao) return;

    botao.addEventListener("click", novoInstrumento);

}

function novoInstrumento() {

    alert(
        "Novo Instrumento\n\n" +
        "Esta função será implementada no Sprint 3."
    );

}

// ===========================================
// DASHBOARD
// ===========================================

function atualizarDashboard() {

    console.log("Dashboard atualizado.");

}

// ===========================================
// LOG
// ===========================================

console.log("app.js carregado com sucesso.");
