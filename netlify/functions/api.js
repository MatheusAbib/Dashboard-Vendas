exports.handler = async function(event, context) {
  const path = event.path.replace('/.netlify/functions/api', '');
  const targetUrl = `http://64.227.6.51:3002/api/vendas${path}`;

  const options = {
    method: event.httpMethod,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (event.body) {
    options.body = event.body;
  }

  try {
    const response = await fetch(targetUrl, options);
    const data = await response.text();

    return {
      statusCode: response.status,
      body: data,
      headers: {
        'Content-Type': 'application/json'
      }
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro ao conectar ao backend' })
    };
  }
};