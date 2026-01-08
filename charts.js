// Revenue Chart (Line Chart)
const revenueCtx = document.getElementById('revenueChart');
if (revenueCtx) {
    new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Revenue',
                data: [12000, 19000, 15000, 25000, 22000, 30000],
                borderColor: 'rgb(99, 102, 241)',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: 'rgb(99, 102, 241)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Traffic Sources Chart (Doughnut Chart)
const trafficCtx = document.getElementById('trafficChart');
if (trafficCtx) {
    new Chart(trafficCtx, {
        type: 'doughnut',
        data: {
            labels: ['Organic Search', 'Direct', 'Social Media', 'Referral', 'Email'],
            datasets: [{
                data: [35, 25, 20, 12, 8],
                backgroundColor: [
                    'rgb(99, 102, 241)',
                    'rgb(168, 85, 247)',
                    'rgb(59, 130, 246)',
                    'rgb(34, 197, 94)',
                    'rgb(251, 146, 60)'
                ],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            }
        }
    });
}

// Performance Chart (Bar Chart)
const performanceCtx = document.getElementById('performanceChart');
if (performanceCtx) {
    new Chart(performanceCtx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [
                {
                    label: 'Sales',
                    data: [65, 59, 80, 81, 56, 85, 70, 75, 88, 92, 78, 95],
                    backgroundColor: 'rgb(99, 102, 241)',
                    borderRadius: 6
                },
                {
                    label: 'Visitors',
                    data: [45, 48, 60, 65, 50, 70, 62, 68, 75, 80, 72, 85],
                    backgroundColor: 'rgb(168, 85, 247)',
                    borderRadius: 6
                },
                {
                    label: 'Conversions',
                    data: [28, 32, 38, 42, 35, 48, 40, 45, 52, 58, 50, 62],
                    backgroundColor: 'rgb(34, 197, 94)',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}
