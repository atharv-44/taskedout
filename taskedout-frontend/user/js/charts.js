// charts.js
export function drawStatusPieChart(ctx, data) {
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: ['#22c55e', '#f59e42', '#6b7280'],
                borderWidth: 0
            }]
        },
        options: {
            plugins: {
                legend: { display: true, position: 'bottom' },
                tooltip: { enabled: true }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

export function drawWeeklyBarChart(ctx, data) {
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Tasks Completed',
                data: data,
                backgroundColor: '#5b4dfa',
                borderRadius: 8
            }]
        },
        options: {
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true }
            },
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
} 