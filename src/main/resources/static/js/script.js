const API_URL = '/api/vendas';
let graficoBarras, graficoPizza, graficoCalor, graficoProdutosRegiao;
let todasVendas = [];
let graficoVendasEstado;



function preencherGraficoVendasEstado(vendas) {
  const ctx = document.getElementById("graficoVendasEstado");
  
  const vendasPorEstado = vendas.reduce((acc, v) => {
    if (v.estado) {
      acc[v.estado] = (acc[v.estado] || 0) + v.valor;
    }
    return acc;
  }, {});
  
  const estados = Object.keys(vendasPorEstado).sort();
  const valores = estados.map(e => vendasPorEstado[e]);

  if (graficoVendasEstado) graficoVendasEstado.destroy();

  graficoVendasEstado = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: estados,
      datasets: [{
        label: 'Vendas por Estado (R$)',
        data: valores,
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return 'R$ ' + value.toFixed(2);
            }
          }
        },
        x: {
          ticks: {
            font: {
              size: window.innerWidth < 768 ? 9 : 11
            }
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            font: {
              size: window.innerWidth < 768 ? 10 : 12
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return 'R$ ' + context.parsed.y.toFixed(2);
            }
          }
        }
      }
    }
  });
}

document.getElementById('cep').addEventListener('input', function(e) {
  aplicarMascaraCEP(this);
});

document.getElementById('cep').addEventListener('keydown', function(e) {
  if ([46, 8, 9, 27, 13].indexOf(e.keyCode) !== -1 ||
      (e.keyCode === 65 && e.ctrlKey === true) ||
      (e.keyCode === 67 && e.ctrlKey === true) ||
      (e.keyCode === 86 && e.ctrlKey === true) ||
      (e.keyCode === 88 && e.ctrlKey === true) ||
      (e.keyCode >= 35 && e.keyCode <= 39)) {
    return;
  }
  
  if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
    e.preventDefault();
  }
});

async function carregarDashboard() {
  mostrarLoader("Atualizando dashboard", "Carregando dados e gráficos...");
  
  try {
    const categoriaFiltro = document.getElementById("categoria").value;
    const dataInicial = document.getElementById("data-inicial").value;
    const dataFinal = document.getElementById("data-final").value;
    const pais = document.getElementById("filtro-pais").value;
    const estado = document.getElementById("filtro-estado").value;
    const cidade = document.getElementById("filtro-cidade").value;

    const response = await fetch(API_URL);
    let vendas = await response.json();

    if(categoriaFiltro) vendas = vendas.filter(v => v.categoria === categoriaFiltro);
    if(dataInicial) vendas = vendas.filter(v => v.dataVenda >= dataInicial);
    if(dataFinal) vendas = vendas.filter(v => v.dataVenda <= dataFinal);
    if(pais) vendas = vendas.filter(v => v.pais === pais);
    if(estado) vendas = vendas.filter(v => v.estado === estado);
    if(cidade) vendas = vendas.filter(v => v.cidade === cidade);

    todasVendas = vendas; 
    preencherTabela(vendas);
    preencherCards(vendas);
    preencherCategorias(vendas);
    preencherFiltrosGeograficos(vendas);
    preencherCheckboxCategorias(vendas);
    preencherGraficoVendasEstado(vendas);

    preencherGraficoBarras(vendas);
    preencherGraficoPizza(vendas);
    preencherRanking(vendas);
    preencherMapaCalor(vendas);
    preencherGraficoProdutosRegiao(vendas);
    preencherMapaVendas(vendas);

    esconderLoader();
    
    if (categoriaFiltro || dataInicial || dataFinal || pais || estado || cidade) {
      mostrarNotificacao(
        "Filtros Aplicados",
        "Dashboard atualizado com os filtros selecionados.",
        "info",
        3000
      );
    }
  } catch (error) {
    esconderLoader();

    console.error("Erro:", error);
  }
}

