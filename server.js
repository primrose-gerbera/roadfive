// ========================================
// ROADFIVE - MongoDB Atlas (BEST VERSION)
// ========================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const PORT = process.env.PORT || 3000;

// ⭐ MongoDB Atlas Connection String
// Get this from: https://cloud.mongodb.com
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'roadfive';

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable is required!');
    console.error('📝 Get it from: https://cloud.mongodb.com');
    process.exit(1);
}

let db;
let client;

// ── Connect to MongoDB ──────────────────────────────────────

async function connectDB() {
    try {
        client = new MongoClient(MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000
        });
        
        await client.connect();
        db = client.db(DB_NAME);
        
        console.log('✅ Connected to MongoDB Atlas');
        console.log(`📁 Database: ${DB_NAME}`);
        
        // Initialize collections
        await initCollections();
        
        return true;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        return false;
    }
}

async function initCollections() {
    // Create collections if they don't exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    const needed = ['owner', 'users', 'snacks', 'submissions'];
    
    for (const name of needed) {
        if (!collectionNames.includes(name)) {
            await db.createCollection(name);
            console.log(`📁 Created collection: ${name}`);
        }
    }
    
    // Initialize owner if not exists
    const owner = await db.collection('owner').findOne({ username: 'roadfive_owner' });
    if (!owner) {
        await db.collection('owner').insertOne({
            username: 'roadfive_owner',
            password: 'Owner@2024',
            role: 'owner',
            created: new Date().toISOString()
        });
        console.log('✅ Owner account created');
    }
    
    // Create indexes for performance
    await db.collection('users').createIndex({ username: 1 });
    await db.collection('snacks').createIndex({ combination: 1 });
    await db.collection('submissions').createIndex({ userId: 1 });
}

// ── Data Functions ──────────────────────────────────────────

async function readData() {
    try {
        const [owner, users, snacks, submissions] = await Promise.all([
            db.collection('owner').findOne({ username: 'roadfive_owner' }),
            db.collection('users').find({}).toArray(),
            db.collection('snacks').find({}).toArray(),
            db.collection('submissions').find({}).toArray()
        ]);
        
        return {
            owner: owner || { username: 'roadfive_owner', password: 'Owner@2024', role: 'owner' },
            users: users || [],
            snacks: snacks || [],
            submissions: submissions || []
        };
    } catch (error) {
        console.error('❌ Error reading data:', error.message);
        return { users: [], snacks: [], submissions: [] };
    }
}

async function writeData(data) {
    try {
        // Update users
        if (data.users) {
            await db.collection('users').deleteMany({});
            if (data.users.length > 0) {
                await db.collection('users').insertMany(data.users);
            }
        }
        
        // Update snacks
        if (data.snacks) {
            await db.collection('snacks').deleteMany({});
            if (data.snacks.length > 0) {
                await db.collection('snacks').insertMany(data.snacks);
            }
        }
        
        // Update submissions
        if (data.submissions) {
            await db.collection('submissions').deleteMany({});
            if (data.submissions.length > 0) {
                await db.collection('submissions').insertMany(data.submissions);
            }
        }
        
        // Update owner
        if (data.owner) {
            await db.collection('owner').updateOne(
                { username: 'roadfive_owner' },
                { $set: data.owner },
                { upsert: true }
            );
        }
        
        console.log('💾 Data saved to MongoDB Atlas');
        return true;
    } catch (error) {
        console.error('❌ Error saving data:', error.message);
        return false;
    }
}

// ── Create Server ───────────────────────────────────────────

const server = http.createServer(async (req, res) => {
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
        const data = await readData();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
        console.log('📤 Data sent to client');
        return;
    }

    if (req.url === '/api/data' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                await writeData(data);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
                console.log('📥 Data received from client');
            } catch (error) {
                console.error('❌ Error processing POST:', error);
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid data' }));
            }
        });
        return;
    }

    // Serve static files
    let filePath = req.url === '/' ? '/login.html' : req.url;
    filePath = path.join(__dirname, filePath);
    
    // Security
    if (filePath.includes('server.js') || filePath.includes('package.json') || filePath.includes('.env')) {
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

// ── Start Server ─────────────────────────────────────────────

async function startServer() {
    const connected = await connectDB();
    
    if (!connected) {
        console.log('\n⚠️  Could not connect to MongoDB Atlas');
        console.log('📝 Please set MONGODB_URI environment variable');
        console.log('🔗 Get it from: https://cloud.mongodb.com\n');
        process.exit(1);
    }
    
    server.listen(PORT, '0.0.0.0', () => {
        console.log('========================================');
        console.log('🚀 ROADFIVE Server Running');
        console.log(`📍 Port: ${PORT}`);
        console.log(`📍 URL: https://roadfive.onrender.com`);
        console.log(`📁 Database: MongoDB Atlas (${DB_NAME})`);
        console.log('💾 Data is PERMANENT and NEVER resets!');
        console.log('========================================');
    });
}

startServer();

// ── Handle Shutdown ──────────────────────────────────────────

process.on('SIGINT', async () => {
    console.log('\n🛑 Server shutting down...');
    if (client) {
        await client.close();
        console.log('✅ MongoDB connection closed');
    }
    process.exit();
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
});

console.log('📊 Server starting...');
