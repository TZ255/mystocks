import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import Stock from '../models/Stock.js';
import StockHistory from '../models/StockHistory.js';
import Portfolio from '../models/Portfolio.js';
import Watchlist from '../models/Watchlist.js';
import Alert from '../models/Alert.js';
import { calculatePortfolioSummary } from '../services/portfolioService.js';
import { getCompanyInfo } from '../config/dseCompanies.js';

const router = Router();

// Verify HTMX request for mutations
const verifyHtmx = (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method) && !req.headers['hx-request']) {
    return res.status(403).send('Forbidden');
  }
  next();
};

// ── Market ──
router.get('/market/overview', async (req, res) => {
  try {
    const stocks = await Stock.find().lean();
    const gainers = stocks.filter((s) => s.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent).slice(0, 5);
    const losers = stocks.filter((s) => s.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent).slice(0, 5);
    const totalVolume = stocks.reduce((sum, s) => sum + (s.volume || 0), 0);
    const totalTurnover = stocks.reduce((sum, s) => sum + (s.turnover || 0), 0);
    const totalDeals = stocks.reduce((sum, s) => sum + (s.deals || 0), 0);

    res.render('partials/market-overview', {
      layout: false,
      stocks,
      gainers,
      losers,
      totalVolume,
      totalTurnover,
      totalDeals,
      totalStocks: stocks.length,
    });
  } catch (err) {
    res.status(500).send('<p class="text-danger">Hitilafu katika kupakia data</p>');
  }
});

// ── Stocks Table ──
router.get('/stocks/table', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 0;
    let query = Stock.find().sort({ symbol: 1 });
    if (limit > 0) query = query.limit(limit);
    const stocks = await query.lean();

    res.render('fragments/stock-table', { layout: false, stocks });
  } catch (err) {
    res.status(500).send('<p class="text-danger">Hitilafu</p>');
  }
});

// ── Search ──
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.render('fragments/search-results', { layout: false, results: [] });

    const results = await Stock.find({
      $or: [
        { symbol: { $regex: q, $options: 'i' } },
        { companyName: { $regex: q, $options: 'i' } },
      ],
    })
      .limit(10)
      .lean();

    res.render('fragments/search-results', { layout: false, results });
  } catch (err) {
    res.status(500).send('');
  }
});

// ── Stock Chart Data ──
router.get('/stocks/:symbol/chart', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const period = req.query.period || '30';
    const days = parseInt(period);

    const history = await StockHistory.find({ symbol })
      .sort({ date: -1 })
      .limit(days)
      .lean();

    const data = history.reverse();
    res.json({
      labels: data.map((d) => d.date.toISOString().split('T')[0]),
      prices: data.map((d) => d.close),
      volumes: data.map((d) => d.volume),
    });
  } catch (err) {
    res.status(500).json({ error: 'Hitilafu' });
  }
});

// ── Market Ticker ──
router.get('/market/ticker', async (req, res) => {
  try {
    const stocks = await Stock.find({ price: { $gt: 0 } })
      .sort({ volume: -1 })
      .limit(15)
      .lean();
    res.render('fragments/market-ticker', { layout: false, stocks });
  } catch (err) {
    res.status(500).send('');
  }
});

// ── Watchlist Toggle ──
router.post('/watchlist/toggle/:symbol', ensureAuthenticated, verifyHtmx, async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const existing = await Watchlist.findOne({ user: req.user._id, symbol });

    if (existing) {
      await Watchlist.deleteOne({ _id: existing._id });
      res.render('fragments/toast', {
        layout: false,
        message: `${symbol} imeondolewa kwenye watchlist`,
        type: 'info',
        isWatched: false,
        symbol,
      });
    } else {
      await Watchlist.create({ user: req.user._id, symbol });
      res.render('fragments/toast', {
        layout: false,
        message: `${symbol} imeongezwa kwenye watchlist`,
        type: 'success',
        isWatched: true,
        symbol,
      });
    }
  } catch (err) {
    res.status(500).render('fragments/toast', {
      layout: false,
      message: 'Hitilafu imetokea',
      type: 'error',
      isWatched: false,
      symbol: req.params.symbol,
    });
  }
});

// ── Watchlist Items ──
router.get('/watchlist/items', ensureAuthenticated, async (req, res) => {
  try {
    const watchlistItems = await Watchlist.find({ user: req.user._id }).lean();
    const symbols = watchlistItems.map((w) => w.symbol);
    const stocks = await Stock.find({ symbol: { $in: symbols } }).lean();
    res.render('fragments/watchlist-items', { layout: false, stocks });
  } catch (err) {
    res.status(500).send('<p class="text-danger">Hitilafu</p>');
  }
});

