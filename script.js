// ========================================
// RENDER API CONFIGURATION
// ========================================

// Use Render URL or localhost for testing
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api/data'
    : '/api/data';

// Save all data to server
async function saveAllData() {
    const data = {
        owner: JSON.parse(localStorage.getItem('owner')),
        users: JSON.parse(localStorage.getItem('users')),
        snacks: JSON.parse(localStorage.getItem('snacks')),
        submissions: JSON.parse(localStorage.getItem('submissions'))
    };
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            console.log('✅ Data saved to server');
        }
    } catch (e) {
        console.log('⚠️ Server not available, using localStorage only');
    }
}

// Load all data from server
async function loadAllData() {
    try {
        const response = await fetch(API_URL);
        if (response.ok) {
            const data = await response.json();
            
            if (data.owner) localStorage.setItem('owner', JSON.stringify(data.owner));
            if (data.users) localStorage.setItem('users', JSON.stringify(data.users));
            if (data.snacks) localStorage.setItem('snacks', JSON.stringify(data.snacks));
            if (data.submissions) localStorage.setItem('submissions', JSON.stringify(data.submissions));
            
            console.log('✅ Data loaded from server');
            return true;
        }
    } catch (e) {
        console.log('⚠️ Server not available, using localStorage');
    }
    return false;
}

// Auto-save every 30 seconds
setInterval(saveAllData, 30000);

// Save when page closes
window.addEventListener('beforeunload', saveAllData);

// Load data on page load
window.addEventListener('load', async function() {
    await loadAllData();
    // Your existing onload code will run after this
});











// ========================================
// ROADFIVE - Main Application
// Complete Polished Version
// ========================================

// ========================================
// INITIALIZATION
// ========================================

function initializeData() {
    // Only create owner if it doesn't exist
    if (!localStorage.getItem('owner')) {
        localStorage.setItem('owner', JSON.stringify({
            username: 'roadfive_owner',
            password: 'Owner@2024',
            role: 'owner',
            created: new Date().toLocaleString()
        }));
    }
    
    // Initialize empty arrays if they don't exist
    if (!localStorage.getItem('users')) {
        localStorage.setItem('users', JSON.stringify([]));
    }
    
    if (!localStorage.getItem('snacks')) {
        localStorage.setItem('snacks', JSON.stringify([]));
    }
    
    if (!localStorage.getItem('submissions')) {
        localStorage.setItem('submissions', JSON.stringify([]));
    }
}

// ========================================
// ROUTING
// ========================================

window.onload = function() {
    initializeData();
    
    // Load data from server (only on Render)
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        loadAllData().then(() => {
            // After loading, set up the page
            setupPage();
        });
    } else {
        setupPage();
    }
};

function setupPage() {
    const path = location.pathname;
    
    if (path.includes('login.html') || path === '/' || path === '') {
        document.getElementById('loginForm')?.addEventListener('submit', handlePlayerLogin);
    }
    
    if (path.includes('owner-login.html')) {
        document.getElementById('ownerLoginForm')?.addEventListener('submit', handleOwnerLogin);
    }
    
    if (path.includes('register.html')) {
        document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
    }
    
    if (path.includes('player-dashboard.html')) {
        loadPlayerDashboard();
    }
    
    if (path.includes('owner-dashboard.html')) {
        loadOwnerDashboard();
    }
}
// ========================================
// PLAYER AUTHENTICATION
// ========================================

function handlePlayerLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const users = JSON.parse(localStorage.getItem('users'));
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        localStorage.setItem('currentPlayer', JSON.stringify(user));
        location.href = 'player-dashboard.html';
    } else {
        alert('❌ Invalid credentials. Please register.');
    }
}

function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    
    if (!username || username.length < 3) {
        alert('❌ Username must be at least 3 characters');
        return;
    }
    
    if (password !== confirm) {
        alert('❌ Passwords do not match');
        return;
    }
    
    if (password.length < 4) {
        alert('❌ Password must be at least 4 characters');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('users'));
    if (users.find(u => u.username === username)) {
        alert('❌ Username already exists');
        return;
    }
    
    users.push({
        id: Date.now(),
        username: username,
        password: password,
        role: 'player',
        points: 0,
        created: new Date().toLocaleString()
    });
    
    localStorage.setItem('users', JSON.stringify(users));
    alert('✅ Account created! Please login.');
    location.href = 'login.html';
}

