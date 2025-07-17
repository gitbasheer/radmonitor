// Netlify Function: /.netlify/functions/proxy

// Simple CORS proxy for RAD Monitor
exports.handler = async (event, context) => {
  // CORS headers - must be on EVERY response
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Elastic-Cookie, Cookie',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Handle GET - health check
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Proxy is running! Send POST requests with esUrl, esPath, and cookie.',
        timestamp: new Date().toISOString()
      })
    };
  }

  // Handle POST - proxy request
  if (event.httpMethod === 'POST') {
    try {
      // Parse request body
      const { esUrl, esPath, cookie, query } = JSON.parse(event.body || '{}');

      // Validate required parameters
      if (!cookie || !query) {
        return {
          statusCode: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Missing required parameters',
            required: ['cookie', 'query'],
            received: { cookie: !!cookie, query: !!query }
          })
        };
      }

      // Format cookie properly for Kibana
      let formattedCookie = cookie.trim();
      if (!formattedCookie.includes('sid=')) {
        formattedCookie = `sid=${formattedCookie}`;
      }

      // Log cookie format for debugging
      console.log('Cookie formatting:', {
        original: cookie.substring(0, 50) + '...',
        formatted: formattedCookie.substring(0, 60) + '...',
        hasSid: formattedCookie.includes('sid=')
      });

      // Build Elasticsearch URL
      const baseUrl = esUrl || 'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243';
      const path = esPath || '/api/console/proxy?path=traffic-*/_search&method=POST';
      const fullUrl = `${baseUrl}${path}`;

      // Make request to Elasticsearch using HTTPS module (always available in Node)
      const https = require('https');
      const url = require('url');

      const parsedUrl = url.parse(fullUrl);

      const requestData = JSON.stringify(query);

      return new Promise((resolve) => {
        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || 443,
          path: parsedUrl.path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestData),
            'Cookie': formattedCookie,
            'Accept': 'application/json',
            'kbn-xsrf': 'true'
          }
        };

        const req = https.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: data
            });
          });
        });

        req.on('error', (error) => {
          resolve({
            statusCode: 500,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: error.message })
          });
        });

        req.write(requestData);
        req.end();
      });

    } catch (error) {
      return {
        statusCode: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Proxy error',
          message: error.message
        })
      };
    }
  }

  // Method not allowed
  return {
    statusCode: 405,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};
