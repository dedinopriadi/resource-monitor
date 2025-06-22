// UI interactivity logic (sidebar toggles, theme switch, dropdowns, etc.) will be moved here from main.js 

let isDarkMode = false;
const darkModeToggle = document.getElementById('darkModeToggle');
const settingsToggle = document.getElementById('settingsToggle');
const settingsDropdown = document.getElementById('settingsDropdown');

const lightTheme = {
    background: '#f1f5f9',
    text: '#1e293b',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    topNavBg: '#f8fafc',
    topNavBorder: '#e2e8f0',
    buttonBg: '#ffffff',
    buttonBorder: '#e2e8f0',
    buttonText: '#1e293b',
    chartGrid: 'rgba(0, 0, 0, 0.05)',
    chartText: '#64748b',
    dropdownBg: '#ffffff',
    dropdownBorder: '#e2e8f0',
    dropdownText: '#1e293b',
    dropdownHeader: '#64748b',
    switchBg: '#e2e8f0',
    switchActive: '#3b82f6'
};

const darkTheme = {
    background: '#0f172a',
    text: '#f1f5f9',
    cardBg: '#1e293b',
    cardBorder: '#334155',
    topNavBg: '#1e293b',
    topNavBorder: '#334155',
    buttonBg: '#334155',
    buttonBorder: '#475569',
    buttonText: '#f1f5f9',
    chartGrid: 'rgba(255, 255, 255, 0.05)',
    chartText: '#94a3b8',
    dropdownBg: '#1e293b',
    dropdownBorder: '#334155',
    dropdownText: '#f1f5f9',
    dropdownHeader: '#94a3b8',
    switchBg: '#475569',
    switchActive: '#60a5fa'
};

function applyTheme(theme) {
    for (const key in theme) {
        if (theme.hasOwnProperty(key)) {
            document.documentElement.style.setProperty(`--${key}`, theme[key]);
        }
    }
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// Initial theme application based on system preference or saved setting
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    isDarkMode = true;
    applyTheme(darkTheme);
    darkModeToggle.checked = true;
} else if (savedTheme === 'light') {
    isDarkMode = false;
    applyTheme(lightTheme);
    darkModeToggle.checked = false;
} else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    isDarkMode = true;
    applyTheme(darkTheme);
    darkModeToggle.checked = true;
} else {
    isDarkMode = false;
    applyTheme(lightTheme);
    darkModeToggle.checked = false;
}

darkModeToggle.addEventListener('change', () => {
    isDarkMode = darkModeToggle.checked;
    if (isDarkMode) {
        applyTheme(darkTheme);
        localStorage.setItem('theme', 'dark');
    } else {
        applyTheme(lightTheme);
        localStorage.setItem('theme', 'light');
    }
});

// Toggle settings dropdown
if (settingsToggle) {
    settingsToggle.addEventListener('click', (event) => {
        settingsDropdown.classList.toggle('show');
        event.stopPropagation();
    });
}

document.addEventListener('click', (event) => {
    if (settingsDropdown && !settingsDropdown.contains(event.target) && !settingsToggle.contains(event.target)) {
        settingsDropdown.classList.remove('show');
    }
});

// Temperature unit toggle event listener
document.addEventListener('DOMContentLoaded', () => {
    const temperatureUnitToggle = document.getElementById('temperatureUnitToggle');
    if (temperatureUnitToggle) {
        // Set initial state based on saved preference or default to Celsius
        const savedUnit = localStorage.getItem('tempUnit');
        if (savedUnit === 'F') {
            temperatureUnitToggle.checked = true;
            currentTempUnit = 'F';
        } else {
            temperatureUnitToggle.checked = false;
            currentTempUnit = 'C';
        }
        // Manually trigger an update to show the correct initial temperature
        if (typeof updateTemperatureDisplay === 'function') {
            updateTemperatureDisplay();
        }

        temperatureUnitToggle.addEventListener('change', () => {
            currentTempUnit = temperatureUnitToggle.checked ? 'F' : 'C';
            localStorage.setItem('tempUnit', currentTempUnit);
            if (typeof updateTemperatureDisplay === 'function') {
                updateTemperatureDisplay();
            }
        });
    }
}); 