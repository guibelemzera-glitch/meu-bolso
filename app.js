// =============================================================
// REGISTRO E ATUALIZAÇÃO DO SERVICE WORKER (PWA)
// =============================================================
if ('serviceWorker' in navigator) {
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:';
  if (isLocal) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => reg.unregister());
    });
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then(reg => reg.update()).catch(() => {});
    });
  }
}

function atualizarIcones() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// =============================================================
// GERENCIAMENTO DE MÚLTIPLAS CONTAS, LOGIN E EXCLUSÃO
// =============================================================
const telaLogin = document.getElementById('tela-login');
const telaApp = document.getElementById('tela-app');
const formLogin = document.getElementById('form-login');
const formRegistro = document.getElementById('form-registro');
const btnAlternar = document.getElementById('btn-alternar-modo');
const statusLogin = document.getElementById('status-login');
const nomeUsuarioLogado = document.getElementById('nome-usuario-logado');

let modoRegistro = false;
let usuarioAtivo = null;

function obterContasCadastradas() {
  try {
    const raw = localStorage.getItem('meubolso_contas');
    const lista = raw ? JSON.parse(raw) : [];
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    return [];
  }
}

function salvarContasCadastradas(listaContas) {
  localStorage.setItem('meubolso_contas', JSON.stringify(listaContas));
  renderizarAtalhosContasSalvas();
}

function chaveUsuario(prefixo) {
  const userAtual = usuarioAtivo || 'padrao';
  const userKey = userAtual.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `${prefixo}_${userKey}`;
}

function renderizarAtalhosContasSalvas() {
  let containerAtalhos = document.getElementById('lista-contas-salvas-login');
  if (!containerAtalhos && formLogin) {
    containerAtalhos = document.createElement('div');
    containerAtalhos.id = 'lista-contas-salvas-login';
    containerAtalhos.className = 'box-contas-salvas';
    formLogin.parentNode.insertBefore(containerAtalhos, formLogin.nextSibling);
  }
  if (!containerAtalhos) return;

  const contas = obterContasCadastradas();
  if (contas.length === 0 || modoRegistro) {
    containerAtalhos.style.display = 'none';
    containerAtalhos.innerHTML = '';
    return;
  }

  containerAtalhos.style.display = 'block';
  let html = `<span class="titulo-contas-salvas">Contas salvas neste dispositivo (${contas.length})</span><div class="lista-chips-contas">`;
  contas.forEach(c => {
    html += `
      <div class="chip-conta">
        <button type="button" class="chip-conta-nome" onclick="preencherContaLogin('${c.usuario}')">
          <i data-lucide="user" class="icon-xs"></i>
          ${c.usuario}
        </button>
        <button type="button" class="chip-conta-del" onclick="deletarContaSalva('${c.usuario}')" title="Excluir conta">
          <i data-lucide="x" class="icon-xs"></i>
        </button>
      </div>
    `;
  });
  html += `</div>`;
  containerAtalhos.innerHTML = html;
  atualizarIcones();
}

window.deletarContaSalva = function(usuario) {
  if (!confirm(`Deseja excluir permanentemente a conta "${usuario}" e todos os seus dados financeiros?`)) {
    return;
  }

  const contasAtualizadas = obterContasCadastradas().filter(
    c => c.usuario.trim().toLowerCase() !== usuario.trim().toLowerCase()
  );
  salvarContasCadastradas(contasAtualizadas);

  const userKey = usuario.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  localStorage.removeItem(`meubolso_dados_${userKey}`);
  localStorage.removeItem(`meubolso_salario_${userKey}`);
  localStorage.removeItem(`meubolso_gastos_fixos_${userKey}`);
  localStorage.removeItem(`meubolso_metas_${userKey}`);
  localStorage.removeItem(`meubolso_alerta_config_${userKey}`);

  const campoUser = document.getElementById('login-usuario');
  const campoPass = document.getElementById('login-senha');
  if (campoUser && campoUser.value.trim().toLowerCase() === usuario.trim().toLowerCase()) {
    campoUser.value = '';
    if (campoPass) campoPass.value = '';
  }

  if (statusLogin) {
    statusLogin.style.color = 'var(--primary)';
    statusLogin.innerText = `Conta "${usuario}" removida.`;
  }
};

window.preencherContaLogin = function(usuario) {
  const campoUser = document.getElementById('login-usuario');
  const campoPass = document.getElementById('login-senha');
  if (campoUser) campoUser.value = usuario;
  if (campoPass) {
    campoPass.value = '';
    campoPass.focus();
  }
  if (statusLogin) statusLogin.innerText = '';
};

function alternarTelaAuth(irParaRegistro) {
  modoRegistro = irParaRegistro;
  if (statusLogin) statusLogin.innerText = "";

  if (modoRegistro) {
    formLogin.style.display = 'none';
    formRegistro.style.display = 'block';
    if (btnAlternar) btnAlternar.innerText = "Já tem uma conta? Faça login";
  } else {
    formLogin.style.display = 'block';
    formRegistro.style.display = 'none';
    if (btnAlternar) btnAlternar.innerText = "Não tem conta? Cadastre-se";
  }
  renderizarAtalhosContasSalvas();
}

if (btnAlternar) {
  btnAlternar.addEventListener('click', function(e) {
    e.preventDefault();
    alternarTelaAuth(!modoRegistro);
  });
}