// ========================================
// PLAYER DASHBOARD
// ========================================

function loadPlayerDashboard() {
    const player = JSON.parse(localStorage.getItem('currentPlayer'));
    if (!player) {
        location.href = 'login.html';
        return;
    }
    
    document.getElementById('playerName').textContent = player.username;
    document.getElementById('totalPoints').textContent = player.points;
    document.getElementById('combinationForm')?.addEventListener('submit', submitCombination);
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('currentPlayer');
        location.href = 'login.html';
    });
    
    loadPlayerHistory();
    loadLeaderboard();
}

function submitCombination(e) {
    e.preventDefault();
    const code = document.getElementById('combination').value.trim();
    const player = JSON.parse(localStorage.getItem('currentPlayer'));
    
    // Validate 12 alphanumeric characters (letters AND numbers)
if (!/^[A-Za-z0-9]{12}$/.test(code)) {
    showMessage('❌ Must be exactly 12 characters (letters or numbers)', 'error');
    document.getElementById('combination').value = '';
    document.getElementById('combination').focus();
    return;
}
    
    // Check if product exists
    const snacks = JSON.parse(localStorage.getItem('snacks'));
    const match = snacks.find(s => s.combination === code);
    
    if (!match) {
        showMessage('❌ No product found with this code', 'error');
        saveSubmission(player.id, code, null, 0, false);
        document.getElementById('combination').value = '';
        document.getElementById('combination').focus();
        return;
    }
    
    // Award points
    const users = JSON.parse(localStorage.getItem('users'));
    const idx = users.findIndex(u => u.id === player.id);
    users[idx].points += match.points;
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('currentPlayer', JSON.stringify(users[idx]));
    
    saveSubmission(player.id, code, match.id, match.points, true);
    
    // Show success
    showSuccessMessage(match);
    
    document.getElementById('totalPoints').textContent = users[idx].points;
    document.getElementById('combination').value = '';
    
    loadPlayerHistory();
    loadLeaderboard();
}

function showSuccessMessage(snack) {
    const msg = document.getElementById('message');
    msg.innerHTML = `
        <div style="text-align:center">
            <div style="font-size:2em">✅ SUCCESSFULLY TRANSFERRED!</div>
            <div style="font-size:1.2em;margin-top:5px">+${snack.points} points from ${snack.name}</div>
            <div style="font-size:0.9em;color:#666;margin-top:5px">Code: ${snack.combination}</div>
        </div>
    `;
    msg.className = 'message success';
    
    setTimeout(() => {
        msg.innerHTML = '';
        msg.className = 'message';
    }, 5000);
}

function saveSubmission(userId, code, snackId, points, success) {
    const subs = JSON.parse(localStorage.getItem('submissions'));
    subs.unshift({
        id: Date.now(),
        userId: userId,
        combination: code,
        snackId: snackId,
        points: points,
        isSuccess: success,
        timestamp: new Date().toLocaleString()
    });
    localStorage.setItem('submissions', JSON.stringify(subs));
}

function loadPlayerHistory() {
    const player = JSON.parse(localStorage.getItem('currentPlayer'));
    const subs = JSON.parse(localStorage.getItem('submissions'));
    const history = subs.filter(s => s.userId === player.id);
    const div = document.getElementById('historyList');
    
    if (!history.length) {
        div.innerHTML = '<p style="color:#999;text-align:center;">No submissions yet</p>';
        return;
    }
    
    div.innerHTML = history.map(s => `
        <div class="history-item ${s.isSuccess ? '' : 'failed'}">
            <strong>Code:</strong> ${s.combination}<br>
            <strong>Result:</strong> ${s.isSuccess ? '✅ Success' : '❌ Failed'}<br>
            <strong>Points:</strong> ${s.points}<br>
            <strong>Time:</strong> ${s.timestamp}
        </div>
    `).join('');
}

