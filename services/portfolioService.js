export const calculatePortfolioSummary = (holdings, stockMap) => {
  let totalInvested = 0;
  let totalCurrentValue = 0;
  const enrichedHoldings = [];

  for (const holding of holdings) {
    const stock = stockMap[holding.symbol];
    const currentPrice = stock?.price || 0;
    const invested = holding.shares * holding.avgBuyPrice;
    const currentValue = holding.shares * currentPrice;
    const gain = currentValue - invested;
    const gainPercent = invested > 0 ? ((gain / invested) * 100) : 0;

    totalInvested += invested;
    totalCurrentValue += currentValue;

    enrichedHoldings.push({
      ...holding,
      currentPrice,
      invested,
      currentValue,
      gain,
      gainPercent: parseFloat(gainPercent.toFixed(2)),
      change: stock?.change || 0,
      changePercent: stock?.changePercent || 0,
    });
  }

  const totalGain = totalCurrentValue - totalInvested;
  const totalGainPercent = totalInvested > 0 ? ((totalGain / totalInvested) * 100) : 0;

  return {
    holdings: enrichedHoldings,
    totalInvested,
    totalCurrentValue,
    totalGain,
    totalGainPercent: parseFloat(totalGainPercent.toFixed(2)),
    holdingCount: holdings.length,
  };
};
