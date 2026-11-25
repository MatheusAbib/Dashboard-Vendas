const API_URL = '/.netlify/functions/api';

//local
// const API_URL = "/api/vendas";

const CORES = {
  primaria: "#397c9f",
  primariaEscura: "#235c7c",
  secundaria: "#20394e",
  destaque: "#d6a665",
  sucesso: "#2d9b78",
  texto: "#748393",
  grade: "#e8edf1",
  paleta: [
    "#397c9f",
    "#d6a665",
    "#6da9a3",
    "#8a9cb9",
    "#d98e79",
    "#6d87a2",
    "#9c88b7",
    "#79a68c",
    "#c7a37c",
    "#7894a1"
  ]
};

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const numero = new Intl.NumberFormat("pt-BR");

const dataCurta = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC"
});

let todasVendas = [];
let vendasFiltradas = [];
let vendasTabela = [];
let filtrosAplicados = {};
let paginaAtual = 1;
let itensPorPagina = 10;
let agrupamentoAtual = "dia";
let vendaParaExcluir = null;
let mapaLeaflet = null;
let marcadoresMapa = null;
let carregandoDashboard = false;
let notificacaoSequencia = 0;

const graficos = {};

const $ = seletor => document.querySelector(seletor);
const $$ = seletor => [...document.querySelectorAll(seletor)];

function valorNumerico(valor) {
  const resultado = Number(valor);
  return Number.isFinite(resultado) ? resultado : 0;
}

function textoSeguro(valor) {
  return String(valor ?? "");
}

function criarElemento(tag, classe = "", texto = null) {
  const elemento = document.createElement(tag);

  if (classe) elemento.className = classe;
  if (texto !== null) elemento.textContent = texto;

  return elemento;
}

function normalizarData(valor) {
  if (!valor) return "";

  const texto = String(valor);
  const encontrada = texto.match(/^\d{4}-\d{2}-\d{2}/);

  return encontrada ? encontrada[0] : "";
}

function formatarData(valor) {
  const data = normalizarData(valor);

  if (!data) return "—";

  const objeto = new Date(`${data}T12:00:00Z`);

  return Number.isNaN(objeto.getTime())
    ? "—"
    : dataCurta.format(objeto);
}

function formatarCEP(cep) {
  const digitos = String(cep ?? "").replace(/\D/g, "").slice(0, 8);

  if (!digitos) return "—";

  return digitos.length > 5
    ? `${digitos.slice(0, 5)}-${digitos.slice(5)}`
    : digitos;
}

function aplicarMascaraCEP(input) {
  input.value = formatarCEP(input.value).replace("—", "");
}

function formatarValor(valor) {
  return moeda.format(valorNumerico(valor));
}

function somarValores(vendas) {
  return vendas.reduce((total, venda) => total + valorNumerico(venda.valor), 0);
}

function somarQuantidades(vendas) {
  return vendas.reduce((total, venda) => total + valorNumerico(venda.quantidade), 0);
}

function obterDataVenda(venda) {
  return normalizarData(venda.dataVenda);
}

function normalizarVenda(venda) {
  return {
    ...venda,
    id: venda.id,
    produto: textoSeguro(venda.produto),
    categoria: textoSeguro(venda.categoria),
    quantidade: valorNumerico(venda.quantidade),
    valor: valorNumerico(venda.valor),
    cidade: textoSeguro(venda.cidade),
    estado: textoSeguro(venda.estado),
    pais: textoSeguro(venda.pais),
    cep: textoSeguro(venda.cep),
    dataVenda: venda.dataVenda || "",
    latitude: venda.latitude == null ? null : Number(venda.latitude),
    longitude: venda.longitude == null ? null : Number(venda.longitude)
  };
}

function obterFiltrosFormulario() {
  return {
    dataInicial: $("#data-inicial").value,
    dataFinal: $("#data-final").value,
    categoria: $("#categoria").value,
    pais: $("#filtro-pais").value,
    estado: $("#filtro-estado").value,
    cidade: $("#filtro-cidade").value
  };
}

function filtrarVendas(vendas, filtros) {
  return vendas.filter(venda => {
    const data = obterDataVenda(venda);

    if (filtros.dataInicial && (!data || data < filtros.dataInicial)) return false;
    if (filtros.dataFinal && (!data || data > filtros.dataFinal)) return false;
    if (filtros.categoria && venda.categoria !== filtros.categoria) return false;
    if (filtros.pais && venda.pais !== filtros.pais) return false;
    if (filtros.estado && venda.estado !== filtros.estado) return false;
    if (filtros.cidade && venda.cidade !== filtros.cidade) return false;

    return true;
  });
}

function atualizarOpcoes(select, valores, primeiraOpcao) {
  const selecionado = select.value;

  select.replaceChildren(new Option(primeiraOpcao, ""));

  [...new Set(valores.filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .forEach(valor => {
      select.add(new Option(valor, valor));
    });

  select.value = [...select.options].some(opcao => opcao.value === selecionado)
    ? selecionado
    : "";
}

function preencherCategorias(vendas = todasVendas) {
  atualizarOpcoes(
    $("#categoria"),
    vendas.map(venda => venda.categoria),
    "Todas as categorias"
  );
}

function preencherFiltrosGeograficos(vendas = todasVendas) {
  const pais = $("#filtro-pais").value;
  const estado = $("#filtro-estado").value;

  atualizarOpcoes(
    $("#filtro-pais"),
    vendas.map(venda => venda.pais),
    "Todos os países"
  );

  const vendasPais = pais
    ? vendas.filter(venda => venda.pais === pais)
    : vendas;

  atualizarOpcoes(
    $("#filtro-estado"),
    vendasPais.map(venda => venda.estado),
    "Todos os estados"
  );

  const vendasEstado = estado
    ? vendasPais.filter(venda => venda.estado === estado)
    : vendasPais;

  atualizarOpcoes(
    $("#filtro-cidade"),
    vendasEstado.map(venda => venda.cidade),
    "Todas as cidades"
  );
}

function preencherCheckboxCategorias(vendas = todasVendas) {
  const container = $("#checkbox-categorias");

  if (!container) return;

  container.replaceChildren();

  const categorias = [...new Set(vendas.map(venda => venda.categoria).filter(Boolean))];

  categorias.forEach((categoria, indice) => {
    const item = criarElemento("div", "checkbox-item");
    const input = criarElemento("input");
    const label = criarElemento("label", "", categoria);

    input.type = "checkbox";
    input.id = `serie-categoria-${indice}`;
    input.value = categoria;
    input.checked = true;
    label.htmlFor = input.id;

    item.append(input, label);
    container.append(item);
  });
}

function atualizarFiltrosAtivos() {
  const container = $("#filtrosAtivosContainer");
  const lista = $("#filtrosAtivos");

  const campos = [
    ["dataInicial", "Desde", "data-inicial"],
    ["dataFinal", "Até", "data-final"],
    ["categoria", "Categoria", "categoria"],
    ["pais", "País", "filtro-pais"],
    ["estado", "Estado", "filtro-estado"],
    ["cidade", "Cidade", "filtro-cidade"]
  ];

  lista.replaceChildren();

  campos.forEach(([chave, rotulo, id]) => {
    const valor = filtrosAplicados[chave];

    if (!valor) return;

    const exibicao = chave.startsWith("data")
      ? formatarData(valor)
      : valor;

    const botao = criarElemento("button", "active-filter-chip");
    const texto = criarElemento("span", "", `${rotulo}: ${exibicao}`);
    const icone = criarElemento("i", "bi bi-x-lg");

    botao.type = "button";
    botao.title = `Remover filtro ${rotulo}`;
    botao.append(texto, icone);

botao.addEventListener("click", async () => {
  document.getElementById(id).value = "";

  if (chave === "pais") {
    $("#filtro-estado").value = "";
    $("#filtro-cidade").value = "";
  }

  if (chave === "estado") {
    $("#filtro-cidade").value = "";
  }

  preencherFiltrosGeograficos(todasVendas);

  await aplicarTodosFiltros();
});

    lista.append(botao);
  });

  container.hidden = lista.children.length === 0;
}

function obterCategoriaDestaque(vendas) {
  const categorias = new Map();

  vendas.forEach(venda => {
    const nome = venda.categoria || "Sem categoria";
    const atual = categorias.get(nome) || { quantidade: 0, valor: 0 };

    atual.quantidade += venda.quantidade;
    atual.valor += venda.valor;

    categorias.set(nome, atual);
  });

  return [...categorias.entries()]
    .sort((a, b) => b[1].quantidade - a[1].quantidade || b[1].valor - a[1].valor)[0] || null;
}

function criarCardIndicador(titulo, valor, icone, detalhe = "") {
  const card = criarElemento("div", "card");
  const simbolo = criarElemento("div", "card-icon");
  const info = criarElemento("div", "card-info");

  simbolo.append(criarElemento("i", `bi ${icone}`));
  info.append(
    criarElemento("h3", "", titulo),
    criarElemento("p", "", valor)
  );

  if (detalhe) {
    info.append(criarElemento("div", "card-detail", detalhe));
  }

  card.append(simbolo, info);

  return card;
}

function preencherCards(vendas) {
  const total = somarValores(vendas);
  const quantidade = somarQuantidades(vendas);
  const transacoes = vendas.length;
  const ticket = transacoes ? total / transacoes : 0;
  const destaque = obterCategoriaDestaque(vendas);

  const container = $("#cards-metricas");

  container.replaceChildren(
    criarCardIndicador(
      "Faturamento total",
      formatarValor(total),
      "bi-currency-dollar",
      `${numero.format(transacoes)} transações registradas`
    ),
    criarCardIndicador(
      "Produtos vendidos",
      numero.format(quantidade),
      "bi-bag-check",
      "Quantidade total de unidades"
    ),
    criarCardIndicador(
      "Ticket médio",
      formatarValor(ticket),
      "bi-receipt",
      "Valor médio por transação"
    ),
    criarCardIndicador(
      "Categoria mais vendida",
      destaque ? destaque[0] : "—",
      "bi-trophy",
      destaque
        ? `${numero.format(destaque[1].quantidade)} unidades vendidas`
        : "Nenhuma categoria no período"
    )
  );

  $("#resumoTransacoes").textContent = numero.format(transacoes);

  $("#resumoProdutos").textContent = numero.format(
    new Set(vendas.map(venda => venda.produto).filter(Boolean)).size
  );

  const datas = vendas.map(obterDataVenda).filter(Boolean).sort();

  $("#resumoPeriodo").textContent = datas.length
    ? `${formatarData(datas[0])} a ${formatarData(datas[datas.length - 1])}`
    : "Sem registros";
}

function configurarChart() {
  if (!window.Chart) return;

  Chart.defaults.font.family = "'DM Sans', sans-serif";
  Chart.defaults.color = CORES.texto;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
}

function destruirGrafico(nome) {
  if (graficos[nome]) {
    graficos[nome].destroy();
    delete graficos[nome];
  }
}

function criarGrafico(nome, canvasId, configuracao) {
  const canvas = document.getElementById(canvasId);

  if (!canvas || !window.Chart) return;

  destruirGrafico(nome);

  graficos[nome] = new Chart(canvas, configuracao);
}

function configuracaoBase() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 350 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#20394e",
        titleColor: "#fff",
        bodyColor: "#fff",
        padding: 12,
        cornerRadius: 8,
        displayColors: false
      }
    }
  };
}

function configuracaoEixo() {
  return {
    beginAtZero: true,
    grid: {
      color: CORES.grade,
      drawBorder: false
    },
    border: { display: false },
    ticks: {
      color: CORES.texto,
      font: { size: 10 },
      callback: valor => numero.format(valor)
    }
  };
}

