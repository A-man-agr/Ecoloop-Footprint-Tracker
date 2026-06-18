/**
 * js/charts.js - Chart.js encapsulation for doughnut breakdown and line trend charts.
 * Separation of Concerns: Handles canvas rendering actions for analytics data.
 */

import { state } from './state.js';

let breakdownChartInstance = null;
let historyChartInstance = null;

/**
 * Draws the doughnut emissions breakdown chart on the canvas.
 * @param {Object} baseline Emisssion calculations breakdown
 */
export function renderBreakdownChart(baseline) {
    if (typeof Chart === 'undefined') {
        console.warn("Chart.js library is not loaded. Skipping breakdown chart rendering.");
        return;
    }
    const ctx = document.getElementById("breakdownChart");
    if (!ctx) return;

    const dataValues = [
        baseline.energy,
        baseline.transport,
        baseline.diet,
        baseline.lifestyle
    ];

    if (breakdownChartInstance) {
        breakdownChartInstance.data.datasets[0].data = dataValues;
        breakdownChartInstance.update();
    } else {
        Chart.defaults.color = '#9CA3AF';
        Chart.defaults.font.family = 'Outfit';
        
        breakdownChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Home Energy', 'Transportation', 'Diet', 'Lifestyle'],
                datasets: [{
                    data: dataValues,
                    backgroundColor: ['#06B6D4', '#3B82F6', '#F59E0B', '#10B981'],
                    borderColor: '#111827',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 15,
                            boxWidth: 12,
                            font: { size: 12, weight: 600 }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }
}

/**
 * Draws the historical carbon footprint reduction trend line chart.
 */
export function renderHistoryChart() {
    if (typeof Chart === 'undefined') {
        console.warn("Chart.js library is not loaded. Skipping history chart rendering.");
        return;
    }
    const ctx = document.getElementById("historyChart");
    if (!ctx) return;

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const d = state.calculatorData;
    const targetGoal = parseFloat(d.targetGoal) || 0;
    const targetTons = 16.0 * (1 - targetGoal);

    if (historyChartInstance) {
        historyChartInstance.data.datasets[0].data = state.history;
        
        if (targetGoal > 0) {
            const targetDataArray = Array(months.length).fill(targetTons);
            if (historyChartInstance.data.datasets.length > 1) {
                historyChartInstance.data.datasets[1].data = targetDataArray;
            } else {
                historyChartInstance.data.datasets.push({
                    label: 'Target Limit',
                    data: targetDataArray,
                    borderColor: '#EF4444',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 0
                });
            }
        } else {
            if (historyChartInstance.data.datasets.length > 1) {
                historyChartInstance.data.datasets.pop();
            }
        }
        
        historyChartInstance.update();
    } else {
        const datasets = [{
            label: 'Net Footprint (Tons CO₂e)',
            data: state.history,
            borderColor: '#06B6D4',
            backgroundColor: 'rgba(6, 182, 212, 0.08)',
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: '#10B981',
            pointBorderColor: '#fff',
            pointHoverRadius: 6
        }];

        if (targetGoal > 0) {
            datasets.push({
                label: 'Target Limit',
                data: Array(months.length).fill(targetTons),
                borderColor: '#EF4444',
                borderDash: [5, 5],
                borderWidth: 2,
                fill: false,
                pointRadius: 0,
                pointHoverRadius: 0
            });
        }

        historyChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        title: { display: true, text: 'Tons CO₂e/yr' }
                    },
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    }
                },
                plugins: {
                    legend: { 
                        display: targetGoal > 0,
                        labels: { boxWidth: 15 }
                    }
                }
            }
        });
    }
}
