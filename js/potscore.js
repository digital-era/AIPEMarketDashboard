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
    //const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    //applyTheme(savedTheme || (systemPrefersDark ? 'dark' : 'light'));
    // We are changing the fallback value to always be 'dark'
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

// --- Main Data Loading ---
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

// MODIFIED FUNCTION
// function populateTopStockInPotScoreTable(data) {
//     const tableBody = document.getElementById('topStockInTopPotScoreTableBody');
//     tableBody.innerHTML = '';
//     data.forEach(item => {
//         const stockName = item['名称'];
//         let baseUrl = 'https://aipeinvestmentagent.pages.dev';
//         // Encode the stock name for use in a URL
//         const encodedStockName = encodeURIComponent(stockName);
//         // Construct the full URL with the query parameter
//         //const stockUrl = `https://aipeinvestmentagent.pages.dev/PotScoreFundAnalytics?stock=${encodedStockName}`;
//         const sharedOrigin = localStorage.getItem('sharedReferrerOrigin')
//         if (sharedOrigin) {
//                 console.log("从 localStorage 获取到的 referrerOrigin:", sharedOrigin);
//                 baseUrl = sharedOrigin;
//         } else {
//                 console.log("localStorage 中未找到 sharedReferrerOrigin。");
//                 baseUrl = 'https://aipeinvestmentagent.pages.dev';
//         }
//         const stockUrl = `${baseUrl}/PotScoreFundAnalytics?stock=${encodedStockName}`;
        
//         const row = `
//             <tr class="bg-white dark:bg-dark-card border-b dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-700">
//                 <td class="px-4 py-2 font-medium text-gray-900 dark:text-white">
//                     <a href="${stockUrl}" target="stockAnalyticsTab" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">
//                         ${stockName}
//                     </a>
//                 </td>
//                 <td class="px-4 py-2 text-gray-500 dark:text-dark-subtle">${item['l2name']}</td>
//                 <td class="px-4 py-2 text-right font-semibold ${getColorClass(item['总净流入占比_5日总和'])}">${formatValue(item['总净流入占比_5日总和'], 2, '%')}</td>
//             </tr>`;
//         tableBody.innerHTML += row;
//     });
// }

/**
 * 【修正】Top Stocks in High PotScore Industries
 * 修复：强制补齐6位代码，防止深圳标的(000xxx)前导零丢失
 */
function populateTopStockInPotScoreTable(data) {
    const tableBody = document.getElementById('topStockInTopPotScoreTableBody');
    tableBody.innerHTML = '';
    data.forEach(item => {
        const stockName = item['名称'];
        
        // 1. 获取代码（兼容多种字段名）
        let rawCode = item['代码'] || item['symbol'] || item['stock_code'] || '';
        
        // 2. 【关键修复】强制格式化为6位字符串，补齐前导零
        const codeStr = rawCode ? String(rawCode).padStart(6, '0').trim() : '';
        
        // 3. 构建东方财富 URL
        let stockUrl;
        if (codeStr && codeStr.length >= 5) {
            const isHK = codeStr.length === 5; // 港股 5 位
            if (isHK) {
                stockUrl = `https://quote.eastmoney.com/hk/${codeStr}.html`;
            } else {
                // A股：6开头→沪市(sh)，其余(0/3开头)→深市(sz)
                const prefix = codeStr.startsWith('6') ? 'sh' : 'sz';
                stockUrl = `https://quote.eastmoney.com/${prefix}${codeStr}.html`;
            }
        } else {
            // 兜底：无有效代码时按名称搜索
            console.warn(`[PotScore] 股票代码无效: "${stockName}" (原始值: ${rawCode})，降级到搜索页`);
            stockUrl = `https://quote.eastmoney.com/search/web?q=${encodeURIComponent(stockName)}`;
        }
        
        const row = `
            <tr class="bg-white dark:bg-dark-card border-b dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-700">
                <td class="px-4 py-2 font-medium text-gray-900 dark:text-white">
                    <a href="${stockUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">
                        ${stockName}
                    </a>
                </td>
                <td class="px-4 py-2 text-gray-500 dark:text-dark-subtle">${item['l2name']}</td>
                <td class="px-4 py-2 text-right font-semibold ${getColorClass(item['总净流入占比_5日总和'])}">${formatValue(item['总净流入占比_5日总和'], 2, '%')}</td>
            </tr>`;
        tableBody.innerHTML += row;
    });
}

