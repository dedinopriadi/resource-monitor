const si = require('systeminformation');

// Store previous network stats for speed calculation
let previousNetworkStats = {};
let lastNetworkCheckTime = 0;
// Store historical data for charts (last 60 seconds)
let networkHistory = {
    timestamps: [],
    data: {}
};

// Function to calculate network speed and manage history
async function getNetworkSpeed() {
    const currentStats = await si.networkStats();
    const currentTime = Date.now();
    const timeDiff = (currentTime - lastNetworkCheckTime) / 1000; // timeDiff in seconds

    const speed = {};

    if (lastNetworkCheckTime === 0 || timeDiff === 0) {
        // First run or no time elapsed, cannot calculate speed yet
        currentStats.forEach(iface => {
            speed[iface.iface] = {
                upload: 0,
                download: 0,
                totalUpload: iface.tx_bytes,
                totalDownload: iface.rx_bytes
            };
            // Initialize history for this interface if it doesn't exist
            if (!networkHistory.data[iface.iface]) {
                networkHistory.data[iface.iface] = {
                    upload: [],
                    download: []
                };
            }
            networkHistory.data[iface.iface].upload.push(0);
            networkHistory.data[iface.iface].download.push(0);
             if (networkHistory.data[iface.iface].upload.length > 60) {
                networkHistory.data[iface.iface].upload.shift();
                networkHistory.data[iface.iface].download.shift();
            }
        });
    } else {
        currentStats.forEach(iface => {
            const prevIface = previousNetworkStats[iface.iface];
            if (prevIface) {
                const uploadSpeed = (iface.tx_bytes - prevIface.tx_bytes) / timeDiff;
                const downloadSpeed = (iface.rx_bytes - prevIface.rx_bytes) / timeDiff;

                const nonNegativeUploadSpeed = Math.max(0, uploadSpeed);
                const nonNegativeDownloadSpeed = Math.max(0, downloadSpeed);


                speed[iface.iface] = {
                    upload: nonNegativeUploadSpeed,
                    download: nonNegativeDownloadSpeed,
                    totalUpload: iface.tx_bytes, // Keep total bytes for reference
                    totalDownload: iface.rx_bytes // Keep total bytes for reference
                };

                // Update history data with non-negative values
                networkHistory.data[iface.iface].upload.push(nonNegativeUploadSpeed);
                networkHistory.data[iface.iface].download.push(nonNegativeDownloadSpeed);

                // Trim history to last 60 points
                if (networkHistory.data[iface.iface].upload.length > 60) {
                    networkHistory.data[iface.iface].upload.shift();
                    networkHistory.data[iface.iface].download.shift();
                }

            } else {
                // If no previous stats for this interface, push 0 speed to history
                networkHistory.data[iface.iface].upload.push(0);
                networkHistory.data[iface.iface].download.push(0);
                 if (networkHistory.data[iface.iface].upload.length > 60) {
                    networkHistory.data[iface.iface].upload.shift();
                    networkHistory.data[iface.iface].download.shift();
                }
            }
        });
    }

    previousNetworkStats = currentStats.reduce((acc, stat) => {
        acc[stat.iface] = stat;
        return acc;
    }, {});
    lastNetworkCheckTime = currentTime;
    return speed;
}

