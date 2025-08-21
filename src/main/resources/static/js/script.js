const API_URL = "http://localhost:8080/api/vendas";
let graficoBarras, graficoPizza, graficoCalor, graficoProdutosRegiao;
let todasVendas = [];
let mapaVendasMapa;

async function carregarDashboard() {
  const categoriaFiltro = document.getElementById("categoria").value;
  const dataInicial = document.getElementById("data-inicial").value;
  const dataFinal = document.getElementById("data-final").value;

  const response = await fetch(API_URL);
  let vendas = await response.json();

  if(categoriaFiltro) vendas = vendas.filter(v => v.categoria === categoriaFiltro);
  if(dataInicial) vendas = vendas.filter(v => v.dataVenda >= dataInicial);
  if(dataFinal) vendas = vendas.filter(v => v.dataVenda <= dataFinal);

  todasVendas = vendas; 
  preencherTabela(vendas);
  preencherCards(vendas);
  preencherCategorias(vendas);
  preencherCheckboxCategorias(vendas);
  filtrarSeries();

  if (categoriaFiltro || dataInicial || dataFinal) {
    if(vendas.length === 0) {
      mostrarMensagem("Nenhuma venda encontrada para esse filtro", "erro");
    } else {
      mostrarMensagem("Filtro aplicado com sucesso!", "sucesso");
    }
  }
}

function preencherTabela(vendas) {
  const tbody = document.getElementById("tabela-vendas");
  tbody.innerHTML = "";
  vendas.forEach(v => {
    tbody.innerHTML += `
      <tr>
        <td>${v.id}</td>
        <td>${v.produto}</td>
        <td>${v.categoria}</td>
        <td>${v.quantidade}</td>
        <td>R$ ${v.valor.toFixed(2)}</td>
        <td>${v.dataVenda}</td>
        <td>${v.cidade || '-'}</td>
        <td>${v.estado || '-'}</td>
        <td>${v.pais || '-'}</td>
      </tr>`;
  });
}

function preencherCards(vendas) {
  const containerGeral = document.getElementById("cards-metricas");

  // Métricas gerais
  const totalVendas = vendas.reduce((acc, v) => acc + v.valor, 0);
  const totalProdutos = vendas.reduce((acc, v) => acc + v.quantidade, 0);
  const ticketMedio = vendas.length ? (totalVendas / vendas.length).toFixed(2) : 0;

  const categoriaMaisVendida = vendas.length
    ? vendas.reduce((a, b, i, arr) =>
        arr.filter(x => x.categoria === b.categoria).length >
        arr.filter(x => x.categoria === a.categoria).length ? b : a, {categoria:""}
      ).categoria
    : "-";

  // Preencher cards gerais
  containerGeral.innerHTML = `
    <div class="card"><h3>Total Vendas</h3><p>R$ ${totalVendas.toFixed(2)}</p></div>
    <div class="card"><h3>Total Produtos</h3><p>${totalProdutos}</p></div>
    <div class="card"><h3>Ticket Médio</h3><p>R$ ${ticketMedio}</p></div>
    <div class="card"><h3>Categoria Mais Vendida</h3><p>${categoriaMaisVendida}</p></div>
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
    options: { responsive:true, scales:{ y:{beginAtZero:true} } }
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
    options:{ responsive:true }
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
      <label>
        <input type="checkbox" id="${id}" checked onchange="filtrarSeries()">
        ${c}
      </label>
    `;
  });
}

// Filtros geográficos
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

function aplicarFiltroGeografico() {
  const pais = document.getElementById("filtro-pais").value;
  const estado = document.getElementById("filtro-estado").value;
  const cidade = document.getElementById("filtro-cidade").value;

  // Filtra primeiro pelas categorias selecionadas
  const checkboxes = document.querySelectorAll('#checkbox-categorias input[type="checkbox"]');
  const categoriasSelecionadas = Array.from(checkboxes)
                                     .filter(c => c.checked)
                                     .map(c => c.id.replace('chk-', ''));

  let filtrado = todasVendas.filter(v => categoriasSelecionadas.includes(v.categoria));

  // Aplica filtro geográfico
  if (pais) filtrado = filtrado.filter(v => v.pais === pais);
  if (estado) filtrado = filtrado.filter(v => v.estado === estado);
  if (cidade) filtrado = filtrado.filter(v => v.cidade === cidade);

  // Atualiza visualizações
  preencherTabela(filtrado);
  preencherCards(filtrado);
  preencherGraficoBarras(filtrado);
  preencherGraficoPizza(filtrado);
  preencherRanking(filtrado);
  preencherMapaCalor(filtrado);
  preencherGraficoProdutosRegiao(filtrado);
  preencherMapaVendas(filtrado);
}


