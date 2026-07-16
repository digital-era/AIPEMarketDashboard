// --- Global Chart Instances ---
let timeSeriesChartInstance = null;
let hotIndustriesChartInstance = null;
let timeSeriesChartThisYearInstance = null;

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
    applyTheme(savedTheme || 'dark');
})();

// ==================== 新增：外部跳转单视图模式 ====================
function initViewMode() {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (!view) return; // 无 view 参数 = 正常站内访问，不干预

    // view 参数与页面文件名的映射
    const viewMap = {
        'market':   'index.html',
        'flow':     'PotScoreMainFund.html',
        'hotspot':  'HotspotTracker.html',
        'portfolio':'PortfolioTracker.html',
        'usmarket': 'USMarket.html'
    };

    const targetPage = viewMap[view];
    if (!targetPage) return;

    // 遍历导航栏所有 <li>，只保留目标页面对应的 Tab
    const navItems = document.querySelectorAll('nav ul li');
    let visibleCount = 0;

    navItems.forEach(item => {
        const link = item.querySelector('a');
        if (!link) return;
        const href = link.getAttribute('href');
        if (href === targetPage) {
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });

    // 只剩一个 Tab 时，隐藏导航栏底部边框（避免单一条目下的视觉残留线）
    if (visibleCount <= 1) {
        const navBorder = document.querySelector('nav .border-b');
        if (navBorder) navBorder.style.borderBottom = 'none';
    }

    console.log(`[ViewMode] Single view: ${view}, target ${targetPage}, hidden ${navItems.length - visibleCount} tabs.`);
}


document.addEventListener('DOMContentLoaded', function() {
    // 【新增】优先处理视图模式（纯 DOM 操作，不依赖数据加载）
    initViewMode();
    
    fetch('AIPEMarketData.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            populateSummaryCards(data);
            createTimeSeriesChart(data.UDI_SZI_from2021);
            createThisYearChart(data.UDI_SZI_from2021);
            createHotIndustriesChart(data.DistributeHotIndustry);
            createEtfPerformanceTable(data);
            createArGroupTable(data.ARGroup);
        })
        .catch(error => {
            console.error('Error fetching or parsing market data:', error);
            document.body.innerHTML = `<div class="p-8 text-red-600">Failed to load market data. Please ensure AIPEMarketData.json is in the same directory and is valid JSON.</div>`;
        });
});

// Helper functions
function getOrderValue(value) {
    if (typeof value !== 'number' || isNaN(value)) { return -Infinity; }
    return value;
}

