document.addEventListener('DOMContentLoaded', function() {
    fetch('AIPEMarketData.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            // Populate UI elements once data is loaded
            populateSummaryCards(data);
            createTimeSeriesChart(data.UDI_SZI_from2021);
            createHotIndustriesChart(data.DistributeHotIndustry);
            createEtfPerformanceTable(data);
            createArGroupTable(data.ARGroup);
        })
        .catch(error => {
            console.error('Error fetching or parsing market data:', error);
            document.body.innerHTML = `<div class="p-8 text-red-600">Failed to load market data. Please ensure AIPEMarketData.json is in the same directory and is valid JSON.</div>`;
        });
});

function formatValue(value, decimals = 2, unit = '') {
    if (typeof value !== 'number' || isNaN(value)) {
        return 'N/A';
    }
    return `${value.toFixed(decimals)}${unit}`;
}

function getColorClass(value) {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-500';
}

function populateSummaryCards(data) {
    // Hottest Industry
    const hottest = data.DistributeHotIndustry[0];
    document.getElementById('hottest-industry').textContent = hottest['Industry Name'];
    document.getElementById('hottest-industry-index').textContent = `${formatValue(hottest['Hot Frequency Index (%)'], 2, '%')} Index`;

    // Top Performer YTD
    const topPerformer = [...data.PriceThisYearChange].sort((a, b) => b.YC - a.YC)[0];
    document.getElementById('top-performer-name').textContent = topPerformer['名称'];
    document.getElementById('top-performer-change').innerHTML = `<span class="${getColorClass(topPerformer.YC)}">${formatValue(topPerformer.YC, 2, '%')}</span>`;

    // Top Share Growth YTD
    const topShareGrowth = [...data.ShareThisYearChange].sort((a, b) => b['Year\u4efd\u989d\u589e\u957f%'] - a['Year\u4efd\u989d\u589e\u957f%'])[0];
    document.getElementById('top-share-growth-name').textContent = topShareGrowth['基金简称'];
    document.getElementById('top-share-growth-change').innerHTML = `<span class="text-blue-600">${formatValue(topShareGrowth['Year\u4efd\u989d\u589e\u957f%'], 2, '%')}</span>`;
    
    // Worst Performer Since 2021
    const worstPerformer = [...data.PriceChangeFrom2021].sort((a, b) => a['价格增长%'] - b['价格增长%'])[0];
    document.getElementById('worst-performer-name').textContent = worstPerformer['基金简称'];
    document.getElementById('worst-performer-change').innerHTML = `<span class="${getColorClass(worstPerformer['价格增长%'])}">${formatValue(worstPerformer['价格增长%'], 2, '%')}</span>`;
}

function createTimeSeriesChart(chartData) {
    const ctx = document.getElementById('timeSeriesChart').getContext('2d');
    console.log(`chartData=${chartData}`)
    const parsedData = chartData
        .map(d => ({
            date: new Date(d.Date.replace('Y', '-').replace('M-', '-').replace('D', '')),
            udi: d.Close_UDI,
            szi: d.Close_SZI
        }))
        .filter(d => !isNaN(d.date.getTime())); // Filter out invalid dates

    const labels = parsedData.map(d => d.date);
    const udiData = parsedData.map(d => (d.udi === null || isNaN(d.udi)) ? null : d.udi);
    const sziData = parsedData.map(d => (d.szi === null || isNaN(d.szi)) ? null : d.szi);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'UDI Close',
                    data: udiData,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.1,
                    yAxisID: 'y'
                },
                {
                    label: 'SZI Close',
                    data: sziData,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'year' },
                    title: { display: true, text: 'Date' }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'UDI Value' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'SZI Value' },
                    grid: { drawOnChartArea: false },
                },
            }
        }
    });
}

function createHotIndustriesChart(industryData) {
    const ctx = document.getElementById('hotIndustriesChart').getContext('2d');
    const top10Data = industryData.slice(0, 10).reverse(); // Reverse for better chart order

    const labels = top10Data.map(d => d['Industry Name']);
    const dataValues = top10Data.map(d => d['Hot Frequency Index (%)']);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Hot Frequency Index (%)',
                data: dataValues,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    beginAtZero: true,
                    title: { display: true, text: 'Index (%)' }
                }
            }
        }
    });
}

function createEtfPerformanceTable(data) {
    const tableBody = document.querySelector('#etfTable tbody');
    tableBody.innerHTML = ''; 

    // Create maps for efficient lookups
    const priceChange2021Map = new Map(data.PriceChangeFrom2021.map(item => [item['基金简称'], item['价格增长%']]));
    const shareChangeMap = new Map(data.ShareThisYearChange.map(item => [item['基金简称'], item['Year\u4efd\u989d\u589e\u957f%']]));

    data.PriceThisYearChange.forEach(item => {
        const name = item['名称'];
        const ytdChange = item.YC;
        const simpleName = name.replace(/ETF.*/, '').trim();
        let since2021Change = priceChange2021Map.get(name);
        if ((since2021Change === null) || Number.isNaN(since2021Change)){
            since2021Change = priceChange2021Map.get(simpleName);
        }
        let shareChange = shareChangeMap.get(name);
        if ((since2021Change === null) || Number.isNaN(since2021Change)) {
                shareChange = priceChange2021Map.get(simpleName);
        }
        
        const row = `
            <tr class="bg-white border-b hover:bg-gray-50">
                <td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">${name}</td>
                <td class="px-6 py-4 text-right font-semibold ${getColorClass(ytdChange)}">${formatValue(ytdChange)}</td>
                <td class="px-6 py-4 text-right ${getColorClass(since2021Change)}">${formatValue(since2021Change)}</td>
                <td class="px-6 py-4 text-right ${getColorClass(shareChange)}">${formatValue(shareChange)}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });

    new DataTable('#etfTable', {
        responsive: true,
        order: [[1, 'desc']],
        pageLength: 10,
        lengthMenu: [10, 25, 50, -1],
        language: {
            search: "Filter records:",
            lengthMenu: "Show _MENU_ entries"
        }
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
            <tr class="bg-white border-b hover:bg-gray-50">
                <td class="px-4 py-2 font-medium text-gray-900">${item.Category}</td>
                <td class="px-4 py-2 text-right font-semibold ${getColorClass(score)}">${score.toFixed(4)}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}
