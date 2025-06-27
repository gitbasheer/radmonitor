// Copy this entire code to val.town
// Visit: https://www.val.town/new

export default async function(req) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Elastic-Cookie',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  // Handle GET
  if (req.method === 'GET') {
    return Response.json({
      message: 'RAD Monitor Proxy is running!',
      usage: 'POST with { esUrl, esPath, cookie, query }'
    }, { headers });
  }

  // Handle POST
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { esUrl, esPath, cookie, query } = body;

      if (!cookie || !query) {
        return Response.json({
          error: 'Missing required parameters',
          required: ['cookie', 'query']
        }, { status: 400, headers });
      }

      const fullUrl = `${esUrl || 'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243'}${esPath || '/elasticsearch/usi*/_search'}`;

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie,
        },
        body: JSON.stringify(query)
      });

      const data = await response.json();

      return Response.json(data, {
        status: response.status,
        headers
      });
    } catch (error) {
      return Response.json({
        error: error.message
      }, { status: 500, headers });
    }
  }

  return Response.json({
    error: 'Method not allowed'
  }, { status: 405, headers });
}