// Submeter Registro
if (formRegistro) {
  formRegistro.addEventListener('submit', function(e) {
    e.preventDefault();
    const usuario = document.getElementById('reg-usuario').value.trim();
    const senha = document.getElementById('reg-senha').value.trim();

    if (!usuario || !senha) {
      alert("Preencha o usuário e a senha.");
      return;
    }

    const contas = obterContasCadastradas();
    const jaExiste = contas.some(c => c.usuario.trim().toLowerCase() === usuario.toLowerCase());

    if (jaExiste) {
      alert(`O usuário "${usuario}" já existe. Escolha outro nome.`);
      return;
    }

    contas.push({
      usuario: usuario,
      senha: senha
    });

    salvarContasCadastradas(contas);

    document.getElementById('reg-usuario').value = "";
    document.getElementById('reg-senha').value = "";
    alternarTelaAuth(false);
    document.getElementById('login-usuario').value = usuario;
    document.getElementById('login-senha').value = "";

    if (statusLogin) {
      statusLogin.style.color = "var(--primary)";
      statusLogin.innerText = `Conta "${usuario}" criada. Digite sua senha para entrar.`;
    }
  });
}

// Submeter Login
if (formLogin) {
  formLogin.addEventListener('submit', function(e) {
    e.preventDefault();
    const usuarioDigitado = document.getElementById('login-usuario').value.trim();
    const senhaDigitada = document.getElementById('login-senha').value.trim();
    const contas = obterContasCadastradas();

    const contaEncontrada = contas.find(
      c => c.usuario.trim().toLowerCase() === usuarioDigitado.toLowerCase() && c.senha === senhaDigitada
    );

    if (contaEncontrada) {
      efetuarLogin(contaEncontrada.usuario);
    } else if (contas.length === 0 && usuarioDigitado === "teste" && senhaDigitada === "1234") {
      efetuarLogin("teste");
    } else {
      if (statusLogin) {
        statusLogin.style.color = "var(--danger)";
        statusLogin.innerText = "Usuário ou senha incorretos.";
      }
    }
  });
}

function efetuarLogin(nome) {
  usuarioAtivo = nome;
  if (nomeUsuarioLogado) nomeUsuarioLogado.innerText = nome;
  if (statusLogin) statusLogin.innerText = "";
  telaLogin.style.display = 'none';
  telaApp.style.display = 'flex';
  ativarAba(abaExtrato, tabExtrato);
  carregarApp();
  atualizarIcones();
}

document.getElementById('btn-logout').addEventListener('click', function() {
  usuarioAtivo = null;
  telaApp.style.display = 'none';
  telaLogin.style.display = 'flex';
  document.getElementById('login-senha').value = '';
  if (statusLogin) statusLogin.innerText = "";
  alternarTelaAuth(false);
});


// =============================================================
// NAVEGAÇÃO ENTRE ABAS
// =============================================================
const abaExtrato = document.getElementById('aba-extrato');
const abaCotacoes = document.getElementById('aba-cotacoes');
const abaGestao = document.getElementById('aba-gestao');
const abaMapa = document.getElementById('aba-mapa');

const tabExtrato = document.getElementById('tab-extrato');
const tabGestao = document.getElementById('tab-gestao');
const tabCotacoes = document.getElementById('tab-cotacoes');
const tabMapa = document.getElementById('tab-mapa');

function ativarAba(abaVisivel, botaoAtivo) {
  [abaExtrato, abaCotacoes, abaGestao, abaMapa].forEach(a => a.style.display = 'none');
  [tabExtrato, tabGestao, tabCotacoes, tabMapa].forEach(b => b.classList.remove('active'));

  abaVisivel.style.display = 'block';
  botaoAtivo.classList.add('active');
}

tabExtrato.addEventListener('click', () => {
  ativarAba(abaExtrato, tabExtrato);
  carregarApp();
});
tabGestao.addEventListener('click', () => {
  ativarAba(abaGestao, tabGestao);
  carregarAnaliseCategoriasEMetas();
});
tabCotacoes.addEventListener('click', () => {
  ativarAba(abaCotacoes, tabCotacoes);
  carregarCotacoesInternacionais();
  carregarGraficoHistoricoMoeda();
});
tabMapa.addEventListener('click', () => {
  ativarAba(abaMapa, tabMapa);
  inicializarOuAtualizarMapa();
});

document.getElementById('btn-atualizar-cotacoes').addEventListener('click', carregarCotacoesInternacionais);


// =============================================================
// ESTADO & DADOS FINANCEIROS (ISOLADOS POR USUÁRIO)
// =============================================================
let saldoOculto = false;
let objetoGpsSalvo = null;
let localizacaoTextoSalvo = "";

const btnToggleSaldo = document.getElementById('btn-toggle-saldo');
const textoSaldo = document.getElementById('texto-saldo');
const textoSalarioBase = document.getElementById('texto-salario-base');
const barraOrcamentoFill = document.getElementById('barra-orcamento-fill');
const textoOrcamentoPct = document.getElementById('texto-orcamento-pct');
const textoOrcamentoInfo = document.getElementById('texto-orcamento-info');

btnToggleSaldo.addEventListener('click', () => {
  saldoOculto = !saldoOculto;
  btnToggleSaldo.innerHTML = `<i data-lucide="${saldoOculto ? 'eye-off' : 'eye'}" class="icon-sm"></i>`;
  atualizarIcones();
  carregarApp();
});