function formatValue(value, decimals = 2, unit = '') {
    if (typeof value !== 'number' || isNaN(value)) { return 'N/A'; }
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

// Charting Functions
function applyThemeToChart(chartInstance) {
    if (!chartInstance) return;

    const isDarkMode = document.documentElement.classList.contains('dark');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDarkMode ? '#C9D1D9' : '#333';
    const tooltipBgColor = isDarkMode ? '#161B22' : '#fff';
    const tooltipBorderColor = isDarkMode ? '#30363D' : '#ccc';

    const chartOptions = chartInstance.options;

    if (chartOptions.plugins.legend) { chartOptions.plugins.legend.labels.color = textColor; }
    if (chartOptions.plugins.tooltip) {
        chartOptions.plugins.tooltip.backgroundColor = tooltipBgColor;
        chartOptions.plugins.tooltip.borderColor = tooltipBorderColor;
        chartOptions.plugins.tooltip.titleColor = textColor;
        chartOptions.plugins.tooltip.bodyColor = textColor;
    }
    
    Object.values(chartOptions.scales).forEach(scale => {
        if (scale.grid) { scale.grid.color = gridColor; }
        if (scale.ticks) { scale.ticks.color = textColor; }
        if (scale.title) { scale.title.color = textColor; }
    });

    chartInstance.update('none');
}

function updateChartsTheme() {
    applyThemeToChart(timeSeriesChartInstance);
    applyThemeToChart(hotIndustriesChartInstance);
    applyThemeToChart(timeSeriesChartThisYearInstance);
}

function createTimeSeriesChart(chartData) {
    const ctx = document.getElementById('timeSeriesChart').getContext('2d');
    const parsedData = chartData.map(d => ({ date: new Date(d.Date.replace('Y', '-').replace('M-', '-').replace('D', '')), udi: d.Close_UDI, szi: d.Close_SZI })).filter(d => !isNaN(d.date.getTime()));
    const labels = parsedData.map(d => d.date);
    const udiData = parsedData.map(d => (d.udi === null || isNaN(d.udi)) ? null : d.udi);
    const sziData = parsedData.map(d => (d.szi === null || isNaN(d.szi)) ? null : d.szi);
    
    timeSeriesChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [{ label: 'UDI Close', data: udiData, borderColor: 'rgb(59, 130, 246)', backgroundColor: 'rgba(59, 130, 246, 0.2)', borderWidth: 2, pointRadius: 0, tension: 0.1, yAxisID: 'y' }, { label: 'SZI Close', data: sziData, borderColor: 'rgb(234, 179, 8)', backgroundColor: 'rgba(234, 179, 8, 0.2)', borderWidth: 2, pointRadius: 0, tension: 0.1, yAxisID: 'y1' }] },
        options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { x: { type: 'time', time: { unit: 'year', displayFormats: { year: 'yyyy' }, tooltipFormat: 'MMM dd, yyyy' }, title: { display: true, text: 'Date' } }, y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'UDI Value' } }, y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'SZI Value' }, grid: { drawOnChartArea: false } } } }
    });
    applyThemeToChart(timeSeriesChartInstance);
}

function createThisYearChart(chartData) {
    const ctx = document.getElementById('timeSeriesChartThisYear').getContext('2d');
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const parsedData = chartData.map(d => ({ date: new Date(d.Date.replace('Y', '-').replace('M-', '-').replace('D', '')), udi: d.Close_UDI, szi: d.Close_SZI })).filter(d => !isNaN(d.date.getTime()) && d.date >= oneYearAgo);
    const labels = parsedData.map(d => d.date);
    const udiData = parsedData.map(d => (d.udi === null || isNaN(d.udi)) ? null : d.udi);
    const sziData = parsedData.map(d => (d.szi === null || isNaN(d.szi)) ? null : d.szi);
    
    timeSeriesChartThisYearInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [{ label: 'UDI Close', data: udiData, borderColor: 'rgb(59, 130, 246)', backgroundColor: 'rgba(59, 130, 246, 0.2)', borderWidth: 2, pointRadius: 0, tension: 0.1, yAxisID: 'y' }, { label: 'SZI Close', data: sziData, borderColor: 'rgb(234, 179, 8)', backgroundColor: 'rgba(234, 179, 8, 0.2)', borderWidth: 2, pointRadius: 0, tension: 0.1, yAxisID: 'y1' }] },
        options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { x: { type: 'time', time: { unit: 'month', displayFormats: { month: 'MMM yyyy' }, tooltipFormat: 'MMM dd, yyyy' }, title: { display: true, text: 'Date' } }, y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'UDI Value' } }, y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'SZI Value' }, grid: { drawOnChartArea: false } } } }
    });
    applyThemeToChart(timeSeriesChartThisYearInstance);
}

/**
 * MODIFIED: Creates the hot industries chart with data sorted from highest to lowest.
 * @param {object[]} industryData The data for the chart, assumed to be pre-sorted.
 */
