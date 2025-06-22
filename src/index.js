const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { setupWebSocket } = require('./websocketHandler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Setup WebSocket
setupWebSocket(io);

// App routes
app.get('/', (req, res) => {
    res.render('pages/dashboard', { activePage: 'dashboard' });
});

app.get('/device-resource', (req, res) => {
    res.render('pages/device-resource', { activePage: 'device-resource' });
});

app.get('/settings', (req, res) => {
    res.render('pages/settings', {
        pageTitle: 'Settings',
        activePage: 'settings'
    });
});

app.get('/about', (req, res) => {
    res.render('pages/about', {
        pageTitle: 'About',
        activePage: 'about'
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
}); 