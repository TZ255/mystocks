import { Router } from 'express';
import { ensureGuest } from '../middleware/auth.js';
import Stock from '../models/Stock.js';

const router = Router();

// @route GET /
router.get('/', ensureGuest, async (req, res) => {
  try {
    const stocks = await Stock.find().sort({ volume: -1 }).limit(10).lean();
    const gainers = await Stock.find({ changePercent: { $gt: 0 } })
      .sort({ changePercent: -1 })
      .limit(5)
      .lean();
    const losers = await Stock.find({ changePercent: { $lt: 0 } })
      .sort({ changePercent: 1 })
      .limit(5)
      .lean();

    const totalStocks = await Stock.countDocuments();
    const totalVolume = await Stock.aggregate([
      { $group: { _id: null, total: { $sum: '$volume' } } },
    ]);

    res.render('pages/landing', {
      title: 'HisaZangu - Fuatilia Hisa Zako za DSE',
      stocks,
      gainers,
      losers,
      totalStocks,
      totalVolume: totalVolume[0]?.total || 0,
      layout: 'layout',
    });
  } catch (err) {
    console.error('Landing page error:', err);
    res.render('pages/landing', {
      title: 'HisaZangu - Fuatilia Hisa Zako za DSE',
      stocks: [],
      gainers: [],
      losers: [],
      totalStocks: 0,
      totalVolume: 0,
      layout: 'layout',
    });
  }
});

export default router;