function preencherTabela(vendas) {
  const tbody = document.getElementById("tabela-vendas");
  tbody.innerHTML = "";

  vendas.forEach(v => {
    const dataVendaFormatada = v.dataVenda ? v.dataVenda.split("T")[0] : "-";
    const cepFormatado = formatarCEP(v.cep);
    const produtoEscapado = v.produto.replace(/'/g, "\\'");

tbody.innerHTML += `
  <tr>
    <td>${v.id}</td>
    <td>${v.produto}</td>
    <td>${v.categoria}</td>
    <td>${v.quantidade}</td>
    <td>R$ ${v.valor.toFixed(2)}</td>
    <td>${v.cidade || '-'}</td>
    <td>${v.estado || '-'}</td>
    <td>${cepFormatado}</td>
    <td>${dataVendaFormatada}</td>
    <td>
      <button class="btn-acao editar" onclick='abrirFormVenda(${JSON.stringify(v)})' title="Editar venda">
        <i class="fas fa-pencil-alt" style="color: #3498db;"></i>
      </button>
      <button class="btn-acao excluir" onclick="confirmarExclusao(${v.id}, '${produtoEscapado}')" title="Excluir venda">
        <i class="fas fa-trash-alt" style="color: #e74c3c;"></i>
      </button>
    </td>
  </tr>`;
  });
}

let vendaParaExcluir = null;

function confirmarExclusao(vendaId, produtoNome) {
  vendaParaExcluir = vendaId;
  const texto = document.getElementById("confirmarExclusaoTexto");
  texto.textContent = `Tem certeza que deseja excluir a venda do produto "${produtoNome}"? Esta ação não pode ser desfeita.`;
  
  const modal = document.getElementById("confirmarExclusaoModal");
  modal.style.display = "flex";
  
  document.getElementById("btnConfirmarExclusao").onclick = async () => {
    modal.style.display = "none";
    await executarExclusao(vendaParaExcluir);
    vendaParaExcluir = null;
  };
  
  document.getElementById("btnCancelarExclusao").onclick = () => {
    modal.style.display = "none";
    vendaParaExcluir = null;
  };
}

async function executarExclusao(id) {
  mostrarLoader("Excluindo venda", "Aguarde enquanto removemos os dados...");
  
  try {
    const resp = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    
    if (resp.ok) {
      esconderLoader();
      mostrarNotificacao(
        "Sucesso!",
        "Venda excluída com sucesso.",
        "sucesso",
        3000
      );
      await carregarDashboard();
    } else {
      esconderLoader();
      mostrarNotificacao(
        "Erro",
        "Não foi possível excluir a venda. Tente novamente.",
        "erro",
        5000
      );
    }
  } catch (error) {
    esconderLoader();
    mostrarNotificacao(
      "Erro de Conexão",
      "Não foi possível conectar ao servidor.",
      "erro",
      5000
    );
    console.error("Erro:", error);
  }
}
function preencherCards(vendas) {
  const containerGeral = document.getElementById("cards-metricas");

  const totalVendas = vendas.reduce((acc, v) => acc + v.valor, 0);
  const totalProdutos = vendas.reduce((acc, v) => acc + v.quantidade, 0);
  const ticketMedio = vendas.length ? (totalVendas / vendas.length).toFixed(2) : 0;

  const categoriaMaisVendida = vendas.length
    ? vendas.reduce((a, b, i, arr) =>
        arr.filter(x => x.categoria === b.categoria).length >
        arr.filter(x => x.categoria === a.categoria).length ? b : a, {categoria:""}
      ).categoria
    : "-";

  containerGeral.innerHTML = `
    <div class="card">
      <div class="card-icon"><i class="bi bi-currency-dollar"></i></div>
      <div class="card-info">
        <h3>Total Vendas</h3>
        <p>R$ ${totalVendas.toFixed(2)}</p>
      </div>
    </div>
    <div class="card">
      <div class="card-icon"><i class="bi bi-box-seam"></i></div>
      <div class="card-info">
        <h3>Total Produtos</h3>
        <p>${totalProdutos}</p>
      </div>
    </div>
    <div class="card">
      <div class="card-icon"><i class="bi bi-receipt"></i></div>
      <div class="card-info">
        <h3>Ticket Médio</h3>
        <p>R$ ${ticketMedio}</p>
      </div>
    </div>
    <div class="card">
      <div class="card-icon"><i class="bi bi-trophy"></i></div>
      <div class="card-info">
        <h3>Categoria Mais Vendida</h3>
        <p>${categoriaMaisVendida}</p>
      </div>
    </div>
  `;
}

function preencherGraficoBarras(vendas) {
  const ctx = document.getElementById("graficoBarras");
  const labels = vendas.map(v=>v.produto);
  const data = vendas.map(v=>v.valor);

  if(graficoBarras) graficoBarras.destroy();
  graficoBarras = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets:[{label:"Valor (R$)", data, backgroundColor:"rgba(75,192,192,0.6)"}] },
    options: { 
      responsive: true,
      maintainAspectRatio: false,
      scales:{ y:{beginAtZero:true} },
      plugins: {
        legend: {
          labels: {
            font: {
              size: window.innerWidth < 768 ? 10 : 12
            }
          }
        }
      }
    }
  });
}

function preencherGraficoPizza(vendas) {
  const ctx = document.getElementById("graficoPizza");
  const categorias = [...new Set(vendas.map(v=>v.categoria))];
  const valores = categorias.map(c => vendas.filter(v=>v.categoria===c).reduce((acc,v)=>acc+v.valor,0));

  if(graficoPizza) graficoPizza.destroy();
  graficoPizza = new Chart(ctx, {
    type:"pie",
    data:{ labels:categorias, datasets:[{data:valores, backgroundColor:["#4CAF50","#FF6384","#36A2EB","#FFCE56"]}] },
    options:{ 
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: window.innerWidth < 768 ? 'bottom' : 'right',
          labels: {
            font: {
              size: window.innerWidth < 768 ? 10 : 12
            }
          }
        }
      }
    }
  });
}

