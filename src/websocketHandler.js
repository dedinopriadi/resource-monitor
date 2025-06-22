const { getSystemInfo } = require('./systemInfo');

// Function to set up WebSocket handling
function setupWebSocket(io) {
    io.on('connection', (socket) => {
        let intervalId; // Use a single ID for the interval

        const sendData = () => {
            getSystemInfo().then(data => {
                socket.emit('sysinfo', { os: data.os, cpu: { currentLoad: data.cpu, cores: data.cpuDetails.cores, speed: data.cpuDetails.speed, manufacturer: data.cpuDetails.manufacturer, brand: data.cpuDetails.brand }, memory: data.memory, disk: data.disk, uptime: data.uptime, load: data.load });
                socket.emit('cpu', { usage: data.cpu, cores: data.cpuDetails.cores, speed: data.cpuDetails.speed });
                socket.emit('memUsage', data.memory);
                socket.emit('diskUsage', data.disk);
                socket.emit('networkSpeed', data.network.speed);
                socket.emit('networkHistory', data.network.history);
                socket.emit('tempInfo', data.temperature);
            }).catch(err => console.error("Error getting system info:", err));
        };

        const startInterval = (newInterval = 1000) => {
            if (intervalId) {
                clearInterval(intervalId);
            }
            sendData(); // Send data immediately, then start interval
            intervalId = setInterval(sendData, newInterval);
        };

        // Start with the default interval
        startInterval();

        // Listener for client setting the interval
        socket.on('set-interval', (data) => {
            if (data && data.interval && typeof data.interval === 'number' && data.interval >= 1000) {
                startInterval(data.interval);
            }
        });

        socket.on('disconnect', () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        });
    });
}

module.exports = {
    setupWebSocket
}; 