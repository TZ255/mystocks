/**
 * HisaZangu - Dashboard JavaScript
 * Chart.js stock price chart, period selectors, and mobile tab bar navigation.
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Theme Colours (matches the dark-themed app)
  // ---------------------------------------------------------------------------

  const COLORS = {
    gold: '#F59E0B',
    blue: '#3B82F6',
    gridLine: 'rgba(255, 255, 255, 0.06)',
    gridBorder: 'rgba(255, 255, 255, 0.1)',
    tooltipBg: '#1F2937',
    tooltipText: '#F9FAFB',
    chartBg: 'transparent',
    gradientTop: 'rgba(245, 158, 11, 0.25)',
    gradientBottom: 'rgba(245, 158, 11, 0)',
  };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  let chartInstance = null;
  let currentSymbol = null;
  let activePeriod = '30d';

  // ---------------------------------------------------------------------------
  // Chart Initialisation
  // ---------------------------------------------------------------------------

  function getChartContainer() {
    return document.getElementById('stock-chart') || document.querySelector('[data-chart]');
  }

  function initChart() {
    const container = getChartContainer();
    if (!container) return;

    // Determine stock symbol from a data attribute or the URL
    currentSymbol =
      container.dataset.symbol ||
      document.querySelector('[data-stock-symbol]')?.dataset.stockSymbol ||
      extractSymbolFromURL();

    if (!currentSymbol) return;

    // Determine initial period from active button, falling back to 30d
    const activeBtn = document.querySelector('.period-btn.active');
    if (activeBtn) {
      activePeriod = activeBtn.dataset.period || '30d';
    }

    fetchAndRender(currentSymbol, activePeriod);
  }

  function extractSymbolFromURL() {
    // Handles paths like /stocks/TCC or /dashboard/TCC
    const match = window.location.pathname.match(/\/stocks\/([A-Za-z]+)/);
    return match ? match[1] : null;
  }

  // ---------------------------------------------------------------------------
  // Fetch Chart Data
  // ---------------------------------------------------------------------------

  async function fetchAndRender(symbol, period) {
    const container = getChartContainer();
    if (!container) return;

    // Show a subtle loading state
    container.classList.add('chart-loading');

    try {
      const response = await fetch(`/api/stocks/${encodeURIComponent(symbol)}/chart?period=${encodeURIComponent(period)}`);

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      renderChart(container, data, symbol);
    } catch (err) {
      console.error('[HisaZangu] Chart fetch failed:', err);

      if (typeof window.showToast === 'function') {
        window.showToast('Failed to load chart data. Please try again.', 'error');
      }
    } finally {
      container.classList.remove('chart-loading');
    }
  }

  // ---------------------------------------------------------------------------
  // Render Chart
  // ---------------------------------------------------------------------------

  function renderChart(container, data, symbol) {
    if (typeof Chart === 'undefined') {
      console.warn('[HisaZangu] Chart.js is not loaded.');
      return;
    }

    // Ensure canvas element exists
    let canvas = container.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      container.innerHTML = '';
      container.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');

    // Build gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.parentElement.clientHeight || 300);
    gradient.addColorStop(0, COLORS.gradientTop);
    gradient.addColorStop(1, COLORS.gradientBottom);

    const labels = (data.labels || []).map((l) => l);
    const values = data.values || data.prices || [];

    // Destroy previous instance
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: `${symbol} Price (TZS)`,
            data: values,
            borderColor: COLORS.gold,
            backgroundColor: gradient,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: COLORS.gold,
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
            fill: true,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: COLORS.tooltipBg,
            titleColor: COLORS.tooltipText,
            bodyColor: COLORS.tooltipText,
            borderColor: COLORS.gridBorder,
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            callbacks: {
              label: function (context) {
                const value = context.parsed.y;
                return typeof window.formatTZS === 'function'
                  ? window.formatTZS(value)
                  : `TZS ${value.toLocaleString()}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              color: COLORS.gridLine,
              drawBorder: false,
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.5)',
              maxRotation: 0,
              maxTicksLimit: 8,
              font: { size: 11 },
            },
          },
          y: {
            grid: {
              color: COLORS.gridLine,
              drawBorder: false,
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.5)',
              font: { size: 11 },
              callback: function (value) {
                if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
                if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
                return value;
              },
            },
            beginAtZero: false,
          },
        },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Period Button Handlers (7d / 30d / 90d)
  // ---------------------------------------------------------------------------

  function initPeriodButtons() {
    const buttons = document.querySelectorAll('.period-btn');
    if (buttons.length === 0) return;

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const period = btn.dataset.period;
        if (!period || !currentSymbol) return;

        // Update active state
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activePeriod = period;

        fetchAndRender(currentSymbol, period);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Mobile Bottom Tab Bar Navigation
  // ---------------------------------------------------------------------------

  function initMobileTabBar() {
    const tabBar = document.querySelector('.tab-bar, .bottom-nav');
    if (!tabBar) return;

    const tabs = tabBar.querySelectorAll('.tab-item, .bottom-nav-item');
    const currentPath = window.location.pathname;

    tabs.forEach((tab) => {
      const link = tab.closest('a') || tab.querySelector('a');
      const href = link ? link.getAttribute('href') : tab.dataset.href;

      // Highlight the active tab by matching the current path
      if (href && currentPath.startsWith(href) && href !== '/') {
        tab.classList.add('active');
      } else if (href === '/' && currentPath === '/') {
        tab.classList.add('active');
      }

      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Initialise
  // ---------------------------------------------------------------------------

  function init() {
    initChart();
    initPeriodButtons();
    initMobileTabBar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