function createHotIndustriesChart(industryData) {
    const ctx = document.getElementById('hotIndustriesChart').getContext('2d');
    // The incoming data is already sorted by hotness. We just take the top 10.
    // Chart.js with indexAxis: 'y' will draw the first item at the top.
    const top10Data = industryData.slice(0, 10); 

    const labels = top10Data.map(d => d['Industry Name']);
    const dataValues = top10Data.map(d => d['Hot Frequency Index (%)']);
    
    hotIndustriesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Hot Frequency Index (%)',
                data: dataValues,
                backgroundColor: 'rgba(34, 211, 238, 0.6)',
                borderColor: 'rgba(34, 211, 238, 1)',
                borderWidth: 1,
                barThickness: 20,
                categoryPercentage: 0.8,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: { display: true, text: 'Index (%)' }
                },
                y: {
                    ticks: {
                        font: { size: 13 }
                    }
                }
            }
        }
    });
    
    applyThemeToChart(hotIndustriesChartInstance);
}

// Table Functions
// function createEtfPerformanceTable(data) {
//     const tableBody = document.querySelector('#etfTable tbody');
//     tableBody.innerHTML = ''; 

//     const priceChange2021Map = new Map(data.PriceChangeFrom2021.map(item => [item['基金简称'], item['价格增长%']]));
//     const shareChangeMap = new Map(data.ShareThisYearChange.map(item => [item['基金简称'], item['Year\u4efd\u989d\u589e\u957f%']]));

//     data.PriceThisYearChange.forEach(item => {
//         const name = item['名称'];
//         let baseUrl = 'https://aipeinvestmentagent.pages.dev';
//         const encodedName = encodeURIComponent(name);
//         //const stockUrl = `https://aipeinvestmentagent.pages.dev/PotScoreFundAnalytics?stock=${encodedName}`;
//         const sharedOrigin = localStorage.getItem('sharedReferrerOrigin')
//         if (sharedOrigin) {
//                 console.log("从 localStorage 获取到的 referrerOrigin:", sharedOrigin);
//                 baseUrl = sharedOrigin;
//         } else {
//                 console.log("localStorage 中未找到 sharedReferrerOrigin。");
//                 baseUrl =  'https://aipeinvestmentagent.pages.dev';
//         }
//         const stockUrl = `${baseUrl}/PotScoreFundAnalytics?stock=${encodedName}`;       
        
//         const ytdChange = item.YC;
//         const simpleName = name.replace(/ETF.*/, '').trim();
//         let since2021Change = priceChange2021Map.get(name) ?? priceChange2021Map.get(simpleName);
//         let shareChange = shareChangeMap.get(name) ?? shareChangeMap.get(simpleName);
        
//         const row = `
//             <tr class="bg-white dark:bg-dark-card border-b dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-700">
//                 <td class="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"><a href="${stockUrl}" target="stockAnalyticsTab" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">${name}</a></td>
//                 <td class="px-6 py-4 text-right font-semibold ${getColorClass(ytdChange)}" data-order="${getOrderValue(ytdChange)}">${formatValue(ytdChange, 2, '%')}</td>
//                 <td class="px-6 py-4 text-right ${getColorClass(since2021Change)}" data-order="${getOrderValue(since2021Change)}">${formatValue(since2021Change, 2, '%')}</td>
//                 <td class="px-6 py-4 text-right ${getColorClass(shareChange)}" data-order="${getOrderValue(shareChange)}">${formatValue(shareChange, 2, '%')}</td>
//             </tr>`;
//         tableBody.innerHTML += row;
//     });

//     if ($.fn.DataTable.isDataTable('#etfTable')) {
//         $('#etfTable').DataTable().destroy();
//     }

//     new DataTable('#etfTable', {
//         responsive: true, order: [[1, 'desc']], pageLength: 10, lengthMenu: [10, 25, 50, -1],
//         columnDefs: [{ type: 'num', targets: [1, 2, 3] }],
//         language: { search: "_INPUT_", searchPlaceholder: "Filter records...", lengthMenu: "Show _MENU_" }
//     });
// }