function chavePeriodo(data, agrupamento) {
  const dataNormalizada = normalizarData(data);

  if (!dataNormalizada) return "";

  if (agrupamento === "mes") {
    return dataNormalizada.slice(0, 7);
  }

  if (agrupamento === "semana") {
    const objeto = new Date(`${dataNormalizada}T12:00:00Z`);
    const diaSemana = (objeto.getUTCDay() + 6) % 7;

    objeto.setUTCDate(objeto.getUTCDate() - diaSemana);

    return objeto.toISOString().slice(0, 10);
  }

  return dataNormalizada;
}

function rotuloPeriodo(chave, agrupamento) {
  if (agrupamento === "mes") {
    const [ano, mes] = chave.split("-");
    return `${mes}/${ano}`;
  }

  if (agrupamento === "semana") {
    return `Sem. ${formatarData(chave)}`;
  }

  return formatarData(chave);
}


function preencherGraficoArea(vendas) {
  const canvas = document.getElementById("mapaCalor");

  if (!canvas) return;

  const anoAtual = new Date().getFullYear();

const vendasAnoAtual = vendas.filter(venda => {
  const data = obterDataVenda(venda);

  return data && Number(data.slice(0, 4)) === anoAtual;
});

const vendasEvolucao =
  filtrosAplicados.dataInicial || filtrosAplicados.dataFinal
    ? vendas
    : vendasAnoAtual.length
      ? vendasAnoAtual
      : vendas;

  const grupos = new Map();

  vendasEvolucao.forEach(venda => {

    const data = obterDataVenda(venda);

    if (!data) return;

    const chave = chavePeriodo(data, agrupamentoAtual);

    grupos.set(
      chave,
      (grupos.get(chave) || 0) + valorNumerico(venda.valor)
    );
  });

  const chaves = [...grupos.keys()].sort();
  const periodos = [];

  if (chaves.length) {
    if (agrupamentoAtual === "mes") {
      const inicio = new Date(`${chaves[0]}-01T12:00:00Z`);
      const fim = new Date(`${chaves[chaves.length - 1]}-01T12:00:00Z`);

      const cursor = new Date(inicio);

      while (cursor <= fim) {
        const chave = cursor.toISOString().slice(0, 7);

        periodos.push({
          chave,
          rotulo: rotuloPeriodo(chave, "mes"),
          valor: grupos.get(chave) || 0
        });

        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
    } else {
      chaves.forEach(chave => {
        periodos.push({
          chave,
          rotulo: rotuloPeriodo(chave, agrupamentoAtual),
          valor: grupos.get(chave) || 0
        });
      });
    }
  }
const containerScroll = document.getElementById("evolucaoScroll");
const containerGrafico = document.getElementById("evolucaoChart");

if (containerScroll && containerGrafico) {
  const larguraPorPeriodo = {
    dia: 75,
    semana: 65,
    mes: 48
  };

  const larguraMinima = containerScroll.clientWidth;
  const larguraCalculada =
    periodos.length * larguraPorPeriodo[agrupamentoAtual];

  containerGrafico.style.width =
    `${Math.max(larguraMinima, larguraCalculada)}px`;
}
  const contexto = canvas.getContext("2d");
  const gradiente = contexto.createLinearGradient(0, 0, 0, 320);

  gradiente.addColorStop(0, "rgba(57,124,159,0.25)");
  gradiente.addColorStop(1, "rgba(57,124,159,0.01)");

  const valores = periodos.map(periodo => periodo.valor);

  const mostrarPontos = periodos.length <= 45;

  criarGrafico("evolucao", "mapaCalor", {
    type: "line",
    data: {
      labels: periodos.map(periodo => periodo.rotulo),
      datasets: [{
        label: "Faturamento",
        data: valores,
        fill: true,
        backgroundColor: gradiente,
        borderColor: CORES.primaria,
        borderWidth: 2.5,
        tension: 0.2,
        pointRadius: mostrarPontos ? 3 : 0,
        pointHoverRadius: 6,
        pointBackgroundColor: CORES.primaria,
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        spanGaps: false
      }]
    },
    options: {
      ...configuracaoBase(),
      interaction: {
        mode: "index",
        intersect: false
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          border: {
            display: false
          },
          ticks: {
            maxTicksLimit: 12,
            maxRotation: 0,
            autoSkip: true,
            font: {
              size: 10
            },

callback: function(valor) {
  const indice = Math.round(Number(valor));
  const periodo = periodos[indice];

  if (!periodo) return "";

  if (agrupamentoAtual === "mes") {
    const [ano, mes] = periodo.chave.split("-");
    return `${mes}/${ano}`;
  }

  if (agrupamentoAtual === "semana") {
    return formatarData(periodo.chave);
  }

  return formatarData(periodo.chave);
}

          }
        },
        y: {
          ...configuracaoEixo(),
          ticks: {
            callback: valor => numero.format(valor),
            font: {
              size: 10
            }
          }
        }
      },
      plugins: {
        ...configuracaoBase().plugins,
        tooltip: {
          ...configuracaoBase().plugins.tooltip,
          callbacks: {
            title: contextos => {
              const indice = contextos[0]?.dataIndex;
              return periodos[indice]?.rotulo || "";
            },
            label: contexto => formatarValor(contexto.parsed.y)
          }
        }
      }
    }
  });

  if (containerScroll) {
  requestAnimationFrame(() => {
    containerScroll.scrollLeft = containerScroll.scrollWidth;
  });
}

 const total = somarValores(vendasEvolucao);
  const totalEvolucao = document.getElementById("totalEvolucao");

  if (totalEvolucao) {
    totalEvolucao.textContent = formatarValor(total);
  }
}

function preencherGraficoPizza(vendas) {
  const grupos = new Map();

  vendas.forEach(venda => {
    const categoria = venda.categoria || "Sem categoria";

    grupos.set(categoria, (grupos.get(categoria) || 0) + venda.valor);
  });

  const entradas = [...grupos.entries()].sort((a, b) => b[1] - a[1]);

  criarGrafico("categorias", "graficoPizza", {
    type: "doughnut",
    data: {
      labels: entradas.map(([nome]) => nome),
      datasets: [{
        data: entradas.map(([, valor]) => valor),
        backgroundColor: entradas.map((_, indice) => CORES.paleta[indice % CORES.paleta.length]),
        borderColor: "#fff",
        borderWidth: 3,
        hoverOffset: 5,
        borderRadius: 3
      }]
    },
    options: {
      ...configuracaoBase(),
      cutout: "69%",
      plugins: {
        ...configuracaoBase().plugins,
        legend: {
          display: true,
          position: "bottom",
          labels: {
            padding: 15,
            boxWidth: 9,
            font: { size: 10 },
            usePointStyle: true
          }
        },
        tooltip: {
          ...configuracaoBase().plugins.tooltip,
          callbacks: {
            label: contexto => {
              const total = somarValores(vendas);
              const percentual = total ? contexto.parsed / total * 100 : 0;

              return `${formatarValor(contexto.parsed)} (${percentual.toFixed(1)}%)`;
            }
          }
        }
      }
    }
  });

  $("#totalCategorias").textContent = numero.format(grupos.size);
}

function agruparProdutos(vendas) {
  const grupos = new Map();

  vendas.forEach(venda => {
    const produto = venda.produto || "Sem identificação";

    grupos.set(produto, (grupos.get(produto) || 0) + venda.valor);
  });

  return [...grupos.entries()].sort((a, b) => b[1] - a[1]);
}

function preencherGraficoRadar(vendas) {
  const produtos = agruparProdutos(vendas).slice(0, 8);

  criarGrafico("produtos", "graficoBarras", {
    type: "bar",
    data: {
      labels: produtos.map(([nome]) => nome),
      datasets: [{
        label: "Faturamento",
        data: produtos.map(([, valor]) => valor),
        backgroundColor: produtos.map((_, indice) =>
          indice === 0 ? CORES.destaque : CORES.primaria
        ),
        borderRadius: 5,
        borderSkipped: false,
        barThickness: 18,
        maxBarThickness: 24
      }]
    },
    options: {
      ...configuracaoBase(),
      indexAxis: "y",
      scales: {
        x: configuracaoEixo(),
        y: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            autoSkip: false,
            font: { size: 10 }
          }
        }
      },
      plugins: {
        ...configuracaoBase().plugins,
        tooltip: {
          ...configuracaoBase().plugins.tooltip,
          callbacks: {
            label: contexto => formatarValor(contexto.parsed.x)
          }
        }
      }
    }
  });
}

function preencherGraficoVendasEstado(vendas) {
  const grupos = new Map();

  vendas.forEach(venda => {
    if (!venda.estado) return;

    grupos.set(venda.estado, (grupos.get(venda.estado) || 0) + venda.valor);
  });

  const entradas = [...grupos.entries()].sort((a, b) => b[1] - a[1]);

  criarGrafico("estados", "graficoVendasEstado", {
    type: "bar",
    data: {
      labels: entradas.map(([estado]) => estado),
      datasets: [{
        label: "Faturamento",
        data: entradas.map(([, valor]) => valor),
        backgroundColor: CORES.primaria,
        borderRadius: 5,
        borderSkipped: false,
        maxBarThickness: 38
      }]
    },
    options: {
      ...configuracaoBase(),
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { font: { size: 10 } }
        },
        y: configuracaoEixo()
      },
      plugins: {
        ...configuracaoBase().plugins,
        tooltip: {
          ...configuracaoBase().plugins.tooltip,
          callbacks: {
            label: contexto => formatarValor(contexto.parsed.y)
          }
        }
      }
    }
  });

  $("#totalEstados").textContent = numero.format(grupos.size);
}

function preencherGraficoProdutosRegiao(vendas) {
  const produtos = agruparProdutos(vendas).slice(0, 6).map(([nome]) => nome);
  const totaisEstado = new Map();

  vendas.forEach(venda => {
    if (!venda.estado) return;

    totaisEstado.set(
      venda.estado,
      (totaisEstado.get(venda.estado) || 0) + venda.valor
    );
  });

  const estados = [...totaisEstado.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([estado]) => estado);

  const datasets = estados.map((estado, indice) => ({
    label: estado,
    data: produtos.map(produto =>
      vendas
        .filter(venda => venda.estado === estado && venda.produto === produto)
        .reduce((total, venda) => total + venda.valor, 0)
    ),
    backgroundColor: CORES.paleta[indice % CORES.paleta.length],
    borderRadius: 3,
    maxBarThickness: 17
  }));

  criarGrafico("regioes", "graficoProdutosRegiao", {
    type: "bar",
    data: { labels: produtos, datasets },
    options: {
      ...configuracaoBase(),
      indexAxis: "y",
      scales: {
        x: {
          ...configuracaoEixo(),
          stacked: true
        },
        y: {
          stacked: true,
          grid: { display: false },
          border: { display: false },
          ticks: { font: { size: 10 } }
        }
      },
      plugins: {
        ...configuracaoBase().plugins,
        legend: {
          display: estados.length > 0,
          position: "bottom",
          labels: {
            padding: 12,
            boxWidth: 9,
            font: { size: 10 },
            usePointStyle: true
          }
        },
        tooltip: {
          ...configuracaoBase().plugins.tooltip,
          callbacks: {
            label: contexto => `${contexto.dataset.label}: ${formatarValor(contexto.parsed.x)}`
          }
        }
      }
    }
  });
}

