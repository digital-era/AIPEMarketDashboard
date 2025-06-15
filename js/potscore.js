// --- Global Chart Instances ---
let udiGdiChartFrom2021Instance = null;
let udiGdiChartThisYearInstance = null; // New chart instance

// --- Theme Management ---
const themeToggleBtn = document.getElementById('theme-toggle');
const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        themeToggleLightIcon.classList.remove('hidden');
        themeToggleDarkIcon.classList.add('hidden');
        localStorage.theme = 'dark';
    } else {
        document.documentElement.classList.remove('dark');
        themeToggleLightIcon.classList.add('hidden');
        themeToggleDarkIcon.classList.remove('hidden');
        localStorage.theme = 'light';
    }
    updateChartsTheme();
}

themeToggleBtn.addEventListener('click', () => {
    const currentTheme = localStorage.getItem('theme') || 'light';
    applyTheme(currentTheme === 'light' ? 'dark' : 'light');
});

(function() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme || (systemPrefersDark ? 'dark' : 'light'));
})();

// --- Main Data Loading ---
document.addEventListener('DOMContentLoaded', function() {
    fetch('AIPEMarketData.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            // Create the two charts
            createUdiGdiChart(data.UDI_GDI_from2021, 'udiGdiChartFrom2021', 'year');
            createUdiGdiChart(data.UDI_GDI_ThisYear, 'udiGdiChartThisYear', 'month'); // New chart call
            
            // Populate tables
            populateTopPotScoreTable(data.TopPotScore5Days);
            populateTopMainFundTable(data.TopMainFund5Days);
            populateTopStockInPotScoreTable(data.TopStockInTopPotScore);
            populateTopStockInMainFundTable(data.TopStockIn5DaysMainFund);
        })
        .catch(error => {
            console.error('Error fetching or parsing market data:', error);
            document.body.innerHTML = `<div class="p-8 text-red-600">Failed to load market data. Please check console for details.</div>`;
        });
});

// --- Helper Functions ---
function getColorClass(value) {
    if (value > 0) return 'text-green-500 dark:text-green-400';
    if (value < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-500 dark:text-gray-400';
}

function formatValue(value, decimals = 2, unit = '') {
    if (typeof value !== 'number' || isNaN(value)) {
        return 'N/A';
    }
    return `${value.toFixed(decimals)}${unit}`;
}


// --- Chart Theming and Creation ---
function applyThemeToChart(chartInstance) {
    if (!chartInstance) return;

    const isDarkMode = document.documentElement.classList.contains('dark');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDarkMode ? '#C9D1D9' : '#333';
    const tooltipBgColor = isDarkMode ? '#161B22' : '#fff';
    const tooltipBorderColor = isDarkMode ? '#30363D' : '#ccc';

    const chartOptions = chartInstance.options;

    if (chartOptions.plugins.legend) chartOptions.plugins.legend.labels.color = textColor;
    if (chartOptions.plugins.tooltip) {
        Object.assign(chartOptions.plugins.tooltip, {
            backgroundColor: tooltipBgColor,
            borderColor: tooltipBorderColor,
            titleColor: textColor,
            bodyColor: textColor,
        });
    }
    
    Object.values(chartOptions.scales).forEach(scale => {
        if (scale.grid) scale.grid.color = gridColor;
        if (scale.ticks) scale.ticks.color = textColor;
        if (scale.title) scale.title.color = textColor;
    });

    chartInstance.update();
}

function updateChartsTheme() {
    applyThemeToChart(udiGdiChartFrom2021Instance);
    applyThemeToChart(udiGdiChartThisYearInstance);
}

// Reusable chart creation function
function createUdiGdiChart(chartData, canvasId, timeUnit) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const parsedData = chartData
        .map(d => ({
            date: new Date(d.Date),
            udi: d.Close_UDI,
            gdi: d.Close_GDI
        }))
        .filter(d => !isNaN(d.date.getTime()));

    const labels = parsedData.map(d => d.date);
    const udiData = parsedData.map(d => (d.udi === null || isNaN(d.udi)) ? null : d.udi);
    const gdiData = parsedData.map(d => (d.gdi === null || isNaN(d.gdi)) ? null : d.gdi);
    
    const chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'UDI Close', data: udiData, borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)', borderWidth: 2, pointRadius: 0, tension: 0.1, yAxisID: 'y'
                },
                {
                    label: 'GDI Close', data: gdiData, borderColor: 'rgb(234, 179, 8)',
                    backgroundColor: 'rgba(234, 179, 8, 0.2)', borderWidth: 2, pointRadius: 0, tension: 0.1, yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            scales: {
                x: { type: 'time', time: { unit: timeUnit, displayFormats: { [timeUnit]: timeUnit === 'year' ? 'yyyy' : 'MMM' }, tooltipFormat: 'MMM dd, yyyy' }, title: { display: false } },
                y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'UDI' } },
                y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Gold' }, grid: { drawOnChartArea: false } }
            },
            plugins: {
                legend: {
                    position: 'bottom', // Move legend to bottom to save space
                }
            }
        }
    });

    // Store the correct instance
    if (canvasId === 'udiGdiChartFrom2021') {
        udiGdiChartFrom2021Instance = chartInstance;
    } else if (canvasId === 'udiGdiChartThisYear') {
        udiGdiChartThisYearInstance = chartInstance;
    }

    applyThemeToChart(chartInstance);
}


