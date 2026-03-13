import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import Portfolio from '../models/Portfolio.js';
import Stock from '../models/Stock.js';
import { calculatePortfolioSummary, collectTransactions } from '../services/portfolioService.js';

const router = Router();

// @route GET /portfolio
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const [portfolioDocs, holdings] = await Promise.all([
      Portfolio.find({ user: req.user._id }).lean(),
      Portfolio.find({ user: req.user._id, shares: { $gt: 0 } }).lean(),
    ]);

    const symbols = holdings.map((h) => h.symbol);
    const stocks = await Stock.find({ symbol: { $in: symbols } }).lean();
    const stockMap = {};
    stocks.forEach((s) => (stockMap[s.symbol] = s));

    const portfolioSummary = calculatePortfolioSummary(holdings, stockMap);
    const transactions = collectTransactions(portfolioDocs);
    const allStocks = await Stock.find().sort({ symbol: 1 }).lean();

    res.render('pages/portfolio', {
      title: 'Portfolio - HisaZangu',
      holdings,
      stockMap,
      portfolioSummary,
      transactions,
      allStocks,
    });
  } catch (err) {
    console.error('Portfolio error:', err);
    req.flash('error_msg', 'Error loading portfolio');
    res.redirect('/dashboard');
  }
});

export default router;
