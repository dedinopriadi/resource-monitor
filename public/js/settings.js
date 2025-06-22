document.addEventListener('DOMContentLoaded', () => {
    const intervalButtons = document.querySelectorAll('.btn-group-item');
    
    if (intervalButtons.length > 0) {
        // Set initial active state from localStorage or default
        let currentInterval = localStorage.getItem('updateInterval') || '1000';
        intervalButtons.forEach(button => {
            if (button.dataset.interval === currentInterval) {
                button.classList.add('active');
            }
        });

        intervalButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                intervalButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to the clicked button
                button.classList.add('active');
                
                // Get new interval and save it
                const newInterval = button.dataset.interval;
                localStorage.setItem('updateInterval', newInterval);
                
                // Emit event to server to update the interval
                if (socket) {
                    socket.emit('set-interval', { interval: parseInt(newInterval, 10) });
                }
            });
        });
    }
}); 