// MODIFIED FUNCTION
// function populateTopStockInMainFundTable(data) {
//     const tableBody = document.getElementById('topStockInMainFundTableBody');
//     tableBody.innerHTML = '';
//     data.forEach(item => {
//         const stockName = item['名称'];
//         let baseUrl = 'https://aipeinvestmentagent.pages.dev';
//         // Encode the stock name for use in a URL
//         const encodedStockName = encodeURIComponent(stockName);
//         // Construct the full URL with the query parameter
//         //const stockUrl = `https://aipeinvestmentagent.pages.dev/PotScoreFundAnalytics?stock=${encodedStockName}`;     
//         const sharedOrigin = localStorage.getItem('sharedReferrerOrigin')
//         if (sharedOrigin) {
//                 console.log("从 localStorage 获取到的 referrerOrigin:", sharedOrigin);
//                 baseUrl = sharedOrigin;
//         } else {
//                 console.log("localStorage 中未找到 sharedReferrerOrigin。");
//                 baseUrl = 'https://aipeinvestmentagent.pages.dev';
//         }
//         const stockUrl = `${baseUrl}/PotScoreFundAnalytics?stock=${encodedStockName}`;

//         const row = `
//             <tr class="bg-white dark:bg-dark-card border-b dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-700">
//                 <td class="px-4 py-2 font-medium text-gray-900 dark:text-white">
//                     <a href="${stockUrl}" target="stockAnalyticsTab" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">
//                         ${stockName}
//                     </a>
//                 </td>
//                 <td class="px-4 py-2 text-gray-500 dark:text-dark-subtle">${item['l2name']}</td>
//                 <td class="px-4 py-2 text-right font-semibold ${getColorClass(item['总净流入占比_5日总和'])}">${formatValue(item['总净流入占比_5日总和'], 2, '%')}</td>
//             </tr>`;
//         tableBody.innerHTML += row;
//     });
// }

/**
 * 【修正】Top Stocks in High MainFund Industries
 * 修复：同步使用代码跳转（原代码仍基于名称，未修改）
 */
function populateTopStockInMainFundTable(data) {
    const tableBody = document.getElementById('topStockInMainFundTableBody');
    tableBody.innerHTML = '';
    data.forEach(item => {
        const stockName = item['名称'];
        
        // 1. 获取代码
        let rawCode = item['代码'] || item['symbol'] || item['stock_code'] || '';
        
        // 2. 【关键修复】强制格式化为6位字符串，补齐前导零
        const codeStr = rawCode ? String(rawCode).padStart(6, '0').trim() : '';
        
        // 3. 构建东方财富 URL
        let stockUrl;
        if (codeStr && codeStr.length >= 5) {
            const isHK = codeStr.length === 5;
            if (isHK) {
                stockUrl = `https://quote.eastmoney.com/hk/${codeStr}.html`;
            } else {
                const prefix = codeStr.startsWith('6') ? 'sh' : 'sz';
                stockUrl = `https://quote.eastmoney.com/${prefix}${codeStr}.html`;
            }
        } else {
            console.warn(`[MainFund] 股票代码无效: "${stockName}" (原始值: ${rawCode})，降级到搜索页`);
            stockUrl = `https://quote.eastmoney.com/search/web?q=${encodeURIComponent(stockName)}`;
        }

        const row = `
            <tr class="bg-white dark:bg-dark-card border-b dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-700">
                <td class="px-4 py-2 font-medium text-gray-900 dark:text-white">
                    <a href="${stockUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">
                        ${stockName}
                    </a>
                </td>
                <td class="px-4 py-2 text-gray-500 dark:text-dark-subtle">${item['l2name']}</td>
                <td class="px-4 py-2 text-right font-semibold ${getColorClass(item['总净流入占比_5日总和'])}">${formatValue(item['总净流入占比_5日总和'], 2, '%')}</td>
            </tr>`;
        tableBody.innerHTML += row;
    });
}