function preencherRanking(vendas) {
  const ranking = $("#ranking-produtos");
  const produtos = agruparProdutos(vendas).slice(0, 10);

  ranking.replaceChildren();

  if (!produtos.length) {
    ranking.append(criarElemento("li", "ranking-vazio", "Nenhum produto encontrado."));
    return;
  }

  produtos.forEach(([produto, valor], indice) => {
    const item = criarElemento("li");

    item.append(
      criarElemento("span", "ranking-posicao", String(indice + 1)),
      criarElemento("span", "ranking-produto", produto),
      criarElemento("strong", "ranking-valor", formatarValor(valor))
    );

    ranking.append(item);
  });
}

function inicializarMapa() {
  if (!window.L || mapaLeaflet) return;

  mapaLeaflet = L.map("mapaVendas", {
    scrollWheelZoom: false,
    zoomControl: true
  }).setView([-14.235, -51.9253], 4);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19
  }).addTo(mapaLeaflet);

  marcadoresMapa = L.featureGroup().addTo(mapaLeaflet);
}

function preencherMapaVendas(vendas) {
  if (!window.L) return;

  inicializarMapa();

  if (!mapaLeaflet) return;

  marcadoresMapa.clearLayers();

  const localizacoes = new Set();

  vendas.forEach(venda => {
    const latitude = Number(venda.latitude);
    const longitude = Number(venda.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180 ||
      venda.latitude == null ||
      venda.longitude == null
    ) {
      return;
    }

    const marcador = L.circleMarker([latitude, longitude], {
      radius: 7,
      color: CORES.primariaEscura,
      weight: 2,
      fillColor: CORES.destaque,
      fillOpacity: 0.85
    });

    const conteudo = document.createElement("div");

    const produto = criarElemento("strong", "", venda.produto);
    const local = criarElemento("div", "", [venda.cidade, venda.estado].filter(Boolean).join(" - "));
    const valor = criarElemento("div", "", formatarValor(venda.valor));

    conteudo.append(produto, local, valor);

    marcador.bindPopup(conteudo);
    marcadoresMapa.addLayer(marcador);

    localizacoes.add(`${latitude.toFixed(4)},${longitude.toFixed(4)}`);
  });

  $("#totalLocalidades").textContent = numero.format(localizacoes.size);

  if (marcadoresMapa.getLayers().length) {
    mapaLeaflet.fitBounds(marcadoresMapa.getBounds().pad(0.25), {
      maxZoom: 12
    });
  } else {
    mapaLeaflet.setView([-14.235, -51.9253], 4);
  }

  requestAnimationFrame(() => mapaLeaflet.invalidateSize());
}

function atualizarGraficos(vendas) {
  preencherGraficoArea(vendas);
  preencherGraficoPizza(vendas);
  preencherGraficoRadar(vendas);
  preencherGraficoVendasEstado(vendas);
  preencherGraficoProdutosRegiao(vendas);
  preencherRanking(vendas);
  preencherMapaVendas(vendas);
}

function compararTexto(a, b) {
  return String(a ?? "").localeCompare(String(b ?? ""), "pt-BR", {
    sensitivity: "base",
    numeric: true
  });
}

function obterVendasOrdenadas(vendas) {
  const criterio = $("#ordenacaoVendas").value;

  return [...vendas].sort((a, b) => {
    switch (criterio) {
      case "data-asc":
        return compararTexto(a.dataVenda, b.dataVenda);
      case "valor-desc":
        return b.valor - a.valor;
      case "valor-asc":
        return a.valor - b.valor;
      case "quantidade-desc":
        return b.quantidade - a.quantidade;
      case "quantidade-asc":
        return a.quantidade - b.quantidade;
      case "produto-asc":
        return compararTexto(a.produto, b.produto);
      case "produto-desc":
        return compararTexto(b.produto, a.produto);
      default:
        return compararTexto(b.dataVenda, a.dataVenda);
    }
  });
}

function obterVendasPesquisadas() {
  const busca = $("#buscaVendas").value.trim().toLocaleLowerCase("pt-BR");

  const encontradas = busca
    ? vendasFiltradas.filter(venda =>
        [
          venda.id,
          venda.produto,
          venda.categoria,
          venda.cidade,
          venda.estado,
          venda.pais,
          venda.cep
        ].some(campo => String(campo ?? "").toLocaleLowerCase("pt-BR").includes(busca))
      )
    : vendasFiltradas;

  return obterVendasOrdenadas(encontradas);
}

function criarBotaoAcao(icone, titulo, classe, acao) {
  const botao = criarElemento("button", `btn-acao ${classe}`);

  botao.type = "button";
  botao.title = titulo;
  botao.setAttribute("aria-label", titulo);
  botao.append(criarElemento("i", `bi ${icone}`));
  botao.addEventListener("click", acao);

  return botao;
}

function preencherTabela(vendas) {
  const tbody = $("#tabela-vendas");

  tbody.replaceChildren();

  vendas.forEach(venda => {
    const linha = criarElemento("tr");

    const campos = [
      venda.id,
      venda.produto,
      venda.categoria,
      numero.format(venda.quantidade),
      formatarValor(venda.valor),
      venda.cidade || "—",
      venda.estado || "—",
      formatarCEP(venda.cep),
      formatarData(venda.dataVenda)
    ];

    campos.forEach((campo, indice) => {
      const celula = criarElemento("td");

      if (indice === 2) {
        celula.append(criarElemento("span", "table-category", campo));
      } else {
        celula.textContent = campo;
      }

      linha.append(celula);
    });

    const acoes = criarElemento("td");
    const grupo = criarElemento("div", "table-actions");

    grupo.append(
      criarBotaoAcao("bi-pencil-square", "Editar venda", "editar", () => abrirFormVenda(venda)),
      criarBotaoAcao("bi-trash3", "Excluir venda", "excluir", () =>
        confirmarExclusao(venda.id, venda.produto)
      )
    );

    acoes.append(grupo);
    linha.append(acoes);
    tbody.append(linha);
  });
}

function criarBotaoPagina(pagina) {
  const botao = criarElemento("button", "pagination-page", String(pagina));

  botao.type = "button";

  if (pagina === paginaAtual) {
    botao.classList.add("active");
    botao.setAttribute("aria-current", "page");
  }

  botao.addEventListener("click", () => {
    paginaAtual = pagina;
    atualizarTabela();
  });

  return botao;
}

function atualizarPaginacao(total) {
  const paginas = Math.max(1, Math.ceil(total / itensPorPagina));
  const container = $("#numerosPaginas");

  container.replaceChildren();

  const indices = new Set([
    1,
    paginas,
    paginaAtual - 1,
    paginaAtual,
    paginaAtual + 1
  ]);

  const visiveis = [...indices]
    .filter(pagina => pagina >= 1 && pagina <= paginas)
    .sort((a, b) => a - b);

  let anterior = 0;

  visiveis.forEach(pagina => {
    if (pagina - anterior > 1) {
      container.append(criarElemento("span", "pagination-ellipsis", "…"));
    }

    container.append(criarBotaoPagina(pagina));
    anterior = pagina;
  });

  $("#paginaAnterior").disabled = paginaAtual <= 1;
  $("#proximaPagina").disabled = paginaAtual >= paginas;

  const inicio = total ? (paginaAtual - 1) * itensPorPagina + 1 : 0;
  const fim = Math.min(paginaAtual * itensPorPagina, total);

  $("#informacoesPaginacao").textContent =
    `Exibindo ${numero.format(inicio)}–${numero.format(fim)} de ${numero.format(total)} registros`;
}

function atualizarTabela() {
  vendasTabela = obterVendasPesquisadas();
  itensPorPagina = Number($("#itensPorPagina").value) || 10;

  const paginas = Math.max(1, Math.ceil(vendasTabela.length / itensPorPagina));

  paginaAtual = Math.min(Math.max(1, paginaAtual), paginas);

  const inicio = (paginaAtual - 1) * itensPorPagina;
  const pagina = vendasTabela.slice(inicio, inicio + itensPorPagina);

  preencherTabela(pagina);
  atualizarPaginacao(vendasTabela.length);

  $("#contadorRegistros").textContent =
    `${numero.format(vendasTabela.length)} ${vendasTabela.length === 1 ? "registro" : "registros"}`;

  $("#tabelaSemResultados").hidden = vendasTabela.length > 0;
  $(".table-scroll").hidden = vendasTabela.length === 0;

  $("#limparBuscaVendas").hidden = !$("#buscaVendas").value;
}

function atualizarDashboardFiltrado() {
  vendasFiltradas = filtrarVendas(todasVendas, filtrosAplicados);

  preencherCards(vendasFiltradas);
  atualizarGraficos(vendasFiltradas);
  atualizarFiltrosAtivos();

  paginaAtual = 1;
  atualizarTabela();

  return Promise.resolve();
}

