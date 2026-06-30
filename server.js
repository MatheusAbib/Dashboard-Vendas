const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src', 'main', 'resources', 'static')));

const vendaRoutes = require('./routes/vendaRoutes');
app.use('/api/vendas', vendaRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor Node.js rodando!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Dashboard disponível em: http://localhost:${PORT}`);
  console.log(`📡 API disponível em: http://localhost:${PORT}/api/vendas`);
});