function filtrarSeries() {
  const checkboxes = document.querySelectorAll('#checkbox-categorias input[type="checkbox"]');
  const selecionadas = Array.from(checkboxes)
                            .filter(c => c.checked)
                            .map(c => c.id.replace('chk-', ''));
  const dataFiltrada = todasVendas.filter(v => selecionadas.includes(v.categoria));
  
  // Atualiza visualizações
  preencherCards(dataFiltrada);
  preencherTabela(dataFiltrada);
  preencherGraficoBarras(dataFiltrada);
  preencherGraficoPizza(dataFiltrada);
  preencherRanking(dataFiltrada);
  preencherMapaCalor(dataFiltrada);
  preencherGraficoProdutosRegiao(dataFiltrada);
  preencherMapaVendas(dataFiltrada);

  // Atualiza filtros geográficos com base nos dados filtrados
  preencherFiltrosGeograficos(dataFiltrada);
}


// Ranking
function preencherRanking(vendas) {
  const ranking = vendas.reduce((acc,v)=>{
    acc[v.produto] = (acc[v.produto]||0) + v.valor;
    return acc;
  }, {});
  const rankingOrdenado = Object.entries(ranking).sort((a,b)=>b[1]-a[1]);

  const ol = document.getElementById("ranking-produtos");
  ol.innerHTML = '';
  rankingOrdenado.forEach(([produto,valor]) => {
    ol.innerHTML += `<li>${produto} - R$ ${valor.toFixed(2)}</li>`;
  });
}

// Mapa de calor
function preencherMapaCalor(vendas) {
  const ctx = document.getElementById("mapaCalor");
  const datas = [...new Set(vendas.map(v=>v.dataVenda))].sort();
  const valores = datas.map(d => vendas.filter(v=>v.dataVenda===d).reduce((acc,v)=>acc+v.valor,0));

  if(graficoCalor) graficoCalor.destroy();
  graficoCalor = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: datas,
      datasets:[{label:"Vendas por Dia", data:valores, backgroundColor:valores.map(v=>`rgba(255,0,0,${v/Math.max(...valores)})`)}]
    },
    options:{ responsive:true, scales:{ y:{ beginAtZero:true } } }
  });
}

// Produtos mais vendidos por Estado
function preencherGraficoProdutosRegiao(vendas) {
  const ctx = document.getElementById("graficoProdutosRegiao");

  // Agrupar vendas por estado e produto
  const vendasPorProdutoEstado = {};
  const produtosSet = new Set();

  vendas.forEach(v => {
    if(v.estado){
      vendasPorProdutoEstado[v.estado] = vendasPorProdutoEstado[v.estado] || {};
      vendasPorProdutoEstado[v.estado][v.produto] = (vendasPorProdutoEstado[v.estado][v.produto] || 0) + v.valor;
      produtosSet.add(v.produto);
    }
  });

  const produtos = Array.from(produtosSet); // todas as labels
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
    options: { indexAxis:'y', responsive:true, scales:{ x:{ beginAtZero:true } } }
  });
}


// Mensagens
function mostrarMensagem(texto, tipo="info") {
  const div = document.getElementById("mensagens");
  div.innerText = texto;
  div.className = "mensagens " + tipo;
  setTimeout(() => { div.innerText = ""; div.className = "mensagens"; }, 4000);
}

// Exportações
function exportarExcel() { window.location.href = API_URL + "/export/excel"; }
function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'pt', 'a4'); 
  let y = 30;

  doc.setFontSize(18);
  doc.text("Dashboard de Vendas", 40, y);
  y += 20;

  const barrasImg = document.getElementById("graficoBarras").toDataURL("image/png", 1.0);
  doc.addImage(barrasImg, 'PNG', 40, y, 500, 250); y += 270;
  const pizzaImg = document.getElementById("graficoPizza").toDataURL("image/png", 1.0);
  doc.addImage(pizzaImg, 'PNG', 40, y, 500, 250); y += 270;
  const calorImg = document.getElementById("mapaCalor").toDataURL("image/png", 1.0);
  doc.addImage(calorImg, 'PNG', 40, y, 500, 250); y += 270;

  if (typeof doc.autoTable === "function") {
    doc.autoTable({ html: '#tabela-vendas', startY: y, theme:'grid', headStyles:{fillColor:[52,73,94],textColor:255} });
  } else { alert("Erro: jsPDF AutoTable não carregado corretamente!"); return; }

  doc.save("dashboard_completo.pdf");
}

function preencherMapaVendas(vendas) {
  const mapaDiv = document.getElementById("mapaVendas");
  mapaDiv.innerHTML = ""; // limpa mapa antigo

  // Se o mapa já existia, destruímos antes
  if (mapaVendasMapa) {
    mapaVendasMapa.remove();
  }

  // Cria o mapa novamente
  mapaVendasMapa = L.map("mapaVendas").setView([-23.5505, -46.6333], 4); // centraliza no Brasil
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapaVendasMapa);

  // Adiciona os markers
  vendas.forEach(v => {
    if (v.latitude && v.longitude) {
      L.marker([v.latitude, v.longitude])
        .addTo(mapaVendasMapa)
        .bindPopup(`
          <b>${v.produto}</b><br>
          Valor: R$ ${v.valor.toFixed(2)}<br>
          Quantidade: ${v.quantidade}<br>
          Data: ${v.dataVenda}<br>
          Cidade: ${v.cidade || '-'}<br>
          Estado: ${v.estado || '-'}<br>
          País: ${v.pais || '-'}
        `);
    }
  });
}

// Inicialização
carregarDashboard();