function preencherCategorias(vendas) {
  const select = document.getElementById("categoria");
  const categorias = [...new Set(vendas.map(v=>v.categoria))];
  select.innerHTML = '<option value="">Todas</option>';
  categorias.forEach(c => select.innerHTML += `<option value="${c}">${c}</option>`);
}

function preencherCheckboxCategorias(vendas) {
  const container = document.getElementById("checkbox-categorias");
  const categorias = [...new Set(vendas.map(v=>v.categoria))];
  container.innerHTML = '';

  categorias.forEach(c => {
    const id = `chk-${c}`;
    container.innerHTML += `
      <div class="checkbox-item">
        <input type="checkbox" id="${id}" checked onchange="filtrarSeries()">
        <label for="${id}">${c}</label>
      </div>
    `;
  });
}

function preencherFiltrosGeograficos(vendas) {
  const paises = [...new Set(vendas.map(v=>v.pais).filter(Boolean))];
  const estados = [...new Set(vendas.map(v=>v.estado).filter(Boolean))];
  const cidades = [...new Set(vendas.map(v=>v.cidade).filter(Boolean))];

  const selectPais = document.getElementById("filtro-pais");
  const selectEstado = document.getElementById("filtro-estado");
  const selectCidade = document.getElementById("filtro-cidade");

  selectPais.innerHTML = '<option value="">Todos</option>';
  selectEstado.innerHTML = '<option value="">Todos</option>';
  selectCidade.innerHTML = '<option value="">Todas</option>';

  paises.forEach(p => selectPais.innerHTML += `<option value="${p}">${p}</option>`);
  estados.forEach(e => selectEstado.innerHTML += `<option value="${e}">${e}</option>`);
  cidades.forEach(c => selectCidade.innerHTML += `<option value="${c}">${c}</option>`);
}

async function aplicarTodosFiltros() {
  const botao = document.querySelector('.btn-filtro');
  const textoOriginal = botao.innerHTML;
  mostrarLoaderBotao(botao, textoOriginal);
  
  try {
    const categoriaFiltro = document.getElementById("categoria").value;
    const dataInicial = document.getElementById("data-inicial").value;
    const dataFinal = document.getElementById("data-final").value;
    const pais = document.getElementById("filtro-pais").value;
    const estado = document.getElementById("filtro-estado").value;
    const cidade = document.getElementById("filtro-cidade").value;

    const checkboxes = document.querySelectorAll('#checkbox-categorias input[type="checkbox"]');
    const categoriasSelecionadas = Array.from(checkboxes)
                                       .filter(c => c.checked)
                                       .map(c => c.id.replace('chk-', ''));

    let filtrado = todasVendas;

    if (categoriaFiltro) filtrado = filtrado.filter(v => v.categoria === categoriaFiltro);
    if (dataInicial) filtrado = filtrado.filter(v => v.dataVenda >= dataInicial);
    if (dataFinal) filtrado = filtrado.filter(v => v.dataVenda <= dataFinal);
    if (pais) filtrado = filtrado.filter(v => v.pais === pais);
    if (estado) filtrado = filtrado.filter(v => v.estado === estado);
    if (cidade) filtrado = filtrado.filter(v => v.cidade === cidade);
    
    if (categoriasSelecionadas.length > 0) {
      filtrado = filtrado.filter(v => categoriasSelecionadas.includes(v.categoria));
    }

    preencherTabela(filtrado);
    preencherCards(filtrado);
    preencherGraficoBarras(filtrado);
    preencherGraficoPizza(filtrado);
    preencherRanking(filtrado);
    preencherMapaCalor(filtrado);
    preencherGraficoProdutosRegiao(filtrado);
    preencherMapaVendas(filtrado);
    preencherGraficoVendasEstado(filtrado);

    
    esconderLoaderBotao(botao);
    mostrarNotificacao(
      "Filtros Aplicados",
      "Todos os filtros foram aplicados com sucesso!",
      "sucesso",
      3000
    );
  } catch (error) {
    esconderLoaderBotao(botao);
 mostrarNotificacao(
      "Filtros Aplicados",
      "Todos os filtros foram aplicados com sucesso!",
      "sucesso",
      3000
    );
    console.error("Erro:", error);
  }
}


function filtrarSeries() {
  const checkboxes = document.querySelectorAll('#checkbox-categorias input[type="checkbox"]');
  const selecionadas = Array.from(checkboxes)
                            .filter(c => c.checked)
                            .map(c => c.id.replace('chk-', ''));
  const dataFiltrada = todasVendas.filter(v => selecionadas.includes(v.categoria));
  
  preencherCards(dataFiltrada);
  preencherTabela(dataFiltrada);
  preencherGraficoBarras(dataFiltrada);
  preencherGraficoPizza(dataFiltrada);
  preencherRanking(dataFiltrada);
  preencherMapaCalor(dataFiltrada);
  preencherGraficoProdutosRegiao(dataFiltrada);
  preencherMapaVendas(dataFiltrada);
  preencherGraficoVendasEstado(dataFiltrada);


  preencherFiltrosGeograficos(dataFiltrada);
}