document.getElementById('form-salario').addEventListener('submit', function(e) {
  e.preventDefault();
  const val = parseFloat(document.getElementById('campo-salario').value);
  if (!isNaN(val)) {
    localStorage.setItem(chaveUsuario('meubolso_salario'), val.toString());
    document.getElementById('campo-salario').value = "";
    carregarApp();
  }
});

document.getElementById('btn-ajustar-saldo').addEventListener('click', function() {
  const saldoDesejado = prompt("Digite o valor exato para ajustar seu saldo atual (R$):");
  if (saldoDesejado !== null) {
    const valAlvo = parseFloat(saldoDesejado.replace(',', '.'));
    if (!isNaN(valAlvo)) {
      const extrato = JSON.parse(localStorage.getItem(chaveUsuario('meubolso_dados'))) || [];
      let saldoAtual = 0;
      extrato.forEach(item => {
        saldoAtual += (item.tipo === 'entrada' ? parseFloat(item.valor) : -parseFloat(item.valor));
      });

      const diferenca = valAlvo - saldoAtual;
      if (diferenca !== 0) {
        extrato.push({
          descricao: "Ajuste de saldo",
          valor: Math.abs(diferenca).toFixed(2),
          tipo: diferenca > 0 ? "entrada" : "saida",
          categoria: "Outros",
          data: new Date().toISOString()
        });
        localStorage.setItem(chaveUsuario('meubolso_dados'), JSON.stringify(extrato));
        carregarApp();
      }
    }
  }
});

document.getElementById('btn-zerar-conta').addEventListener('click', function() {
  if (confirm("Deseja apagar todo o histórico e zerar os dados desta conta?")) {
    localStorage.removeItem(chaveUsuario('meubolso_dados'));
    localStorage.removeItem(chaveUsuario('meubolso_salario'));
    localStorage.removeItem(chaveUsuario('meubolso_gastos_fixos'));
    localStorage.removeItem(chaveUsuario('meubolso_metas'));
    carregarApp();
  }
});

function carregarApp() {
  const salarioRef = parseFloat(localStorage.getItem(chaveUsuario('meubolso_salario'))) || 0;
  const extrato = JSON.parse(localStorage.getItem(chaveUsuario('meubolso_dados'))) || [];

  let saldoCalculado = 0;
  let totalGastosMes = 0;

  extrato.sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));

  const grupos = {};

  extrato.forEach(item => {
    const v = parseFloat(item.valor);
    if (item.tipo === 'entrada') {
      saldoCalculado += v;
    } else {
      saldoCalculado -= v;
      totalGastosMes += v;
    }

    const dataObj = item.data ? new Date(item.data) : new Date();
    const chaveData = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    if (!grupos[chaveData]) grupos[chaveData] = [];
    grupos[chaveData].push(item);
  });

  if (saldoOculto) {
    textoSaldo.innerText = "R$ ••••••";
    textoSaldo.style.color = "#ffffff";
  } else {
    textoSaldo.innerText = `R$ ${saldoCalculado.toFixed(2)}`;
    textoSaldo.style.color = saldoCalculado < 0 ? "#fecaca" : "#ffffff";
  }

  textoSalarioBase.innerText = `Renda mensal: R$ ${salarioRef.toFixed(2)}`;

  if (salarioRef > 0) {
    const pct = Math.min(Math.round((totalGastosMes / salarioRef) * 100), 100);
    const pctReal = ((totalGastosMes / salarioRef) * 100).toFixed(0);

    barraOrcamentoFill.style.width = `${pct}%`;
    textoOrcamentoPct.innerText = `${pctReal}%`;
    textoOrcamentoInfo.innerText = `Gastos: R$ ${totalGastosMes.toFixed(2)} de R$ ${salarioRef.toFixed(2)}`;

    barraOrcamentoFill.className = "barra-fill";
    if (pctReal >= 100) {
      barraOrcamentoFill.classList.add("vermelha");
    } else if (pctReal >= 80) {
      barraOrcamentoFill.classList.add("amarela");
    }
  } else {
    barraOrcamentoFill.style.width = "0%";
    textoOrcamentoPct.innerText = "0%";
    textoOrcamentoInfo.innerText = "Defina uma renda mensal acima para acompanhar o limite.";
  }

  const containerExtrato = document.getElementById('container-extrato-agrupado');
  containerExtrato.innerHTML = "";

  if (Object.keys(grupos).length === 0) {
    containerExtrato.innerHTML = `<p class="texto-auxiliar" style="text-align:center; padding:16px 0;">Nenhuma movimentação registrada.</p>`;
    renderizarGastosFixos();
    return;
  }

  Object.keys(grupos).forEach(dataStr => {
    const divGrupo = document.createElement('div');
    divGrupo.className = 'grupo-dia';

    const headerDia = document.createElement('div');
    headerDia.className = 'header-dia';
    headerDia.innerText = dataStr;
    divGrupo.appendChild(headerDia);

    const ul = document.createElement('ul');
    ul.className = 'lista-historico';

    grupos[dataStr].forEach(item => {
      const li = document.createElement('li');
      li.className = item.tipo === 'saida' ? 'despesa' : 'receita';
      
      const v = parseFloat(item.valor);
      const valTexto = saldoOculto ? "R$ •••" : `R$ ${v.toFixed(2)}`;

      li.innerHTML = `
        <div class="info-item">
          <span>${item.descricao}</span>
          <small>${item.categoria || 'Outros'}${item.local ? ' • Local registrado' : ''}</small>
        </div>
        <strong style="font-size: 14px; color: ${item.tipo === 'saida' ? 'var(--danger)' : 'var(--primary)'}">
          ${item.tipo === 'saida' ? '-' : '+'} ${valTexto}
        </strong>
      `;
      ul.appendChild(li);
    });

    divGrupo.appendChild(ul);
    containerExtrato.appendChild(divGrupo);
  });

  renderizarGastosFixos();
}

