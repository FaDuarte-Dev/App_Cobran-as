document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface
    const checklistContainer = document.getElementById('checklist-container');
    const searchBox = document.querySelector('.search-box');
    const totalCount = document.getElementById('total-count');
    const paidCount = document.getElementById('paid-count');
    const pendingCount = document.getElementById('pending-count');
    const relatorioMensal = document.getElementById('relatorio-mensal');
    const relatorioGeral = document.getElementById('relatorio-geral');
    const btnExtrato = document.getElementById('mostrar-extrato');
    const extratoPagos = document.getElementById('extrato-pagos');
    const btnBaixarExtrato = document.getElementById('baixar-extrato');
    const formCadastro = document.getElementById('form-cadastro');
    const nomeMorador = document.getElementById('nome-morador');
    const aptoMorador = document.getElementById('apto-morador');
    const idMorador = document.getElementById('id-morador');
    const cadastroMsg = document.getElementById('cadastro-msg');
    const cobrancasTabs = document.getElementById('cobrancas-tabs');
    const nomeCobranca = document.getElementById('nome-cobranca');
    const valorCobranca = document.getElementById('valor-cobranca');
    const btnAddCobranca = document.getElementById('add-cobranca');

    // Dados
    let moradores = [];
    let cobrancas = [];
    let cobrancaAtiva = null;

    // Carregar moradores do Local Storage
    if (localStorage.getItem('moradores')) {
        moradores = JSON.parse(localStorage.getItem('moradores'));
    } else {
        for (let i = 1; i <= 5; i++) {
            moradores.push({
                id: i,
                name: `Morador ${i}`,
                apartment: `Bloco 1, Apt 10${i}`
            });
        }
    }

    // Carregar cobranças do Local Storage (ou vazio)
    if (localStorage.getItem('cobrancas')) {
        cobrancas = JSON.parse(localStorage.getItem('cobrancas'));
    } else {
        cobrancas = [];
    }
    if (localStorage.getItem('cobrancaAtiva')) {
        cobrancaAtiva = parseInt(localStorage.getItem('cobrancaAtiva'));
    } else {
        cobrancaAtiva = cobrancas.length > 0 ? cobrancas[0].id : null;
    }

    function salvarDados() {
        localStorage.setItem('moradores', JSON.stringify(moradores));
        localStorage.setItem('cobrancas', JSON.stringify(cobrancas));
        localStorage.setItem('cobrancaAtiva', cobrancaAtiva);
    }

    // Abas de cobranças
    function renderCobrancasTabs() {
        cobrancasTabs.innerHTML = '';
        cobrancas.forEach(cob => {
            const tab = document.createElement('div');
            tab.className = 'cobranca-tab' + (cob.id === cobrancaAtiva ? ' active' : '');
            tab.textContent = cob.nome;
            tab.title = `Valor: R$ ${cob.valor.toFixed(2)}`;
            tab.onclick = () => {
                cobrancaAtiva = cob.id;
                salvarDados();
                renderCobrancasTabs();
                renderPeopleList();
                renderRelatorioGeral();
            };
            // Permite apagar qualquer cobrança, mesmo se for a última
            const delBtn = document.createElement('button');
            delBtn.className = 'del-cobranca';
            delBtn.innerHTML = '×';
            delBtn.title = 'Apagar cobrança';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm('Deseja apagar esta cobrança?')) {
                    cobrancas = cobrancas.filter(c => c.id !== cob.id);
                    cobrancaAtiva = cobrancas.length > 0 ? cobrancas[0].id : null;
                    salvarDados();
                    renderCobrancasTabs();
                    renderPeopleList();
                    renderRelatorioGeral();
                }
            };
            tab.appendChild(delBtn);
            cobrancasTabs.appendChild(tab);
        });
    }

    // Nova cobrança
    btnAddCobranca.addEventListener('click', function() {
        const nome = nomeCobranca.value.trim();
        const valor = parseFloat(valorCobranca.value);
        if (!nome || isNaN(valor) || valor <= 0) {
            alert('Preencha o nome e valor da cobrança!');
            return;
        }
        const novoId = cobrancas.length > 0 ? Math.max(...cobrancas.map(c => c.id)) + 1 : 1;
        cobrancas.push({
            id: novoId,
            nome,
            valor,
            pagamentos: moradores.map(m => ({moradorId: m.id, pago: false}))
        });
        cobrancaAtiva = novoId;
        nomeCobranca.value = '';
        valorCobranca.value = '';
        salvarDados();
        renderCobrancasTabs();
        renderPeopleList();
        renderRelatorioGeral();
    });

    // Cadastro/edição de morador
    formCadastro.addEventListener('submit', function(e) {
        e.preventDefault();
        const nome = nomeMorador.value.trim();
        const apto = aptoMorador.value.trim();
        if (!nome || !apto) {
            cadastroMsg.textContent = "Preencha todos os campos!";
            cadastroMsg.style.color = "red";
            return;
        }
        if (idMorador.value) {
            // Editar
            const id = parseInt(idMorador.value);
            const morador = moradores.find(m => m.id === id);
            if (morador) {
                morador.name = nome;
                morador.apartment = apto;
            }
            cadastroMsg.textContent = "Morador editado com sucesso!";
        } else {
            // Novo
            const novoId = moradores.length > 0 ? Math.max(...moradores.map(m => m.id)) + 1 : 1;
            moradores.push({
                id: novoId,
                name: nome,
                apartment: apto
            });
            cobrancas.forEach(cob => {
                cob.pagamentos.push({moradorId: novoId, pago: false});
            });
            cadastroMsg.textContent = "Morador cadastrado com sucesso!";
        }
        cadastroMsg.style.color = "green";
        nomeMorador.value = "";
        aptoMorador.value = "";
        idMorador.value = "";
        salvarDados();
        renderPeopleList();
        renderRelatorioGeral();
        setTimeout(() => cadastroMsg.textContent = "", 2000);
    });

    // Lista de moradores para a cobrança ativa
    function renderPeopleList() {
        checklistContainer.innerHTML = '';
        const cobranca = cobrancas.find(c => c.id === cobrancaAtiva);
        if (!cobranca) {
            updateStats();
            return;
        }
        let lista = moradores.slice();
        const termo = searchBox.value.toLowerCase();
        if (termo) {
            lista = lista.filter(person =>
                person.name.toLowerCase().includes(termo) ||
                person.apartment.toLowerCase().includes(termo)
            );
        }
        lista.forEach(person => {
            const pagamento = cobranca.pagamentos.find(p => p.moradorId === person.id);
            const personCard = document.createElement('div');
            personCard.className = `person-card ${pagamento && pagamento.pago ? 'paid' : ''}`;
            personCard.innerHTML = `
                <div class="checkbox-container">
                    <input type="checkbox" id="person-${person.id}" ${pagamento && pagamento.pago ? 'checked' : ''} data-id="${person.id}">
                    <span class="checkmark"></span>
                </div>
                <div class="person-info">
                    <div class="person-name">${person.name}</div>
                    <div class="person-apartment">${person.apartment}</div>
                </div>
                <button class="confirm-btn" data-id="${person.id}" disabled>Confirmar</button>
                <button class="edit-btn" data-id="${person.id}">Editar</button>
                <button class="delete-btn" data-id="${person.id}">Apagar</button>
            `;
            checklistContainer.appendChild(personCard);

            const checkbox = personCard.querySelector('input[type="checkbox"]');
            const confirmBtn = personCard.querySelector('.confirm-btn');
            let originalChecked = pagamento && pagamento.pago;

            checkbox.addEventListener('change', function() {
                confirmBtn.disabled = (checkbox.checked === originalChecked);
            });

            confirmBtn.addEventListener('click', function() {
                if (pagamento) {
                    pagamento.pago = checkbox.checked;
                    originalChecked = checkbox.checked;
                    personCard.classList.toggle('paid', pagamento.pago);
                    confirmBtn.disabled = true;
                    salvarDados();
                    updateStats();
                    renderRelatorioGeral();
                }
            });

            // Editar morador
            personCard.querySelector('.edit-btn').addEventListener('click', function() {
                nomeMorador.value = person.name;
                aptoMorador.value = person.apartment;
                idMorador.value = person.id;
                nomeMorador.focus();
            });

            // Apagar morador
            personCard.querySelector('.delete-btn').addEventListener('click', function() {
                if (confirm("Deseja realmente apagar este morador?")) {
                    moradores = moradores.filter(m => m.id !== person.id);
                    cobrancas.forEach(cob => {
                        cob.pagamentos = cob.pagamentos.filter(p => p.moradorId !== person.id);
                    });
                    salvarDados();
                    renderPeopleList();
                    updateStats();
                    renderRelatorioGeral();
                }
            });
        });
        updateStats();
    }

    // Estatísticas e relatório mensal
    function updateStats() {
        const cobranca = cobrancas.find(c => c.id === cobrancaAtiva);
        if (!cobranca) {
            totalCount.textContent = moradores.length;
            paidCount.textContent = 0;
            pendingCount.textContent = 0;
            relatorioMensal.innerHTML = `<div><strong>Nenhuma cobrança selecionada.</strong></div>`;
            return;
        }
        const total = moradores.length;
        const pagos = cobranca.pagamentos.filter(p => p.pago).length;
        const pendentes = total - pagos;
        totalCount.textContent = total;
        paidCount.textContent = pagos;
        pendingCount.textContent = pendentes;
        const arrecadado = pagos * cobranca.valor;
        const pendente = pendentes * cobranca.valor;
        relatorioMensal.innerHTML = `
            <div><strong>Relatório da Cobrança:</strong> ${cobranca.nome}</div>
            <div>Valor unitário: <strong>R$ ${cobranca.valor.toFixed(2)}</strong></div>
            <div>Total arrecadado: <span style="color:green">R$ ${arrecadado.toFixed(2)}</span></div>
            <div>Total pendente: <span style="color:red">R$ ${pendente.toFixed(2)}</span></div>
        `;
    }

    // Relatório geral de todas as cobranças
    function renderRelatorioGeral() {
        let totalArrecadado = 0;
        let totalPendente = 0;
        let totalPagos = 0;
        let totalPendentes = 0;
        let totalCobrancas = cobrancas.length;

        cobrancas.forEach(cob => {
            const pagos = cob.pagamentos.filter(p => p.pago).length;
            const pendentes = cob.pagamentos.length - pagos;
            totalPagos += pagos;
            totalPendentes += pendentes;
            totalArrecadado += pagos * cob.valor;
            totalPendente += pendentes * cob.valor;
        });

        relatorioGeral.innerHTML = `
            <div><strong>Relatório Geral</strong></div>
            <div>Total de cobranças: <strong>${totalCobrancas}</strong></div>
            <div>Total de pagamentos: <strong>${totalPagos}</strong></div>
            <div>Total pendências: <strong>${totalPendentes}</strong></div>
            <div>Total arrecadado: <span style="color:green">R$ ${totalArrecadado.toFixed(2)}</span></div>
            <div>Total pendente: <span style="color:red">R$ ${totalPendente.toFixed(2)}</span></div>
        `;
    }

    // Busca
    searchBox.addEventListener('input', function() {
        renderPeopleList();
    });

    // Extrato de pagamentos
    btnExtrato.addEventListener('click', function() {
        const cobranca = cobrancas.find(c => c.id === cobrancaAtiva);
        if (!cobranca) return;
        const pagos = cobranca.pagamentos.filter(p => p.pago);
        if (pagos.length === 0) {
            extratoPagos.innerHTML = "<em>Nenhum pagamento registrado.</em>";
        } else {
            let total = pagos.length * cobranca.valor;
            extratoPagos.innerHTML = `
                <h3>Extrato de Pagamentos</h3>
                <ul>
                    ${pagos.map(p => {
                        const morador = moradores.find(m => m.id === p.moradorId);
                        return `<li>${morador ? morador.name : 'Desconhecido'} (${morador ? morador.apartment : ''}) - R$ ${cobranca.valor.toFixed(2)}</li>`;
                    }).join('')}
                </ul>
                <strong>Total recebido: R$ ${total.toFixed(2)}</strong>
            `;
        }
        extratoPagos.style.display = extratoPagos.style.display === "none" ? "block" : "none";
    });

    // Baixar extrato em TXT
    btnBaixarExtrato.addEventListener('click', function() {
        const cobranca = cobrancas.find(c => c.id === cobrancaAtiva);
        if (!cobranca) return;
        const pagos = cobranca.pagamentos.filter(p => p.pago);
        let txt = `Extrato de Pagamentos - ${cobranca.nome}\n\n`;
        if (pagos.length === 0) {
            txt += "Nenhum pagamento registrado.\n";
        } else {
            pagos.forEach(p => {
                const morador = moradores.find(m => m.id === p.moradorId);
                txt += `${morador ? morador.name : 'Desconhecido'} (${morador ? morador.apartment : ''}) - R$ ${cobranca.valor.toFixed(2)}\n`;
            });
            txt += `\nTotal recebido: R$ ${(pagos.length * cobranca.valor).toFixed(2)}\n`;
        }
        const blob = new Blob([txt], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `extrato_${cobranca.nome ? cobranca.nome.replace(/\s+/g,'_') : 'cobranca'}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Inicialização
    renderCobrancasTabs();
    renderPeopleList();
    renderRelatorioGeral();
    // ...código existente...

// Extrato geral de todas as cobranças
function mostrarExtratoGeral() {
    if (cobrancas.length === 0) {
        extratoPagos.innerHTML = "<em>Nenhuma cobrança cadastrada.</em>";
        extratoPagos.style.display = "block";
        return;
    }
    let txt = `<h3>Extrato Geral de Pagamentos</h3>`;
    let totalRecebido = 0;
    let totalCobrado = 0;
    cobrancas.forEach(cob => {
        const pagos = cob.pagamentos.filter(p => p.pago);
        const valorRecebido = pagos.length * cob.valor;
        const valorCobrado = cob.pagamentos.length * cob.valor;
        totalRecebido += valorRecebido;
        totalCobrado += valorCobrado;
        txt += `<div style="margin-top:10px"><strong>${cob.nome}</strong> (R$ ${cob.valor.toFixed(2)}):<ul>`;
        if (pagos.length === 0) {
            txt += `<li><em>Nenhum pagamento registrado.</em></li>`;
        } else {
            txt += pagos.map(p => {
                const morador = moradores.find(m => m.id === p.moradorId);
                return `<li>${morador ? morador.name : 'Desconhecido'} (${morador ? morador.apartment : ''}) - R$ ${cob.valor.toFixed(2)}</li>`;
            }).join('');
        }
        txt += `</ul>`;
        txt += `<div><strong>Total recebido:</strong> R$ ${valorRecebido.toFixed(2)} / <strong>Total cobrado:</strong> R$ ${valorCobrado.toFixed(2)}</div></div>`;
    });
    txt += `<div style="margin-top:15px"><strong>Total geral recebido:</strong> R$ ${totalRecebido.toFixed(2)}<br><strong>Total geral cobrado:</strong> R$ ${totalCobrado.toFixed(2)}</div>`;
    extratoPagos.innerHTML = txt;
    extratoPagos.style.display = "block";
}

// Botão para mostrar extrato geral
const btnExtratoGeral = document.createElement('button');
btnExtratoGeral.textContent = "Mostrar Extrato Geral";
btnExtratoGeral.style.marginTop = "10px";
btnExtratoGeral.onclick = function() {
    mostrarExtratoGeral();
};
relatorioGeral.parentNode.insertBefore(btnExtratoGeral, relatorioGeral.nextSibling);

// ...código existente...

// Função para gerar e baixar o extrato geral em TXT
function baixarExtratoGeral() {
    if (cobrancas.length === 0) {
        alert("Nenhuma cobrança cadastrada.");
        return;
    }
    let txt = `Extrato Geral de Pagamentos\n\n`;
    let totalRecebido = 0;
    let totalCobrado = 0;
    cobrancas.forEach(cob => {
        const pagos = cob.pagamentos.filter(p => p.pago);
        const valorRecebido = pagos.length * cob.valor;
        const valorCobrado = cob.pagamentos.length * cob.valor;
        totalRecebido += valorRecebido;
        totalCobrado += valorCobrado;
        txt += `${cob.nome} (R$ ${cob.valor.toFixed(2)}):\n`;
        if (pagos.length === 0) {
            txt += "  Nenhum pagamento registrado.\n";
        } else {
            pagos.forEach(p => {
                const morador = moradores.find(m => m.id === p.moradorId);
                txt += `  ${morador ? morador.name : 'Desconhecido'} (${morador ? morador.apartment : ''}) - R$ ${cob.valor.toFixed(2)}\n`;
            });
        }
        txt += `  Total recebido: R$ ${valorRecebido.toFixed(2)} / Total cobrado: R$ ${valorCobrado.toFixed(2)}\n\n`;
    });
    txt += `Total geral recebido: R$ ${totalRecebido.toFixed(2)}\nTotal geral cobrado: R$ ${totalCobrado.toFixed(2)}\n`;

    const blob = new Blob([txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "extrato_geral.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Botão para baixar extrato geral
const btnBaixarExtratoGeral = document.createElement('button');
btnBaixarExtratoGeral.textContent = "Baixar Extrato Geral (.txt)";
btnBaixarExtratoGeral.style.marginTop = "10px";
btnBaixarExtratoGeral.onclick = function() {
    baixarExtratoGeral();
};
relatorioGeral.parentNode.insertBefore(btnBaixarExtratoGeral, relatorioGeral.nextSibling.nextSibling);

// ...restante do código...
});