function preencherRanking(vendas) {
  const ranking = vendas.reduce((acc, v) => {
    acc[v.produto] = (acc[v.produto] || 0) + v.valor;
    return acc;
  }, {});
  
  const rankingOrdenado = Object.entries(ranking)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  const ol = document.getElementById("ranking-produtos");
  ol.innerHTML = '';
  
  rankingOrdenado.forEach(([produto, valor], index) => {
    const posicao = index + 1;
    ol.innerHTML += `
      <li>
        <span class="ranking-posicao">${posicao}.</span>
        <span class="ranking-produto">${produto}</span>
        <span class="ranking-valor">R$ ${valor.toFixed(2)}</span>
      </li>
    `;
  });
}
function preencherMapaCalor(vendas) {
  const ctx = document.getElementById("mapaCalor");
  
  function formatarDataHora(dataISO) {
    const d = new Date(dataISO);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  const datas = [...new Set(vendas.map(v => v.dataVenda))].sort();
  const datasFormatadas = datas.map(d => formatarDataHora(d));
  const valores = datas.map(d => vendas.filter(v => v.dataVenda === d).reduce((acc, v) => acc + v.valor, 0));

  if (graficoCalor) graficoCalor.destroy();
  
  graficoCalor = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: datasFormatadas,
      datasets: [{
        label: "Vendas por Dia/Hora",
        data: valores,
        backgroundColor: valores.map(v => `rgba(255,0,0,${v / Math.max(...valores)})`)
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { 
        y: { 
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return 'R$ ' + value.toFixed(2);
            }
          }
        },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            font: {
              size: window.innerWidth < 768 ? 8 : 10
            }
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            font: {
              size: window.innerWidth < 768 ? 10 : 12
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return 'R$ ' + context.parsed.y.toFixed(2);
            }
          }
        }
      }
    }
  });
}

function preencherGraficoProdutosRegiao(vendas) {
  const ctx = document.getElementById("graficoProdutosRegiao");
  if (!ctx) {
    console.warn('Elemento graficoProdutosRegiao não encontrado');
    return;
  }

  const vendasPorProdutoEstado = {};
  const produtosSet = new Set();

  vendas.forEach(v => {
    if(v.estado){
      vendasPorProdutoEstado[v.estado] = vendasPorProdutoEstado[v.estado] || {};
      vendasPorProdutoEstado[v.estado][v.produto] = (vendasPorProdutoEstado[v.estado][v.produto] || 0) + v.valor;
      produtosSet.add(v.produto);
    }
  });

  const produtos = Array.from(produtosSet);
  const estados = Object.keys(vendasPorProdutoEstado);
  const datasets = estados.map((estado, i) => {
    const data = produtos.map(prod => vendasPorProdutoEstado[estado][prod] || 0);
    return {
      label: estado,
      data,
      backgroundColor: `hsl(${i*50 % 360},70%,50%)`
    };
  });

  if(graficoProdutosRegiao) graficoProdutosRegiao.destroy();

  graficoProdutosRegiao = new Chart(ctx, {
    type: "bar",
    data: { labels: produtos, datasets },
    options: { 
      indexAxis:'y', 
      responsive: true,
      maintainAspectRatio: false,
      scales:{ x:{ beginAtZero:true } },
      plugins: {
        legend: {
          labels: {
            font: {
              size: window.innerWidth < 768 ? 10 : 12
            }
          }
        }
      }
    }
  });
}

function mostrarMensagem(texto, tipo="info") {
  const div = document.getElementById("mensagens");
  div.innerText = texto;
  div.className = "mensagens " + tipo;
  setTimeout(() => { div.innerText = ""; div.className = "mensagens"; }, 4000);
}