// --- Table Population Functions ---
function populateTopPotScoreTable(data) {
    const tableBody = document.getElementById('topPotScoreTableBody');
    tableBody.innerHTML = '';
    data.forEach(item => {
        const row = `
            <tr class="bg-white dark:bg-dark-card border-b dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-700">
                <td class="px-4 py-2 font-medium text-gray-900 dark:text-white">${item['l2name']}</td>
                <td class="px-4 py-2 text-right font-semibold ${getColorClass(item['PotScore'])}">${formatValue(item['PotScore'])}</td>
                <td class="px-4 py-2 text-right font-semibold ${getColorClass(item['主力净流入-净占比'])}">${formatValue(item['主力净流入-净占比'], 2, '%')}</td>
            </tr>`;
        tableBody.innerHTML += row;
    });
}

function populateTopMainFundTable(data) {
    const tableBody = document.getElementById('topMainFundTableBody');
    tableBody.innerHTML = '';
    data.forEach(item => {
        const row = `
            <tr class="bg-white dark:bg-dark-card border-b dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-700">
                <td class="px-4 py-2 font-medium text-gray-900 dark:text-white">${item['l2name']}</td>
                <td class="px-4 py-2 text-right font-semibold ${getColorClass(item['PotScore'])}">${formatValue(item['PotScore'])}</td>
                <td class="px-4 py-2 text-right font-semibold ${getColorClass(item['主力净流入-净占比'])}">${formatValue(item['主力净流入-净占比'], 2, '%')}</td>
            </tr>`;
        tableBody.innerHTML += row;
    });
}

function populateTopStockInPotScoreTable(data) {
    const tableBody = document.getElementById('topStockInTopPotScoreTableBody');
    tableBody.innerHTML = '';
    data.forEach(item => {
        const row = `
            <tr class="bg-white dark:bg-dark-card border-b dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-700">
                <td class="px-4 py-2 font-medium text-gray-900 dark:text-white">${item['名称']}</td>
                <td class="px-4 py-2 text-gray-500 dark:text-dark-subtle">${item['l2name']}</td>
                <td class="px-4 py-2 text-right font-semibold ${getColorClass(item['总净流入占比_5日总和'])}">${formatValue(item['总净流入占比_5日总和'], 2, '%')}</td>
            </tr>`;
        tableBody.innerHTML += row;
    });
}

function populateTopStockInMainFundTable(data) {
    const tableBody = document.getElementById('topStockInMainFundTableBody');
    tableBody.innerHTML = '';
    data.forEach(item => {
        const row = `
            <tr class="bg-white dark:bg-dark-card border-b dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-700">
                <td class="px-4 py-2 font-medium text-gray-900 dark:text-white">${item['名称']}</td>
                <td class="px-4 py-2 text-gray-500 dark:text-dark-subtle">${item['l2name']}</td>
                <td class="px-4 py-2 text-right font-semibold ${getColorClass(item['总净流入占比_5日总和'])}">${formatValue(item['总净流入占比_5日总和'], 2, '%')}</td>
            </tr>`;
        tableBody.innerHTML += row;
    });
}
