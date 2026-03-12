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
    res.render('pages/stocks', {
      title: 'Hisa za DSE - HisaZangu',
      stocks,
    });
  } catch (err) {
    console.error('Stocks page error:', err);
    res.render('pages/stocks', { title: 'Hisa za DSE - HisaZangu', stocks: [] });
  }
});

// @route GET /stocks/:symbol
router.get('/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const stock = await Stock.findOne({ symbol }).lean();

    if (!stock) {
      return res.status(404).render('pages/error', {
        title: 'Hisa Haipatikani',
        message: `Hisa "${symbol}" haipatikani.`,
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
      title: 'Hitilafu',
      message: 'Hitilafu katika kupakia taarifa za hisa.',
      code: 500,
    });
  }
});

export default router;
