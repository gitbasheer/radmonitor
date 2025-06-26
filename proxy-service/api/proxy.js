// Simple CORS proxy for Elasticsearch
// Deploy to Vercel, Netlify Functions, or any serverless platform

export default async function handler(req, res) {
    // Enable CORS for your GitHub Pages domain
    res.setHeader('Access-Control-Allow-Origin', 'https://balkhalil-godaddy.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Elastic-Cookie');
    
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