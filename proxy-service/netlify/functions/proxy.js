// Netlify Function: /api/proxy
exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Elastic-Cookie',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Handle GET
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'RAD Monitor Proxy is running!',
        endpoint: '/.netlify/functions/proxy',
        usage: 'POST with { esUrl, esPath, cookie, query }'
      })
    };
  }

  // Handle POST
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body);
      const { esUrl, esPath, cookie, query } = body;

      if (!cookie || !query) {
        return {
          statusCode: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Missing required parameters' })
        };
      }

      const fullUrl = `${esUrl || 'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243'}${esPath || '/elasticsearch/usi*/_search'}`;

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie
        },
        body: JSON.stringify(query)
      });

      const data = await response.json();

      return {
        statusCode: response.status,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: 'Method Not Allowed'
  };
};
