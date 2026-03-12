import cron from 'node-cron';
import { fetchLivePrices, fetchAndStoreHistory } from '../services/dseService.js';
import { checkAlerts } from '../services/alertService.js';

export const startStockFetcher = () => {
  // Initial fetch on startup: history first (full data), then live prices (latest)
  console.log('Running initial stock data fetch...');
  fetchAndStoreHistory()
    .then(() => fetchLivePrices())
    .then(() => checkAlerts())
    .catch((err) => console.error('Initial fetch error:', err.message));

  // Every 5 minutes during DSE trading hours (Mon-Fri 10:00-14:00 EAT / 07:00-11:00 UTC)
  cron.schedule('*/5 7-11 * * 1-5', async () => {
    console.log(`[${new Date().toISOString()}] Cron: fetching DSE prices...`);
    await fetchLivePrices();
    await checkAlerts();
  }, {
    timezone: 'Africa/Dar_es_Salaam',
  });

  // Daily historical data sync at 15:00 EAT (after market close)
  cron.schedule('0 15 * * 1-5', async () => {
    console.log(`[${new Date().toISOString()}] Cron: syncing historical data...`);
    await fetchAndStoreHistory();
  }, {
    timezone: 'Africa/Dar_es_Salaam',
  });

  console.log('Stock fetcher cron jobs scheduled');
};
