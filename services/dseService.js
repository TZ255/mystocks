import axios from 'axios';
import Stock from '../models/Stock.js';
import StockHistory from '../models/StockHistory.js';
import { DSE_ENDPOINTS } from '../config/dse.js';
import { getCompanyInfo } from '../config/dseCompanies.js';

const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

export const fetchLivePrices = async () => {
  try {
    const { data } = await axios.get(DSE_ENDPOINTS.livePrices, { timeout: 15000 });

    if (!data || !Array.isArray(data)) {
      console.warn('DSE live prices: unexpected response format');
      return [];
    }

    const ops = data.map((item) => {
      const symbol = (item.security_code || item.symbol || '').toUpperCase().trim();
      if (!symbol) return null;

      const companyInfo = getCompanyInfo(symbol);
      const price = parseFloat(item.close || item.price || 0);
      const previousClose = parseFloat(item.previous_close || item.prev_close || 0);
      const change = price - previousClose;
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
              previousClose,
              change: parseFloat(change.toFixed(2)),
              changePercent: parseFloat(changePercent.toFixed(2)),
              open: parseFloat(item.open || 0),
              high: parseFloat(item.high || 0),
              low: parseFloat(item.low || 0),
              close: price,
              volume: parseInt(item.volume || item.total_volume || 0),
              deals: parseInt(item.deals || item.total_deals || 0),
              turnover: parseFloat(item.turnover || item.total_turnover || 0),
              lastTradeDate: item.trade_date ? new Date(item.trade_date) : new Date(),
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

    return data;
  } catch (err) {
    console.error('Error fetching DSE live prices:', err.message);
    return [];
  }
};

export const fetchAndStoreHistory = async () => {
  try {
    const today = formatDate(new Date());
    const { data } = await axios.get(DSE_ENDPOINTS.historicalPrices(today), { timeout: 20000 });

    if (!data || !Array.isArray(data)) {
      console.warn('DSE historical prices: unexpected response format');
      return;
    }

    const ops = data.map((item) => {
      const symbol = (item.security_code || item.symbol || '').toUpperCase().trim();
      const dateStr = item.trade_date || item.date;
      if (!symbol || !dateStr) return null;

      const date = new Date(dateStr);
      date.setHours(0, 0, 0, 0);

      return {
        updateOne: {
          filter: { symbol, date },
          update: {
            $set: {
              symbol,
              date,
              open: parseFloat(item.open || 0),
              high: parseFloat(item.high || 0),
              low: parseFloat(item.low || 0),
              close: parseFloat(item.close || item.price || 0),
              volume: parseInt(item.volume || item.total_volume || 0),
              turnover: parseFloat(item.turnover || item.total_turnover || 0),
              deals: parseInt(item.deals || item.total_deals || 0),
            },
          },
          upsert: true,
        },
      };
    }).filter(Boolean);

    if (ops.length > 0) {
      await StockHistory.bulkWrite(ops);
      console.log(`Stored ${ops.length} historical records`);
    }
  } catch (err) {
    console.error('Error fetching DSE history:', err.message);
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
