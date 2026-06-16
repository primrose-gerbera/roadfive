// ========================================
// ROADFIVE - Render.com Ready Server
// ========================================

const http = require('http');
const fs = require('fs');
const path = require('path');

// Render provides PORT automatically
const PORT = process.env.PORT || 3000;

// Data file location (works on Render)
const DATA_FILE = path.join(__dirname, 'data.json');

// Initialize data file if not exists
if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
        owner: { 
            username: 'roadfive_owner', 
            password: 'Owner@2024', 
            role: 'owner' 
        },
        users: [],
        snacks: [],
        submissions: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    console.log('📁 Created data.json');
}

console.log('📁 DATA FILE:', DATA_FILE);

// Read data from file
function readData() {
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
        console.error('Error reading data:', e);
        return { users: [], snacks: [], submissions: [] };
    }
}

// Write data to file
function writeData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('💾 Data saved:', new Date().toLocaleString());
    } catch (e) {
        console.error('Error saving data:', e);
    }
}

// Create server
const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API Routes
    if (req.url === '/api/data' && req.method === 'GET') {
        const data = readData();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
        console.log('📤 Data sent to client');
        return;
    }

    if (req.url === '/api/data' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                writeData(data);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
                console.log('📥 Data received from client');
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid data' }));
            }
        });
        return;
    }

    // Serve static files
    let filePath = req.url === '/' ? '/login.html' : req.url;
    filePath = path.join(__dirname, filePath);
    
    // Security: Prevent access to server.js
    if (filePath.includes('server.js') || filePath.includes('package.json')) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath);
    const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.ico': 'image/x-icon'
    };

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found: ' + filePath);
            return;
        }
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
        res.end(content);
    });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log('✅ ROADFIVE Server Running');
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 URL: https://roadfive.onrender.com`);
    console.log(`📁 Data file: ${DATA_FILE}`);
    console.log('💾 Data is PERMANENT!');
    console.log('========================================');
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
    console.log('\n🛑 Server shutting down...');
    process.exit();
});

process.on('exit', () => {
    console.log('💾 Final save complete.');
});