// --- Global Chart Instances ---
let timeSeriesChartInstance = null;
let hotIndustriesChartInstance = null;

// --- Theme Management ---
const themeToggleBtn = document.getElementById('theme-toggle');
const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');

// Function to apply the theme
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
    // Update charts after theme change
    updateChartsTheme();
}

// Event listener for the toggle button
themeToggleBtn.addEventListener('click', () => {
    const currentTheme = localStorage.getItem('theme') || 'light';
    applyTheme(currentTheme === 'light' ? 'dark' : 'light');
});

// Apply theme on initial load
(function() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme || (systemPrefersDark ? 'dark' : 'light'));
})();


document.addEventListener('DOMContentLoaded', function() {
    fetch('AIPEMarketData.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            populateSummaryCards(data);
            // We now pass the initial theme state to the chart creation functions
            const isDarkMode = document.documentElement.classList.contains('dark');
            createTimeSeriesChart(data.UDI_SZI_from2021, isDarkMode);
            createHotIndustriesChart(data.DistributeHotIndustry, isDarkMode);
            createEtfPerformanceTable(data);
            createArGroupTable(data.ARGroup);
        })
        .catch(error => {
            console.error('Error fetching or parsing market data:', error);
            document.body.innerHTML = `<div class="p-8 text-red-600">Failed to load market data. Please ensure AIPEMarketData.json is in the same directory and is valid JSON.</div>`;
        });
});

// ... (other helper functions like getOrderValue, formatValue, getColorClass are unchanged) ...

function getOrderValue(value) {
    if (typeof value !== 'number' || isNaN(value)) {
        return -Infinity;
    }
    return value;
}

function formatValue(value, decimals = 2, unit = '') {
    if (typeof value !== 'number' || isNaN(value)) {
        return 'N/A';
    }
    return `${value.toFixed(decimals)}${unit}`;
}

function getColorClass(value) {
    if (value > 0) return 'text-green-500 dark:text-green-400';
    if (value < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-500 dark:text-gray-400';
}

function populateSummaryCards(data) {
    const hottest = data.DistributeHotIndustry[0];
    document.getElementById('hottest-industry').textContent = hottest['Industry Name'];
    document.getElementById('hottest-industry-index').textContent = `${formatValue(hottest['Hot Frequency Index (%)'], 2, '%')} Index`;
    const topPerformer = [...data.PriceThisYearChange].sort((a, b) => b.YC - a.YC)[0];
    document.getElementById('top-performer-name').textContent = topPerformer['名称'];
    document.getElementById('top-performer-change').innerHTML = `<span class="${getColorClass(topPerformer.YC)}">${formatValue(topPerformer.YC, 2, '%')}</span>`;
    const topShareGrowth = [...data.ShareThisYearChange].sort((a, b) => b['Year\u4efd\u989d\u589e\u957f%'] - a['Year\u4efd\u989d\u589e\u957f%'])[0];
    document.getElementById('top-share-growth-name').textContent = topShareGrowth['基金简称'];
    document.getElementById('top-share-growth-change').innerHTML = `<span class="text-blue-500 dark:text-blue-400">${formatValue(topShareGrowth['Year\u4efd\u989d\u589e\u957f%'], 2, '%')}</span>`;
    const worstPerformer = [...data.PriceChangeFrom2021].sort((a, b) => a['价格增长%'] - b['价格增长%'])[0];
    document.getElementById('worst-performer-name').textContent = worstPerformer['基金简称'];
    document.getElementById('worst-performer-change').innerHTML = `<span class="${getColorClass(worstPerformer['价格增长%'])}">${formatValue(worstPerformer['价格增长%'], 2, '%')}</span>`;
}


// =======================================================
// ==================   MODIFIED SECTION START   ==================
// =======================================================

/**
 * A dedicated function to apply theme colors to a chart instance.
 * It surgically updates only color properties, preserving other settings.
 * @param {Chart} chartInstance The chart instance to update.
 */
function applyThemeToChart(chartInstance) {
    if (!chartInstance) return;

    const isDarkMode = document.documentElement.classList.contains('dark');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDarkMode ? '#C9D1D9' : '#333';
    const tooltipBgColor = isDarkMode ? '#161B22' : '#fff';
    const tooltipBorderColor = isDarkMode ? '#30363D' : '#ccc';

    const chartOptions = chartInstance.options;

    // Update plugins (legend, tooltip)
    if (chartOptions.plugins.legend) {
        chartOptions.plugins.legend.labels.color = textColor;
    }
    if (chartOptions.plugins.tooltip) {
        chartOptions.plugins.tooltip.backgroundColor = tooltipBgColor;
        chartOptions.plugins.tooltip.borderColor = tooltipBorderColor;
        chartOptions.plugins.tooltip.titleColor = textColor;
        chartOptions.plugins.tooltip.bodyColor = textColor;
    }
    
    // Update scales (axes)
    Object.values(chartOptions.scales).forEach(scale => {
        if (scale.grid) {
            scale.grid.color = gridColor;
        }
        if (scale.ticks) {
            scale.ticks.color = textColor;
        }
        if (scale.title) {
            scale.title.color = textColor;
        }
    });

    chartInstance.update();
}

/**
 * The main theme update function. Now simpler and more robust.
 */
function updateChartsTheme() {
    applyThemeToChart(timeSeriesChartInstance);
    applyThemeToChart(hotIndustriesChartInstance);
}

/**
 * Creates the time series chart with all its settings.
 * @param {object[]} chartData The data for the chart.
 */
function createTimeSeriesChart(chartData) {
    const ctx = document.getElementById('timeSeriesChart').getContext('2d');
    const parsedData = chartData
        .map(d => ({
            date: new Date(d.Date.replace('Y', '-').replace('M-', '-').replace('D', '')),
            udi: d.Close_UDI,
            szi: d.Close_SZI
        }))
        .filter(d => !isNaN(d.date.getTime()));

    const labels = parsedData.map(d => d.date);
    const udiData = parsedData.map(d => (d.udi === null || isNaN(d.udi)) ? null : d.udi);
    const sziData = parsedData.map(d => (d.szi === null || isNaN(d.szi)) ? null : d.szi);
    
    timeSeriesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'UDI Close', data: udiData, borderColor: 'rgb(59, 130, 246)', 
                    backgroundColor: 'rgba(59, 130, 246, 0.2)', borderWidth: 2, pointRadius: 0, tension: 0.1, yAxisID: 'y'
                },
                {
                    label: 'SZI Close', data: sziData, borderColor: 'rgb(234, 179, 8)', 
                    backgroundColor: 'rgba(234, 179, 8, 0.2)', borderWidth: 2, pointRadius: 0, tension: 0.1, yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { 
                    type: 'time', 
                    time: { 
                        unit: 'year',
                        displayFormats: { year: 'yyyy' },
                        tooltipFormat: 'MMM dd, yyyy' 
                    }, 
                    title: { display: true, text: 'Date' } 
                },
                y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'UDI Value' } },
                y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'SZI Value' }, grid: { drawOnChartArea: false } }
            }
        }
    });

    // Apply the current theme to the newly created chart
    applyThemeToChart(timeSeriesChartInstance);
}

