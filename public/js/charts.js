// Chart.js setup and update logic will be moved here from main.js 

document.addEventListener('DOMContentLoaded', () => {
    // CPU Chart initialization
    const cpuChartCanvas = document.getElementById('cpuChart');
    if (cpuChartCanvas) {
        const ctx = cpuChartCanvas.getContext('2d');
        cpuChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'CPU Usage',
                    data: [],
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 0 },
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: isDarkMode ? darkTheme.chartText : lightTheme.chartText
                        }
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                const timestamp = context[0].parsed.x;
                                if (typeof timestamp === 'number') {
                                    const date = luxon.DateTime.fromMillis(timestamp);
                                    return date.toFormat('HH:mm:ss');
                                }
                                return '';
                            },
                            label: function(context) {
                                return `CPU Usage: ${context.parsed.y.toFixed(1)}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Usage %',
                            color: isDarkMode ? darkTheme.chartText : lightTheme.chartText
                        },
                        ticks: {
                            color: isDarkMode ? darkTheme.chartText : lightTheme.chartText
                        },
                        grid: {
                            color: isDarkMode ? darkTheme.chartGrid : lightTheme.chartGrid
                        }
                    },
                    x: {
                        type: 'time',
                        time: {
                            unit: 'second',
                            displayFormats: {
                                second: 'HH:mm:ss'
                            }
                        },
                        ticks: {
                            maxRotation: 0,
                            minRotation: 0,
                            color: isDarkMode ? darkTheme.chartText : lightTheme.chartText,
                            callback: function(value) {
                                if (typeof value === 'number') {
                                    const date = luxon.DateTime.fromMillis(value);
                                    return date.toFormat('HH:mm:ss');
                                }
                                return '';
                            }
                        },
                        grid: {
                            color: isDarkMode ? darkTheme.chartGrid : lightTheme.chartGrid
                        }
                    }
                }
            }
        });
    }

    // Network item initialization (for legacy network card)
    const networkContent = document.getElementById('networkContent');
    if (networkContent) {
        const networkItem = document.createElement('div');
        networkItem.id = 'networkItem';
        networkItem.className = 'network-item';
        networkContent.appendChild(networkItem);
    }
}); 