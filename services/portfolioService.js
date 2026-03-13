export const calculatePortfolioSummary = (holdings, stockMap) => {
  let totalInvested = 0;
  let totalCurrentValue = 0;
  const enrichedHoldings = [];
  const sectorAllocation = {};

  for (const holding of holdings) {
    const stock = stockMap[holding.symbol];
    const currentPrice = stock?.price || 0;
    const invested = holding.shares * holding.avgBuyPrice;
    const currentValue = holding.shares * currentPrice;
    const gain = currentValue - invested;
    const gainPercent = invested > 0 ? ((gain / invested) * 100) : 0;

    totalInvested += invested;
    totalCurrentValue += currentValue;

    // Sector allocation
    const sector = stock?.sector || 'Other';
    sectorAllocation[sector] = (sectorAllocation[sector] || 0) + currentValue;

    enrichedHoldings.push({
      ...holding,
      currentPrice,
      invested,
      currentValue,
      gain,
      gainPercent: parseFloat(gainPercent.toFixed(2)),
      change: stock?.change || 0,
      changePercent: stock?.changePercent || 0,
      sector,
      companyName: stock?.companyName || holding.symbol,
    });
  }

  const totalGain = totalCurrentValue - totalInvested;
  const totalGainPercent = totalInvested > 0 ? ((totalGain / totalInvested) * 100) : 0;

  // Convert sector allocation to percentages
  const sectorData = Object.entries(sectorAllocation).map(([sector, value]) => ({
    sector,
    value,
    percent: totalCurrentValue > 0 ? parseFloat(((value / totalCurrentValue) * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.value - a.value);

  // Sort holdings by current value descending
  enrichedHoldings.sort((a, b) => b.currentValue - a.currentValue);

  return {
    holdings: enrichedHoldings,
    totalInvested,
    totalCurrentValue,
    totalGain,
    totalGainPercent: parseFloat(totalGainPercent.toFixed(2)),
    holdingCount: holdings.length,
    sectorData,
  };
};

export const collectTransactions = (portfolioDocs) => {
  const transactions = [];

  for (const holding of portfolioDocs) {
    if (!holding.transactions || holding.transactions.length === 0) continue;

    for (const tx of holding.transactions) {
      transactions.push({
        ...tx,
        symbol: holding.symbol,
      });
    }
  }

  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  return transactions;
};