// Table Functions
function createEtfPerformanceTable(data) {
    const tableBody = document.querySelector('#etfTable tbody');
    tableBody.innerHTML = ''; 

    const priceChange2021Map = new Map(data.PriceChangeFrom2021.map(item => [item['基金简称'], item['价格增长%']]));
    const shareChangeMap = new Map(data.ShareThisYearChange.map(item => [item['基金简称'], item['Year\u4efd\u989d\u589e\u957f%']]));

    data.PriceThisYearChange.forEach(item => {
        const name = item['名称'];
        
        // ==========================================
        // 【修改】构建东方财富 URL（替代 PotScoreFundAnalytics）
        // ==========================================
        let stockUrl;
        // 优先使用代码字段；请确保 AIPEMarketData.json 中包含 "代码" 或 "基金代码"
        const code = item['代码'] || item['基金代码'] || '';
        
        if (code) {
            const codeStr = String(code).trim();
            const isHK = codeStr.length === 5; // 港股代码通常为 5 位
            
            if (isHK) {
                stockUrl = `https://quote.eastmoney.com/hk/${codeStr}.html`;
            } else {
                // 【关键修正】ETF 交易所判断：
                //   - 沪市 ETF 以 5/6 开头 (如 510050、600000) → sh
                //   - 深市 ETF 以 0/1/2/3 开头 (如 159915、000001) → sz
                const prefix = (codeStr.startsWith('5') || codeStr.startsWith('6')) ? 'sh' : 'sz';
                stockUrl = `https://quote.eastmoney.com/${prefix}${codeStr}.html`;
            }
        } else {
            // 降级：无代码时用名称跳转到东方财富搜索页
            stockUrl = `https://quote.eastmoney.com/search/web?q=${encodeURIComponent(name)}`;
        }
        
        const ytdChange = item.YC;
        const simpleName = name.replace(/ETF.*/, '').trim();
        let since2021Change = priceChange2021Map.get(name) ?? priceChange2021Map.get(simpleName);
        let shareChange = shareChangeMap.get(name) ?? shareChangeMap.get(simpleName);
        
        const row = `
            <tr class="bg-white dark:bg-dark-card border-b dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-700">
                <td class="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    <a href="${stockUrl}" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline">${name}</a>
                </td>
                <td class="px-6 py-4 text-right font-semibold ${getColorClass(ytdChange)}" data-order="${getOrderValue(ytdChange)}">${formatValue(ytdChange, 2, '%')}</td>
                <td class="px-6 py-4 text-right ${getColorClass(since2021Change)}" data-order="${getOrderValue(since2021Change)}">${formatValue(since2021Change, 2, '%')}</td>
                <td class="px-6 py-4 text-right ${getColorClass(shareChange)}" data-order="${getOrderValue(shareChange)}">${formatValue(shareChange, 2, '%')}</td>
            </tr>`;
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

/**
 * MODIFIED: Creates the AR group table with rows sorted by PotScore in descending order.
 * @param {object[]} arData The data for the table.
 */
function createArGroupTable(arData) {
    const tableBody = document.getElementById('arGroupTableBody');
    tableBody.innerHTML = '';
    
    // Find the latest date in the dataset
    const latestDate = arData.reduce((latest, current) => new Date(current.日期) > new Date(latest) ? current.日期 : latest, arData[0].日期);
    
    // Filter for the latest data
    const latestData = arData.filter(item => item.日期 === latestDate);

    // *** NEW: Sort the latest data by PotScore in descending order ***
    latestData.sort((a, b) => b['PotScore-New_Mean'] - a['PotScore-New_Mean']);

    // Now, iterate over the sorted data to create table rows
    latestData.forEach(item => {
        const score = item['PotScore-New_Mean'];
        const row = `
            <tr class="bg-white dark:bg-dark-card border-b dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-700">
                <td class="px-4 py-2 font-medium text-gray-900 dark:text-white">${item.Category}</td>
                <td class="px-4 py-2 text-right font-semibold ${getColorClass(score)}">${score.toFixed(4)}</td>
            </tr>`;
        tableBody.innerHTML += row;
    });
}
