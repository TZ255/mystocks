const DSE_BASE_URL = 'https://dse.co.tz';

export const DSE_ENDPOINTS = {
  livePrices: `${DSE_BASE_URL}/api/get/live/market/prices`,
  marketOverview: (date) => `${DSE_BASE_URL}/get/market/over/view?to_date=${date}`,
  gainersLosers: `${DSE_BASE_URL}/get/gainers/losers`,
  movers: `${DSE_BASE_URL}/get/movers`,
  lastTradeDate: `${DSE_BASE_URL}/get/last/trade/date`,
  historicalPrices: (date, symbol = 'ALL', cls = 'EQUITY') =>
    `${DSE_BASE_URL}/api/get/market/prices/for/range?to_date=${date}&security_code=${symbol}&class=${cls}`,
  indices: (date) => `${DSE_BASE_URL}/get/last/traded/indices?from=${date}`,
};

export const DSE_TRADING_HOURS = {
  open: 10,  // 10:00 EAT
  close: 14, // 14:00 EAT
  timezone: 'Africa/Dar_es_Salaam',
  days: [1, 2, 3, 4, 5], // Mon-Fri
};