document.getElementById('formulario').addEventListener('submit', function(e) {
  e.preventDefault();
  const extrato = JSON.parse(localStorage.getItem(chaveUsuario('meubolso_dados'))) || [];

  extrato.push({
    descricao: document.getElementById('campo-descricao').value,
    valor: document.getElementById('campo-valor').value,
    tipo: document.getElementById('campo-tipo').value,
    categoria: document.getElementById('campo-categoria').value,
    local: localizacaoTextoSalvo,
    coords: objetoGpsSalvo,
    data: new Date().toISOString()
  });

  localStorage.setItem(chaveUsuario('meubolso_dados'), JSON.stringify(extrato));
  document.getElementById('formulario').reset();
  localizacaoTextoSalvo = "";
  objetoGpsSalvo = null;
  document.getElementById('status-aviso').innerText = "";
  carregarApp();
});


// =============================================================
// GASTOS FIXOS RECORRENTES
// =============================================================
document.getElementById('form-gasto-fixo').addEventListener('submit', function(e) {
  e.preventDefault();
  const fixos = JSON.parse(localStorage.getItem(chaveUsuario('meubolso_gastos_fixos'))) || [];
  
  fixos.push({
    nome: document.getElementById('fixo-nome').value,
    valor: document.getElementById('fixo-valor').value
  });

  localStorage.setItem(chaveUsuario('meubolso_gastos_fixos'), JSON.stringify(fixos));
  document.getElementById('fixo-nome').value = "";
  document.getElementById('fixo-valor').value = "";
  renderizarGastosFixos();
});

function renderizarGastosFixos() {
  const lista = document.getElementById('lista-gastos-fixos');
  const fixos = JSON.parse(localStorage.getItem(chaveUsuario('meubolso_gastos_fixos'))) || [];
  lista.innerHTML = "";

  if (fixos.length === 0) {
    lista.innerHTML = `<li class="texto-auxiliar">Nenhuma conta fixa cadastrada.</li>`;
    return;
  }

  fixos.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'item-fixo';
    li.innerHTML = `
      <div style="display:flex; flex-direction:column;">
        <strong style="font-size:13px; color:var(--text-main);">${item.nome}</strong>
        <small style="font-size:11px; color:var(--text-sub);">R$ ${parseFloat(item.valor).toFixed(2)} / mês</small>
      </div>
      <button type="button" class="btn-debitar-fixo" onclick="debitarGastoFixo(${index})">Lançar</button>
    `;
    lista.appendChild(li);
  });
}

window.debitarGastoFixo = function(index) {
  const fixos = JSON.parse(localStorage.getItem(chaveUsuario('meubolso_gastos_fixos'))) || [];
  const item = fixos[index];

  if (item) {
    const extrato = JSON.parse(localStorage.getItem(chaveUsuario('meubolso_dados'))) || [];
    extrato.push({
      descricao: `Conta Fixa: ${item.nome}`,
      valor: item.valor,
      tipo: 'saida',
      categoria: 'Moradia',
      data: new Date().toISOString()
    });
    localStorage.setItem(chaveUsuario('meubolso_dados'), JSON.stringify(extrato));
    carregarApp();
  }
};


// =============================================================
// CATEGORIAS, FLUXO FINANCEIRO & METAS DE ECONOMIA (ABA 3)
// =============================================================
let graficoCategoriasInstancia = null;

