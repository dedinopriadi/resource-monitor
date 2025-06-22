let currentTempUnit = 'C'; // 'C' for Celsius, 'F' for Fahrenheit
let lastTemperatureData = null; // Store last received temperature data

function updateProgressBar(element, value, warning = 70, danger = 90) {
    element.style.width = `${value}%`;
    element.className = 'progress-bar';
    if (value >= danger) {
        element.classList.add('danger');
    } else if (value >= warning) {
        element.classList.add('warning');
    }
}

function formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

function createDetailsItem(label, value) {
    return `
        <div class="details-item">
            <span>${label}</span>
            <span>${value}</span>
        </div>
    `;
}

function formatSpeed(bytesPerSecond) {
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let value = bytesPerSecond;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }
    return `${value.toFixed(2)} ${units[unitIndex]}`;
}

function formatTotalBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }
    return `${value.toFixed(2)} ${units[unitIndex]}`;
}

function celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
}

function formatTemperature(celsius, unit) {
    if (typeof celsius !== 'number') return '-- \u00b0C';
    if (unit === 'F') {
        const fahrenheit = celsiusToFahrenheit(celsius);
        return `${fahrenheit.toFixed(1)} \u00b0F`;
    } else {
        return `${celsius.toFixed(1)} \u00b0C`;
    }
}

function updateTemperatureDisplay() {
    const temperatureValue = document.getElementById('temperatureValue');
    const temperatureDetails = document.getElementById('temperatureDetails');
    
    // Safety check for dashboard view
    if (!temperatureValue || !temperatureDetails) {
        return;
    }

    if (lastTemperatureData && typeof lastTemperatureData.main === 'number') {
        temperatureValue.textContent = formatTemperature(lastTemperatureData.main, currentTempUnit);
        let detailsHtml = createDetailsItem('Main', formatTemperature(lastTemperatureData.main, currentTempUnit));
        if (typeof lastTemperatureData.max === 'number') {
            detailsHtml += createDetailsItem('Max', formatTemperature(lastTemperatureData.max, currentTempUnit));
        }
        if (lastTemperatureData.cores && Array.isArray(lastTemperatureData.cores)) {
            lastTemperatureData.cores.forEach((coreTemp, index) => {
                if (typeof coreTemp === 'number') {
                    detailsHtml += createDetailsItem(`Core ${index}`, formatTemperature(coreTemp, currentTempUnit));
                } else {
                    detailsHtml += createDetailsItem(`Core ${index}`, 'N/A');
                }
            });
        }
        temperatureDetails.innerHTML = detailsHtml;
    } else {
        // Even if no data, update unit correctly based on toggle
        temperatureValue.textContent = `-- ${currentTempUnit === 'F' ? '°F' : '°C'}`;
        temperatureDetails.innerHTML = '';
    }
} 