function exportarPDF() {
  const vendas = todasVendas; 
  if (!vendas.length) {
    mostrarNotificacao(
      "Aviso",
      "Nenhuma venda para exportar!",
      "warning",
      3000
    );
    return;
  }

  mostrarLoader("Exportando PDF", "Gerando relatório em PDF...");
  
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4'); 
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    function cabecalho() {
      doc.setFillColor(52, 152, 219);
      doc.rect(0, 0, pageWidth, 50, 'F'); 
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text("Dashboard de Vendas", pageWidth / 2, 30, { align: "center" });
    }

    function rodape(paginaAtual, totalPaginas) {
      doc.setFillColor(52, 73, 94);
      doc.rect(0, pageHeight - 30, pageWidth, 30, 'F');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(`Página ${paginaAtual} de ${totalPaginas}`, pageWidth / 2, pageHeight - 12, { align: "center" });
    }

    let y = 70;
    cabecalho();

    const cards = [
      { title: "Total Vendas", value: document.querySelector("#cards-metricas div:nth-child(1) p")?.innerText || "R$ 0,00", color: [46, 204, 113] },
      { title: "Total Produtos", value: document.querySelector("#cards-metricas div:nth-child(2) p")?.innerText || "0", color: [231, 76, 60] },
      { title: "Ticket Médio", value: document.querySelector("#cards-metricas div:nth-child(3) p")?.innerText || "R$ 0,00", color: [241, 196, 15] },
      { title: "Categoria Mais Vendida", value: document.querySelector("#cards-metricas div:nth-child(4) p")?.innerText || "-", color: [52, 152, 219] }
    ];

    const cardWidth = (pageWidth - 80) / 4;
    const cardHeight = 50;

    cards.forEach((c, i) => {
      const x = 40 + i * cardWidth;
      doc.setFillColor(...c.color);
      doc.roundedRect(x, y, cardWidth - 10, cardHeight, 5, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(c.title, x + 5, y + 15);
      doc.setFontSize(12);
      doc.text(c.value, x + 5, y + 35);
    });
    y += cardHeight + 20;

    // Verificar se os gráficos existem antes de tentar exportar
    const graficoBarrasEl = document.getElementById("graficoBarras");
    const graficoPizzaEl = document.getElementById("graficoPizza");
    const mapaCalorEl = document.getElementById("mapaCalor");
    const graficoProdutosRegiaoEl = document.getElementById("graficoProdutosRegiao");

    if (graficoBarrasEl) {
      const graficoBarrasImg = graficoBarrasEl.toDataURL("image/png", 1.0);
      doc.addImage(graficoBarrasImg, 'PNG', 40, y, 250, 200);
    }
    if (graficoPizzaEl) {
      const graficoPizzaImg = graficoPizzaEl.toDataURL("image/png", 1.0);
      doc.addImage(graficoPizzaImg, 'PNG', 300, y, 250, 200);
    }
    y += 220;

    if (mapaCalorEl) {
      const calorImg = mapaCalorEl.toDataURL("image/png", 1.0);
      doc.addImage(calorImg, 'PNG', 40, y, 250, 200);
    }
    if (graficoProdutosRegiaoEl) {
      const produtosRegiaoImg = graficoProdutosRegiaoEl.toDataURL("image/png", 1.0);
      doc.addImage(produtosRegiaoImg, 'PNG', 300, y, 250, 200);
    }
    y += 220;

    if (typeof doc.autoTable === "function") {
      doc.addPage();
      cabecalho();
      const totalPaginas = doc.internal.getNumberOfPages();
      doc.autoTable({ 
        html: '#tabela-vendas', 
        startY: 70, 
        theme: 'grid', 
        headStyles: { fillColor:[52,73,94], textColor:255 },
        styles: { fontSize: 9, cellPadding: 2 },
        didDrawPage: function (data) {
          const paginaAtual = doc.internal.getCurrentPageInfo().pageNumber;
          rodape(paginaAtual, totalPaginas);
        }
      });
    } else { 
      esconderLoader();
      mostrarNotificacao(
        "Erro",
        "jsPDF AutoTable não carregado corretamente!",
        "erro",
        5000
      );
      return; 
    }

    rodape(1, doc.internal.getNumberOfPages());
    
    setTimeout(() => {
      doc.save("dashboard_completo.pdf");
      esconderLoader();
      mostrarNotificacao(
        "Exportação Concluída",
        "Arquivo PDF gerado com sucesso!",
        "sucesso",
        3000
      );
    }, 900);
    
  } catch (error) {
    esconderLoader();
    mostrarNotificacao(
      "Erro na Exportação",
      "Não foi possível exportar o arquivo PDF.",
      "erro",
      5000
    );
    console.error("Erro:", error);
  }
}
async function exportarExcel() {
  const vendas = todasVendas; 
  if (!vendas.length) {
    mostrarNotificacao(
      "Aviso",
      "Nenhuma venda para exportar!",
      "warning",
      3000
    );
    return;
  }

  mostrarLoader("Exportando Excel", "Gerando arquivo de exportação...");
  
  try {
    const wb = XLSX.utils.book_new();
    const wsData = [];

    const cards = [
      { title: "Total Vendas", value: document.querySelector("#cards-metricas div:nth-child(1) p").innerText },
      { title: "Total Produtos", value: document.querySelector("#cards-metricas div:nth-child(2) p").innerText },
      { title: "Ticket Médio", value: document.querySelector("#cards-metricas div:nth-child(3) p").innerText },
      { title: "Categoria Mais Vendida", value: document.querySelector("#cards-metricas div:nth-child(4) p").innerText }
    ];
    
    wsData.push(cards.map(c => c.title));
    wsData.push(cards.map(c => c.value));
    wsData.push([]);

    const headers = ["ID", "Produto", "Categoria", "Quantidade", "Valor (R$)", "Cidade", "Estado", "CEP", "Data Venda"];
    wsData.push(headers);

    vendas.forEach(v => {
      wsData.push([
        v.id,
        v.produto,
        v.categoria,
        v.quantidade,
        v.valor,
        v.cidade || '-',
        v.estado || '-',
        v.cep || '-',
        v.dataVenda ? v.dataVenda.split('T')[0] : '-'
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wpx: 80 },
      { wpx: 150 },
      { wpx: 95 },
      { wpx: 80 },
      { wpx: 80 },
      { wpx: 110 },
      { wpx: 60 },
      { wpx: 70 },
      { wpx: 70 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Dashboard");
    
    setTimeout(() => {
      XLSX.writeFile(wb, "dashboard_vendas.xlsx");
      esconderLoader();
      mostrarNotificacao(
        "Exportação Concluída",
        "Arquivo Excel gerado com sucesso!",
        "sucesso",
        3000
      );
    }, 900);
    
  } catch (error) {
    esconderLoader();
    mostrarNotificacao(
      "Erro na Exportação",
      "Não foi possível exportar o arquivo Excel.",
      "erro",
      5000
    );
    console.error("Erro:", error);
  }
}

function preencherMapaVendas(vendas) {
    const mapa = document.getElementById("mapaVendas");
    
    if (mapa._leaflet_id) {
        mapa._leaflet_map.remove();
    }
    
    const map = L.map(mapa).setView([-23.5505, -46.6333], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data © OpenStreetMap contributors'
    }).addTo(map);

    vendas.forEach(v => {
        if (v.latitude && v.longitude) {
            L.marker([v.latitude, v.longitude])
             .addTo(map)
             .bindPopup(`${v.produto} - ${v.cidade} - R$${v.valor}`);
        }
    });
    
    mapa._leaflet_map = map;
    
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
}

function abrirFormVenda(venda = null) {
  document.getElementById("formVendaModal").style.display = "flex";
  const form = document.getElementById("formVenda");

  if (venda) {
    mostrarLoader("Carregando dados da venda", "Preparando formulário...");
    
    setTimeout(() => {
      document.getElementById("formTitulo").innerText = "Editar Venda";
      document.getElementById("venda-id").value = venda.id;
      document.getElementById("produto").value = venda.produto || "";
      document.getElementById("categoriaForm").value = venda.categoria || "";
      document.getElementById("quantidade").value = venda.quantidade || "";
      document.getElementById("valor").value = venda.valor || "";
      document.getElementById("cidade").value = venda.cidade || "";
      document.getElementById("pais").value = venda.pais || "";
      
      const estadoSelect = document.getElementById("estado");
      if (venda.estado) {
        estadoSelect.value = venda.estado.toUpperCase();
      } else {
        estadoSelect.value = "";
      }
      
      if (venda.cep) {
        let cepFormatado = venda.cep.replace(/\D/g, '');
        if (cepFormatado.length > 5) {
          cepFormatado = cepFormatado.substring(0, 5) + '-' + cepFormatado.substring(5, 8);
        }
        document.getElementById("cep").value = cepFormatado;
      } else {
        document.getElementById("cep").value = "";
      }

      esconderLoader();
    }, 300);

  } else {
    form.reset();
    document.getElementById("venda-id").value = "";
    document.getElementById("formTitulo").innerText = "Cadastrar Venda";
    document.getElementById("estado").value = "";
  }
}

function fecharFormVenda() {
  document.getElementById("formVendaModal").style.display = "none";
  document.getElementById("formVenda").reset();
  
  mostrarNotificacao(
    "Formulário Fechado",
    "As alterações não salvas foram descartadas.",
    "info",
    2000
  );
}

document.getElementById("formVendaModal").addEventListener('click', function(e) {
  if (e.target === this) {
    fecharFormVenda();
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const modalVenda = document.getElementById("formVendaModal");
    if (modalVenda.style.display === "flex") {
      fecharFormVenda();
    }
  }
});

document.getElementById("formVenda").addEventListener("submit", async function(e) {
  e.preventDefault();

  const botaoSalvar = this.querySelector('.btn-salvar');
  const textoOriginal = botaoSalvar.innerHTML;
  mostrarLoaderBotao(botaoSalvar, textoOriginal);
  
  mostrarLoader(
    this.querySelector('#venda-id').value ? "Atualizando venda..." : "Salvando nova venda...",
    "Processando dados..."
  );

  const id = document.getElementById("venda-id").value;

  const agora = new Date();
  const brasil = new Date(agora.getTime() - 3*60*60*1000);

  const ano = brasil.getUTCFullYear();
  const mes = String(brasil.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(brasil.getUTCDate()).padStart(2, '0');
  const hora = String(brasil.getUTCHours()).padStart(2, '0');
  const min = String(brasil.getUTCMinutes()).padStart(2, '0');
  const seg = String(brasil.getUTCSeconds()).padStart(2, '0');

  const dataFormatada = `${ano}-${mes}-${dia}T${hora}:${min}:${seg}`;

  const venda = {
      produto: document.getElementById("produto").value,
      categoria: document.getElementById("categoriaForm").value,
      quantidade: parseInt(document.getElementById("quantidade").value),
      valor: parseFloat(document.getElementById("valor").value),
      cidade: document.getElementById("cidade").value,
      estado: document.getElementById("estado").value,
      pais: document.getElementById("pais").value,
      cep: document.getElementById("cep").value.replace(/\D/g, ''),
      latitude: null,
      longitude: null,
      dataVenda: dataFormatada
  };

  const metodo = id ? "PUT" : "POST";
  const url = id ? `${API_URL}/${id}` : API_URL;

  try {
    const resp = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(venda)
    });

    if (resp.ok) {
      esconderLoader();
      esconderLoaderBotao(botaoSalvar);
      mostrarNotificacao(
        "Sucesso!",
        id ? "Venda atualizada com sucesso!" : "Venda cadastrada com sucesso!",
        "sucesso",
        3000
      );
      fecharFormVenda();
      await carregarDashboard();
    } else {
      esconderLoader();
      esconderLoaderBotao(botaoSalvar);
      mostrarNotificacao(
        "Erro",
        "Não foi possível salvar a venda. Verifique os dados.",
        "erro",
        5000
      );
      const text = await resp.text();
      console.error("Erro:", text);
    }
  } catch (error) {
    esconderLoader();
    esconderLoaderBotao(botaoSalvar);
    mostrarNotificacao(
      "Erro de Conexão",
      "Não foi possível conectar ao servidor.",
      "erro",
      5000
    );
    console.error("Erro:", error);
  }
});

async function obterCoordenadasPorCEP(cep) {
  if (!cep) return null;

  cep = cep.replace(/\D/g,'');

  const url = `https://nominatim.openstreetmap.org/search?q=${cep},Brasil&format=json`;

  try {
    const resposta = await fetch(url, {
      headers: { 'User-Agent': 'Dashboard-Vendas/1.0' }
    });
    const dados = await resposta.json();
    if (dados.length > 0) {
      return [parseFloat(dados[0].lat), parseFloat(dados[0].lon)];
    }
  } catch (err) {
    console.error("Erro ao obter coordenadas:", err);
  }

  return null;
}

async function limparTodosFiltros() {
  const botao = document.querySelector('.btn-filtro.btn-secundario');
  const textoOriginal = botao.innerHTML;
  mostrarLoaderBotao(botao, textoOriginal);
  
  try {
    document.getElementById('data-inicial').value = '';
    document.getElementById('data-final').value = '';
    document.getElementById('categoria').value = '';
    document.getElementById('filtro-pais').value = '';
    document.getElementById('filtro-estado').value = '';
    document.getElementById('filtro-cidade').value = '';
    
    const checkboxes = document.querySelectorAll('#checkbox-categorias input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = true;
    });
    
    await carregarDashboard();
    
    esconderLoaderBotao(botao);
    mostrarNotificacao(
      "Filtros Limpos",
      "Todos os filtros foram resetados.",
      "info",
      3000
    );
  } catch (error) {
    esconderLoaderBotao(botao);
    mostrarNotificacao(
      "Erro",
      "Não foi possível limpar os filtros.",
      "erro",
      5000
    );
    console.error("Erro:", error);
  }
}

function mostrarMensagem(texto, tipo="info") {
  const titulo = tipo === "sucesso" ? "Sucesso!" : 
                 tipo === "erro" ? "Erro" : 
                 tipo === "warning" ? "Atenção" : "Informação";
  
  mostrarNotificacao(titulo, texto, tipo, 4000);
}
function toggleSidebar() {
  if (window.innerWidth < 768) {
    const sidebar = document.querySelector('.sidebar-filtros');
    sidebar.classList.toggle('colapsada');
  }
}

function aplicarMascaraCEP(input) {
  let cep = input.value.replace(/\D/g, '');
  cep = cep.substring(0, 8);
  if (cep.length > 5) {
    cep = cep.substring(0, 5) + '-' + cep.substring(5);
  }
  input.value = cep;
}

function formatarCEP(cep) {
  if (!cep) return '-';
  cep = cep.toString().replace(/\D/g, '');
  if (cep.length !== 8) return cep || '-';
  return cep.substring(0, 5) + '-' + cep.substring(5);
}

document.addEventListener('DOMContentLoaded', function() {
    carregarDashboard();
});


document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const modal = document.getElementById("confirmarExclusaoModal");
    if (modal.style.display === "flex") {
      modal.style.display = "none";
      vendaParaExcluir = null;
    }
  }
});

