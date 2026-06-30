const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

console.log('Carregando rotas...');

const vendaRoutes = require('./routes/vendaRoutes');
console.log('Rotas carregadas:', typeof vendaRoutes);

app.use('/api/vendas', vendaRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Teste: http://localhost:${PORT}/api/vendas`);
});
