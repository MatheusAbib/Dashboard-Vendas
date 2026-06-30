const axios = require('axios');

async function buscarCoordenadas(cidade, estado, pais) {
  if (!cidade || !estado || !pais) {
    return { latitude: null, longitude: null };
  }

  try {
    const endereco = `${cidade},${estado},${pais}`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(endereco)}&format=json&limit=1`;

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Dashboard-Vendas/1.0'
      }
    });

    if (response.data && response.data.length > 0) {
      const lat = parseFloat(response.data[0].lat);
      const lon = parseFloat(response.data[0].lon);
      return { latitude: lat, longitude: lon };
    }
  } catch (error) {
    console.error('Erro ao buscar coordenadas:', error.message);
  }

  return { latitude: null, longitude: null };
}

module.exports = { buscarCoordenadas };