document.getElementById("confirmarExclusaoModal").addEventListener('click', function(e) {
  if (e.target === this) {
    this.style.display = "none";
    vendaParaExcluir = null;
  }
});


function mostrarLoader(mensagem, detalhes = "") {
  const loader = document.getElementById("loaderOverlay");
  const loaderText = document.getElementById("loaderText");
  
  loaderText.innerHTML = `
    <i class="bi bi-hourglass-split loader-icon"></i>
    <div>
      <div>${mensagem}</div>
      ${detalhes ? `<div class="loader-info">${detalhes}</div>` : ''}
    </div>
  `;
  
  loader.style.display = "flex";
}

function esconderLoader() {
  const loader = document.getElementById("loaderOverlay");
  loader.style.display = "none";
}

function mostrarLoaderBotao(botao, textoOriginal) {
  botao.classList.add('btn-loading');
  botao.dataset.originalText = textoOriginal;
  botao.disabled = true;
}

function esconderLoaderBotao(botao) {
  botao.classList.remove('btn-loading');
  botao.disabled = false;
  if (botao.dataset.originalText) {
    botao.innerHTML = botao.dataset.originalText;
  }
}

function mostrarNotificacao(titulo, mensagem, tipo = "info", duracao = 5000) {
  const container = document.getElementById("notificacoesContainer");
  
  const notificacao = document.createElement("div");
  notificacao.className = `notificacao ${tipo}`;
  notificacao.innerHTML = `
    <div class="notificacao-icon">
      ${tipo === "sucesso" ? '<i class="bi bi-check-circle"></i>' : ''}
      ${tipo === "erro" ? '<i class="bi bi-x-circle"></i>' : ''}
      ${tipo === "warning" ? '<i class="bi bi-exclamation-triangle"></i>' : ''}
      ${tipo === "info" ? '<i class="bi bi-info-circle"></i>' : ''}
    </div>
    <div class="notificacao-content">
      <div class="notificacao-title">${titulo}</div>
      <div class="notificacao-message">${mensagem}</div>
    </div>
    <button class="notificacao-close" onclick="this.parentElement.remove()">
      <i class="bi bi-x"></i>
    </button>
    <div class="notificacao-progress">
      <div class="notificacao-progress-bar" style="animation-duration: ${duracao}ms"></div>
    </div>
  `;
  
  container.appendChild(notificacao);
  
  setTimeout(() => {
    if (notificacao.parentElement) {
      notificacao.style.animation = "slideIn 0.3s ease-out reverse forwards";
      setTimeout(() => notificacao.remove(), 300);
    }
  }, duracao);
}

