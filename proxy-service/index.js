// Simple CORS proxy for Elasticsearch
// Deploy to Vercel, Netlify Functions, or any serverless platform

export default async function handler(req, res) {
    // Enable CORS for your GitHub Pages domain
    res.setHeader('Access-Control-Allow-Origin', 'https://balkhalil-godaddy.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    try {
        // Extract Elasticsearch URL and path from query params
        const { esUrl, esPath, cookie } = req.query;
        const fullUrl = `${esUrl}${esPath}`;
        
        // Forward the request to Elasticsearch
        const response = await fetch(fullUrl, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookie,
                ...req.headers
            },
            body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
        });
        
        const data = await response.json();
        res.status(response.status).json(data);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
} 