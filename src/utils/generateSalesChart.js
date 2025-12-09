const { createCanvas } = require('canvas');
const Chart = require('chart.js');
const ChartDataLabels = require('chartjs-plugin-datalabels');
const fs = require('fs');
const moment = require('moment');

Chart.register(ChartDataLabels);

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

async function generateMonthlySalesChart(salesData, month) {
    const width = 800;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Calculate the labels and check for Mondays
    const labels = Object.keys(salesData).map(day => {
        const date = moment(`${moment().format('YYYY-MM')}-${day}`, 'YYYY-MM-DD');
        if (date.day() === 1) { // Check if it's Monday (0 is Sunday, 1 is Monday, ...)
            return `Week ${Math.floor(date.date() / 7) + 1}\n${day} (Sen)`; // Highlight Monday
        }
        return day;
    });

    const totals = Object.values(salesData); // Total sales for each day

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Sales',
                data: totals,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                fill: true,
            }]
        },
        options: {
            plugins: {
                legend: {
                    display: true
                },
                datalabels: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: `Day of the Month ${month}`
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Total Sales'
                    }
                }
            }
        }
    });

    const buffer = canvas.toBuffer('image/png');
    const filePath = `./monthly-sales-chart-${moment().format('MMYYYY')}.png`;
    fs.writeFileSync(filePath, buffer);
    return filePath;
}


async function generateSalesChart(data) {
    const width = 800;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const labels = data.map(item => item.item_name);
    const quantities = data.map(item => item.quantity);
    const backgroundColors = labels.map(() => getRandomColor());
    const borderColors = backgroundColors.map(color => color);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantity Sold',
                data: quantities,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                datalabels: {
                    anchor: 'end',
                    align: 'start',
                    color: 'black',
                    font: {
                        weight: 'bold',
                        size: 16
                    },
                    formatter: function(value, context) {
                        const { ctx, x, y } = context;
                        if (ctx && x !== undefined && y !== undefined) {
                            ctx.save();
                            ctx.strokeStyle = 'white';
                            ctx.lineWidth = 6;
                            ctx.strokeText(value, x, y - 5);
                            ctx.fillStyle = 'black';
                            ctx.fillText(value, x, y - 5);
                            ctx.restore();
                        }
                        return value;
                    }
                },
                legend: {
                    display: true,
                    labels: {
                        generateLabels: function(chart) {
                            const data = chart.data;
                            return data.datasets[0].data.map((value, index) => {
                                return {
                                    text: `${data.labels[index]} (${value})`,
                                    fillStyle: data.datasets[0].backgroundColor[index],
                                    hidden: false,
                                    index: index
                                };
                            });
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    const buffer = canvas.toBuffer('image/png');
    const filePath = `./sales-chart-${moment().format('DDMMYYYY')}.png`;
    fs.writeFileSync(filePath, buffer);
    return filePath;
}

module.exports = {generateSalesChart, generateMonthlySalesChart};