function loadLeaderboard() {
    const users = JSON.parse(localStorage.getItem('users'));
    const players = users.filter(u => u.role === 'player').sort((a,b) => b.points - a.points);
    const div = document.getElementById('leaderboard');
    
    if (!players.length) {
        div.innerHTML = '<p style="color:#999;text-align:center;">No players yet</p>';
        return;
    }
    
    div.innerHTML = players.map((p, i) => `
        <div class="leaderboard-item">
            ${i + 1}. 🎮 ${p.username} - ${p.points} points
        </div>
    `).join('');
}

function showMessage(msg, type) {
    const div = document.getElementById('message');
    div.textContent = msg;
    div.className = `message ${type}`;
    setTimeout(() => {
        div.textContent = '';
        div.className = 'message';
    }, 3000);
}

// ========================================
// OWNER AUTHENTICATION
// ========================================

function handleOwnerLogin(e) {
    e.preventDefault();
    const username = document.getElementById('ownerUsername').value.trim();
    const password = document.getElementById('ownerPassword').value;
    const owner = JSON.parse(localStorage.getItem('owner'));
    
    if (owner && owner.username === username && owner.password === password) {
        localStorage.setItem('currentOwner', JSON.stringify(owner));
        location.href = 'owner-dashboard.html';
    } else {
        alert('❌ Invalid owner credentials');
    }
}

function changeOwnerPassword(oldPass, newPass) {
    const owner = JSON.parse(localStorage.getItem('owner'));
    if (owner.password === oldPass) {
        owner.password = newPass;
        localStorage.setItem('owner', JSON.stringify(owner));
        return true;
    }
    return false;
}

// ========================================
// OWNER DASHBOARD
// ========================================

function loadOwnerDashboard() {
    const owner = JSON.parse(localStorage.getItem('currentOwner'));
    if (!owner) {
        location.href = 'owner-login.html';
        return;
    }
    
    document.getElementById('ownerName').textContent = '👑 ' + owner.username;
    document.getElementById('addSnackForm')?.addEventListener('submit', addProduct);
    document.getElementById('ownerLogoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('currentOwner');
        location.href = 'owner-login.html';
    });
    document.getElementById('changePasswordBtn')?.addEventListener('click', () => {
        const oldP = prompt('Current password:');
        const newP = prompt('New password (min 6 chars):');
        if (newP && newP.length >= 6) {
            if (changeOwnerPassword(oldP, newP)) {
                alert('✅ Password changed! Login again.');
                localStorage.removeItem('currentOwner');
                location.href = 'owner-login.html';
            } else {
                alert('❌ Current password is incorrect');
            }
        }
    });
    
    loadProductsList();
    loadPlayersList();
    loadAllSubmissions();
}

// ========================================
// PRODUCT MANAGEMENT (OWNER ONLY)
// ========================================

function addProduct(e) {
    e.preventDefault();
    const name = document.getElementById('snackName').value.trim();
    const combo = document.getElementById('snackCombination').value.trim();
    const points = parseInt(document.getElementById('snackPoints').value);
    
    // Validation
    if (!name) {
        showOwnerMessage('❌ Please enter a product name', 'error');
        return;
    }
    
   if (!/^[A-Za-z0-9]{12}$/.test(combo)) {
    showOwnerMessage('❌ Code must be exactly 12 characters (letters or numbers)', 'error');
    return;
}
    
    if (!points || points < 1) {
        showOwnerMessage('❌ Points must be at least 1', 'error');
        return;
    }
    
    const snacks = JSON.parse(localStorage.getItem('snacks'));
    
    if (snacks.find(s => s.combination === combo)) {
        showOwnerMessage('❌ This code is already in use', 'error');
        return;
    }
    
    if (snacks.find(s => s.name.toLowerCase() === name.toLowerCase())) {
        showOwnerMessage('❌ A product with this name already exists', 'error');
        return;
    }
    
    // Add product
    snacks.push({
        id: Date.now(),
        name: name,
        combination: combo,
        points: points,
        created: new Date().toLocaleString()
    });
    
    localStorage.setItem('snacks', JSON.stringify(snacks));
    
    showOwnerMessage(`✅ "${name}" added! Code: ${combo} | Points: ${points}`, 'success');
    document.getElementById('addSnackForm').reset();
    loadProductsList();
}

