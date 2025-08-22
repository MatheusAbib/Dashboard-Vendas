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
    // Formata a data para YYYY-MM-DD
    const dataVendaFormatada = v.dataVenda ? v.dataVenda.split("T")[0] : "-";

    tbody.innerHTML += `
      <tr>
        <td>${v.id}</td>
        <td>${v.produto}</td>
        <td>${v.categoria}</td>
        <td>${v.quantidade}</td>
        <td>R$ ${v.valor.toFixed(2)}</td>
        <td>${v.cidade || '-'}</td>
        <td>${v.estado || '-'}</td>
        <td>${v.cep || '-'}</td>
        <td>${dataVendaFormatada}</td>
        <td>
          <button class="btn-acao editar" onclick='abrirFormVenda(${JSON.stringify(v)})'>
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-acao excluir" onclick='deletarVenda(${v.id})'>
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>`;
  });
}


async function deletarVenda(id) {
  if (!confirm("Tem certeza que deseja excluir esta venda?")) return;
  
  const resp = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
  if (resp.ok) {
    mostrarMensagem("Venda deletada com sucesso!", "sucesso");
    carregarDashboard();
  } else {
    mostrarMensagem("Erro ao deletar venda", "erro");
  }
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
async function exportarExcel() {
  const vendas = todasVendas; 
  if (!vendas.length) {
    alert("Nenhuma venda para exportar!");
    return;
  }

  // Criar workbook e planilha
  const wb = XLSX.utils.book_new();
  const wsData = [];

  // Adicionar cards resumidos no topo
  const cards = [
    { title: "Total Vendas", value: document.querySelector("#cards-metricas div:nth-child(1) p").innerText },
    { title: "Total Produtos", value: document.querySelector("#cards-metricas div:nth-child(2) p").innerText },
    { title: "Ticket Médio", value: document.querySelector("#cards-metricas div:nth-child(3) p").innerText },
    { title: "Categoria Mais Vendida", value: document.querySelector("#cards-metricas div:nth-child(4) p").innerText }
  ];
  
  wsData.push(cards.map(c => c.title));
  wsData.push(cards.map(c => c.value));
  wsData.push([]); // linha em branco

  // Cabeçalho da tabela
  const headers = ["ID", "Produto", "Categoria", "Quantidade", "Valor (R$)", "Cidade", "Estado", "CEP", "Data Venda"];
  wsData.push(headers);

  // Linhas de vendas
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

  // Criar worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Ajustar largura das colunas
  ws['!cols'] = [
    { wpx: 80 },  // ID
    { wpx: 150 }, // Produto
    { wpx: 95 }, // Categoria
    { wpx: 80 },  // Quantidade
    { wpx: 80 },  // Valor
    { wpx: 110 }, // Cidade
    { wpx: 60 },  // Estado
    { wpx: 70 }, // CEP
    { wpx: 70 }  // Data
  ];

  // Adicionar planilha ao workbook
  XLSX.utils.book_append_sheet(wb, ws, "Dashboard");

  // Gerar arquivo e baixar
  XLSX.writeFile(wb, "dashboard_vendas.xlsx");
}

function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'pt', 'a4'); 
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Função para desenhar cabeçalho
  function cabecalho() {
    doc.setFillColor(52, 152, 219); // azul do cabeçalho
    doc.rect(0, 0, pageWidth, 50, 'F'); 
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255); // branco
    doc.text("Dashboard de Vendas", pageWidth / 2, 30, { align: "center" });
  }

  // Função para desenhar rodapé
  function rodape(paginaAtual, totalPaginas) {
    doc.setFillColor(52, 73, 94); // cinza escuro
    doc.rect(0, pageHeight - 30, pageWidth, 30, 'F');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`Página ${paginaAtual} de ${totalPaginas}`, pageWidth / 2, pageHeight - 12, { align: "center" });
  }

  let y = 70;
  cabecalho();

  // Cards resumidos com cores
  const cards = [
    { title: "Total Vendas", value: document.querySelector("#cards-metricas div:nth-child(1) p").innerText, color: [46, 204, 113] },
    { title: "Total Produtos", value: document.querySelector("#cards-metricas div:nth-child(2) p").innerText, color: [231, 76, 60] },
    { title: "Ticket Médio", value: document.querySelector("#cards-metricas div:nth-child(3) p").innerText, color: [241, 196, 15] },
    { title: "Categoria Mais Vendida", value: document.querySelector("#cards-metricas div:nth-child(4) p").innerText, color: [52, 152, 219] }
  ];

  const cardWidth = (pageWidth - 80) / 4; // espaço entre os cards
  const cardHeight = 50;

  cards.forEach((c, i) => {
    const x = 40 + i * cardWidth;
    doc.setFillColor(...c.color);
    doc.roundedRect(x, y, cardWidth - 10, cardHeight, 5, 5, 'F'); // fundo colorido
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(c.title, x + 5, y + 15);
    doc.setFontSize(12);
    doc.text(c.value, x + 5, y + 35);
  });
  y += cardHeight + 20;

  // Gráficos lado a lado
  const graficoBarrasImg = document.getElementById("graficoBarras").toDataURL("image/png", 1.0);
  const graficoPizzaImg = document.getElementById("graficoPizza").toDataURL("image/png", 1.0);
  doc.addImage(graficoBarrasImg, 'PNG', 40, y, 250, 200);
  doc.addImage(graficoPizzaImg, 'PNG', 300, y, 250, 200);
  y += 220;

  // Gráficos abaixo
  const calorImg = document.getElementById("mapaCalor").toDataURL("image/png", 1.0);
  const produtosRegiaoImg = document.getElementById("graficoProdutosRegiao").toDataURL("image/png", 1.0);
  doc.addImage(calorImg, 'PNG', 40, y, 250, 200);
  doc.addImage(produtosRegiaoImg, 'PNG', 300, y, 250, 200);
  y += 220;

  // Tabela de vendas
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
    alert("Erro: jsPDF AutoTable não carregado corretamente!"); 
    return; 
  }

  // Rodapé na primeira página
  rodape(1, doc.internal.getNumberOfPages());

  doc.save("dashboard_completo.pdf");
}



