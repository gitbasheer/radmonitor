import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'RAD Monitor Proxy is running!' });
});

// Proxy endpoint
app.post('/api/proxy', async (req, res) => {
    try {
        const { esUrl, esPath, cookie, query } = req.body;

        if (!cookie || !query) {
            return res.status(400).json({ error: 'Missing required parameters' });
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
        res.status(response.status).json(data);

    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