function carregarAnaliseCategoriasEMetas() {
  const extrato = JSON.parse(localStorage.getItem(chaveUsuario('meubolso_dados'))) || [];
  const salarioRef = parseFloat(localStorage.getItem(chaveUsuario('meubolso_salario'))) || 0;
  const containerCat = document.getElementById('container-categorias');
  const wrapperGrafico = document.getElementById('wrapper-grafico-categorias');
  const canvasCat = document.getElementById('grafico-categorias');

  const elEntradas = document.getElementById('analise-total-entradas');
  const elSaidas = document.getElementById('analise-total-saidas');
  const elEconomia = document.getElementById('analise-taxa-economia');
  const elInsight = document.getElementById('analise-insight-texto');

  const entradas = extrato.filter(item => item.tipo === 'entrada');
  const saidas = extrato.filter(item => item.tipo === 'saida');

  const totalEntradas = entradas.reduce((acc, curr) => acc + parseFloat(curr.valor), 0);
  const totalSaidas = saidas.reduce((acc, curr) => acc + parseFloat(curr.valor), 0);
  const baseRenda = totalEntradas > 0 ? totalEntradas : salarioRef;

  if (elEntradas) elEntradas.innerText = `R$ ${totalEntradas.toFixed(2)}`;
  if (elSaidas) elSaidas.innerText = `R$ ${totalSaidas.toFixed(2)}`;

  if (elEconomia) {
    if (baseRenda > 0) {
      const saldoLiquido = baseRenda - totalSaidas;
      const pctEco = Math.round((saldoLiquido / baseRenda) * 100);
      elEconomia.innerText = `${pctEco}%`;
      elEconomia.style.color = pctEco >= 20 ? 'var(--primary)' : (pctEco >= 0 ? 'var(--warning-color)' : 'var(--danger)');
    } else {
      elEconomia.innerText = '0%';
      elEconomia.style.color = 'var(--text-main)';
    }
  }

  containerCat.innerHTML = "";

  if (totalSaidas === 0) {
    if (wrapperGrafico) wrapperGrafico.style.display = 'none';
    if (elInsight) elInsight.innerText = "Registre entradas e despesas no Extrato para gerar o diagnóstico automático.";
    containerCat.innerHTML = `<p class="texto-auxiliar">Nenhum gasto registrado.</p>`;
  } else {
    const porCategoria = {};
    saidas.forEach(item => {
      const cat = item.categoria || 'Outros';
      porCategoria[cat] = (porCategoria[cat] || 0) + parseFloat(item.valor);
    });

    const categoriasOrdenadas = Object.keys(porCategoria).sort((a, b) => porCategoria[b] - porCategoria[a]);
    const maiorCategoria = categoriasOrdenadas[0];
    const pctMaior = ((porCategoria[maiorCategoria] / totalSaidas) * 100).toFixed(0);

    if (elInsight) {
      elInsight.innerHTML = `Maior concentração de gastos: <strong style="color: var(--primary);">${maiorCategoria} (${pctMaior}%)</strong> — R$ ${porCategoria[maiorCategoria].toFixed(2)}.`;
    }

    const paletaCores = ['#0f766e', '#0284c7', '#d97706', '#dc2626', '#7c3aed', '#059669', '#64748b'];

    if (wrapperGrafico && canvasCat && typeof Chart !== 'undefined') {
      wrapperGrafico.style.display = 'block';
      if (graficoCategoriasInstancia) {
        graficoCategoriasInstancia.destroy();
      }

      graficoCategoriasInstancia = new Chart(canvasCat.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: categoriasOrdenadas,
          datasets: [{
            data: categoriasOrdenadas.map(c => porCategoria[c]),
            backgroundColor: categoriasOrdenadas.map((_, i) => paletaCores[i % paletaCores.length]),
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: {
              position: 'right',
              labels: {
                boxWidth: 12,
                padding: 10,
                color: '#0f172a',
                font: { size: 11, family: 'Inter' }
              }
            }
          }
        }
      });
    }

    categoriasOrdenadas.forEach((cat, idx) => {
      const valorCat = porCategoria[cat];
      const pct = ((valorCat / totalSaidas) * 100).toFixed(0);
      const corBarra = paletaCores[idx % paletaCores.length];

      const div = document.createElement('div');
      div.className = 'card-categoria-progresso';
      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; font-size:12px;">
          <span style="font-weight:500;">${cat}</span>
          <strong>R$ ${valorCat.toFixed(2)} (${pct}%)</strong>
        </div>
        <div class="barra-container">
          <div class="barra-fill" style="width: ${pct}%; background: ${corBarra};"></div>
        </div>
      `;
      containerCat.appendChild(div);
    });
  }

  renderizarMetas();
}

document.getElementById('form-meta').addEventListener('submit', function(e) {
  e.preventDefault();
  const metas = JSON.parse(localStorage.getItem(chaveUsuario('meubolso_metas'))) || [];

  metas.push({
    nome: document.getElementById('meta-nome').value,
    alvo: parseFloat(document.getElementById('meta-alvo').value),
    atual: parseFloat(document.getElementById('meta-atual').value) || 0
  });

  localStorage.setItem(chaveUsuario('meubolso_metas'), JSON.stringify(metas));
  document.getElementById('meta-nome').value = "";
  document.getElementById('meta-alvo').value = "";
  document.getElementById('meta-atual').value = "0";
  renderizarMetas();
});

function renderizarMetas() {
  const containerMetas = document.getElementById('container-metas');
  const metas = JSON.parse(localStorage.getItem(chaveUsuario('meubolso_metas'))) || [];
  containerMetas.innerHTML = "";

  if (metas.length === 0) {
    containerMetas.innerHTML = `<p class="texto-auxiliar">Nenhuma meta criada ainda.</p>`;
    return;
  }

  metas.forEach((m, idx) => {
    const pct = Math.min(Math.round((m.atual / m.alvo) * 100), 100);

    const div = document.createElement('div');
    div.className = 'card-meta';
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <strong style="font-size:13px; color:var(--text-main);">${m.nome}</strong>
        <small style="color:var(--primary); font-weight:700;">${pct}%</small>
      </div>
      <div class="barra-container" style="margin-bottom:8px;">
        <div class="barra-fill" style="width: ${pct}%;"></div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:var(--text-sub);">
        <span>R$ ${m.atual.toFixed(2)} de R$ ${m.alvo.toFixed(2)}</span>
        <button type="button" class="btn-link" style="font-size:11px;" onclick="guardarNaMeta(${idx})">+ Adicionar valor</button>
      </div>
    `;
    containerMetas.appendChild(div);
  });
}

