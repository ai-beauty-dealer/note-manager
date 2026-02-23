require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 5005;
const API_KEY = process.env.API_KEY;
const DATA_FILE = path.join(__dirname, '../data/articles.json');

const corsOptions = {
    origin: '*',
    methods: 'GET,POST,PUT,DELETE',
    allowedHeaders: ['Content-Type', 'x-api-key', 'ngrok-skip-browser-warning']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes
app.use(bodyParser.json());

// Auth Middleware
app.use((req, res, next) => {
    // Skip auth for OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
        return next();
    }
    const apiKey = req.headers['x-api-key'];
    if (API_KEY && apiKey !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
});

// Serve static files from the frontend build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Helper to read data
const readData = () => {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify([]));
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
};

// Helper to write data
const writeData = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// GET all articles
app.get('/api/articles', (req, res) => {
    const articles = readData();
    res.json(articles);
});

// POST new article
app.post('/api/articles', (req, res) => {
    const { title, draft_url, publish_at } = req.body;
    if (!draft_url || !publish_at) {
        return res.status(400).json({ error: 'Draft URL and Publish Date are required' });
    }

    const articles = readData();
    const newArticle = {
        id: uuidv4(),
        title: title || 'Untitled',
        draft_url,
        published_url: null,
        status: 'scheduled',
        publish_at,
        created_at: new Date().toISOString()
    };

    articles.push(newArticle);
    writeData(articles);
    res.status(201).json(newArticle);
});

// DELETE article
app.delete('/api/articles/:id', (req, res) => {
    const { id } = req.params;
    let articles = readData();
    articles = articles.filter(a => a.id !== id);
    writeData(articles);
    res.json({ success: true });
});

// Trigger post manually (for testing)
app.post('/api/articles/:id/post', (req, res) => {
    const { id } = req.params;
    const articles = readData();
    const article = articles.find(a => a.id === id);

    if (!article) {
        return res.status(404).json({ error: 'Article not found' });
    }

    // Run the python script
    const scriptPath = path.join(__dirname, '../scripts/auto_post_note.py');
    const pythonCmd = `python3 "${scriptPath}" --url "${article.draft_url}" --id "${article.id}"`;

    exec(pythonCmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).json({ error: 'Failed to trigger post script' });
        }
        res.json({ message: 'Post triggered', output: stdout });
    });
});

app.listen(PORT, () => {
    console.log(`Note Manager Backend running on http://localhost:${PORT}`);
});
