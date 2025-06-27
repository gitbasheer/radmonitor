// Simple CORS proxy for Elasticsearch
// Deploy to Vercel, Netlify Functions, or any serverless platform

export default async function handler(req, res) {
    // Get the origin from the request
    const origin = req.headers.origin;

    // List of allowed origins
    const allowedOrigins = [
        'https://balkhalil-godaddy.github.io',
        'https://balkhalil.github.io',
        'http://localhost:8000',
        'http://localhost:8001',
        'http://localhost:3000',
        'http://127.0.0.1:8000',
        'http://127.0.0.1:8001'
    ];

    // Allow the origin if it's in our list
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        // For any GitHub Pages domain (more flexible)
        if (origin && origin.includes('.github.io')) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        }
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Elastic-Cookie');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        let esUrl, esPath, cookie, query;

        // Support both query params (legacy) and request body (preferred)
        if (req.query.esUrl) {
            // Legacy query param method (less secure but fallback)
            esUrl = req.query.esUrl;
            esPath = req.query.esPath;
            cookie = req.query.cookie;
            query = req.body;
        } else {
            // Preferred method: everything in request body
            const requestData = req.body;
            esUrl = requestData.esUrl || 'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243';
            esPath = requestData.esPath || '/elasticsearch/usi*/_search';
            cookie = requestData.cookie || req.headers['x-elastic-cookie'];
            query = requestData.query;
        }

        if (!cookie) {
            return res.status(400).json({ error: 'No authentication cookie provided' });
        }

        const fullUrl = `${esUrl}${esPath}`;

        // Forward the request to Elasticsearch
        const response = await fetch(fullUrl, {
            method: req.method === 'GET' ? 'GET' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookie,
                'User-Agent': 'RAD-Monitor-Proxy/1.0'
            },
            body: query ? JSON.stringify(query) : undefined
        });

        const data = await response.json();

        // Forward the response
        res.status(response.status).json(data);

    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