window.addEventListener('resize', function() {
  if (graficoBarras) {
    graficoBarras.resize();
    graficoBarras.options.plugins.legend.labels.font.size = window.innerWidth < 768 ? 10 : 12;
    graficoBarras.update();
  }
  if (graficoPizza) {
    graficoPizza.resize();
    graficoPizza.options.plugins.legend.position = window.innerWidth < 768 ? 'bottom' : 'right';
    graficoPizza.options.plugins.legend.labels.font.size = window.innerWidth < 768 ? 10 : 12;
    graficoPizza.update();
  }
  if (graficoCalor) {
    graficoCalor.resize();
    graficoCalor.options.plugins.legend.labels.font.size = window.innerWidth < 768 ? 10 : 12;
    graficoCalor.update();
  }
  if (graficoProdutosRegiao) {
    graficoProdutosRegiao.resize();
    graficoProdutosRegiao.options.plugins.legend.labels.font.size = window.innerWidth < 768 ? 10 : 12;
    graficoProdutosRegiao.update();
  }
  
  const mapaElement = document.getElementById('mapaVendas');
  if (mapaElement && mapaElement._leaflet_id) {
    const map = L.map(mapaElement);
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }
});

window.addEventListener('orientationchange', function() {
  setTimeout(function() {
    if (graficoBarras) graficoBarras.resize();
    if (graficoPizza) graficoPizza.resize();
    if (graficoCalor) graficoCalor.resize();
    if (graficoProdutosRegiao) graficoProdutosRegiao.resize();
    
    const mapaElement = document.getElementById('mapaVendas');
    if (mapaElement && mapaElement._leaflet_id) {
      const map = L.map(mapaElement);
      setTimeout(() => {
        map.invalidateSize();
      }, 300);
    }
  }, 300);
});

