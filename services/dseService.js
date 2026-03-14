import axios from 'axios';
import Stock from '../models/Stock.js';
import StockHistory from '../models/StockHistory.js';
import { DSE_ENDPOINTS } from '../config/dse.js';
import { getCompanyInfo } from '../config/dseCompanies.js';

const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

/**
 * Extract the array from DSE API responses.
 * DSE returns { success: true, data: [...] } not a plain array.
 */
const extractArray = (response) => {
  if (Array.isArray(response)) return response;
  if (response && Array.isArray(response.data)) return response.data;
  return null;
};

/**
 * Fetch live prices from DSE.
 * Endpoint returns sparse data: { company, price, change } per stock.
 * Used for quick updates during trading hours.
 */
export const fetchLivePrices = async () => {
  try {
    const { data: response } = await axios.get(DSE_ENDPOINTS.livePrices, { timeout: 15000 });

    const items = extractArray(response);
    if (!items) {
      console.warn('DSE live prices: unexpected response format', typeof response);
      return [];
    }

    const ops = items.map((item) => {
      const symbol = (item.company || item.security_code || item.symbol || '').toUpperCase().trim();
      if (!symbol) return null;

      const companyInfo = getCompanyInfo(symbol);
      const price = parseFloat(item.price || item.close || 0);
      const change = parseFloat(item.change || 0);
      const previousClose = price - change;
      const changePercent = previousClose > 0 ? ((change / previousClose) * 100) : 0;

      return {
        updateOne: {
          filter: { symbol },
          update: {
            $set: {
              symbol,
              companyName: companyInfo.name,
              sector: companyInfo.sector,
              price,
              previousClose: parseFloat(previousClose.toFixed(2)),
              change: parseFloat(change.toFixed(2)),
              changePercent: parseFloat(changePercent.toFixed(2)),
              close: price,
              updatedAt: new Date(),
            },
          },
          upsert: true,
        },
      };
    }).filter(Boolean);

    if (ops.length > 0) {
      await Stock.bulkWrite(ops);
      console.log(`Synced ${ops.length} stock prices from DSE`);
    }

    return items;
  } catch (err) {
    console.error('Error fetching DSE live prices:', err.message);
    return [];
  }
};

/**
 * Fetch historical/daily prices and store in StockHistory.
 * Also updates the Stock model with full daily data (open, high, low, volume, etc.)
 * since the live endpoint only provides price + change.
 */
export const fetchAndStoreHistory = async () => {
  try {
    const today = formatDate(new Date());
    const { data: response } = await axios.get(DSE_ENDPOINTS.historicalPrices(today), { timeout: 20000 });

    const items = extractArray(response);
    if (!items) {
      console.warn('DSE historical prices: unexpected response format', typeof response);
      return;
    }

    const historyOps = [];
    const stockOps = [];

    for (const item of items) {
      const symbol = (item.company || item.security_code || item.symbol || '').toUpperCase().trim();
      const dateStr = item.trade_date || item.date;
      if (!symbol || !dateStr) continue;

      const date = new Date(dateStr);
      date.setHours(0, 0, 0, 0);

      const closingPrice = parseFloat(item.closing_price || item.close || item.price || 0);
      const openingPrice = parseFloat(item.opening_price || item.open || 0);
      const high = parseFloat(item.high || 0);
      const low = parseFloat(item.low || 0);
      const prevClose = parseFloat(item.prev_close || item.previous_close || 0);
      const volume = parseInt(item.volume || item.total_volume || 0);
      const turnover = parseFloat(item.turnover || item.total_turnover || 0);
      const changePercent = parseFloat(item.change || 0);
      const change = closingPrice - prevClose;

      // Store in StockHistory
      historyOps.push({
        updateOne: {
          filter: { symbol, date },
          update: {
            $set: {
              symbol,
              date,
              open: openingPrice,
              high,
              low,
              close: closingPrice,
              volume,
              turnover,
              deals: parseInt(item.deals || 0),
            },
          },
          upsert: true,
        },
      });

      // Also update the Stock model with full daily data
      const companyInfo = getCompanyInfo(symbol);
      stockOps.push({
        updateOne: {
          filter: { symbol },
          update: {
            $set: {
              symbol,
              companyName: companyInfo.name,
              sector: companyInfo.sector,
              price: closingPrice,
              previousClose: prevClose,
              change: parseFloat(change.toFixed(2)),
              changePercent: parseFloat(changePercent.toFixed(2)),
              open: openingPrice,
              high,
              low,
              close: closingPrice,
              volume,
              turnover,
              deals: parseInt(item.deals || 0),
              lastTradeDate: date,
              updatedAt: new Date(),
            },
          },
          upsert: true,
        },
      });
    }

    if (historyOps.length > 0) {
      await StockHistory.bulkWrite(historyOps);
      console.log(`Stored ${historyOps.length} historical records`);
    }

    if (stockOps.length > 0) {
      await Stock.bulkWrite(stockOps);
      console.log(`Updated ${stockOps.length} stocks with full daily data`);
    }
  } catch (err) {
    console.error('Error fetching DSE history:', err.message);
  }
};

/**
 * Fetch historical prices for a specific date and store in StockHistory.
 * Used by the backfill job to populate past data one day at a time.
 */
export const fetchHistoryForDate = async (dateStr) => {
  try {
    const { data: response } = await axios.get(
      DSE_ENDPOINTS.historicalPrices(dateStr),
      { timeout: 20000 }
    );

    const items = extractArray(response);
    if (!items || items.length === 0) {
      console.log(`No historical data for ${dateStr}`);
      return 0;
    }

    const historyOps = [];

    for (const item of items) {
      const symbol = (item.company || item.security_code || item.symbol || '').toUpperCase().trim();
      const dateValue = item.trade_date || item.date;
      if (!symbol || !dateValue) continue;

      const date = new Date(dateValue);
      date.setHours(0, 0, 0, 0);

      historyOps.push({
        updateOne: {
          filter: { symbol, date },
          update: {
            $set: {
              symbol,
              date,
              open: parseFloat(item.opening_price || item.open || 0),
              high: parseFloat(item.high || 0),
              low: parseFloat(item.low || 0),
              close: parseFloat(item.closing_price || item.close || item.price || 0),
              volume: parseInt(item.volume || item.total_volume || 0),
              turnover: parseFloat(item.turnover || item.total_turnover || 0),
              deals: parseInt(item.deals || 0),
            },
          },
          upsert: true,
        },
      });
    }

    if (historyOps.length > 0) {
      await StockHistory.bulkWrite(historyOps);
      console.log(`[Backfill] Stored ${historyOps.length} records for ${dateStr}`);
    }

    return historyOps.length;
  } catch (err) {
    console.error(`[Backfill] Error fetching history for ${dateStr}:`, err.message);
    return 0;
  }
};

export const fetchMarketOverview = async () => {
  try {
    const today = formatDate(new Date());
    const { data } = await axios.get(DSE_ENDPOINTS.marketOverview(today), { timeout: 15000 });
    return data;
  } catch (err) {
    console.error('Error fetching market overview:', err.message);
    return null;
  }
};

export const fetchGainersLosers = async () => {
  try {
    const { data } = await axios.get(DSE_ENDPOINTS.gainersLosers, { timeout: 15000 });
    return data;
  } catch (err) {
    console.error('Error fetching gainers/losers:', err.message);
    return null;
  }
};
