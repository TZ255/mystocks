/**
 * HisaZangu - Dashboard JavaScript
 * Chart.js stock price chart, portfolio allocation chart, period selectors.
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Theme Colours
  // ---------------------------------------------------------------------------

  const COLORS = {
    gold: '#F59E0B',
    blue: '#3B82F6',
    gridLine: 'rgba(255, 255, 255, 0.06)',
    gridBorder: 'rgba(255, 255, 255, 0.1)',
    tooltipBg: '#1F2937',
    tooltipText: '#F9FAFB',
    gradientTop: 'rgba(245, 158, 11, 0.25)',
    gradientBottom: 'rgba(245, 158, 11, 0)',
  };

  const CHART_COLORS = [
    '#F59E0B', '#3B82F6', '#10B981', '#EF4444',
    '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
  ];

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  let chartInstance = null;
  let currentSymbol = null;
  let activePeriod = '30';
  let allocationChart = null;
  let chartResizeFrame = null;

  // ---------------------------------------------------------------------------
  // Stock Price Chart
  // ---------------------------------------------------------------------------

  function getChartContainer() {
    return document.getElementById('stock-chart') || document.querySelector('[data-chart]');
  }

  function isMobileViewport() {
    return window.matchMedia('(max-width: 575.98px)').matches;
  }

  function parsePeriod(period) {
    const parsed = Number.parseInt(period, 10);
    return Number.isFinite(parsed) ? parsed : 30;
  }

  function parseChartDate(label) {
    if (!label) return null;
    const date = new Date(label);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatChartDateLabel(label, period) {
    const date = parseChartDate(label);
    if (!date) return label;

    if (period >= 365) {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${month}/${date.getFullYear()}`;
    }

    const options = { day: 'numeric', month: 'short' };
    return new Intl.DateTimeFormat('en-TZ', options).format(date);
  }

  function getChartTickConfig(period) {
    const mobile = isMobileViewport();
    const denseRange = period >= 30;
    const maxTicksLimit = mobile
      ? (period >= 365 ? 6 : period >= 90 ? 4 : period >= 30 ? 5 : 4)
      : (period >= 365 ? 8 : 6);

    return {
      color: 'rgba(255, 255, 255, 0.5)',
      autoSkip: true,
      autoSkipPadding: mobile ? 12 : 16,
      maxRotation: mobile && denseRange ? 45 : 0,
      minRotation: mobile && denseRange ? 45 : 0,
      maxTicksLimit,
      font: { size: mobile ? 10 : 11 },
      callback: function (value) {
        const label = typeof this.getLabelForValue === 'function'
          ? this.getLabelForValue(value)
          : value;

        return formatChartDateLabel(label, period);
      },
    };
  }

  function applyResponsiveChartOptions(period) {
    if (!chartInstance) return;

    const tickConfig = getChartTickConfig(period);
    const mobile = isMobileViewport();

    chartInstance.options.layout = {
      padding: {
        bottom: mobile && period >= 30 ? 8 : 0,
      },
    };
    chartInstance.options.scales.x.ticks = {
      ...chartInstance.options.scales.x.ticks,
      ...tickConfig,
    };
  }

  function initChart() {
    const container = getChartContainer();
    if (!container) return;

    currentSymbol =
      container.dataset.symbol ||
      document.querySelector('[data-stock-symbol]')?.dataset.stockSymbol ||
      extractSymbolFromURL();

    if (!currentSymbol) return;

    const activeBtn = document.querySelector('.period-btn.active');
    if (activeBtn) {
      activePeriod = activeBtn.dataset.period || '30';
    }

    fetchAndRender(currentSymbol, activePeriod);
  }

  function extractSymbolFromURL() {
    const match = window.location.pathname.match(/\/stocks\/([A-Za-z]+)/);
    return match ? match[1] : null;
  }

  async function fetchAndRender(symbol, period) {
    const container = getChartContainer();
    if (!container) return;

    container.classList.add('chart-loading');

    try {
      const response = await fetch(`/api/stocks/${encodeURIComponent(symbol)}/chart?period=${encodeURIComponent(period)}`);

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      renderChart(container, data, symbol, period);
    } catch (err) {
      console.error('[HisaZangu] Chart fetch failed:', err);

      if (typeof window.showToast === 'function') {
        window.showToast('Failed to load chart data.', 'error');
      }
    } finally {
      container.classList.remove('chart-loading');
    }
  }

  function renderChart(container, data, symbol, period) {
    if (typeof Chart === 'undefined') return;

    let canvas = container.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      container.innerHTML = '';
      container.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.parentElement.clientHeight || 300);
    gradient.addColorStop(0, COLORS.gradientTop);
    gradient.addColorStop(1, COLORS.gradientBottom);

    const labels = data.labels || [];
    const values = data.values || data.prices || [];

    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    const periodDays = parsePeriod(period);
    const tickConfig = getChartTickConfig(periodDays);

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
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
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        layout: {
          padding: {
            bottom: isMobileViewport() && periodDays >= 30 ? 8 : 0,
          },
        },
        plugins: {
          legend: { display: false },
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
            grid: { color: COLORS.gridLine, drawBorder: false },
            ticks: tickConfig,
          },
          y: {
            grid: { color: COLORS.gridLine, drawBorder: false },
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
  // Period Button Handlers
  // ---------------------------------------------------------------------------

  function initPeriodButtons() {
    const buttons = document.querySelectorAll('.period-btn');
    if (buttons.length === 0) return;

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const period = btn.dataset.period;
        if (!period || !currentSymbol) return;

        buttons.forEach((b) => {
          b.classList.remove('active', 'chip-active');
        });
        btn.classList.add('active', 'chip-active');
        activePeriod = period;

        fetchAndRender(currentSymbol, period);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Portfolio Allocation Chart (Doughnut)
  // ---------------------------------------------------------------------------

  function initAllocationChart() {
    const canvas = document.getElementById('allocationCanvas');
    if (!canvas || typeof Chart === 'undefined') return;

    // Fetch allocation data
    fetch('/api/portfolio/chart-data')
      .then((r) => r.json())
      .then((data) => {
        if (!data.holdings || data.holdings.length === 0) return;

        const labels = data.holdings.map((h) => h.symbol);
        const values = data.holdings.map((h) => h.value);
        const colors = data.holdings.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

        if (allocationChart) {
          allocationChart.destroy();
        }

        allocationChart = new Chart(canvas.getContext('2d'), {
          type: 'doughnut',
          data: {
            labels,
            datasets: [{
              data: values,
              backgroundColor: colors,
              borderColor: 'rgba(17, 24, 39, 0.8)',
              borderWidth: 2,
              hoverBorderColor: '#fff',
              hoverBorderWidth: 2,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: COLORS.tooltipBg,
                titleColor: COLORS.tooltipText,
                bodyColor: COLORS.tooltipText,
                borderColor: COLORS.gridBorder,
                borderWidth: 1,
                padding: 10,
                callbacks: {
                  label: function (context) {
                    const value = context.parsed;
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                    const formatted = typeof window.formatTZS === 'function'
                      ? window.formatTZS(value)
                      : `TZS ${value.toLocaleString()}`;
                    return `${context.label}: ${formatted} (${pct}%)`;
                  },
                },
              },
            },
          },
        });
      })
      .catch((err) => {
        console.error('[HisaZangu] Allocation chart failed:', err);
      });
  }

  // ---------------------------------------------------------------------------
  // Initialise
  // ---------------------------------------------------------------------------

  function init() {
    initChart();
    initPeriodButtons();
    initAllocationChart();
  }

  function handleChartResize() {
    if (!chartInstance) return;

    if (chartResizeFrame) {
      window.cancelAnimationFrame(chartResizeFrame);
    }

    chartResizeFrame = window.requestAnimationFrame(() => {
      applyResponsiveChartOptions(parsePeriod(activePeriod));
      chartInstance.update('none');
      chartResizeFrame = null;
    });
  }

  document.addEventListener('htmx:afterSwap', (event) => {
    const target = event.detail.target;
    if (!target) return;

    if (target.id === 'portfolio-content' || target.querySelector('#allocationCanvas')) {
      initAllocationChart();
    }

    if (target.id === 'stock-chart' || target.querySelector('#stock-chart')) {
      initChart();
      initPeriodButtons();
    }
  });

  window.addEventListener('resize', handleChartResize);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