window.guardarNaMeta = function(idx) {
  const metas = JSON.parse(localStorage.getItem(chaveUsuario('meubolso_metas'))) || [];
  const add = prompt(`Quanto deseja adicionar para "${metas[idx].nome}" (R$)?`);
  if (add !== null) {
    const v = parseFloat(add.replace(',', '.'));
    if (!isNaN(v) && v > 0) {
      metas[idx].atual += v;
      localStorage.setItem(chaveUsuario('meubolso_metas'), JSON.stringify(metas));
      renderizarMetas();
    }
  }
};


// =============================================================
// COTAÇÕES INTERNACIONAIS, GRÁFICO HISTÓRICO & NOTIFICAÇÕES
// =============================================================
let taxasCambioAtuais = {};
let graficoMoedaInstancia = null;
let diasGraficoAtual = 7;

async function carregarCotacoesInternacionais() {
  const container = document.getElementById('container-moedas');
  container.innerHTML = `<p class="status-texto">Atualizando cotações...</p>`;

  const moedasSuportadas = [
    { par: 'USD-BRL', sigla: 'USD', nome: 'Dólar Americano' },
    { par: 'EUR-BRL', sigla: 'EUR', nome: 'Euro' },
    { par: 'GBP-BRL', sigla: 'GBP', nome: 'Libra Esterlina' },
    { par: 'CAD-BRL', sigla: 'CAD', nome: 'Dólar Canadense' },
    { par: 'ARS-BRL', sigla: 'ARS', nome: 'Peso Argentino' },
    { par: 'JPY-BRL', sigla: 'JPY', nome: 'Iene Japonês' },
    { par: 'BTC-BRL', sigla: 'BTC', nome: 'Bitcoin' }
  ];

  try {
    const paresQuery = moedasSuportadas.map(m => m.par).join(',');
    const resposta = await fetch(`https://economia.awesomeapi.com.br/last/${paresQuery}`);
    const dados = await resposta.json();

    container.innerHTML = "";

    moedasSuportadas.forEach(item => {
      const chave = item.par.replace('-', '');
      const cotacao = dados[chave];

      if (cotacao) {
        const preco = parseFloat(cotacao.bid);
        const maximo = parseFloat(cotacao.high);
        const minimo = parseFloat(cotacao.low);
        const variacao = parseFloat(cotacao.pctChange);
        const classeVar = variacao >= 0 ? 'alta' : 'baixa';
        const simboloVar = variacao >= 0 ? '+' : '';

        taxasCambioAtuais[item.sigla] = preco;

        const precoFormatado = `R$ ${preco.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
        const maxFormatado = `R$ ${maximo.toFixed(2)}`;
        const minFormatado = `R$ ${minimo.toFixed(2)}`;

        const card = document.createElement('div');
        card.className = 'card-moeda';
        card.innerHTML = `
          <div class="moeda-info">
            <div class="moeda-sigla-badge">${item.sigla}</div>
            <div class="moeda-nome">
              <strong>${item.nome}</strong>
              <small>Máx: ${maxFormatado} • Mín: ${minFormatado}</small>
            </div>
          </div>
          <div class="moeda-valores">
            <span class="preco">${precoFormatado}</span>
            <span class="variacao ${classeVar}">${simboloVar}${variacao.toFixed(2)}%</span>
            <button type="button" class="btn-card-comprar" onclick="redirecionarCompraMoeda('${item.sigla}')">Comprar</button>
          </div>
        `;
        container.appendChild(card);
      }
    });

    calcularConversaoMoeda();
    verificarAlertaPrecoAlvo(true);

  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="status-texto" style="color:var(--danger)">Falha ao carregar cotações.</p>`;
  }
}

async function carregarGraficoHistoricoMoeda() {
  const selectMoeda = document.getElementById('grafico-moeda-select');
  const canvas = document.getElementById('grafico-historico-moeda');
  if (!selectMoeda || !canvas || typeof Chart === 'undefined') return;

  const parMoeda = selectMoeda.value;

  try {
    const resposta = await fetch(`https://economia.awesomeapi.com.br/json/daily/${parMoeda}/${diasGraficoAtual}`);
    const historico = await resposta.json();

    if (!Array.isArray(historico) || historico.length === 0) return;

    const dadosOrdenados = historico.slice().reverse();
    const labels = dadosOrdenados.map(item => {
      const d = new Date(parseInt(item.timestamp, 10) * 1000);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const valores = dadosOrdenados.map(item => parseFloat(item.bid));

    if (graficoMoedaInstancia) {
      graficoMoedaInstancia.destroy();
    }

    const ctx = canvas.getContext('2d');
    graficoMoedaInstancia = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: `${parMoeda} (${diasGraficoAtual} dias)`,
          data: valores,
          borderColor: '#0f766e',
          backgroundColor: 'rgba(15, 118, 110, 0.1)',
          borderWidth: 2,
          pointRadius: diasGraficoAtual === 7 ? 3.5 : 1.5,
          pointBackgroundColor: '#0f766e',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#0f172a', font: { size: 11, family: 'Inter' } }
          }
        },
        scales: {
          x: {
            ticks: { color: '#64748b', font: { size: 10 }, maxTicksLimit: 8 },
            grid: { color: '#f1f5f9' }
          },
          y: {
            ticks: { color: '#64748b', font: { size: 10 } },
            grid: { color: '#f1f5f9' }
          }
        }
      }
    });
  } catch (err) {
    console.error("Erro ao carregar histórico gráfico:", err);
  }
}