// Function to get all relevant system resources
async function getSystemInfo() {
    try {
        const time = si.time();
        const cpu = await si.currentLoad();
        const mem = await si.mem();
        const os = await si.osInfo();
        const disk = await si.fsSize();
        const temp = await si.cpuTemperature();
        const networkStats = await si.networkStats();
        const networkInterfaces = await si.networkInterfaces();
        const load = await si.currentLoad();
        const uptime = await si.time();
        const system = await si.system();
        const cpuInfo = await si.cpu();

        // Calculate network speed and update history
        const currentTime = new Date().toLocaleTimeString();
        const speed = await getNetworkSpeed();
        const activeInterfaces = networkInterfaces.filter(iface => iface.operstate === 'up');

        activeInterfaces.forEach(iface => {
            // The speed calculation is already handled by getNetworkSpeed(),
            // so we only need to update network history here if needed.
            // Remove the redundant speed calculation and assignment to speed[iface.iface]

            // Update history (this part was already correct)
            if (!networkHistory.data[iface.iface]) {
                networkHistory.data[iface.iface] = {
                    upload: [],
                    download: []
                };
            }

            networkHistory.timestamps.push(currentTime);
            // Ensure we are pushing values from the 'speed' object which was correctly populated by getNetworkSpeed
            const currentUploadSpeed = speed[iface.iface] ? speed[iface.iface].upload : 0;
            const currentDownloadSpeed = speed[iface.iface] ? speed[iface.iface].download : 0;
            networkHistory.data[iface.iface].upload.push(currentUploadSpeed);
            networkHistory.data[iface.iface].download.push(currentDownloadSpeed);

            // Keep only last 60 seconds of data
            if (networkHistory.timestamps.length > 60) {
                networkHistory.timestamps.shift();
                networkHistory.data[iface.iface].upload.shift();
                networkHistory.data[iface.iface].download.shift();
            }
        });

        return {
            cpu: cpu.currentLoad,
            cpuDetails: {
                cores: cpuInfo.cores,
                speed: cpuInfo.speed,
                manufacturer: cpuInfo.manufacturer,
                brand: cpuInfo.brand
            },
            memory: {
                total: mem.total,
                used: mem.used,
                free: mem.free,
                usagePercent: (mem.used / mem.total) * 100,
                swap: {
                    total: mem.swaptotal,
                    used: mem.swapused,
                    free: mem.swapfree,
                    usagePercent: mem.swaptotal ? (mem.swapused / mem.swaptotal) * 100 : 0
                }
            },
            disk: (() => {
                let mainDisk = null;

                if (os.platform === 'win32') {
                    // For Windows, look for the C: drive
                    mainDisk = disk.find(d => d.mount === 'C:\\' || d.mount === 'C:');
                } else if (os.platform === 'darwin') {
                    // For macOS, prioritize /System/Volumes/Data, then / (APFS containers)
                    mainDisk = disk.find(d => d.mount === '/System/Volumes/Data') || disk.find(d => d.mount === '/');
                } else {
                    // For Linux and other Unix-like systems, look for the root mount point /
                    mainDisk = disk.find(d => d.mount === '/');
                }

                if (mainDisk) {
                    const totalSize = mainDisk.size;
                    const totalAvailable = mainDisk.available;
                    const totalUsed = totalSize - totalAvailable; // Calculate used space based on total and available
                    const overallUsagePercent = totalSize > 0 ? (totalUsed / totalSize) * 100 : 0;

                    return {
                        total: totalSize,
                        used: totalUsed,
                        available: totalAvailable,
                        usagePercent: overallUsagePercent
                    };
                } else {
                    // Fallback if no relevant disk is found
                    return {
                        total: 0,
                        used: 0,
                        available: 0,
                        usagePercent: 0
                    };
                }
            })(),
            temperature: temp,
            network: {
                interfaces: activeInterfaces,
                speed: speed,
                history: networkHistory
            },
            load: {
                current: load.currentLoad,
                average: load.avgLoad,
                one: load.loads ? load.loads[0] : undefined,
                five: load.loads ? load.loads[1] : undefined,
                fifteen: load.loads ? load.loads[2] : undefined
            },
            uptime: {
                seconds: uptime.uptime,
                formatted: formatUptime(uptime.uptime)
            },
            system: {
                manufacturer: system.manufacturer,
                model: system.model,
                version: system.version,
                serial: system.serial,
                uuid: system.uuid,
                sku: system.sku,
                virtual: system.virtual
            },
            os: {
                platform: os.platform,
                arch: os.arch,
                hostname: os.hostname,
                distro: os.distro,
                release: os.release,
                kernel: os.kernel
            }
        };
    } catch (error) {
        console.error('Error fetching system info:', error);
        throw error;
    }
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.join(' ') || '0m';
}

module.exports = {
    getSystemInfo
}; 