function loadProductsList() {
    const snacks = JSON.parse(localStorage.getItem('snacks'));
    const div = document.getElementById('snacksList');
    
    if (!snacks.length) {
        div.innerHTML = `
            <div style="text-align:center;padding:20px;color:#999;">
                <p>📦 No products added yet</p>
                <p style="font-size:0.9em;">Use the form above to add your first product</p>
            </div>
        `;
        return;
    }
    
    div.innerHTML = snacks.map((s, i) => `
        <div class="snack-item">
            <strong>#${i + 1} 🍔 ${s.name}</strong><br>
            🔢 Code: <strong style="font-family:monospace;font-size:1.2em;">${s.combination}</strong><br>
            ⭐ Points: ${s.points}<br>
            📅 Added: ${s.created || 'Unknown'}
        </div>
    `).join('');
}

// ========================================
// CUSTOMER MANAGEMENT
// ========================================

function removeCustomer(playerId, playerName) {
    if (!confirm(`⚠️ Remove "${playerName}"? This cannot be undone.`)) return;
    
    let users = JSON.parse(localStorage.getItem('users'));
    let submissions = JSON.parse(localStorage.getItem('submissions'));
    
    users = users.filter(u => u.id !== playerId);
    submissions = submissions.filter(s => s.userId !== playerId);
    
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('submissions', JSON.stringify(submissions));
    
    showOwnerMessage(`✅ ${playerName} removed`, 'success');
    loadPlayersList();
    loadAllSubmissions();
}

function loadPlayersList() {
    const users = JSON.parse(localStorage.getItem('users'));
    const players = users.filter(u => u.role === 'player').sort((a,b) => b.points - a.points);
    const div = document.getElementById('playersList');
    
    if (!players.length) {
        div.innerHTML = '<p style="color:#999;text-align:center;">No registered players</p>';
        return;
    }
    
    div.innerHTML = players.map(p => `
        <div class="player-item">
            <div>
                <strong>🎮 ${p.username}</strong><br>
                📍 Points: ${p.points}<br>
                📅 Joined: ${p.created || 'Unknown'}
            </div>
            <button onclick="removeCustomer(${p.id}, '${p.username}')">🗑️ Remove</button>
        </div>
    `).join('');
}

// ========================================
// SUBMISSIONS
// ========================================

function loadAllSubmissions() {
    const subs = JSON.parse(localStorage.getItem('submissions'));
    const users = JSON.parse(localStorage.getItem('users'));
    const snacks = JSON.parse(localStorage.getItem('snacks'));
    const div = document.getElementById('allSubmissions');
    
    if (!subs.length) {
        div.innerHTML = '<p style="color:#999;text-align:center;">No submissions yet</p>';
        return;
    }
    
    div.innerHTML = subs.map(s => {
        const user = users.find(u => u.id === s.userId);
        const snack = snacks.find(sn => sn.id === s.snackId);
        return `
            <div class="submission-item" style="background:${s.isSuccess ? '#e8f5e9' : '#ffebee'}">
                <strong>Player:</strong> ${user?.username || 'Deleted'}<br>
                <strong>Code:</strong> ${s.combination}<br>
                <strong>Product:</strong> ${snack?.name || '❌ No match'}<br>
                <strong>Points:</strong> ${s.points}<br>
                <strong>Time:</strong> ${s.timestamp}
            </div>
        `;
    }).join('');
}

function showOwnerMessage(msg, type) {
    const div = document.getElementById('ownerMessage');
    div.textContent = msg;
    div.className = `message ${type}`;
    setTimeout(() => {
        div.textContent = '';
        div.className = 'message';
    }, 4000);
}