function calcularConversaoMoeda() {
  const campoValor = document.getElementById('converter-valor');
  const campoMoeda = document.getElementById('converter-moeda-destino');
  const campoOperacao = document.getElementById('converter-tipo-operacao');
  const textoResultado = document.getElementById('texto-resultado-cambio');
  const textoDetalhe = document.getElementById('texto-detalhe-iof');

  if (!campoValor || !campoMoeda || !campoOperacao || !textoResultado) return;

  const valorBRL = parseFloat(campoValor.value) || 0;
  const moedaDestino = campoMoeda.value;
  const tipoOp = campoOperacao.value;
  const taxaPura = taxasCambioAtuais[moedaDestino];

  if (!taxaPura) {
    textoResultado.innerText = "Taxa indisponível";
    return;
  }

  let pctIOF = 0;
  if (tipoOp === "dinheiro") pctIOF = 0.011;
  if (tipoOp === "cartao") pctIOF = 0.0438;

  const valorComIOF = valorBRL * (1 + pctIOF);
  const resultadoMoeda = valorBRL / taxaPura;

  let simbolo = "$";
  if (moedaDestino === "EUR") simbolo = "€";
  if (moedaDestino === "GBP") simbolo = "£";
  if (moedaDestino === "JPY") simbolo = "¥";
  if (moedaDestino === "ARS") simbolo = "$";
  if (moedaDestino === "BTC") simbolo = "₿";

  const casasDecimais = moedaDestino === "BTC" ? 6 : 2;
  
  textoResultado.innerText = `R$ ${valorBRL.toFixed(2)} = ${simbolo} ${resultadoMoeda.toLocaleString('pt-BR', {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais
  })}`;

  if (pctIOF > 0) {
    textoDetalhe.innerText = `Custo total com IOF (${(pctIOF * 100).toFixed(2)}%): R$ ${valorComIOF.toFixed(2)}`;
  } else {
    textoDetalhe.innerText = `Cotação comercial sem taxas adicionais.`;
  }
}

window.redirecionarCompraMoeda = function(siglaMoeda) {
  const moeda = siglaMoeda || document.getElementById('converter-moeda-destino').value;

  let urlFinal = "";

  if (moeda === "USD" || moeda === "EUR") {
    urlFinal = "https://www.nomadglobal.com/";
  } else if (moeda === "BTC") {
    urlFinal = "https://www.binance.com/pt-BR";
  } else if (moeda === "ARS") {
    urlFinal = "https://www.westernunion.com/br/pt/home.html";
  } else {
    urlFinal = `https://wise.com/br/currency-converter/brl-to-${moeda.toLowerCase()}-rate`;
  }

  window.open(urlFinal, '_blank');
};

function solicitarPermissaoNotificacoes() {
  if (!("Notification" in window)) {
    alert("Seu navegador não suporta notificações.");
    return;
  }

  Notification.requestPermission().then(permissao => {
    const btnNotif = document.getElementById('btn-ativar-notificacoes');
    if (permissao === "granted") {
      if (btnNotif) btnNotif.innerText = "Notificações ativas";
      new Notification("MeuBolso", {
        body: "Alertas de cotação ativados.",
        icon: "icon.png"
      });
    } else {
      alert("Permissão de notificação negada.");
    }
  });
}

function dispararNotificacaoMeta(moedaNome, sigla, taxaAtual, precoAlvo) {
  if ("Notification" in window && Notification.permission === "granted") {
    const chaveNotif = `meubolso_notif_${sigla}_${precoAlvo}`;
    if (sessionStorage.getItem(chaveNotif)) return;

    new Notification(`Meta atingida: ${moedaNome}`, {
      body: `O ${sigla} atingiu R$ ${taxaAtual.toFixed(2)} (Meta: R$ ${precoAlvo.toFixed(2)}).`,
      icon: "icon.png"
    });
    sessionStorage.setItem(chaveNotif, "enviada");
  }
}