/**
 * Creates the hot industries chart with all its settings.
 * @param {object[]} industryData The data for the chart.
 */
function createHotIndustriesChart(industryData) {
    const ctx = document.getElementById('hotIndustriesChart').getContext('2d');
    const top10Data = industryData.slice(0, 10).reverse();

    const labels = top10Data.map(d => d['Industry Name']);
    const dataValues = top10Data.map(d => d['Hot Frequency Index (%)']);
    
    hotIndustriesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Hot Frequency Index (%)', data: dataValues,
                backgroundColor: 'rgba(34, 211, 238, 0.6)', borderColor: 'rgba(34, 211, 238, 1)', borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, title: { display: true, text: 'Index (%)' } },
                y: { }
            }
        }
    });
    
    // Apply the current theme to the newly created chart
    applyThemeToChart(hotIndustriesChartInstance);
}

// =======================================================
// ===================   MODIFIED SECTION END   ===================
// =======================================================


function createEtfPerformanceTable(data) {
    const tableBody = document.querySelector('#etfTable tbody');
    tableBody.innerHTML = ''; 

    const priceChange2021Map = new Map(data.PriceChangeFrom2021.map(item => [item['基金简称'], item['价格增长%']]));
    const shareChangeMap = new Map(data.ShareThisYearChange.map(item => [item['基金简称'], item['Year\u4efd\u989d\u589e\u957f%']]));

    data.PriceThisYearChange.forEach(item => {
        const name = item['名称'];
        const ytdChange = item.YC;
        const simpleName = name.replace(/ETF.*/, '').trim();

        let since2021Change = priceChange2021Map.get(name);
        if (since2021Change === undefined) { since2021Change = priceChange2021Map.get(simpleName); }
        
        let shareChange = shareChangeMap.get(name);
        if (shareChange === undefined) { shareChange = shareChangeMap.get(simpleName); }
        
        const row = `
            <tr class="bg-white dark:bg-dark-card border-b dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-700">
                <td class="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">${name}</td>
                <td class="px-6 py-4 text-right font-semibold ${getColorClass(ytdChange)}" data-order="${getOrderValue(ytdChange)}">
                    ${formatValue(ytdChange, 2, '%')}
                </td>
                <td class="px-6 py-4 text-right ${getColorClass(since2021Change)}" data-order="${getOrderValue(since2021Change)}">
                    ${formatValue(since2021Change, 2, '%')}
                </td>
                <td class="px-6 py-4 text-right ${getColorClass(shareChange)}" data-order="${getOrderValue(shareChange)}">
                    ${formatValue(shareChange, 2, '%')}
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });

    if ($.fn.DataTable.isDataTable('#etfTable')) {
        $('#etfTable').DataTable().destroy();
    }

    new DataTable('#etfTable', {
        responsive: true, order: [[1, 'desc']], pageLength: 10, lengthMenu: [10, 25, 50, -1],
        columnDefs: [{ type: 'num', targets: [1, 2, 3] }],
        language: { search: "_INPUT_", searchPlaceholder: "Filter records...", lengthMenu: "Show _MENU_" }
    });
}

function createArGroupTable(arData) {
    const tableBody = document.getElementById('arGroupTableBody');
    tableBody.innerHTML = '';
    
    const latestDate = arData.reduce((latest, current) => new Date(current.日期) > new Date(latest) ? current.日期 : latest, arData[0].日期);
    const latestData = arData.filter(item => item.日期 === latestDate);

    latestData.forEach(item => {
        const score = item['PotScore-New_Mean'];
        const row = `
            <tr class="bg-white dark:bg-dark-card border-b dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-700">
                <td class="px-4 py-2 font-medium text-gray-900 dark:text-white">${item.Category}</td>
                <td class="px-4 py-2 text-right font-semibold ${getColorClass(score)}">${score.toFixed(4)}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}
