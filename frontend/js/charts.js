/**
 * KONE Elevator Digital Twin - Charts & Visualizations
 * High-performance Chart.js rendering for PINN Analysis, Forecast, Sparklines & Health Gauge.
 */

(function () {
  'use strict';

  class ElevatorChartsManager {
    constructor() {
      this.charts = {};
      this.init();
    }

    init() {
      // Ensure Chart.js is loaded
      if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded');
        return;
      }

      // Configure default font styling to match UI
      Chart.defaults.font.family = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";
      Chart.defaults.color = '#64748b';
      Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.9)';
      Chart.defaults.plugins.tooltip.padding = 8;
      Chart.defaults.plugins.tooltip.cornerRadius = 6;

      this.initPinnChart();
      this.initForecastChart();
      this.initHealthDonut();
      this.initSparklines();

      // Subscribe to ElevatorStore updates
      if (window.ElevatorStore) {
        window.ElevatorStore.subscribe('telemetry', (telemetry) => {
          this.updateSparklines(telemetry);
        });

        window.ElevatorStore.subscribe('pinnAnalysis', (pinn) => {
          this.updatePinnChart(pinn);
        });

        window.ElevatorStore.subscribe('systemHealth', (health) => {
          this.updateHealthDonut(health);
        });
      }
    }

    // ==========================================
    // 1. PINN ANALYSIS: MOTOR TEMPERATURE
    // ==========================================
    initPinnChart() {
      const canvas = document.getElementById('pinn-temperature-chart');
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const storeData = window.ElevatorStore ? window.ElevatorStore.state.pinnAnalysis : null;

      const timePoints = storeData ? storeData.timePoints : [0, 10, 20, 30, 40, 50, 60];
      const observed = storeData ? storeData.observedCurve : [22, 38, 48, 62, 74, 82, 88.5];
      const predicted = storeData ? storeData.predictedCurve : [22, 36, 46, 56, 65, 71.5, 76.8];
      const deviation = storeData ? storeData.deviationCurve : [0, 2, 2.5, 4.5, 5.8, 6.7, 7.4];

      // Custom plugin to draw the "Deviation increasing" background highlight zone
      const deviationAlertPlugin = {
        id: 'deviationAlertZone',
        beforeDatasetsDraw(chart) {
          const { ctx, chartArea, scales: { x, y } } = chart;
          if (!chartArea) return;

          const startX = x.getPixelForValue(40);
          const endX = x.getPixelForValue(60);
          const topY = chartArea.top;
          const bottomY = chartArea.bottom;

          ctx.save();
          // Soft pink shaded alert zone
          ctx.fillStyle = 'rgba(254, 226, 226, 0.45)';
          ctx.fillRect(startX, topY, endX - startX, bottomY - topY);

          // Draw the "Deviation increasing" badge
          const badgeX = (startX + endX) / 2;
          const badgeY = topY + 22;
          const text = "Deviation increasing";
          ctx.font = "600 10.5px 'Plus Jakarta Sans', sans-serif";
          const textWidth = ctx.measureText(text).width;
          const padX = 8;
          const padY = 4;

          ctx.fillStyle = '#fee2e2';
          ctx.strokeStyle = '#fca5a5';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(badgeX - (textWidth / 2) - padX, badgeY - 12 - padY, textWidth + (padX * 2), 20, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#b91c1c';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, badgeX, badgeY - 2);

          ctx.restore();
        }
      };

      this.charts.pinn = new Chart(ctx, {
        type: 'line',
        data: {
          labels: timePoints,
          datasets: [
            {
              label: 'Observed (Sensor)',
              data: observed,
              borderColor: '#dc2626', // Red
              backgroundColor: '#dc2626',
              pointBackgroundColor: '#dc2626',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 1.5,
              pointRadius: 3.5,
              pointHoverRadius: 5,
              tension: 0.35,
              borderWidth: 2
            },
            {
              label: 'PINN Predicted',
              data: predicted,
              borderColor: '#16a34a', // Green
              backgroundColor: '#16a34a',
              pointBackgroundColor: '#16a34a',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 1.5,
              pointRadius: 3.5,
              pointHoverRadius: 5,
              tension: 0.35,
              borderWidth: 2
            },
            {
              label: 'Deviation',
              data: deviation,
              borderColor: '#9333ea', // Purple
              backgroundColor: '#9333ea',
              pointBackgroundColor: '#9333ea',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 1,
              pointRadius: 3,
              borderDash: [3, 3],
              tension: 0.35,
              borderWidth: 1.8
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false // Handled in custom HTML header matching reference
            },
            tooltip: {
              mode: 'index',
              intersect: false
            }
          },
          scales: {
            x: {
              grid: {
                color: 'rgba(0, 0, 0, 0.04)',
                drawBorder: false
              },
              title: {
                display: true,
                text: 'Time (seconds)',
                font: { size: 9.5, weight: '500' },
                color: '#94a3b8'
              },
              ticks: {
                font: { size: 9.5 },
                color: '#94a3b8'
              }
            },
            y: {
              min: 0,
              max: 120,
              ticks: {
                stepSize: 20,
                font: { size: 9.5 },
                color: '#94a3b8'
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.04)',
                drawBorder: false
              },
              title: {
                display: true,
                text: 'Temperature (°C)',
                font: { size: 9.5, weight: '500' },
                color: '#94a3b8'
              }
            }
          },
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
          }
        },
        plugins: [deviationAlertPlugin]
      });
    }

    // ==========================================
    // 2. NEXT 60 SECONDS FORECAST (PINN)
    // ==========================================
    initForecastChart() {
      const canvas = document.getElementById('forecast-chart');
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const storeData = window.ElevatorStore ? window.ElevatorStore.state.forecast : null;

      const timePoints = storeData ? storeData.timePoints : [0, 10, 20, 30, 40, 50, 60];
      const projected = storeData ? storeData.projectedValues : [48, 55, 63, 72, 81, 90, 98];
      const upper = storeData ? storeData.upperConfidence : [52, 60, 69, 78, 88, 97, 105];
      const lower = storeData ? storeData.lowerConfidence : [44, 50, 57, 66, 74, 83, 91];

      // Custom plugin to draw the "May reach 98°C" tag at 60s
      const forecastTagPlugin = {
        id: 'forecastTag',
        afterDatasetsDraw(chart) {
          const { ctx, chartArea, scales: { x, y } } = chart;
          if (!chartArea) return;

          const peakX = x.getPixelForValue(60);
          const peakY = y.getPixelForValue(98);

          ctx.save();
          const text = "May reach 98°C";
          ctx.font = "600 10px 'Plus Jakarta Sans', sans-serif";
          const textWidth = ctx.measureText(text).width;
          const padX = 7;
          const padY = 3.5;
          const tagX = peakX - textWidth - 14;
          const tagY = peakY - 14;

          ctx.fillStyle = '#fee2e2';
          ctx.strokeStyle = '#fca5a5';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(tagX - padX, tagY - 10 - padY, textWidth + (padX * 2), 18, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#b91c1c';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, tagX, tagY - 1);

          ctx.restore();
        }
      };

      this.charts.forecast = new Chart(ctx, {
        type: 'line',
        data: {
          labels: timePoints,
          datasets: [
            {
              label: 'Upper Bound',
              data: upper,
              fill: '+1',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              borderColor: 'transparent',
              pointRadius: 0
            },
            {
              label: 'Lower Bound',
              data: lower,
              fill: false,
              borderColor: 'transparent',
              pointRadius: 0
            },
            {
              label: 'Temperature (°C)',
              data: projected,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.25)',
              pointBackgroundColor: '#ef4444',
              pointBorderColor: '#ffffff',
              pointRadius: 2.5,
              borderWidth: 2,
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              filter: (item) => item.datasetIndex === 2
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(0,0,0,0.03)' },
              ticks: { font: { size: 9 }, color: '#94a3b8' }
            },
            y: {
              min: 0,
              max: 120,
              ticks: { stepSize: 20, font: { size: 9 }, color: '#94a3b8' },
              grid: { color: 'rgba(0,0,0,0.03)' }
            }
          }
        },
        plugins: [forecastTagPlugin]
      });
    }

    // ==========================================
    // 3. SYSTEM HEALTH RADIAL DONUT GAUGE
    // ==========================================
    initHealthDonut() {
      const canvas = document.getElementById('health-gauge-chart');
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const percent = window.ElevatorStore ? window.ElevatorStore.state.systemHealth.overallPercentage : 92;

      this.charts.health = new Chart(ctx, {
        type: 'doughnut',
        data: {
          datasets: [
            {
              data: [percent, 100 - percent],
              backgroundColor: ['#256c4d', '#e5e7eb'],
              borderWidth: 0,
              circumference: 260,
              rotation: 230
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '74%',
          plugins: {
            tooltip: { enabled: false }
          }
        }
      });
    }

    // ==========================================
    // 4. TELEMETRY SPARKLINES (6 CARDS)
    // ==========================================
    initSparklines() {
      const sparklineConfigs = [
        { id: 'spark-motor-temp', key: 'motorTemperature', color: '#ef4444', fill: 'rgba(239, 68, 68, 0.1)' },
        { id: 'spark-motor-current', key: 'motorCurrent', color: '#10b981', fill: 'rgba(16, 185, 129, 0.1)' },
        { id: 'spark-vibration', key: 'vibrationRMS', color: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.1)' },
        { id: 'spark-car-load', key: 'carLoad', color: '#10b981', fill: 'rgba(16, 185, 129, 0.1)' },
        { id: 'spark-car-speed', key: 'carSpeed', color: '#eab308', fill: 'rgba(234, 179, 8, 0.1)' },
        { id: 'spark-ambient-temp', key: 'ambientTemperature', color: '#b45309', fill: 'rgba(180, 83, 9, 0.08)' }
      ];

      this.sparklines = {};

      sparklineConfigs.forEach(cfg => {
        const canvas = document.getElementById(cfg.id);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const telemetryItem = window.ElevatorStore ? window.ElevatorStore.state.telemetry[cfg.key] : null;
        const history = telemetryItem ? telemetryItem.history : [10, 12, 11, 14, 13, 16];

        this.sparklines[cfg.key] = new Chart(ctx, {
          type: 'line',
          data: {
            labels: history.map((_, i) => i),
            datasets: [
              {
                data: history,
                borderColor: cfg.color,
                backgroundColor: cfg.fill,
                fill: true,
                pointRadius: 0,
                borderWidth: 1.6,
                tension: 0.4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { enabled: false }
            },
            scales: {
              x: { display: false },
              y: { display: false }
            }
          }
        });
      });
    }

    updateSparklines(telemetry) {
      if (!this.sparklines) return;
      for (const [key, chart] of Object.entries(this.sparklines)) {
        if (telemetry[key] && telemetry[key].history) {
          chart.data.labels = telemetry[key].history.map((_, i) => i);
          chart.data.datasets[0].data = telemetry[key].history;
          chart.update('none');
        }
      }
    }

    updatePinnChart(pinn) {
      if (this.charts.pinn && pinn) {
        this.charts.pinn.data.labels = pinn.timePoints;
        this.charts.pinn.data.datasets[0].data = pinn.observedCurve;
        this.charts.pinn.data.datasets[1].data = pinn.predictedCurve;
        this.charts.pinn.data.datasets[2].data = pinn.deviationCurve;
        this.charts.pinn.update('none');
      }
    }

    updateHealthDonut(health) {
      if (this.charts.health && health) {
        const val = health.overallPercentage;
        this.charts.health.data.datasets[0].data = [val, 100 - val];
        this.charts.health.update('none');
      }
    }
  }

  window.ElevatorChartsManager = ElevatorChartsManager;
})();
