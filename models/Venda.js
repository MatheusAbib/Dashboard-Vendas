class Venda {
  constructor(data) {
    this.id = data.id;
    this.produto = data.produto;
    this.categoria = data.categoria;
    this.quantidade = data.quantidade;
    this.valor = data.valor;
    this.cidade = data.cidade;
    this.estado = data.estado;
    this.pais = data.pais;
    this.cep = data.cep;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.dataVenda = data.dataVenda;
  }

  static fromDatabase(row) {
    return new Venda({
      id: row.id,
      produto: row.produto,
      categoria: row.categoria,
      quantidade: row.quantidade,
      valor: row.valor,
      cidade: row.cidade,
      estado: row.estado,
      pais: row.pais,
      cep: row.cep,
      latitude: row.latitude,
      longitude: row.longitude,
      dataVenda: row.data_venda
    });
  }
}

module.exports = Venda;