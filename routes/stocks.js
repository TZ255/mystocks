import { Router } from 'express';
import Stock from '../models/Stock.js';
import StockHistory from '../models/StockHistory.js';
import Watchlist from '../models/Watchlist.js';
import { getCompanyInfo } from '../config/dseCompanies.js';

const router = Router();

// @route GET /stocks
router.get('/', async (req, res) => {
  try {
    const stocks = await Stock.find().sort({ symbol: 1 }).lean();
    let watchedSymbols = [];

    if (req.isAuthenticated()) {
      const watchlist = await Watchlist.find({ user: req.user._id }).lean();
      watchedSymbols = watchlist.map((w) => w.symbol);
    }

    const watchedSet = new Set(watchedSymbols);
    const stocksWithState = stocks.map((stock) => ({
      ...stock,
      isWatched: watchedSet.has(stock.symbol),
    }));

    res.render('pages/stocks', {
      title: 'DSE Stocks - HisaZangu',
      stocks: stocksWithState,
    });
  } catch (err) {
    console.error('Stocks page error:', err);
    res.render('pages/stocks', { title: 'DSE Stocks - HisaZangu', stocks: [] });
  }
});

// @route GET /stocks/:symbol
router.get('/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const stock = await Stock.findOne({ symbol }).lean();

    if (!stock) {
      return res.status(404).render('pages/error', {
        title: 'Stock Not Found',
        message: `Stock "${symbol}" was not found.`,
        code: 404,
      });
    }

    const history = await StockHistory.find({ symbol })
      .sort({ date: -1 })
      .limit(90)
      .lean();

    const companyInfo = getCompanyInfo(symbol);

    let isWatched = false;
    if (req.isAuthenticated()) {
      const watch = await Watchlist.findOne({ user: req.user._id, symbol });
      isWatched = !!watch;
    }

    res.render('pages/stock-detail', {
      title: `${symbol} - ${companyInfo.name} - HisaZangu`,
      stock,
      history: history.reverse(),
      companyInfo,
      isWatched,
    });
  } catch (err) {
    console.error('Stock detail error:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      message: 'Error loading stock information.',
      code: 500,
    });
  }
});

export default router;
