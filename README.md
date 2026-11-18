# 📊 Dashboard de Vendas

## 📋 Sobre o Projeto

O **Dashboard de Vendas** é uma aplicação web para gerenciamento de vendas, monitoramento de indicadores financeiros e análise de desempenho comercial.

A plataforma reúne gráficos interativos, filtros avançados, análises temporais e geográficas, gerenciamento de registros e geração de relatórios personalizados em uma interface responsiva.

> 🔗 **Acesse online:** (https://dashboard-vendas-node.netlify.app/)

---

## ✨ Funcionalidades

### 📝 Gestão de Vendas
- Cadastro, edição e exclusão de vendas
- Registro de produtos, categorias, quantidades, valores e localização
- Validação dos dados informados
- Confirmação antes da exclusão de registros
- Atualização dos indicadores após alterações

### 🔍 Filtros e Pesquisa
- Filtragem por intervalo de datas
- Filtros rápidos de período
- Filtro por categoria de produto
- Filtros geográficos por país, estado e cidade
- Combinação de diferentes filtros
- Indicadores visuais dos filtros aplicados
- Pesquisa dinâmica na tabela de vendas
- Ordenação e paginação dos registros

### 📊 Indicadores Comerciais
- Faturamento total
- Quantidade de produtos vendidos
- Ticket médio por transação
- Categoria mais vendida
- Quantidade de transações e produtos distintos
- Comparação de faturamento entre períodos equivalentes
- Crescimento anual com comparação entre anos
- Identificação de novos faturamentos quando não existe base percentual de comparação

### 📈 Gráficos e Análises
- **Evolução de Vendas:** acompanhamento do faturamento por dia, semana ou mês
- **Distribuição por Categoria:** gráfico de rosca com participação das categorias
- **Faturamento por Produto:** gráfico de barras comparativo
- **Vendas por Estado:** análise do desempenho regional
- **Produtos por Região:** comparação de produtos entre diferentes estados
- **Ranking de Produtos:** classificação dos 10 produtos com maior faturamento
- **Mapa Interativo:** visualização geográfica das vendas com Leaflet
- **Análise Anual:** comparação de resultados e variações entre anos

### 📤 Relatórios Personalizados

Exportação de relatórios em **PDF e Excel**, com diferentes modelos:

- **Visão Geral:** resumo financeiro e registros de vendas
- **Por Produto:** quantidade, transações, faturamento e participação
- **Por Categoria:** desempenho comercial agrupado por categoria
- **Por Região:** resultados por país, estado e cidade
- **Por Ano:** faturamento anual e variação entre anos consecutivos

Os relatórios consideram os filtros aplicados no dashboard.

### 💬 Notificações e Interações
- Notificações de sucesso, erro e aviso
- Indicadores de carregamento para operações assíncronas
- Modais para cadastro, edição e exclusão
- Feedback visual durante as operações
- Atualização dinâmica de tabelas, gráficos e indicadores

### 📱 Design Responsivo
- Interface adaptável para desktop, tablet e dispositivos móveis
- Menu lateral responsivo
- Organização dos indicadores em diferentes resoluções
- Tabelas com navegação e paginação
- Gráficos interativos adaptados ao espaço disponível

---

## 🛠️ Tecnologias Utilizadas

### Backend

| Tecnologia | Descrição |
|------------|-----------|
| **Node.js** | Ambiente de execução JavaScript |
| **Express** | Framework para construção da API REST |
| **MySQL** | Banco de dados relacional |
| **CORS** | Gerenciamento de requisições entre origens |

### Frontend

| Tecnologia | Descrição |
|------------|-----------|
| **HTML5** | Estrutura da aplicação |
| **CSS3** | Estilização e responsividade |
| **JavaScript (ES6+)** | Lógica, interatividade e integração com a API |
| **Chart.js** | Visualização de dados em gráficos |
| **Leaflet** | Mapas geográficos interativos |
| **jsPDF** | Geração de relatórios PDF |
| **jsPDF AutoTable** | Construção de tabelas nos relatórios PDF |
| **SheetJS (XLSX)** | Geração de planilhas Excel |
| **Bootstrap Icons** | Ícones da interface |

### Infraestrutura

| Tecnologia | Descrição |
|------------|-----------|
| **Netlify** | Hospedagem do frontend |
| **DigitalOcean** | Hospedagem do backend |
| **PM2** | Gerenciamento do processo Node.js |

---

## 📌 Objetivo

O projeto foi desenvolvido para reunir operações de gestão de vendas e recursos de análise comercial em uma única plataforma, permitindo acompanhar resultados, identificar tendências, comparar períodos e gerar relatórios para apoiar a tomada de decisões.