function verificarAlertaPrecoAlvo(automatico = false) {
  const selectMoedaAlvo = document.getElementById('alerta-moeda-alvo');
  const campoAlvo = document.getElementById('alerta-preco-alvo');
  const statusAlerta = document.getElementById('status-alerta-alvo');

  const sigla = selectMoedaAlvo ? selectMoedaAlvo.value : 'USD';
  const nomeMoeda = sigla === 'EUR' ? 'Euro' : 'Dólar';
  const taxaAtual = taxasCambioAtuais[sigla];

  if (!campoAlvo || !statusAlerta) return;

  const precoAlvo = parseFloat(campoAlvo.value) || 0;
  localStorage.setItem(chaveUsuario('meubolso_alerta_config'), JSON.stringify({ sigla, precoAlvo }));

  if (!automatico && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  if (!taxaAtual) return;

  if (taxaAtual <= precoAlvo) {
    statusAlerta.style.color = "var(--primary)";
    statusAlerta.innerText = `Meta atingida: ${nomeMoeda} a R$ ${taxaAtual.toFixed(2)} (alvo: R$ ${precoAlvo.toFixed(2)}).`;
    dispararNotificacaoMeta(nomeMoeda, sigla, taxaAtual, precoAlvo);
  } else {
    statusAlerta.style.color = "var(--warning-color)";
    statusAlerta.innerText = `Acima do alvo: ${nomeMoeda} a R$ ${taxaAtual.toFixed(2)} (alvo: R$ ${precoAlvo.toFixed(2)}).`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  atualizarIcones();
  renderizarAtalhosContasSalvas();

  const inputValor = document.getElementById('converter-valor');
  const selectMoeda = document.getElementById('converter-moeda-destino');
  const selectOperacao = document.getElementById('converter-tipo-operacao');
  const btnAlvo = document.getElementById('btn-verificar-alvo');
  const btnAtivarNotif = document.getElementById('btn-ativar-notificacoes');
  const btnComprarDireto = document.getElementById('btn-comprar-moeda-direto');
  const selectGraficoMoeda = document.getElementById('grafico-moeda-select');
  const btnGrafico7d = document.getElementById('btn-grafico-7d');
  const btnGrafico30d = document.getElementById('btn-grafico-30d');

  if ("Notification" in window && Notification.permission === "granted" && btnAtivarNotif) {
    btnAtivarNotif.innerText = "Notificações ativas";
  }

  if (inputValor) inputValor.addEventListener('input', calcularConversaoMoeda);
  if (selectMoeda) selectMoeda.addEventListener('change', calcularConversaoMoeda);
  if (selectOperacao) selectOperacao.addEventListener('change', calcularConversaoMoeda);
  if (btnAlvo) btnAlvo.addEventListener('click', () => verificarAlertaPrecoAlvo(false));
  if (btnAtivarNotif) btnAtivarNotif.addEventListener('click', solicitarPermissaoNotificacoes);
  if (btnComprarDireto) btnComprarDireto.addEventListener('click', () => redirecionarCompraMoeda());

  if (selectGraficoMoeda) {
    selectGraficoMoeda.addEventListener('change', carregarGraficoHistoricoMoeda);
  }

  if (btnGrafico7d && btnGrafico30d) {
    btnGrafico7d.addEventListener('click', () => {
      diasGraficoAtual = 7;
      btnGrafico7d.classList.add('active');
      btnGrafico30d.classList.remove('active');
      carregarGraficoHistoricoMoeda();
    });

    btnGrafico30d.addEventListener('click', () => {
      diasGraficoAtual = 30;
      btnGrafico30d.classList.add('active');
      btnGrafico7d.classList.remove('active');
      carregarGraficoHistoricoMoeda();
    });
  }
});


// =============================================================
// MAPA DE GASTOS (LEAFLET.JS)
// =============================================================
let mapa = null;
let marcadoresMapa = [];

function inicializarOuAtualizarMapa() {
  const extrato = JSON.parse(localStorage.getItem(chaveUsuario('meubolso_dados'))) || [];
  const transacoesComGPS = extrato.filter(item => item.coords);

  if (!mapa) {
    const centroInicial = transacoesComGPS.length > 0 
      ? [transacoesComGPS[0].coords.lat, transacoesComGPS[0].coords.lng] 
      : [-23.5505, -46.6333];

    mapa = L.map('mapa-container').setView(centroInicial, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(mapa);
  }

  marcadoresMapa.forEach(m => mapa.removeLayer(m));
  marcadoresMapa = [];

  if (transacoesComGPS.length === 0) return;

  const grupoPONTOS = [];

  transacoesComGPS.forEach(item => {
    const latLng = [item.coords.lat, item.coords.lng];
    grupoPONTOS.push(latLng);

    const textoPopup = `
      <div style="color: #0f172a; font-family: Inter, sans-serif;">
        <strong>${item.descricao}</strong><br>
        <span style="color:${item.tipo === 'saida' ? '#dc2626' : '#0f766e'}">
          ${item.tipo === 'saida' ? '-' : '+'} R$ ${parseFloat(item.valor).toFixed(2)}
        </span>
      </div>
    `;

    const marker = L.marker(latLng).addTo(mapa).bindPopup(textoPopup);
    marcadoresMapa.push(marker);
  });

  if (grupoPONTOS.length > 0) {
    mapa.fitBounds(grupoPONTOS, { padding: [30, 30] });
  }

  setTimeout(() => { mapa.invalidateSize(); }, 200);
}


// =============================================================
// HARDWARE (GPS, DÓLAR RÁPIDO)
// =============================================================

// GPS
document.getElementById('btn-gps').addEventListener('click', function() {
  const statusAviso = document.getElementById('status-aviso');
  statusAviso.innerText = "Obtendo localização...";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      objetoGpsSalvo = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };
      localizacaoTextoSalvo = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
      statusAviso.innerText = "Localização vinculada ao próximo lançamento.";
    },
    () => { statusAviso.innerText = "Permissão de localização não concedida."; }
  );
});

// Dólar Rápido
document.getElementById('btn-cambio-rapido').addEventListener('click', async function() {
  const statusAviso = document.getElementById('status-aviso');
  statusAviso.innerText = "Consultando cotação...";
  try {
    const resposta = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
    const dados = await resposta.json();
    const dolar = parseFloat(dados.USDBRL.bid).toFixed(4);
    statusAviso.innerText = `Cotação atual do Dólar: R$ ${dolar}`;
  } catch (err) {
    statusAviso.innerText = "Erro ao consultar cotação.";
  }
});