// ── Portfolio ──
router.post('/portfolio/add', ensureAuthenticated, verifyHtmx, async (req, res) => {
  try {
    const { symbol, shares, avgBuyPrice, notes } = req.body;

    if (!symbol || !shares || !avgBuyPrice) {
      return res.status(400).render('fragments/toast', {
        layout: false,
        message: 'Tafadhali jaza taarifa zote',
        type: 'error',
      });
    }

    await Portfolio.findOneAndUpdate(
      { user: req.user._id, symbol: symbol.toUpperCase() },
      {
        user: req.user._id,
        symbol: symbol.toUpperCase(),
        shares: parseFloat(shares),
        avgBuyPrice: parseFloat(avgBuyPrice),
        notes: notes || '',
      },
      { upsert: true, new: true }
    );

    // Return updated holdings
    const holdings = await Portfolio.find({ user: req.user._id }).lean();
    const symbols = holdings.map((h) => h.symbol);
    const stocks = await Stock.find({ symbol: { $in: symbols } }).lean();
    const stockMap = {};
    stocks.forEach((s) => (stockMap[s.symbol] = s));
    const portfolioSummary = calculatePortfolioSummary(holdings, stockMap);

    res.render('fragments/portfolio-holdings', {
      layout: false,
      holdings,
      stockMap,
      portfolioSummary,
    });
  } catch (err) {
    res.status(500).render('fragments/toast', {
      layout: false,
      message: 'Hitilafu katika kuongeza hisa',
      type: 'error',
    });
  }
});

router.delete('/portfolio/remove/:id', ensureAuthenticated, verifyHtmx, async (req, res) => {
  try {
    await Portfolio.deleteOne({ _id: req.params.id, user: req.user._id });

    const holdings = await Portfolio.find({ user: req.user._id }).lean();
    const symbols = holdings.map((h) => h.symbol);
    const stocks = await Stock.find({ symbol: { $in: symbols } }).lean();
    const stockMap = {};
    stocks.forEach((s) => (stockMap[s.symbol] = s));
    const portfolioSummary = calculatePortfolioSummary(holdings, stockMap);

    res.render('fragments/portfolio-holdings', {
      layout: false,
      holdings,
      stockMap,
      portfolioSummary,
    });
  } catch (err) {
    res.status(500).render('fragments/toast', {
      layout: false,
      message: 'Hitilafu katika kuondoa hisa',
      type: 'error',
    });
  }
});

// ── Portfolio Form ──
router.get('/portfolio/form', ensureAuthenticated, async (req, res) => {
  try {
    const allStocks = await Stock.find().sort({ symbol: 1 }).lean();
    res.render('fragments/portfolio-form', { layout: false, allStocks });
  } catch (err) {
    res.status(500).send('');
  }
});

// ── Alerts ──
router.post('/alerts/create', ensureAuthenticated, verifyHtmx, async (req, res) => {
  try {
    const { symbol, condition, targetPrice } = req.body;

    if (!symbol || !condition || !targetPrice) {
      return res.status(400).render('fragments/toast', {
        layout: false,
        message: 'Tafadhali jaza taarifa zote',
        type: 'error',
      });
    }

    await Alert.create({
      user: req.user._id,
      symbol: symbol.toUpperCase(),
      condition,
      targetPrice: parseFloat(targetPrice),
    });

    const alerts = await Alert.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    res.render('fragments/alert-list', { layout: false, alerts });
  } catch (err) {
    res.status(500).render('fragments/toast', {
      layout: false,
      message: 'Hitilafu katika kuunda arifa',
      type: 'error',
    });
  }
});

router.delete('/alerts/remove/:id', ensureAuthenticated, verifyHtmx, async (req, res) => {
  try {
    await Alert.deleteOne({ _id: req.params.id, user: req.user._id });
    const alerts = await Alert.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    res.render('fragments/alert-list', { layout: false, alerts });
  } catch (err) {
    res.status(500).render('fragments/toast', {
      layout: false,
      message: 'Hitilafu katika kuondoa arifa',
      type: 'error',
    });
  }
});

// ── Alert Form ──
router.get('/alerts/form', ensureAuthenticated, async (req, res) => {
  try {
    const allStocks = await Stock.find().sort({ symbol: 1 }).lean();
    res.render('fragments/alert-form', { layout: false, allStocks });
  } catch (err) {
    res.status(500).send('');
  }
});

export default router;
