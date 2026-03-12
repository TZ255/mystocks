import Alert from '../models/Alert.js';
import Stock from '../models/Stock.js';

export const checkAlerts = async () => {
  try {
    const activeAlerts = await Alert.find({ active: true, triggered: false }).lean();

    if (activeAlerts.length === 0) return;

    const symbols = [...new Set(activeAlerts.map((a) => a.symbol))];
    const stocks = await Stock.find({ symbol: { $in: symbols } }).lean();
    const stockMap = {};
    stocks.forEach((s) => (stockMap[s.symbol] = s));

    const triggeredIds = [];

    for (const alert of activeAlerts) {
      const stock = stockMap[alert.symbol];
      if (!stock || !stock.price) continue;

      const isTriggered =
        (alert.condition === 'above' && stock.price >= alert.targetPrice) ||
        (alert.condition === 'below' && stock.price <= alert.targetPrice);

      if (isTriggered) {
        triggeredIds.push(alert._id);
      }
    }

    if (triggeredIds.length > 0) {
      await Alert.updateMany(
        { _id: { $in: triggeredIds } },
        { $set: { triggered: true, triggeredAt: new Date() } }
      );
      console.log(`Triggered ${triggeredIds.length} alerts`);
    }
  } catch (err) {
    console.error('Alert check error:', err.message);
  }
};
