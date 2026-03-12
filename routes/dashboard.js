import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import Stock from '../models/Stock.js';
import Portfolio from '../models/Portfolio.js';
import Watchlist from '../models/Watchlist.js';
import Alert from '../models/Alert.js';
import { calculatePortfolioSummary } from '../services/portfolioService.js';

const router = Router();

// @route GET /dashboard
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const [holdings, watchlistItems, alerts, gainers, losers] = await Promise.all([
      Portfolio.find({ user: req.user._id }).lean(),
      Watchlist.find({ user: req.user._id }).lean(),
      Alert.find({ user: req.user._id, active: true }).lean(),
      Stock.find({ changePercent: { $gt: 0 } }).sort({ changePercent: -1 }).limit(5).lean(),
      Stock.find({ changePercent: { $lt: 0 } }).sort({ changePercent: 1 }).limit(5).lean(),
    ]);

    // Get current prices for portfolio symbols
    const symbols = holdings.map((h) => h.symbol);
    const stocks = await Stock.find({ symbol: { $in: symbols } }).lean();
    const stockMap = {};
    stocks.forEach((s) => (stockMap[s.symbol] = s));

    const portfolioSummary = calculatePortfolioSummary(holdings, stockMap);

    // Get watchlist stock data
    const watchlistSymbols = watchlistItems.map((w) => w.symbol);
    const watchlistStocks = await Stock.find({ symbol: { $in: watchlistSymbols } }).lean();

    res.render('pages/dashboard', {
      title: 'Dashboard - HisaZangu',
      holdings,
      portfolioSummary,
      watchlistStocks,
      alerts,
      gainers,
      losers,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    req.flash('error_msg', 'Error loading dashboard');
    res.redirect('/');
  }
});

export default router;
