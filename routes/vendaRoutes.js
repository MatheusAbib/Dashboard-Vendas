const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Venda = require('../models/Venda');
const { buscarCoordenadas } = require('../services/geocodeService');
const { exportarVendas } = require('../services/excelService');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM venda ORDER BY id DESC');
    const vendas = rows.map(row => Venda.fromDatabase(row));
    res.json(vendas);
  } catch (error) {
    console.error('Erro ao listar vendas:', error);
    res.status(500).json({ error: 'Erro ao buscar vendas' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { produto, categoria, quantidade, valor, cidade, estado, pais, cep } = req.body;
    
    const { latitude, longitude } = await buscarCoordenadas(cidade, estado, pais);
    
    const [result] = await db.query(
      `INSERT INTO venda (produto, categoria, quantidade, valor, cidade, estado, pais, cep, latitude, longitude, data_venda)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [produto, categoria, quantidade, valor, cidade, estado, pais, cep, latitude, longitude]
    );
    
    const [rows] = await db.query('SELECT * FROM venda WHERE id = ?', [result.insertId]);
    const novaVenda = Venda.fromDatabase(rows[0]);
    
    res.status(201).json(novaVenda);
  } catch (error) {
    console.error('Erro ao criar venda:', error);
    res.status(500).json({ error: 'Erro ao criar venda' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { produto, categoria, quantidade, valor, cidade, estado, pais, cep } = req.body;
    
    const { latitude, longitude } = await buscarCoordenadas(cidade, estado, pais);
    
    const [result] = await db.query(
      `UPDATE venda SET 
        produto = ?, categoria = ?, quantidade = ?, valor = ?, 
        cidade = ?, estado = ?, pais = ?, cep = ?, latitude = ?, longitude = ?
       WHERE id = ?`,
      [produto, categoria, quantidade, valor, cidade, estado, pais, cep, latitude, longitude, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }
    
    const [rows] = await db.query('SELECT * FROM venda WHERE id = ?', [id]);
    const vendaAtualizada = Venda.fromDatabase(rows[0]);
    
    res.json(vendaAtualizada);
  } catch (error) {
    console.error('Erro ao atualizar venda:', error);
    res.status(500).json({ error: 'Erro ao atualizar venda' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await db.query('DELETE FROM venda WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar venda:', error);
    res.status(500).json({ error: 'Erro ao deletar venda' });
  }
});

router.get('/export/excel', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM venda ORDER BY id DESC');
    const vendas = rows.map(row => Venda.fromDatabase(row));
    
    const buffer = await exportarVendas(vendas);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=vendas.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Erro ao exportar Excel:', error);
    res.status(500).json({ error: 'Erro ao exportar Excel' });
  }
});

router.get('/atualizar-coordenadas', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM venda WHERE latitude IS NULL OR longitude IS NULL');
    
    for (const row of rows) {
      const venda = Venda.fromDatabase(row);
      const { latitude, longitude } = await buscarCoordenadas(venda.cidade, venda.estado, venda.pais);
      
      if (latitude && longitude) {
        await db.query(
          'UPDATE venda SET latitude = ?, longitude = ? WHERE id = ?',
          [latitude, longitude, venda.id]
        );
      }
    }
    
    res.json({ message: 'Coordenadas atualizadas com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar coordenadas:', error);
    res.status(500).json({ error: 'Erro ao atualizar coordenadas' });
  }
});

module.exports = router;