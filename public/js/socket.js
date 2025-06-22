const socket = io();

socket.on('connect', () => {
    // On every connection, read the saved interval from localStorage
    const savedInterval = localStorage.getItem('updateInterval') || '1000';
    
    // Inform the server of the client's preferred interval
    socket.emit('set-interval', { interval: parseInt(savedInterval, 10) });
});

// Shared state for charts
const networkCharts = {};
const MAX_DATA_POINTS = 60;
let cpuChart;
let cpuHistory = [];

// --- Network Usage Summary Chart for Dashboard ---
let dashboardNetworkChart;
let dashboardNetworkHistory = {
    timestamps: [],
    upload: [],
    download: []
};

// --- Adaptive Unit Formatter ---
function formatAdaptiveUnit(value, type = 'speed') {
    const units = type === 'speed' ? ['B/s', 'KB/s', 'MB/s', 'GB/s'] : ['B', 'KB', 'MB', 'GB', 'TB'];
    let v = value;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
    }
    return `${v.toFixed(2)} ${units[i]}`;
}

function getNetworkYAxisUnit(maxValue) {
    if (maxValue >= 1024 * 1024 * 1024) return { unit: 'GB/s', divisor: 1024 * 1024 * 1024 };
    if (maxValue >= 1024 * 1024) return { unit: 'MB/s', divisor: 1024 * 1024 };
    if (maxValue >= 1024) return { unit: 'KB/s', divisor: 1024 };
    return { unit: 'B/s', divisor: 1 };
}