function preencherMapaVendas(vendas) {
    const mapa = document.getElementById("mapaVendas");
    // Exemplo usando Leaflet
    const map = L.map(mapa).setView([-23.5505, -46.6333], 5); // Brasil central

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
}



// Abre modal de cadastro
function abrirFormVenda(venda = null) {
  document.getElementById("formVendaModal").style.display = "flex";
  const form = document.getElementById("formVenda");

  if (venda) {
    document.getElementById("formTitulo").innerText = "Editar Venda";
    document.getElementById("venda-id").value = venda.id;
    document.getElementById("produto").value = venda.produto;
    document.getElementById("categoriaForm").value = venda.categoria;
    document.getElementById("quantidade").value = venda.quantidade;
    document.getElementById("valor").value = venda.valor;
    document.getElementById("dataVenda").value = venda.dataVenda;
    document.getElementById("cidade").value = venda.cidade || "";
    document.getElementById("estado").value = venda.estado || "";
    document.getElementById("pais").value = venda.pais || "";
    document.getElementById("cep").value = venda.cep || "";

  } else {
    form.reset();
    document.getElementById("venda-id").value = "";
    document.getElementById("formTitulo").innerText = "Cadastrar Venda";
  }
}

function fecharFormVenda() {
  document.getElementById("formVendaModal").style.display = "none";
}

document.getElementById("formVenda").addEventListener("submit", async function(e) {
  e.preventDefault();

  const id = document.getElementById("venda-id").value;

  // Pega a hora atual UTC
  const agora = new Date();
  // Converte para horário de Brasília (GMT-3)
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
      cep: document.getElementById("cep").value,
      latitude: null,
      longitude: null,
      dataVenda: dataFormatada
  };

  const metodo = id ? "PUT" : "POST";
  const url = id ? `${API_URL}/${id}` : API_URL;

  const resp = await fetch(url, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(venda)
  });

  if (resp.ok) {
    mostrarMensagem("Venda salva com sucesso!", "sucesso");
    fecharFormVenda();
    carregarDashboard();
  } else {
    mostrarMensagem("Erro ao salvar venda", "erro");
    const text = await resp.text();
    console.error("Erro:", text);
  }
});


async function obterCoordenadasPorCEP(cep) {
  if (!cep) return null;

  cep = cep.replace(/\D/g,''); // remove qualquer caractere não numérico

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


function limparFiltros() {
  document.getElementById('data-inicial').value = '';
  document.getElementById('data-final').value = '';
  document.getElementById('categoria').value = '';

  // Se quiser, já recarrega o dashboard sem filtros
  carregarDashboard();
}


// Inicialização
carregarDashboard();