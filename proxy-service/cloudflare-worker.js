/**
 * RAD Monitor Proxy for Cloudflare Workers
 * Deploy this to workers.cloudflare.com for a free CORS proxy
 */

export default {
  async fetch(request, env) {
    // Handle CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Elastic-Cookie',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Parse request
      const requestData = await request.json();
      const esUrl = requestData.esUrl || 'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243';
      const esPath = requestData.esPath || '/elasticsearch/usi*/_search';
      const cookie = requestData.cookie || request.headers.get('X-Elastic-Cookie');
      const query = requestData.query;

      if (!cookie) {
        return new Response(
          JSON.stringify({ error: 'No authentication cookie provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Forward to Elasticsearch
      const esResponse = await fetch(`${esUrl}${esPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie,
        },
        body: JSON.stringify(query),
      });

      const data = await esResponse.json();

      // Return response with CORS headers
      return new Response(JSON.stringify(data), {
        status: esResponse.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  },
};