function ajustarInputsDataMobile() {
  if (window.innerWidth <= 767) {
    const dateInputs = document.querySelectorAll('input[type="date"]');
    
    dateInputs.forEach(input => {
      input.style.width = '100%';
      input.style.maxWidth = '100%';
      input.style.boxSizing = 'border-box';
      input.style.webkitAppearance = 'none';
      input.style.mozAppearance = 'textfield';
      
      if (!input.parentElement.classList.contains('date-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'date-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.width = '100%';
        
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);
        
        const icon = document.createElement('i');
        icon.className = 'bi bi-calendar';
        icon.style.position = 'absolute';
        icon.style.right = '10px';
        icon.style.top = '50%';
        icon.style.transform = 'translateY(-50%)';
        icon.style.color = 'var(--text-secondary)';
        icon.style.pointerEvents = 'none';
        wrapper.appendChild(icon);
      }
    });
  }
}

window.addEventListener('load', ajustarInputsDataMobile);
window.addEventListener('resize', ajustarInputsDataMobile);

document.addEventListener('DOMContentLoaded', ajustarInputsDataMobile);

const style = document.createElement('style');
style.textContent = `
  @media (max-width: 767px) {
    .date-wrapper {
      width: 100% !important;
      display: block !important;
    }
    
    .date-wrapper input[type="date"] {
      width: 100% !important;
      padding-right: 40px !important;
      background: white !important;
      border: 2px solid var(--border) !important;
      border-radius: 8px !important;
      height: 44px !important;
      font-size: 16px !important;
    }
  }
`;
document.head.appendChild(style);