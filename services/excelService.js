const ExcelJS = require('exceljs');

async function exportarVendas(vendas) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Vendas');

  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Produto', key: 'produto', width: 20 },
    { header: 'Categoria', key: 'categoria', width: 15 },
    { header: 'Quantidade', key: 'quantidade', width: 12 },
    { header: 'Valor', key: 'valor', width: 12 },
    { header: 'Cidade', key: 'cidade', width: 20 },
    { header: 'Estado', key: 'estado', width: 10 },
    { header: 'País', key: 'pais', width: 15 },
    { header: 'CEP', key: 'cep', width: 12 },
    { header: 'Data Venda', key: 'dataVenda', width: 15 },
    { header: 'Latitude', key: 'latitude', width: 12 },
    { header: 'Longitude', key: 'longitude', width: 12 }
  ];

  vendas.forEach(venda => {
    worksheet.addRow({
      id: venda.id,
      produto: venda.produto,
      categoria: venda.categoria,
      quantidade: venda.quantidade,
      valor: venda.valor,
      cidade: venda.cidade,
      estado: venda.estado,
      pais: venda.pais,
      cep: venda.cep,
      dataVenda: venda.dataVenda ? venda.dataVenda.toISOString().split('T')[0] : '',
      latitude: venda.latitude,
      longitude: venda.longitude
    });
  });

  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

module.exports = { exportarVendas };