async function carregarDashboard() {
  if (carregandoDashboard) return;

  carregandoDashboard = true;
  mostrarLoader("Atualizando dashboard", "Carregando os dados de vendas...");

  try {
    const resposta = await fetch(API_URL, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

    if (!resposta.ok) {
      throw new Error(`Erro HTTP ${resposta.status}`);
    }

    const dados = await resposta.json();

    if (!Array.isArray(dados)) {
      throw new Error("O servidor retornou dados inválidos.");
    }

    todasVendas = dados.map(normalizarVenda);

    preencherCategorias(todasVendas);
    preencherFiltrosGeograficos(todasVendas);
    preencherCheckboxCategorias(todasVendas);

    await atualizarDashboardFiltrado();
  } catch (erro) {
    console.error("Erro ao carregar dashboard:", erro);

    mostrarNotificacao(
      "Erro ao carregar",
      "Não foi possível obter os dados de vendas.",
      "erro",
      5000
    );
  } finally {
    carregandoDashboard = false;
    esconderLoader();
  }
}

async function aplicarTodosFiltros() {
  const filtros = obterFiltrosFormulario();

  if (
    filtros.dataInicial &&
    filtros.dataFinal &&
    filtros.dataInicial > filtros.dataFinal
  ) {
    mostrarNotificacao(
      "Período inválido",
      "A data inicial não pode ser posterior à data final.",
      "aviso",
      4000
    );

    return;
  }

  filtrosAplicados = { ...filtros };

  await atualizarDashboardFiltrado();

  mostrarNotificacao(
    "Filtros aplicados",
    "Os indicadores e gráficos foram atualizados.",
    "sucesso",
    2500
  );
}

async function limparTodosFiltros() {
  [
    "data-inicial",
    "data-final",
    "categoria",
    "filtro-pais",
    "filtro-estado",
    "filtro-cidade"
  ].forEach(id => {
    document.getElementById(id).value = "";
  });

  const aviso = document.getElementById("avisoPeriodoPersonalizado");

  if (aviso) {
    aviso.hidden = true;
  }

  const periodoRapido = document.getElementById("periodoRapido");

  if (periodoRapido) {
    periodoRapido.value = "todos";
  }

  filtrosAplicados = {};

  preencherFiltrosGeograficos(todasVendas);

  await atualizarDashboardFiltrado();

  mostrarNotificacao(
    "Filtros limpos",
    "Todos os registros estão disponíveis novamente.",
    "info",
    2500
  );
}

function filtrarSeries() {
  preencherGraficoArea(vendasFiltradas);
}

function mostrarLoader(mensagem, detalhes = "") {
  const overlay = $("#loaderOverlay");
  const texto = $("#loaderText");

  texto.replaceChildren();

  texto.append(criarElemento("div", "", mensagem));

  if (detalhes) {
    texto.append(criarElemento("div", "loader-info", detalhes));
  }

  overlay.style.display = "flex";
}

function esconderLoader() {
  $("#loaderOverlay").style.display = "none";
}

function mostrarLoaderBotao(botao) {
  if (!botao) return;

  botao.disabled = true;
  botao.classList.add("btn-loading");
}

function esconderLoaderBotao(botao) {
  if (!botao) return;

  botao.disabled = false;
  botao.classList.remove("btn-loading");
}

function mostrarNotificacao(titulo, mensagem, tipo = "info", duracao = 5000) {
  const container = $("#notificacoesContainer");
  const notificacao = criarElemento("div", `notificacao ${tipo}`);
  const icone = criarElemento("i", "notificacao-icon bi");
  const conteudo = criarElemento("div", "notificacao-content");
  const fechar = criarElemento("button", "notificacao-close");
  const progresso = criarElemento("div", "notificacao-progress");
  const barra = criarElemento("div", "notificacao-progress-bar");

  const icones = {
    sucesso: "bi-check-circle",
    erro: "bi-x-circle",
    aviso: "bi-exclamation-circle",
    warning: "bi-exclamation-circle",
    info: "bi-info-circle"
  };

  icone.classList.add(icones[tipo] || icones.info);

  conteudo.append(
    criarElemento("div", "notificacao-title", titulo),
    criarElemento("div", "notificacao-message", mensagem)
  );

  fechar.type = "button";
  fechar.setAttribute("aria-label", "Fechar notificação");
  fechar.append(criarElemento("i", "bi bi-x-lg"));

  fechar.addEventListener("click", () => notificacao.remove());

  barra.style.animationDuration = `${duracao}ms`;
  progresso.append(barra);

  notificacao.append(icone, conteudo, fechar, progresso);
  container.append(notificacao);

  const identificador = ++notificacaoSequencia;
  notificacao.dataset.id = String(identificador);

  setTimeout(() => notificacao.remove(), duracao);

  return notificacao;
}

function mostrarMensagem(texto, tipo = "info") {
  mostrarNotificacao("Informação", texto, tipo, 4000);
}

function abrirFormVenda(venda = null) {
  const modal = $("#formVendaModal");
  const formulario = $("#formVenda");

  formulario.reset();

  $("#venda-id").value = venda?.id ?? "";
  $("#formTitulo").textContent = venda ? "Editar Venda" : "Cadastrar Venda";

  if (venda) {
    $("#produto").value = venda.produto || "";
    $("#categoriaForm").value = venda.categoria || "";
    $("#quantidade").value = venda.quantidade || "";
    $("#valor").value = venda.valor ?? "";
    $("#cidade").value = venda.cidade || "";
    $("#estado").value = venda.estado || "";
    $("#pais").value = venda.pais || "";
    $("#cep").value = formatarCEP(venda.cep).replace("—", "");
  } else {
    $("#pais").value = "Brasil";
  }

  modal.style.display = "flex";
  document.body.style.overflow = "hidden";

  requestAnimationFrame(() => $("#produto").focus());
}

function fecharFormVenda() {
  $("#formVendaModal").style.display = "none";
  $("#formVenda").reset();
  document.body.style.overflow = "";
}

async function salvarVenda(evento) {
  evento.preventDefault();

  const formulario = $("#formVenda");

  if (!formulario.reportValidity()) return;

  const id = $("#venda-id").value;
  const botao = formulario.querySelector('button[type="submit"]');

  const agora = new Date();
  const horarioBrasil = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).format(agora).replace(" ", "T");

  const vendaAnterior = id
    ? todasVendas.find(venda => String(venda.id) === String(id))
    : null;

  const venda = {
    produto: $("#produto").value.trim(),
    categoria: $("#categoriaForm").value.trim(),
    quantidade: Number($("#quantidade").value),
    valor: Number($("#valor").value),
    cidade: $("#cidade").value.trim(),
    estado: $("#estado").value,
    pais: $("#pais").value.trim(),
    cep: $("#cep").value.replace(/\D/g, ""),
    latitude: vendaAnterior?.latitude ?? null,
    longitude: vendaAnterior?.longitude ?? null,
    dataVenda: vendaAnterior?.dataVenda || horarioBrasil
  };

  if (venda.cep.length !== 8) {
    mostrarNotificacao(
      "CEP inválido",
      "Informe um CEP com oito dígitos.",
      "aviso",
      4000
    );
    return;
  }

  mostrarLoaderBotao(botao);

  try {
    const resposta = await fetch(id ? `${API_URL}/${encodeURIComponent(id)}` : API_URL, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(venda)
    });

    if (!resposta.ok) {
      throw new Error(`Erro HTTP ${resposta.status}`);
    }

    fecharFormVenda();

    mostrarNotificacao(
      "Venda salva",
      id ? "O registro foi atualizado com sucesso." : "A venda foi cadastrada com sucesso.",
      "sucesso",
      3500
    );

    await carregarDashboard();
  } catch (erro) {
    console.error("Erro ao salvar venda:", erro);

    mostrarNotificacao(
      "Erro ao salvar",
      "Não foi possível salvar o registro. Verifique os dados e tente novamente.",
      "erro",
      5000
    );
  } finally {
    esconderLoaderBotao(botao);
  }
}

function confirmarExclusao(id, produto) {
  vendaParaExcluir = id;

  $("#confirmarExclusaoTexto").textContent =
    `Tem certeza que deseja excluir a venda do produto "${produto}"? Esta ação não pode ser desfeita.`;

  $("#confirmarExclusaoModal").style.display = "flex";
  document.body.style.overflow = "hidden";
}

function fecharConfirmacaoExclusao() {
  $("#confirmarExclusaoModal").style.display = "none";
  document.body.style.overflow = "";
  vendaParaExcluir = null;
}

async function executarExclusao(id = vendaParaExcluir) {
  if (id == null) return;

  fecharConfirmacaoExclusao();
  mostrarLoader("Excluindo venda", "Removendo o registro selecionado...");

  try {
    const resposta = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });

    if (!resposta.ok) {
      throw new Error(`Erro HTTP ${resposta.status}`);
    }

    mostrarNotificacao(
      "Venda excluída",
      "O registro foi removido com sucesso.",
      "sucesso",
      3500
    );

    esconderLoader();
    await carregarDashboard();
  } catch (erro) {
    console.error("Erro ao excluir venda:", erro);

    mostrarNotificacao(
      "Erro ao excluir",
      "Não foi possível remover o registro.",
      "erro",
      5000
    );
  } finally {
    esconderLoader();
  }
}

