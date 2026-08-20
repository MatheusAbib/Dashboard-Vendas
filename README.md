# 📊 Dashboard de Vendas

## 📋 Sobre o Projeto

O **Dashboard de Vendas** é uma aplicação web completa para monitoramento e gestão de vendas. Com uma interface intuitiva e responsiva, permite visualizar métricas em tempo real, analisar gráficos interativos, gerenciar vendas e exportar relatórios.

> Acesse o projeto online: (https://dashboard-vendas-node.netlify.app)

---

## ✨ Funcionalidades

### 📝 Gestão de Vendas
- Cadastro, edição e exclusão de vendas
- Formulário intuitivo com validação de dados
- Feedback visual para todas as ações

### 🔍 Filtros Inteligentes
- Filtragem por período (data inicial/final)
- Filtro por categoria de produto
- Filtros geográficos (país, estado, cidade)
- Filtro por séries (categorias selecionáveis)

### 📊 Visualização de Dados
- **Cards de Métricas:** Total de vendas, total de produtos, ticket médio e categoria mais vendida
- **Gráfico de Barras:** Vendas por produto
- **Gráfico de Pizza:** Distribuição de vendas por categoria
- **Mapa de Calor:** Vendas por dia/hora
- **Mapa Interativo:** Visualização geográfica das vendas com Leaflet
- **Gráfico de Vendas por Estado:** Distribuição regional
- **Ranking de Produtos:** Top 15 produtos mais vendidos

### 📤 Exportação de Relatórios
- **Excel:** Exporta métricas e tabela completa de vendas
- **PDF:** Relatório completo com gráficos e tabela

### 💬 Sistema de Feedback
- Notificações em tempo real
- Loader para operações assíncronas
- Modais de confirmação para ações destrutivas

### 📱 Design Responsivo
- Interface adaptada para todos os dispositivos
- Sidebar de filtros recolhível no mobile
- Gráficos com toggle para melhor visualização em telas pequenas

---

## 🛠️ Tecnologias Utilizadas

### Backend
| Tecnologia | Descrição |
|------------|-----------|
| **Node.js** | Ambiente de execução JavaScript |
| **Express** | Framework web para Node.js |
| **MySQL** | Banco de dados relacional |
| **CORS** | Middleware para requisições cross-origin |

### Frontend
| Tecnologia | Descrição |
|------------|-----------|
| **HTML5 / CSS3** | Estrutura e estilização |
| **JavaScript (ES6+)** | Lógica da aplicação |
| **Chart.js** | Criação de gráficos interativos |
| **Leaflet** | Mapas interativos |
| **jsPDF** | Exportação de PDF |
| **SheetJS (XLSX)** | Exportação de Excel |
| **Bootstrap Icons** | Ícones vetoriais |
| **Font Awesome** | Ícones adicionais |

### Infraestrutura
| Tecnologia | Descrição |
|------------|-----------|
| **Netlify** | Hospedagem do frontend |
| **DigitalOcean** | Hospedagem do backend |
| **PM2** | Gerenciamento de processos Node.js |

---