function updateDashboardNetworkChart() {
    const maxY = Math.max(...dashboardNetworkHistory.upload, ...dashboardNetworkHistory.download, 1);
    const yUnit = getNetworkYAxisUnit(maxY);
    const uploadData = dashboardNetworkHistory.upload.map(v => v / yUnit.divisor);
    const downloadData = dashboardNetworkHistory.download.map(v => v / yUnit.divisor);
    if (!dashboardNetworkChart) {
        const ctx = document.getElementById('networkChart').getContext('2d');
        dashboardNetworkChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dashboardNetworkHistory.timestamps,
                datasets: [
                    {
                        label: 'Upload',
                        data: uploadData,
                        borderColor: 'rgb(255, 99, 132)',
                        tension: 0.1,
                        fill: false
                    },
                    {
                        label: 'Download',
                        data: downloadData,
                        borderColor: 'rgb(54, 162, 235)',
                        tension: 0.1,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 0 },
                plugins: {
                    legend: { display: true },
                    tooltip: { enabled: true }
                },
                scales: {
                    x: { display: false },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: `Speed (${yUnit.unit})` },
                        grid: { color: isDarkMode ? darkTheme.chartGrid : lightTheme.chartGrid },
                        ticks: {
                            color: isDarkMode ? darkTheme.chartText : lightTheme.chartText,
                            callback: function(value) {
                                return value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    } else {
        dashboardNetworkChart.options.scales.y.title.text = `Speed (${yUnit.unit})`;
        dashboardNetworkChart.data.labels = dashboardNetworkHistory.timestamps;
        dashboardNetworkChart.data.datasets[0].data = uploadData;
        dashboardNetworkChart.data.datasets[1].data = downloadData;
        dashboardNetworkChart.update();
    }
}

// System Information Update
socket.on('sysinfo', (data) => {
    // Safely update legacy System Info card (for Device Resource page)
    const systemInfoDetails = document.getElementById('systemInfoDetails');
    if (systemInfoDetails) {
        let detailsHtml = '';
        detailsHtml += createDetailsItem('OS Type', data.os.platform);
        detailsHtml += createDetailsItem('Architecture', data.os.arch);
        detailsHtml += createDetailsItem('Hostname', data.os.hostname);
        detailsHtml += createDetailsItem('Total Memory', formatBytes(data.memory.total));
        detailsHtml += createDetailsItem('CPU Cores', data.cpu.cores);
        detailsHtml += createDetailsItem('CPU Speed', `${data.cpu.speed} GHz`);
        detailsHtml += createDetailsItem('System Uptime', data.uptime.formatted);
        systemInfoDetails.innerHTML = detailsHtml;
    }

    // UPDATE HEADER UPTIME (for main Dashboard)
    const headerUptime = document.getElementById('headerUptime');
    if (headerUptime) {
        headerUptime.textContent = data.uptime.formatted;
    }

    // Safely update legacy Load Average card (for Device Resource page)
    const loadAverageValue = document.getElementById('loadAverageValue');
    const loadAverageDetails = document.getElementById('loadAverageDetails');
    if (loadAverageValue && loadAverageDetails) {
        if (data.load && typeof data.load.average === 'number') {
            loadAverageValue.textContent = data.load.average.toFixed(2);
            let loadDetailsHtml = createDetailsItem('1 min', typeof data.load.one === 'number' ? data.load.one.toFixed(2) : '--');
            loadDetailsHtml += createDetailsItem('5 min', typeof data.load.five === 'number' ? data.load.five.toFixed(2) : '--');
            loadDetailsHtml += createDetailsItem('15 min', typeof data.load.fifteen === 'number' ? data.load.fifteen.toFixed(2) : '--');
            loadAverageDetails.innerHTML = loadDetailsHtml;
        } else {
            loadAverageValue.textContent = '--';
            loadAverageDetails.innerHTML = '';
        }
    }

    // Safely update legacy Uptime card (for Device Resource page)
    const uptimeValue = document.getElementById('uptimeValue');
    const uptimeDetails = document.getElementById('uptimeDetails');
    if (uptimeValue && uptimeDetails) {
        if (data.uptime) {
            uptimeValue.textContent = data.uptime.formatted;
            let uptimeDetailsHtml = createDetailsItem('Total Uptime', data.uptime.formatted);
            uptimeDetailsHtml += createDetailsItem('Seconds', `${data.uptime.seconds}s`);
            uptimeDetails.innerHTML = uptimeDetailsHtml;
        } else {
            uptimeValue.textContent = '--';
            uptimeDetails.innerHTML = '';
        }
    }
});

// Memory Usage Update
socket.on('memUsage', (data) => {
    // Update summary card on Dashboard
    const summaryMemoryUsed = document.getElementById('summaryMemoryUsed');
    if (summaryMemoryUsed) {
        summaryMemoryUsed.textContent = `${formatBytes(data.used)} / ${formatBytes(data.total)}`;
    }

    // Safely update legacy Memory card (for Device Resource page)
    const memoryProgressBar = document.getElementById('memoryProgressBar');
    if (memoryProgressBar) {
        const memoryProgressText = document.getElementById('memoryProgressText');
        const memoryUsedValue = document.getElementById('memoryUsedValue');
        const memoryDetails = document.getElementById('memoryDetails');
        const swapMemoryProgressBar = document.getElementById('swapMemoryProgressBar');
        const swapMemoryProgressText = document.getElementById('swapMemoryProgressText');
        const swapMemoryUsedValue = document.getElementById('swapMemoryUsedValue');
        const swapMemoryDetails = document.getElementById('swapMemoryDetails');

        updateProgressBar(memoryProgressBar, data.usagePercent);
        memoryProgressText.textContent = `${data.usagePercent.toFixed(1)}%`;
        memoryUsedValue.textContent = `${data.usagePercent.toFixed(1)}% used`;
        let detailsHtml = createDetailsItem('Total', formatBytes(data.total));
        detailsHtml += createDetailsItem('Used', formatBytes(data.used));
        detailsHtml += createDetailsItem('Free', formatBytes(data.free));
        memoryDetails.innerHTML = detailsHtml;

        if (data.swap) {
            updateProgressBar(swapMemoryProgressBar, data.swap.usagePercent);
            swapMemoryProgressText.textContent = `${data.swap.usagePercent.toFixed(1)}%`;
            swapMemoryUsedValue.textContent = `${data.swap.usagePercent.toFixed(1)}% used`;
            let swapDetailsHtml = createDetailsItem('Total Swap', formatBytes(data.swap.total));
            swapDetailsHtml += createDetailsItem('Used Swap', formatBytes(data.swap.used));
            swapDetailsHtml += createDetailsItem('Free Swap', formatBytes(data.swap.free));
            swapMemoryDetails.innerHTML = swapDetailsHtml;
        }
    }
});

// Disk Usage Update
socket.on('diskUsage', (data) => {
    // Update summary card on Dashboard
    const summaryDiskFree = document.getElementById('summaryDiskFree');
    if (summaryDiskFree) {
        summaryDiskFree.textContent = `${formatTotalBytes(data.available)}`;
    }
    
    // Safely update legacy Disk card (for Device Resource page)
    const diskProgressBar = document.getElementById('diskProgressBar');
    if (diskProgressBar) {
        const diskProgressText = document.getElementById('diskProgressText');
        const diskUsedValue = document.getElementById('diskUsedValue');
        const diskDetails = document.getElementById('diskDetails');

        updateProgressBar(diskProgressBar, data.usagePercent);
        diskProgressText.textContent = `${data.usagePercent.toFixed(1)}%`;
        diskUsedValue.textContent = `${data.usagePercent.toFixed(1)}% used`;
        let detailsHtml = createDetailsItem('Total', formatBytes(data.total));
        detailsHtml += createDetailsItem('Used', formatBytes(data.used));
        detailsHtml += createDetailsItem('Available', formatBytes(data.available));
        diskDetails.innerHTML = detailsHtml;
    }
});

// Network Speed Update
socket.on('networkSpeed', (data) => {
    let totalUploadSpeed = 0;
    let totalDownloadSpeed = 0;
    let totalUpload = 0;
    let totalDownload = 0;
    for (const iface in data) {
        totalUploadSpeed += data[iface].upload;
        totalDownloadSpeed += data[iface].download;
        totalUpload += data[iface].totalUpload;
        totalDownload += data[iface].totalDownload;
    }
    // Use adaptive units for display
    const uploadSpeedStr = formatAdaptiveUnit(totalUploadSpeed, 'speed');
    const downloadSpeedStr = formatAdaptiveUnit(totalDownloadSpeed, 'speed');
    const totalUploadStr = formatAdaptiveUnit(totalUpload, 'total');
    const totalDownloadStr = formatAdaptiveUnit(totalDownload, 'total');
    // Update the layout as in the blueprint (2x2 grid with divider)
    const networkStats = document.querySelector('.network-stats');
    if (networkStats) {
        networkStats.innerHTML = `
          <div class="network-col network-col-left">
            <div class="network-row">
              <span>Upload</span>
              <span class="network-value">${uploadSpeedStr}</span>
            </div>
            <div class="network-row">
              <span>Download</span>
              <span class="network-value">${downloadSpeedStr}</span>
            </div>
          </div>
          <div class="network-divider"></div>
          <div class="network-col network-col-right">
            <div class="network-row">
              <span>Total Up</span>
              <span class="network-value">${totalUploadStr}</span>
            </div>
            <div class="network-row">
              <span>Total Down</span>
              <span class="network-value">${totalDownloadStr}</span>
            </div>
          </div>
        `;
    }
});

// Network History Update
socket.on('networkHistory', (data) => {
    // Aggregate upload/download across all interfaces for each timestamp
    const timestamps = data.timestamps.slice(-MAX_DATA_POINTS);
    const upload = [];
    const download = [];
    for (let i = 0; i < timestamps.length; i++) {
        let totalUpload = 0;
        let totalDownload = 0;
        for (const iface in data.data) {
            totalUpload += data.data[iface].upload[i] || 0;
            totalDownload += data.data[iface].download[i] || 0;
        }
        upload.push(totalUpload);
        download.push(totalDownload);
    }
    dashboardNetworkHistory = { timestamps, upload, download };
    updateDashboardNetworkChart();
});

// Temperature Info Update
socket.on('tempInfo', (data) => {
    lastTemperatureData = data;
    updateTemperatureDisplay();
});

// Update CPU data handling
socket.on('cpu', (data) => {
    const cpuUsage = data.usage;
    
    // Update summary card on Dashboard
    const summaryCpuUsage = document.getElementById('summaryCpuUsage');
    if (summaryCpuUsage) {
        summaryCpuUsage.textContent = `${cpuUsage.toFixed(1)}%`;
    }

    // Update CPU Chart history
    const currentTime = new Date();
    cpuHistory.push({ time: currentTime, usage: cpuUsage });
    if (cpuHistory.length > MAX_DATA_POINTS) {
        cpuHistory.shift();
    }
    if (cpuChart) {
        cpuChart.data.datasets[0].data = cpuHistory.map(item => ({ x: item.time, y: item.usage }));
        cpuChart.update();
    }
    
    // Safely update legacy CPU card (for Device Resource page)
    const cpuProgressBar = document.getElementById('cpuProgressBar');
    if (cpuProgressBar) {
        const cpuProgressText = document.getElementById('cpuProgressText');
        const cpuUsedValue = document.getElementById('cpuUsedValue');
        const cpuDetails = document.getElementById('cpuDetails');

        updateProgressBar(cpuProgressBar, cpuUsage);
        cpuProgressText.textContent = `${cpuUsage.toFixed(1)}%`;
        cpuUsedValue.textContent = `${cpuUsage.toFixed(1)}% used`;
        
        let detailsHtml = '';
        if (data.cores) {
            data.cores.forEach((core, index) => {
                detailsHtml += createDetailsItem(`Core ${index}`, `${core.toFixed(1)}%`);
            });
        }
        cpuDetails.innerHTML = detailsHtml;
    }
});

// Network data handling
socket.on('network', (data) => {
    const networkContent = document.getElementById('networkContent');
    const networkItem = document.getElementById('networkItem');
    if (!networkContent || !networkItem) return;
    let networkHtml = '';
    if (data.interfaces) {
        Object.entries(data.interfaces).forEach(([name, stats]) => {
            networkHtml += `
                <div class="interface">
                    <h3>${name}</h3>
                    <div class="details">
                        ${createDetailsItem('Download', formatSpeed(stats.download))}
                        ${createDetailsItem('Upload', formatSpeed(stats.upload))}
                    </div>
                </div>
            `;
        });
    }
    networkItem.innerHTML = networkHtml;
    if (data.total) {
        const summaryNetworkSpeed = document.getElementById('summaryNetworkSpeed');
        if (summaryNetworkSpeed) {
            summaryNetworkSpeed.textContent = formatSpeed(data.total.download + data.total.upload);
        }
    }
}); 