async function obterCoordenadasPorCEP(cep) {
  const digitos = String(cep ?? "").replace(/\D/g, "");

  if (digitos.length !== 8) return null;

  try {
    const resposta = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(digitos)}&country=Brazil&format=json&limit=1`,
      {
        headers: {
          Accept: "application/json"
        }
      }
    );

    if (!resposta.ok) return null;

    const dados = await resposta.json();

    if (!dados.length) return null;

    return [Number(dados[0].lat), Number(dados[0].lon)];
  } catch (erro) {
    console.error("Erro ao obter coordenadas:", erro);
    return null;
  }
}

function obterDadosExportacao() {
  return vendasTabela.length || !vendasFiltradas.length
    ? [...vendasTabela]
    : [];
}

function obterResumoExportacao(vendas) {
  const destaque = obterCategoriaDestaque(vendas);

  return [
    ["Indicador", "Valor"],
    ["Faturamento total", formatarValor(somarValores(vendas))],
    ["Produtos vendidos", somarQuantidades(vendas)],
    ["Ticket médio", formatarValor(vendas.length ? somarValores(vendas) / vendas.length : 0)],
    ["Categoria mais vendida", destaque ? destaque[0] : "—"],
    ["Transações", vendas.length],
    ["Produtos diferentes", new Set(vendas.map(venda => venda.produto)).size]
  ];
}

function obterLinhasExportacao(vendas) {
  return vendas.map(venda => [
    venda.id,
    venda.produto,
    venda.categoria,
    venda.quantidade,
    venda.valor,
    venda.cidade || "",
    venda.estado || "",
    venda.pais || "",
    formatarCEP(venda.cep),
    formatarData(venda.dataVenda)
  ]);
}

function exportarExcel() {
  const vendas = obterDadosExportacao();

  if (!vendas.length) {
    mostrarNotificacao("Sem registros", "Não existem vendas para exportar.", "aviso");
    return;
  }

  if (!window.XLSX) {
    mostrarNotificacao("Erro", "A biblioteca de Excel não foi carregada.", "erro");
    return;
  }

  mostrarLoader("Exportando Excel", "Preparando a planilha...");

  try {
    const livro = XLSX.utils.book_new();

    const resumo = XLSX.utils.aoa_to_sheet(obterResumoExportacao(vendas));

    resumo["!cols"] = [{ wch: 28 }, { wch: 30 }];

    const cabecalho = [
      "ID",
      "Produto",
      "Categoria",
      "Quantidade",
      "Valor (R$)",
      "Cidade",
      "Estado",
      "País",
      "CEP",
      "Data"
    ];

    const planilha = XLSX.utils.aoa_to_sheet([
      cabecalho,
      ...obterLinhasExportacao(vendas)
    ]);

    planilha["!cols"] = [
      { wch: 10 },
      { wch: 30 },
      { wch: 22 },
      { wch: 15 },
      { wch: 18 },
      { wch: 24 },
      { wch: 12 },
      { wch: 18 },
      { wch: 15 },
      { wch: 16 }
    ];

    planilha["!autofilter"] = {
      ref: `A1:J${vendas.length + 1}`
    };

    XLSX.utils.book_append_sheet(livro, resumo, "Resumo");
    XLSX.utils.book_append_sheet(livro, planilha, "Vendas");

    XLSX.writeFile(livro, "dashboard_vendas.xlsx");

    mostrarNotificacao(
      "Exportação concluída",
      "A planilha Excel foi gerada com sucesso.",
      "sucesso",
      3500
    );
  } catch (erro) {
    console.error("Erro ao exportar Excel:", erro);

    mostrarNotificacao(
      "Erro na exportação",
      "Não foi possível gerar a planilha.",
      "erro",
      5000
    );
  } finally {
    esconderLoader();
  }
}

function exportarPDF() {
  const vendas = obterDadosExportacao();

  if (!vendas.length) {
    mostrarNotificacao("Sem registros", "Não existem vendas para exportar.", "aviso");
    return;
  }

  if (!window.jspdf?.jsPDF) {
    mostrarNotificacao("Erro", "A biblioteca de PDF não foi carregada.", "erro");
    return;
  }

  mostrarLoader("Exportando PDF", "Preparando o relatório...");

  try {
    const { jsPDF } = window.jspdf;
    const documento = new jsPDF("landscape", "pt", "a4");

    const largura = documento.internal.pageSize.getWidth();

    documento.setFillColor(24, 42, 60);
    documento.rect(0, 0, largura, 82, "F");

    documento.setTextColor(255, 255, 255);
    documento.setFont("helvetica", "bold");
    documento.setFontSize(21);
    documento.text("Dashboard de Vendas", 35, 43);

    documento.setFontSize(10);
    documento.setFont("helvetica", "normal");
    documento.text("Central Comercial | Relatorio de vendas", 35, 62);

    const faturamento = somarValores(vendas);
    const quantidade = somarQuantidades(vendas);
    const ticket = vendas.length ? faturamento / vendas.length : 0;

    documento.setTextColor(32, 49, 67);
    documento.setFont("helvetica", "bold");
    documento.setFontSize(11);

    documento.text(`Faturamento: ${formatarValor(faturamento)}`, 35, 110);
    documento.text(`Produtos vendidos: ${numero.format(quantidade)}`, 35, 129);
    documento.text(`Ticket medio: ${formatarValor(ticket)}`, 35, 148);
    documento.text(`Transacoes: ${numero.format(vendas.length)}`, 35, 167);

    if (typeof documento.autoTable !== "function") {
      throw new Error("A biblioteca AutoTable não foi carregada.");
    }

    documento.autoTable({
      startY: 190,
      head: [[
        "ID",
        "Produto",
        "Categoria",
        "Qtd.",
        "Valor",
        "Cidade",
        "Estado",
        "Pais",
        "CEP",
        "Data"
      ]],
      body: vendas.map(venda => [
        String(venda.id),
        venda.produto,
        venda.categoria,
        numero.format(venda.quantidade),
        formatarValor(venda.valor),
        venda.cidade || "—",
        venda.estado || "—",
        venda.pais || "—",
        formatarCEP(venda.cep),
        formatarData(venda.dataVenda)
      ]),
      theme: "grid",
      headStyles: {
        fillColor: [35, 92, 124],
        textColor: 255,
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [45, 60, 75]
      },
      alternateRowStyles: {
        fillColor: [245, 248, 250]
      },
      margin: {
        left: 35,
        right: 35,
        bottom: 42
      }
    });

    const totalPaginas = documento.internal.getNumberOfPages();

    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
      documento.setPage(pagina);
      documento.setFontSize(9);
      documento.setTextColor(120, 135, 150);

      documento.text(
        `Pagina ${pagina} de ${totalPaginas}`,
        largura - 35,
        documento.internal.pageSize.getHeight() - 20,
        { align: "right" }
      );
    }

    documento.save("dashboard_vendas.pdf");

    mostrarNotificacao(
      "Exportação concluída",
      "O relatório PDF foi gerado com sucesso.",
      "sucesso",
      3500
    );
  } catch (erro) {
    console.error("Erro ao exportar PDF:", erro);

    mostrarNotificacao(
      "Erro na exportação",
      "Não foi possível gerar o relatório PDF.",
      "erro",
      5000
    );
  } finally {
    esconderLoader();
  }
}

function atualizarDataAtual() {
  $("#dataAtual").textContent = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date());
}

function fecharMenuMobile() {
  $("#appSidebar").classList.remove("mobile-open");
  $("#mobileSidebarOverlay").classList.remove("visible");
  $("#mobileMenuButton").setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
}

function alternarMenuMobile() {
  const aberto = $("#appSidebar").classList.toggle("mobile-open");

  $("#mobileSidebarOverlay").classList.toggle("visible", aberto);
  $("#mobileMenuButton").setAttribute("aria-expanded", String(aberto));
  document.body.classList.toggle("menu-open", aberto);
}

function alternarFiltros() {
  const painel = $("#painelFiltros");
  const botao = $("#abrirFiltros");
  const oculto = painel.classList.toggle("panel-hidden");

  $("#textoBotaoFiltros").textContent =
    oculto ? "Mostrar filtros" : "Esconder filtros";

  botao.querySelector("i").className =
    oculto ? "bi bi-eye" : "bi bi-eye-slash";

  botao.classList.toggle("selected", !oculto);
  botao.setAttribute("aria-expanded", String(!oculto));

  requestAnimationFrame(() => {
    Object.values(graficos).forEach(grafico => grafico.resize());

    if (mapaLeaflet) mapaLeaflet.invalidateSize();
  });
}

function toggleSidebar() {
  alternarFiltros();
}


function configurarNavegacao() {
  const links = $$(".navigation-link[href^='#']");
  const breadcrumb = document.getElementById("breadcrumbAtual");

  const secoes = links
    .map(link => {
      const seletor = link.getAttribute("href");
      const elemento = document.getElementById(seletor.slice(1));

      return {
        link,
        elemento,
        area: seletor === "#visao-geral"
          ? document.querySelector(".metrics-section") || elemento
          : elemento
      };
    })
    .filter(item => item.elemento);

  if (!secoes.length) return;

  let secaoAtiva = secoes[0];
  let navegacaoPendente = null;
  let quadroPendente = false;
  let temporizadorNavegacao = null;
  let ultimaPosicao = window.scrollY;
  let direcao = "baixo";

  const definirAtivo = item => {
    if (!item) return;

    secaoAtiva = item;

    links.forEach(link => {
      const ativo = link === item.link;

      link.classList.toggle("active", ativo);

      if (ativo) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    if (breadcrumb) {
      breadcrumb.textContent =
        item.link.querySelector("span")?.textContent?.trim() ||
        "Visão geral";
    }
  };

  const obterSecaoAtual = () => {
    const alturaTela = window.innerHeight;
    const areaAtual = secaoAtiva.area.getBoundingClientRect();

    if (window.scrollY <= 0) {
      return secoes[0];
    }

    if (areaAtual.bottom > 0 && areaAtual.top < alturaTela) {
      return secaoAtiva;
    }

    const visiveis = secoes.filter(item => {
      const area = item.area.getBoundingClientRect();

      return area.bottom > 0 && area.top < alturaTela;
    });

    if (!visiveis.length) {
      return secaoAtiva;
    }

    return direcao === "baixo"
      ? visiveis[0]
      : visiveis[visiveis.length - 1];
  };

  const atualizarNavegacao = () => {
    quadroPendente = false;

    const posicaoAtual = window.scrollY;

    if (posicaoAtual > ultimaPosicao) {
      direcao = "baixo";
    } else if (posicaoAtual < ultimaPosicao) {
      direcao = "cima";
    }

    ultimaPosicao = posicaoAtual;

    if (navegacaoPendente) return;

    definirAtivo(obterSecaoAtual());
  };

  const solicitarAtualizacao = () => {
    if (quadroPendente) return;

    quadroPendente = true;
    requestAnimationFrame(atualizarNavegacao);
  };

  const liberarNavegacao = () => {
    clearTimeout(temporizadorNavegacao);
    navegacaoPendente = null;
    solicitarAtualizacao();
  };

  links.forEach(link => {
    link.addEventListener("click", () => {
      const item = secoes.find(secao => secao.link === link);

      if (!item) return;

      navegacaoPendente = item;

      definirAtivo(item);
      fecharMenuMobile();

      clearTimeout(temporizadorNavegacao);

      temporizadorNavegacao = setTimeout(
        liberarNavegacao,
        1500
      );
    });
  });

  window.addEventListener("scroll", solicitarAtualizacao, {
    passive: true
  });

  window.addEventListener("scrollend", () => {
    if (navegacaoPendente) {
      liberarNavegacao();
    }
  });

  window.addEventListener("wheel", liberarNavegacao, {
    passive: true
  });

  window.addEventListener("touchstart", liberarNavegacao, {
    passive: true
  });

  window.addEventListener("resize", solicitarAtualizacao, {
    passive: true
  });

  window.addEventListener("load", solicitarAtualizacao);

  solicitarAtualizacao();
}

const inteligenciaComercial = {
  intervaloGrafico: "todos",
  compararAnos: false,
  estadoSelecionado: "",
  permitirDuplicada: false,
  vendaPendente: null
};

function definirTextoIndicador(id, valor) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.textContent = valor;
}

function formatarPercentual(valor) {
  if (!Number.isFinite(valor)) return "—";
  return `${valor > 0 ? "+" : ""}${valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })}%`;
}

function calcularVariacaoPercentual(atual, anterior) {
  if (anterior === 0) return null;
  return ((atual - anterior) / anterior) * 100;
}

function atualizarIndicadorTendencia(id, valor) {
  const elemento = document.getElementById(id);
  if (!elemento) return;

  elemento.classList.remove("positive", "negative");

  if (valor === null || valor === 0) {
    elemento.innerHTML = '<i class="bi bi-dash"></i>';
    return;
  }

  const positivo = valor > 0;
  elemento.classList.add(positivo ? "positive" : "negative");
  elemento.innerHTML = positivo
    ? '<i class="bi bi-arrow-up-right"></i>'
    : '<i class="bi bi-arrow-down-right"></i>';
}

function agruparFaturamentoPorAno(vendas) {
  const grupos = new Map();

  vendas.forEach(venda => {
    const data = obterDataVenda(venda);
    if (!data) return;

    const ano = Number(data.slice(0, 4));
    grupos.set(ano, (grupos.get(ano) || 0) + valorNumerico(venda.valor));
  });

  return grupos;
}


function obterAnosComparacao() {
  const anoAtual = new Date().getFullYear();
  const inicio = filtrosAplicados.dataInicial;
  const fim = filtrosAplicados.dataFinal;

  if (inicio && fim) {
    const anoInicial = Number(inicio.slice(0, 4));
    const anoFinal = Number(fim.slice(0, 4));

    return anoInicial === anoFinal
      ? [anoFinal, anoFinal - 1]
      : [anoFinal, anoInicial];
  }

  if (inicio || fim) {
    const ano = Number((fim || inicio).slice(0, 4));
    return [ano, ano - 1];
  }

  return [anoAtual, anoAtual - 1];
}



function atualizarSeletoresAnuais() {
  const anoBase = document.getElementById("anoComparacaoA");
  const anoComparado = document.getElementById("anoComparacaoB");

  if (!anoBase || !anoComparado) return;

  const [anoPadraoA, anoPadraoB] = obterAnosComparacao();

  const anos = [...new Set([
    anoPadraoA,
    anoPadraoB,
    ...todasVendas
      .map(venda => obterDataVenda(venda))
      .filter(Boolean)
      .map(data => Number(data.slice(0, 4)))
  ])].sort((a, b) => b - a);

  const chaveFiltros = [
    filtrosAplicados.dataInicial || "",
    filtrosAplicados.dataFinal || ""
  ].join("|");

  const filtrosMudaram = anoBase.dataset.filtros !== chaveFiltros;

  const anteriorA = Number(anoBase.value);
  const anteriorB = Number(anoComparado.value);

  [anoBase, anoComparado].forEach(select => {
    select.replaceChildren();

    anos.forEach(ano => {
      select.add(new Option(String(ano), String(ano)));
    });
  });

  anoBase.value = String(
    !filtrosMudaram && anos.includes(anteriorA)
      ? anteriorA
      : anoPadraoA
  );

  anoComparado.value = String(
    !filtrosMudaram && anos.includes(anteriorB)
      ? anteriorB
      : anoPadraoB
  );

  anoBase.dataset.filtros = chaveFiltros;
}



function preencherCrescimentoAnual() {
  const vendasComparacaoAnual = filtrarVendas(todasVendas, {
    ...filtrosAplicados,
    dataInicial: "",
    dataFinal: ""
  });

  const grupos = agruparFaturamentoPorAno(vendasComparacaoAnual);
  const anoA = Number(document.getElementById("anoComparacaoA")?.value);
  const anoB = Number(document.getElementById("anoComparacaoB")?.value);

  if (!anoA || !anoB) {
    definirTextoIndicador("crescimentoAnualPercentual", "—");
    definirTextoIndicador("crescimentoAnualDescricao", "Não há anos suficientes para comparar");
    definirTextoIndicador("resultadoComparacaoAnual", "—");
    atualizarIndicadorTendencia("crescimentoAnualTendencia", null);
    return;
  }

  const atual = grupos.get(anoA) || 0;
  const anterior = grupos.get(anoB) || 0;

  const variacao = calcularVariacaoPercentual(atual, anterior);

  let resultado;

  if (anterior === 0 && atual > 0) {
    resultado = `Novo faturamento (+${formatarValor(atual)})`;
  } else if (anterior === 0 && atual === 0) {
    resultado = "Sem variação";
  } else {
    resultado = formatarPercentual(variacao);
  }

  definirTextoIndicador("crescimentoAnualPercentual", resultado);
  definirTextoIndicador("crescimentoAnualDescricao", `${anoA} em comparação com ${anoB}`);
  definirTextoIndicador("crescimentoAnoAtualLabel", String(anoA));
  definirTextoIndicador("crescimentoAnoAnteriorLabel", String(anoB));
  definirTextoIndicador("crescimentoAnoAtualValor", formatarValor(atual));
  definirTextoIndicador("crescimentoAnoAnteriorValor", formatarValor(anterior));
  definirTextoIndicador("resultadoComparacaoAnual", resultado);

  atualizarIndicadorTendencia(
    "crescimentoAnualTendencia",
    anterior === 0 && atual > 0 ? 1 : variacao
  );
}


function obterIntervaloAnterior(filtros) {
  if (!filtros.dataInicial || !filtros.dataFinal) return null;

  const inicio = new Date(`${filtros.dataInicial}T12:00:00Z`);
  const fim = new Date(`${filtros.dataFinal}T12:00:00Z`);

  const quantidadeDias = Math.round((fim - inicio) / 86400000) + 1;

  if (quantidadeDias <= 0) return null;

  const anteriorFim = new Date(inicio);
  anteriorFim.setUTCDate(anteriorFim.getUTCDate() - 1);

  const anteriorInicio = new Date(anteriorFim);
  anteriorInicio.setUTCDate(anteriorInicio.getUTCDate() - quantidadeDias + 1);

  return {
    dataInicial: anteriorInicio.toISOString().slice(0, 10),
    dataFinal: anteriorFim.toISOString().slice(0, 10)
  };
}

function preencherComparacaoPeriodo() {
  const intervaloAnterior = obterIntervaloAnterior(filtrosAplicados);

  if (!intervaloAnterior) {
    definirTextoIndicador("variacaoPeriodoPercentual", "—");
    definirTextoIndicador(
      "variacaoPeriodoDescricao",
      "Selecione uma data inicial e uma data final para comparar"
    );
    definirTextoIndicador("faturamentoPeriodoAnterior", "—");
    definirTextoIndicador(
      "faturamentoPeriodoAtual",
      formatarValor(somarValores(vendasFiltradas))
    );
    definirTextoIndicador("periodoAnteriorLabel", "Período anterior");
    definirTextoIndicador("periodoAtualLabel", "Período selecionado");
    atualizarIndicadorTendencia("variacaoPeriodoTendencia", null);
    return;
  }

  const filtrosComparacao = {
    ...filtrosAplicados,
    ...intervaloAnterior
  };

  const vendasAnteriores = filtrarVendas(todasVendas, filtrosComparacao);

  const faturamentoAtual = somarValores(vendasFiltradas);
  const faturamentoAnterior = somarValores(vendasAnteriores);

  const variacao = calcularVariacaoPercentual(
    faturamentoAtual,
    faturamentoAnterior
  );

  const dataInicialAtual = formatarData(filtrosAplicados.dataInicial);
  const dataFinalAtual = formatarData(filtrosAplicados.dataFinal);

  const dataInicialAnterior = formatarData(intervaloAnterior.dataInicial);
  const dataFinalAnterior = formatarData(intervaloAnterior.dataFinal);

  definirTextoIndicador(
    "variacaoPeriodoPercentual",
    formatarPercentual(variacao)
  );

  definirTextoIndicador(
    "variacaoPeriodoDescricao",
    "Comparação com o período imediatamente anterior, de mesma duração"
  );

  definirTextoIndicador(
    "periodoAnteriorLabel",
    `Período anterior: ${dataInicialAnterior} a ${dataFinalAnterior}`
  );

  definirTextoIndicador(
    "periodoAtualLabel",
    `Período selecionado: ${dataInicialAtual} a ${dataFinalAtual}`
  );

  definirTextoIndicador(
    "faturamentoPeriodoAnterior",
    formatarValor(faturamentoAnterior)
  );

  definirTextoIndicador(
    "faturamentoPeriodoAtual",
    formatarValor(faturamentoAtual)
  );

  atualizarIndicadorTendencia("variacaoPeriodoTendencia", variacao);
}

function preencherGraficoComparacaoAnual() {
  const canvas = document.getElementById("graficoComparacaoAnual");
  if (!canvas) return;

  const anoA = Number(document.getElementById("anoComparacaoA")?.value);
  const anoB = Number(document.getElementById("anoComparacaoB")?.value);

  if (!anoA || !anoB) {
    destruirGrafico("comparacaoAnual");
    return;
  }

  const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];

  function obterValores(ano) {
    const valores = Array(12).fill(0);

    
const vendasComparacao = filtrarVendas(todasVendas, {
  ...filtrosAplicados,
  dataInicial: "",
  dataFinal: ""
});

vendasComparacao.forEach(venda => {

      const data = obterDataVenda(venda);
      if (!data || Number(data.slice(0, 4)) !== ano) return;

      valores[Number(data.slice(5, 7)) - 1] += valorNumerico(venda.valor);
    });

    return valores;
  }

  criarGrafico("comparacaoAnual", "graficoComparacaoAnual", {
    type: "line",
    data: {
      labels: meses,
      datasets: [
        {
          label: String(anoA),
          data: obterValores(anoA),
          borderColor: CORES.primaria,
          backgroundColor: "rgba(57,124,159,0.08)",
          borderWidth: 2.5,
          tension: 0.25,
          pointRadius: 3,
          pointHoverRadius: 5
        },
        {
          label: String(anoB),
          data: obterValores(anoB),
          borderColor: CORES.destaque,
          backgroundColor: "rgba(214,166,101,0.08)",
          borderWidth: 2.5,
          tension: 0.25,
          pointRadius: 3,
          pointHoverRadius: 5
        }
      ]
    },
    options: {
      ...configuracaoBase(),
      interaction: {
        mode: "index",
        intersect: false
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false }
        },
        y: {
          ...configuracaoEixo(),
          ticks: {
            callback: valor => numero.format(valor)
          }
        }
      },
      plugins: {
        ...configuracaoBase().plugins,
        tooltip: {
          callbacks: {
            label: contexto => `${contexto.dataset.label}: ${formatarValor(contexto.parsed.y)}`
          }
        }
      }
    }
  });
}

function preencherAnaliseProdutos() {
  const produtos = new Map();

  vendasFiltradas.forEach(venda => {
    const nome = venda.produto || "Não informado";

    if (!produtos.has(nome)) {
      produtos.set(nome, { nome, faturamento: 0, quantidade: 0 });
    }

    const produto = produtos.get(nome);
    produto.faturamento += valorNumerico(venda.valor);
    produto.quantidade += valorNumerico(venda.quantidade);
  });

  const lista = [...produtos.values()];
  const porFaturamento = [...lista].sort((a, b) => b.faturamento - a.faturamento);
  const porQuantidade = [...lista].sort((a, b) => b.quantidade - a.quantidade);
  const total = somarValores(vendasFiltradas);

  const liderFaturamento = porFaturamento[0];
  const liderQuantidade = porQuantidade[0];

  definirTextoIndicador("produtoMaiorFaturamento", liderFaturamento?.nome || "—");
  definirTextoIndicador("produtoMaiorFaturamentoValor", liderFaturamento ? formatarValor(liderFaturamento.faturamento) : "—");
  definirTextoIndicador("produtoMaisVendido", liderQuantidade?.nome || "—");
  definirTextoIndicador("produtoMaisVendidoQuantidade", liderQuantidade ? `${numero.format(liderQuantidade.quantidade)} unidades` : "—");
  definirTextoIndicador("produtoMaiorParticipacao", liderFaturamento?.nome || "—");
  definirTextoIndicador("produtoMaiorParticipacaoValor", liderFaturamento && total ? formatarPercentual(liderFaturamento.faturamento / total * 100) : "—");

  const intervaloAnterior = obterIntervaloAnterior(filtrosAplicados);

  if (!intervaloAnterior) {
    definirTextoIndicador("produtoMaiorQueda", "—");
    definirTextoIndicador("produtoMaiorQuedaValor", "Selecione um período para comparar");
    return;
  }

  const vendasAnteriores = filtrarVendas(todasVendas, {
    ...filtrosAplicados,
    ...intervaloAnterior
  });

  const anteriores = new Map();

  vendasAnteriores.forEach(venda => {
    anteriores.set(
      venda.produto,
      (anteriores.get(venda.produto) || 0) + valorNumerico(venda.valor)
    );
  });

  const quedas = [];

  anteriores.forEach((valorAnterior, nome) => {
    if (valorAnterior <= 0) return;

    const atual = produtos.get(nome)?.faturamento || 0;
    const variacao = calcularVariacaoPercentual(atual, valorAnterior);

    if (variacao < 0) quedas.push({ nome, variacao });
  });

  quedas.sort((a, b) => a.variacao - b.variacao);

  definirTextoIndicador("produtoMaiorQueda", quedas[0]?.nome || "Nenhuma queda identificada");
  definirTextoIndicador("produtoMaiorQuedaValor", quedas.length ? formatarPercentual(quedas[0].variacao) : "—");
}

function preencherResumoRegional() {
  const estado = inteligenciaComercial.estadoSelecionado || filtrosAplicados.estado || "";

  const vendasEstado = estado
    ? vendasFiltradas.filter(venda => venda.estado === estado)
    : vendasFiltradas;

  const faturamento = somarValores(vendasEstado);
  const total = somarValores(vendasFiltradas);

  definirTextoIndicador(
    "estadoMapaSelecionado",
    estado || "Todos os estados"
  );

  definirTextoIndicador(
    "faturamentoEstadoSelecionado",
    formatarValor(faturamento)
  );

  definirTextoIndicador(
    "participacaoEstadoSelecionado",
    total ? formatarPercentual((faturamento / total) * 100) : "—"
  );

  const botao = document.getElementById("limparSelecaoMapa");

  if (botao) {
    botao.hidden = !inteligenciaComercial.estadoSelecionado;
  }
}

function atualizarInteligenciaComercial() {
  atualizarSeletoresAnuais();
  preencherCrescimentoAnual();
  preencherComparacaoPeriodo();
  preencherGraficoComparacaoAnual();
  preencherAnaliseProdutos();
  preencherResumoRegional();
  atualizarCategoriasTabela();
  atualizarSugestoesCadastro();
}

function atualizarCategoriasTabela() {
  const select = document.getElementById("filtroCategoriaTabela");
  if (!select) return;

  const selecionada = select.value;
  const categorias = [...new Set(vendasFiltradas.map(venda => venda.categoria).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  select.replaceChildren(new Option("Todas as categorias", ""));

  categorias.forEach(categoria => {
    select.add(new Option(categoria, categoria));
  });

  select.value = categorias.includes(selecionada) ? selecionada : "";
}

function atualizarSugestoesCadastro() {
  const configuracoes = [
    ["sugestoesProdutos", "produto"],
    ["sugestoesCategorias", "categoria"]
  ];

  configuracoes.forEach(([id, propriedade]) => {
    const lista = document.getElementById(id);
    if (!lista) return;

    lista.replaceChildren();

    [...new Set(todasVendas.map(venda => venda[propriedade]).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .forEach(valor => {
        const opcao = document.createElement("option");
        opcao.value = valor;
        lista.appendChild(opcao);
      });
  });
}

async function aplicarPeriodoRapido() {
  const seletor = document.getElementById("periodoRapido");
  const inicial = document.getElementById("data-inicial");
  const final = document.getElementById("data-final");

  

  if (!seletor || !inicial || !final) return;

    const opcao = seletor.value;
    const aviso = document.getElementById("avisoPeriodoPersonalizado");

    if (aviso) {
      aviso.hidden = opcao !== "personalizado";
    }

    if (opcao === "personalizado") return;

  if (opcao === "todos") {
    inicial.value = "";
    final.value = "";

    await aplicarTodosFiltros();
    return;
  }

  const agora = new Date();
  const hoje = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate()
  );

  const inicio = new Date(hoje);
  const fim = new Date(hoje);

  if (["7", "30", "90"].includes(opcao)) {
    inicio.setDate(inicio.getDate() - Number(opcao) + 1);
  } else if (opcao === "ano-atual") {
    inicio.setMonth(0, 1);
  } else if (opcao === "ano-anterior") {
    inicio.setFullYear(inicio.getFullYear() - 1, 0, 1);
    fim.setFullYear(fim.getFullYear() - 1, 11, 31);
  }

  const formatarLocal = data => [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, "0"),
    String(data.getDate()).padStart(2, "0")
  ].join("-");

  inicial.value = formatarLocal(inicio);
  final.value = formatarLocal(fim);

  await aplicarTodosFiltros();
}

function obterDataLocalAtual() {
  const agora = new Date();
  return [
    agora.getFullYear(),
    String(agora.getMonth() + 1).padStart(2, "0"),
    String(agora.getDate()).padStart(2, "0")
  ].join("-");
}

function configurarDataCadastro() {
  const campo = document.getElementById("dataVendaForm");
  if (!campo) return;

  const id = document.getElementById("venda-id")?.value;

  if (id) {
    const venda = todasVendas.find(item => String(item.id) === String(id));
    campo.value = venda ? obterDataVenda(venda) : obterDataLocalAtual();
  } else {
    campo.value = obterDataLocalAtual();
  }
}

function configurarFiltrosTabela() {
  const select = document.getElementById("filtroCategoriaTabela");
  if (!select) return;

  select.addEventListener("change", () => {
    paginaAtual = 1;
    atualizarTabela();
  });
}

function configurarComparacaoAnual() {
  ["anoComparacaoA", "anoComparacaoB"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", () => {
      preencherCrescimentoAnual();
      preencherGraficoComparacaoAnual();
    });
  });
}

function configurarSelecaoRegional() {
  document.getElementById("limparSelecaoMapa")?.addEventListener("click", () => {
    inteligenciaComercial.estadoSelecionado = "";
    preencherResumoRegional();
  });
}



function configurarRelatoriosPersonalizados() {
  const modal = document.getElementById("relatoriosModal");
  const abrir = document.getElementById("abrirRelatorios");
  const fechar = document.getElementById("fecharRelatorios");
  const cancelar = document.getElementById("cancelarRelatorios");
  const formulario = document.getElementById("formRelatorios");

  if (!modal || !formulario) return;

  const fecharModal = () => {
    modal.style.display = "none";
    document.body.style.overflow = "";
  };

  abrir?.addEventListener("click", () => {
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  });

  fechar?.addEventListener("click", fecharModal);
  cancelar?.addEventListener("click", fecharModal);

  modal.addEventListener("click", evento => {
    if (evento.target === modal) fecharModal();
  });

  formulario.addEventListener("submit", evento => {
    evento.preventDefault();

    const formato = document.getElementById("relatorioFormato")?.value;

    const tiposRelatorio = {
      geral: "geral",
      produtos: "produto",
      produto: "produto",
      categorias: "categoria",
      categoria: "categoria",
      regiao: "regiao",
      regioes: "regiao",
      regional: "regiao",
      anual: "ano",
      ano: "ano"
    };

    const tipoSelecionado = document.getElementById("relatorioTipo")?.value;
    const tipo = tiposRelatorio[tipoSelecionado];
    console.log("Tipo selecionado:", tipo);
    console.log("Formato selecionado:", formato);

    if (!["geral", "produto", "categoria", "regiao", "ano"].includes(tipo)) {
      mostrarNotificacao(
        "Relatório inválido",
        "Selecione um modelo de relatório válido.",
        "aviso"
      );
      return;
    }

    if (!["pdf", "excel"].includes(formato)) {
      mostrarNotificacao(
        "Formato inválido",
        "Selecione PDF ou Excel.",
        "aviso"
      );
      return;
    }

    if (tipo !== "geral") {
      const exportador = formato === "excel"
        ? exportarExcelPersonalizado
        : exportarPDFPersonalizado;

      if (typeof exportador !== "function") {
        mostrarNotificacao(
          "Exportador indisponível",
          "As funções de relatórios personalizados não foram carregadas.",
          "erro"
        );
        return;
      }

      fecharModal();
      exportador(tipo);
      return;
    }

    fecharModal();

    if (formato === "excel") {
      exportarExcel();
    } else {
      exportarPDF();
    }
  });
}


function configurarControlesEvolucao() {
  document.getElementById("intervaloGrafico")?.addEventListener("change", evento => {
    inteligenciaComercial.intervaloGrafico = evento.target.value;
    preencherEvolucaoAvancada();
  });

  document.getElementById("compararAnosGrafico")?.addEventListener("change", evento => {
    inteligenciaComercial.compararAnos = evento.target.checked;
    preencherEvolucaoAvancada();
  });

  const botaoAno = document.querySelector('#controleAgrupamento [data-periodo="ano"]');

  botaoAno?.addEventListener("click", () => {
    agrupamentoAtual = "ano";

    document.querySelectorAll("#controleAgrupamento .chart-segment").forEach(botao => {
      const ativo = botao.dataset.periodo === "ano";
      botao.classList.toggle("active", ativo);
      botao.setAttribute("aria-pressed", String(ativo));
    });

    preencherEvolucaoAvancada();
  });
}

function preencherEvolucaoAvancada() {
  const canvas = document.getElementById("mapaCalor");
  if (!canvas) return;

  const meses = Number(inteligenciaComercial.intervaloGrafico);
  let vendas = [...vendasFiltradas];

  if (Number.isFinite(meses) && meses > 0) {
    const datas = vendas
      .map(obterDataVenda)
      .filter(Boolean)
      .sort();

    if (datas.length) {
      const limite = new Date(`${datas[datas.length - 1]}T12:00:00Z`);
      limite.setUTCMonth(limite.getUTCMonth() - meses);

      vendas = vendas.filter(venda => {
        const data = obterDataVenda(venda);
        return data && new Date(`${data}T12:00:00Z`) >= limite;
      });
    }
  }

  if (agrupamentoAtual !== "ano" && !inteligenciaComercial.compararAnos) {
    preencherGraficoArea(vendas);
    return;
  }

  const grupos = new Map();

  vendas.forEach(venda => {
    const data = obterDataVenda(venda);
    if (!data) return;

    const chave = data.slice(0, 4);
    grupos.set(chave, (grupos.get(chave) || 0) + valorNumerico(venda.valor));
  });

  const anos = [...grupos.keys()].sort();

  criarGrafico("evolucao", "mapaCalor", {
    type: "line",
    data: {
      labels: anos,
      datasets: [{
        label: "Faturamento anual",
        data: anos.map(ano => grupos.get(ano)),
        borderColor: CORES.primaria,
        backgroundColor: "rgba(57,124,159,0.12)",
        borderWidth: 2.5,
        fill: true,
        tension: 0.2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      ...configuracaoBase(),
      scales: {
        x: {
          grid: { display: false }
        },
        y: {
          ...configuracaoEixo(),
          ticks: {
            callback: valor => numero.format(valor)
          }
        }
      },
      plugins: {
        ...configuracaoBase().plugins,
        tooltip: {
          callbacks: {
            label: contexto => formatarValor(contexto.parsed.y)
          }
        }
      }
    }
  });

  const container = document.getElementById("evolucaoChart");
  if (container) container.style.width = "100%";

  definirTextoIndicador("totalEvolucao", formatarValor(somarValores(vendas)));
}

function configurarInteligenciaComercial() {
  document.getElementById("periodoRapido")?.addEventListener("change", aplicarPeriodoRapido);

  ["data-inicial", "data-final"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", () => {
      const seletor = document.getElementById("periodoRapido");
      if (seletor) seletor.value = "personalizado";
    });
  });

  configurarFiltrosTabela();
  configurarComparacaoAnual();
  configurarSelecaoRegional();
  configurarRelatoriosPersonalizados();
  configurarControlesEvolucao();
}

const atualizarDashboardFiltradoOriginal = atualizarDashboardFiltrado;

atualizarDashboardFiltrado = async function() {
  await atualizarDashboardFiltradoOriginal();
  atualizarInteligenciaComercial();
};

const abrirFormVendaOriginal = abrirFormVenda;

abrirFormVenda = function(venda = null) {
  abrirFormVendaOriginal(venda);
  configurarDataCadastro();
};

const obterVendasPesquisadasOriginal = obterVendasPesquisadas;

obterVendasPesquisadas = function() {
  const vendas = obterVendasPesquisadasOriginal();
  const categoria = document.getElementById("filtroCategoriaTabela")?.value;

  return categoria
    ? vendas.filter(venda => venda.categoria === categoria)
    : vendas;
};

document.addEventListener("DOMContentLoaded", () => {
  configurarInteligenciaComercial();
});

function configurarEventos() {
  $("#abrirFiltros").addEventListener("click", alternarFiltros);
  $("#mobileMenuButton").addEventListener("click", alternarMenuMobile);
  $("#mobileSidebarOverlay").addEventListener("click", fecharMenuMobile);

  $("#formVenda").addEventListener("submit", salvarVenda);

  $("#cep").addEventListener("input", evento => {
    aplicarMascaraCEP(evento.target);
  });

  $("#btnCancelarExclusao").addEventListener("click", fecharConfirmacaoExclusao);

  $("#btnConfirmarExclusao").addEventListener("click", () => {
    executarExclusao();
  });

  $("#formVendaModal").addEventListener("click", evento => {
    if (evento.target.id === "formVendaModal") fecharFormVenda();
  });

  $("#confirmarExclusaoModal").addEventListener("click", evento => {
    if (evento.target.id === "confirmarExclusaoModal") {
      fecharConfirmacaoExclusao();
    }
  });

  document.addEventListener("keydown", evento => {
    if (evento.key !== "Escape") return;

    if ($("#confirmarExclusaoModal").style.display === "flex") {
      fecharConfirmacaoExclusao();
    } else if ($("#formVendaModal").style.display === "flex") {
      fecharFormVenda();
    } else {
      fecharMenuMobile();
    }
  });

$("#filtro-pais").addEventListener("change", () => {
  $("#filtro-estado").value = "";
  $("#filtro-cidade").value = "";
  preencherFiltrosGeograficos(todasVendas);
  aplicarTodosFiltros();
});

$("#filtro-estado").addEventListener("change", () => {
  $("#filtro-cidade").value = "";
  preencherFiltrosGeograficos(todasVendas);
  aplicarTodosFiltros();
});

[
  "data-inicial",
  "data-final",
  "categoria",
  "filtro-cidade"
].forEach(id => {
  document.getElementById(id).addEventListener(
    "change",
    aplicarTodosFiltros
  );
});

  $("#limparFiltrosAtivos").addEventListener("click", limparTodosFiltros);

  $("#buscaVendas").addEventListener("input", () => {
    paginaAtual = 1;
    atualizarTabela();
  });

  $("#limparBuscaVendas").addEventListener("click", () => {
    $("#buscaVendas").value = "";
    paginaAtual = 1;
    atualizarTabela();
    $("#buscaVendas").focus();
  });

  $("#limparBuscaSemResultados").addEventListener("click", () => {
    $("#buscaVendas").value = "";
    paginaAtual = 1;
    atualizarTabela();
  });

  $("#ordenacaoVendas").addEventListener("change", () => {
    paginaAtual = 1;
    atualizarTabela();
  });

  $("#itensPorPagina").addEventListener("change", () => {
    paginaAtual = 1;
    atualizarTabela();
  });

  $("#paginaAnterior").addEventListener("click", () => {
    if (paginaAtual > 1) {
      paginaAtual--;
      atualizarTabela();
    }
  });

  $("#proximaPagina").addEventListener("click", () => {
    const total = Math.ceil(vendasTabela.length / itensPorPagina);

    if (paginaAtual < total) {
      paginaAtual++;
      atualizarTabela();
    }
  });

$$("#controleAgrupamento .chart-segment").forEach(botao => {
  botao.addEventListener("click", () => {
    const periodo = botao.dataset.periodo;

    if (!["dia", "semana", "mes"].includes(periodo)) return;

    agrupamentoAtual = periodo;

    $$("#controleAgrupamento .chart-segment").forEach(item => {
      const ativo = item.dataset.periodo === periodo;

      item.classList.toggle("active", ativo);
      item.setAttribute("aria-pressed", String(ativo));
    });

preencherEvolucaoAvancada();
  });
});

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) fecharMenuMobile();

    if (mapaLeaflet) {
      requestAnimationFrame(() => mapaLeaflet.invalidateSize());
    }
  });

  configurarNavegacao();
}


function obterDadosRelatorioPersonalizado(tipo) {
  const vendas = [...vendasFiltradas];
  const totalGeral = somarValores(vendas);
  const grupos = new Map();

  const configuracoes = {
    produto: {
      titulo: "Relatório por Produto",
      colunas: ["Produto", "Quantidade", "Transações", "Faturamento", "Participação"],
      chave: venda => venda.produto || "Não informado"
    },
    categoria: {
      titulo: "Relatório por Categoria",
      colunas: ["Categoria", "Quantidade", "Transações", "Faturamento", "Participação"],
      chave: venda => venda.categoria || "Não informada"
    },
    regiao: {
      titulo: "Relatório por Região",
      colunas: ["País", "Estado", "Cidade", "Quantidade", "Transações", "Faturamento", "Participação"],
      chave: venda => JSON.stringify([
        venda.pais || "Não informado",
        venda.estado || "Não informado",
        venda.cidade || "Não informada"
      ])
    },
    ano: {
      titulo: "Relatório por Ano",
      colunas: ["Ano", "Quantidade", "Transações", "Faturamento", "Variação anual"],
      chave: venda => obterDataVenda(venda).slice(0, 4)
    }
  };

  const configuracao = configuracoes[tipo];

  if (!configuracao) {
    throw new Error("Tipo de relatório inválido.");
  }

  vendas.forEach(venda => {
    const chave = configuracao.chave(venda);

    if (!chave) return;

    if (!grupos.has(chave)) {
      grupos.set(chave, {
        chave,
        quantidade: 0,
        transacoes: 0,
        faturamento: 0
      });
    }

    const grupo = grupos.get(chave);

    grupo.quantidade += valorNumerico(venda.quantidade);
    grupo.transacoes += 1;
    grupo.faturamento += valorNumerico(venda.valor);
  });

  const registros = [...grupos.values()];

  if (tipo === "ano") {
    registros.sort((a, b) => Number(a.chave) - Number(b.chave));
  } else {
    registros.sort((a, b) =>
      b.faturamento - a.faturamento ||
      a.chave.localeCompare(b.chave, "pt-BR")
    );
  }

  const linhas = registros.map((grupo, indice) => {
    const participacao = totalGeral
      ? formatarPercentual(grupo.faturamento / totalGeral * 100)
      : "0,0%";

    const dados = [
      numero.format(grupo.quantidade),
      numero.format(grupo.transacoes),
      formatarValor(grupo.faturamento)
    ];

    if (tipo === "regiao") {
      return [
        ...JSON.parse(grupo.chave),
        ...dados,
        participacao
      ];
    }

    if (tipo === "ano") {
      const anterior = registros.find(
        item => Number(item.chave) === Number(grupo.chave) - 1
      );

      let variacao = "Sem ano anterior";

      if (anterior) {
        if (anterior.faturamento === 0 && grupo.faturamento > 0) {
          variacao = `Novo faturamento (+${formatarValor(grupo.faturamento)})`;
        } else if (anterior.faturamento === 0) {
          variacao = "Sem variação";
        } else {
          variacao = formatarPercentual(
            calcularVariacaoPercentual(
              grupo.faturamento,
              anterior.faturamento
            )
          );
        }
      }

      return [grupo.chave, ...dados, variacao];
    }

    return [grupo.chave, ...dados, participacao];
  });

  return {
    tipo,
    titulo: configuracao.titulo,
    colunas: configuracao.colunas,
    linhas,
    vendas,
    totalGeral,
    quantidade: somarQuantidades(vendas),
    transacoes: vendas.length
  };
}

function obterDescricaoFiltrosRelatorio() {
  const filtros = [];

  if (filtrosAplicados.dataInicial) {
    filtros.push(`Início: ${formatarData(filtrosAplicados.dataInicial)}`);
  }

  if (filtrosAplicados.dataFinal) {
    filtros.push(`Fim: ${formatarData(filtrosAplicados.dataFinal)}`);
  }

  if (filtrosAplicados.categoria) {
    filtros.push(`Categoria: ${filtrosAplicados.categoria}`);
  }

  if (filtrosAplicados.pais) {
    filtros.push(`País: ${filtrosAplicados.pais}`);
  }

  if (filtrosAplicados.estado) {
    filtros.push(`Estado: ${filtrosAplicados.estado}`);
  }

  if (filtrosAplicados.cidade) {
    filtros.push(`Cidade: ${filtrosAplicados.cidade}`);
  }

  return filtros.length ? filtros.join(" | ") : "Todos os registros";
}

function exportarExcelPersonalizado(tipo) {
  if (!window.XLSX) {
    mostrarNotificacao(
      "Erro",
      "A biblioteca de Excel não foi carregada.",
      "erro"
    );
    return;
  }

  try {
    const dados = obterDadosRelatorioPersonalizado(tipo);

    if (!dados.vendas.length) {
      mostrarNotificacao(
        "Sem registros",
        "Não existem vendas para os filtros selecionados.",
        "aviso"
      );
      return;
    }

    const livro = XLSX.utils.book_new();

    const resumo = XLSX.utils.aoa_to_sheet([
      ["Relatório", dados.titulo],
      ["Filtros", obterDescricaoFiltrosRelatorio()],
      ["Gerado em", new Date().toLocaleString("pt-BR")],
      [],
      ["Indicador", "Valor"],
      ["Faturamento total", dados.totalGeral],
      ["Produtos vendidos", dados.quantidade],
      ["Transações", dados.transacoes],
      ["Grupos encontrados", dados.linhas.length]
    ]);

    resumo["!cols"] = [
      { wch: 25 },
      { wch: 65 }
    ];

    const planilha = XLSX.utils.aoa_to_sheet([
      dados.colunas,
      ...dados.linhas
    ]);

    planilha["!cols"] = dados.colunas.map(coluna => ({
      wch: Math.max(20, coluna.length + 8)
    }));

    planilha["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: {
          r: dados.linhas.length,
          c: dados.colunas.length - 1
        }
      })
    };

    XLSX.utils.book_append_sheet(livro, resumo, "Resumo");
    XLSX.utils.book_append_sheet(livro, planilha, "Dados");

    XLSX.writeFile(livro, `relatorio_${tipo}.xlsx`);

    mostrarNotificacao(
      "Relatório exportado",
      "O arquivo Excel foi gerado com sucesso.",
      "sucesso",
      3500
    );
  } catch (erro) {
    console.error("Erro ao exportar relatório Excel:", erro);

    mostrarNotificacao(
      "Erro na exportação",
      "Não foi possível gerar o relatório Excel.",
      "erro"
    );
  }
}

function exportarPDFPersonalizado(tipo) {
  if (!window.jspdf?.jsPDF) {
    mostrarNotificacao(
      "Erro",
      "A biblioteca de PDF não foi carregada.",
      "erro"
    );
    return;
  }

  try {
    const dados = obterDadosRelatorioPersonalizado(tipo);

    if (!dados.vendas.length) {
      mostrarNotificacao(
        "Sem registros",
        "Não existem vendas para os filtros selecionados.",
        "aviso"
      );
      return;
    }

    const { jsPDF } = window.jspdf;
    const documento = new jsPDF("landscape", "pt", "a4");

    if (typeof documento.autoTable !== "function") {
      throw new Error("A biblioteca AutoTable não foi carregada.");
    }

    const largura = documento.internal.pageSize.getWidth();

    documento.setFillColor(24, 42, 60);
    documento.rect(0, 0, largura, 90, "F");

    documento.setTextColor(255, 255, 255);
    documento.setFont("helvetica", "bold");
    documento.setFontSize(21);
    documento.text(dados.titulo, 35, 43);

    documento.setFont("helvetica", "normal");
    documento.setFontSize(10);
    documento.text("Dashboard de Vendas | Relatório comercial", 35, 65);

    documento.setTextColor(32, 49, 67);
    documento.setFont("helvetica", "bold");
    documento.setFontSize(11);

    documento.text(
      `Faturamento total: ${formatarValor(dados.totalGeral)}`,
      35,
      119
    );

    documento.text(
      `Produtos vendidos: ${numero.format(dados.quantidade)}`,
      35,
      138
    );

    documento.text(
      `Transações: ${numero.format(dados.transacoes)}`,
      35,
      157
    );

    documento.text(
      `Grupos encontrados: ${numero.format(dados.linhas.length)}`,
      35,
      176
    );

    documento.setFont("helvetica", "normal");
    documento.setFontSize(9);
    documento.setTextColor(110, 125, 140);

    const filtros = documento.splitTextToSize(
      obterDescricaoFiltrosRelatorio(),
      largura - 70
    );

    documento.text(filtros, 35, 198);

    const inicioTabela = 210 + filtros.length * 12;

    documento.autoTable({
      startY: inicioTabela,
      head: [dados.colunas],
      body: dados.linhas,
      theme: "grid",
      headStyles: {
        fillColor: [35, 92, 124],
        textColor: 255,
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [45, 60, 75]
      },
      alternateRowStyles: {
        fillColor: [245, 248, 250]
      },
      margin: {
        left: 35,
        right: 35,
        bottom: 42
      },
      styles: {
        cellPadding: 6,
        overflow: "linebreak"
      }
    });

    const totalPaginas = documento.internal.getNumberOfPages();

    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
      documento.setPage(pagina);
      documento.setFontSize(9);
      documento.setTextColor(120, 135, 150);

      documento.text(
        `Página ${pagina} de ${totalPaginas}`,
        largura - 35,
        documento.internal.pageSize.getHeight() - 20,
        { align: "right" }
      );
    }

    documento.save(`relatorio_${tipo}.pdf`);

    mostrarNotificacao(
      "Relatório exportado",
      "O arquivo PDF foi gerado com sucesso.",
      "sucesso",
      3500
    );
  } catch (erro) {
    console.error("Erro ao exportar relatório PDF:", erro);

    mostrarNotificacao(
      "Erro na exportação",
      "Não foi possível gerar o relatório PDF.",
      "erro"
    );
  }
}



document.addEventListener("DOMContentLoaded", async () => {
  configurarChart();
  configurarEventos();
  atualizarDataAtual();

  filtrosAplicados = {};

  await carregarDashboard();
});
