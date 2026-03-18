import cron from 'node-cron';
import { fetchLivePrices, fetchAndStoreHistory, fetchHistoryForDate } from '../services/dseService.js';
import { checkAlerts } from '../services/alertService.js';

const formatDate = (date) => date.toISOString().split('T')[0];

/**
 * Temporary backfill: fetches history for the last N days, one API call per minute.
 * Each call fetches ALL stocks for a single date.
 * Set BACKFILL_DAYS env var to control range (default 7).
 */
const startBackfill = () => {
  const days = parseInt(process.env.BACKFILL_DAYS || '366');
  const dates = [];

  for (let i = days; i >= 66; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    // Skip weekends (Sat=6, Sun=0)
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    dates.push(formatDate(d));
  }

  if (dates.length === 0) {
    console.log('[Backfill] No weekdays to backfill');
    return;
  }

  console.log(`[Backfill] Starting backfill for ${dates.length} dates: ${dates[0]} → ${dates[dates.length - 1]}`);
  console.log(`[Backfill] Will complete in ~${dates.length} minutes (1 request/min)`);

  let index = 0;

  // Process the first date immediately
  fetchHistoryForDate(dates[index]).then(() => {
    index++;
    if (index >= dates.length) {
      console.log('[Backfill] Complete!');
      return;
    }

    // Then one date per minute for the rest
    const interval = setInterval(async () => {
      if (index >= dates.length) {
        clearInterval(interval);
        console.log('[Backfill] Complete!');
        return;
      }

      await fetchHistoryForDate(dates[index]);
      index++;
    }, 3_000);
  });
};

export const startStockFetcher = () => {
  // Initial fetch on startup: history first (full data), then live prices (latest)
  console.log('Running initial stock data fetch...');
  fetchAndStoreHistory()
    .then(() => fetchLivePrices())
    .then(() => checkAlerts())
    .catch((err) => console.error('Initial fetch error:', err.message));

  // Run backfill if enabled (set ENABLE_BACKFILL=true in .env)
  if (process.env.ENABLE_BACKFILL === 'true') {
    startBackfill();
  }

  // Every 5 minutes during DSE trading hours (Mon-Fri 09:00-15:55 EAT)
  cron.schedule('*/5 9-15 * * 1-5', async () => {
    console.log(`[${new Date().toISOString()}] Cron: fetching DSE prices...`);
    await fetchLivePrices();
    await checkAlerts();
  }, {
    timezone: 'Africa/Dar_es_Salaam',
  });

  // Daily historical data sync at 16:00 EAT (after market close)
  cron.schedule('0 16,17,20 * * 1-5', async () => {
    console.log(`[${new Date().toISOString()}] Cron: syncing historical data...`);
    await fetchAndStoreHistory();
  }, {
    timezone: 'Africa/Dar_es_Salaam',
  });

  console.log('Stock fetcher cron jobs scheduled');
};
