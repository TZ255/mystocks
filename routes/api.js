import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import Stock from '../models/Stock.js';
import StockHistory from '../models/StockHistory.js';
import Portfolio from '../models/Portfolio.js';
import Watchlist from '../models/Watchlist.js';
import Alert from '../models/Alert.js';
import { calculatePortfolioSummary, collectTransactions } from '../services/portfolioService.js';

const router = Router();

// Verify HTMX request for mutations
const verifyHtmx = (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method) && !req.headers['hx-request']) {
    return res.status(403).send('Forbidden');
  }
  next();
};

const buildPortfolioViewData = async (userId) => {
  const [portfolioDocs, holdings] = await Promise.all([
    Portfolio.find({ user: userId }).lean(),
    Portfolio.find({ user: userId, shares: { $gt: 0 } }).lean(),
  ]);

  const symbols = holdings.map((h) => h.symbol);
  const stocks = symbols.length > 0 ? await Stock.find({ symbol: { $in: symbols } }).lean() : [];
  const stockMap = {};
  stocks.forEach((stock) => {
    stockMap[stock.symbol] = stock;
  });

  const portfolioSummary = calculatePortfolioSummary(holdings, stockMap);
  const transactions = collectTransactions(portfolioDocs);

  return {
    holdings,
    stockMap,
    portfolioSummary,
    transactions,
  };
};

// Helper: fetch and render portfolio content
const renderPortfolioContent = async (req, res) => {
  const data = await buildPortfolioViewData(req.user._id);

  res.render('fragments/portfolio-content', {
    layout: false,
    ...data,
  });
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
    res.status(500).send('<p class="text-red">Failed to load market data</p>');
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
    res.status(500).send('<p class="text-red">Error loading stocks</p>');
  }
});

// ── Search ──
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const isAuthenticated = req.isAuthenticated();

    if (!q) {
      return res.render('fragments/search-results', {
        layout: false,
        results: [],
        watchedSymbols: [],
        isAuthenticated,
      });
    }

    const results = await Stock.find({
      $or: [
        { symbol: { $regex: q, $options: 'i' } },
        { companyName: { $regex: q, $options: 'i' } },
      ],
    })
      .limit(10)
      .lean();

    let watchedSymbols = [];
    if (isAuthenticated && results.length > 0) {
      const symbols = results.map((result) => result.symbol);
      const watchlistRows = await Watchlist.find({
        user: req.user._id,
        symbol: { $in: symbols },
      }).lean();
      watchedSymbols = watchlistRows.map((row) => row.symbol);
    }

    res.render('fragments/search-results', {
      layout: false,
      results,
      watchedSymbols,
      isAuthenticated,
    });
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
    res.status(500).json({ error: 'Error loading chart data' });
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
    let isWatched;
    let message;
    let type;

    if (existing) {
      await Watchlist.deleteOne({ _id: existing._id });
      isWatched = false;
      message = `${symbol} removed from watchlist`;
      type = 'info';
    } else {
      await Watchlist.create({ user: req.user._id, symbol });
      isWatched = true;
      message = `${symbol} added to watchlist`;
      type = 'success';
    }

    res.set(
      'HX-Trigger',
      JSON.stringify({
        showToast: { message, type },
        watchlistChanged: { symbol, isWatched },
      })
    );
    res.status(204).send();
  } catch (err) {
    res.set(
      'HX-Trigger',
      JSON.stringify({
        showToast: { message: 'An error occurred', type: 'error' },
      })
    );
    res.status(500).send();
  }
});

// ── Watchlist Items ──
router.get('/watchlist/items', ensureAuthenticated, async (req, res) => {
  try {
    const watchlistItems = await Watchlist.find({ user: req.user._id }).lean();
    const symbols = watchlistItems.map((w) => w.symbol);
    const stocks = await Stock.find({ symbol: { $in: symbols } }).sort({ symbol: 1 }).lean();
    res.render('fragments/watchlist-items', { layout: false, stocks });
  } catch (err) {
    res.status(500).send('<p class="text-red">Error loading watchlist</p>');
  }
});

// ── Portfolio: Buy / Add ──
router.post('/portfolio/add', ensureAuthenticated, verifyHtmx, async (req, res) => {
  try {
    const { symbol, shares, avgBuyPrice, purchaseDate, notes } = req.body;

    if (!symbol || !shares || !avgBuyPrice) {
      return res.status(400).render('fragments/toast', {
        layout: false,
        message: 'Please fill in all required fields',
        type: 'error',
      });
    }

    const shareCount = parseFloat(shares);
    const buyPrice = parseFloat(avgBuyPrice);
    const date = purchaseDate ? new Date(purchaseDate) : new Date();

    if (!Number.isFinite(shareCount) || shareCount <= 0 || !Number.isFinite(buyPrice) || buyPrice <= 0) {
      return res.status(400).render('fragments/toast', {
        layout: false,
        message: 'Enter valid share count and buy price',
        type: 'error',
      });
    }

    const existing = await Portfolio.findOne({ user: req.user._id, symbol: symbol.toUpperCase() });

    if (existing) {
      if (existing.shares > 0) {
        // Recalculate weighted average when adding to an existing open position
        const totalOldCost = existing.shares * existing.avgBuyPrice;
        const totalNewCost = shareCount * buyPrice;
        const newTotalShares = existing.shares + shareCount;
        const newAvgPrice = (totalOldCost + totalNewCost) / newTotalShares;

        existing.shares = newTotalShares;
        existing.avgBuyPrice = parseFloat(newAvgPrice.toFixed(2));
      } else {
        // Re-open a previously closed position
        existing.shares = shareCount;
        existing.avgBuyPrice = buyPrice;
        existing.purchaseDate = date;
      }

      existing.notes = notes || existing.notes || '';
      existing.transactions.push({
        type: 'buy',
        shares: shareCount,
        price: buyPrice,
        date,
        notes: notes || '',
      });
      await existing.save();
    } else {
      await Portfolio.create({
        user: req.user._id,
        symbol: symbol.toUpperCase(),
        shares: shareCount,
        avgBuyPrice: buyPrice,
        purchaseDate: date,
        notes: notes || '',
        transactions: [{
          type: 'buy',
          shares: shareCount,
          price: buyPrice,
          date,
          notes: notes || '',
        }],
      });
    }

    await renderPortfolioContent(req, res);
  } catch (err) {
    console.error('Portfolio add error:', err);
    res.status(500).render('fragments/toast', {
      layout: false,
      message: 'Error adding stock to portfolio',
      type: 'error',
    });
  }
});

// ── Portfolio: Sell ──
router.post('/portfolio/sell', ensureAuthenticated, verifyHtmx, async (req, res) => {
  try {
    const { symbol, shares, sellPrice, notes } = req.body;

    if (!symbol || !shares || !sellPrice) {
      return res.status(400).render('fragments/toast', {
        layout: false,
        message: 'Please fill in all required fields',
        type: 'error',
      });
    }

    const shareCount = parseFloat(shares);
    const price = parseFloat(sellPrice);

    if (!Number.isFinite(shareCount) || shareCount <= 0 || !Number.isFinite(price) || price <= 0) {
      return res.status(400).render('fragments/toast', {
        layout: false,
        message: 'Enter valid share count and sell price',
        type: 'error',
      });
    }

    const holding = await Portfolio.findOne({
      user: req.user._id,
      symbol: symbol.toUpperCase(),
      shares: { $gt: 0 },
    });

    if (!holding) {
      return res.status(400).render('fragments/toast', {
        layout: false,
        message: `You don't own any ${symbol} shares`,
        type: 'error',
      });
    }

    if (shareCount > holding.shares) {
      return res.status(400).render('fragments/toast', {
        layout: false,
        message: `You only own ${holding.shares.toLocaleString()} shares of ${symbol}`,
        type: 'error',
      });
    }

    // Record the transaction
    holding.transactions.push({
      type: 'sell',
      shares: shareCount,
      price,
      date: new Date(),
      notes: notes || '',
    });

    holding.shares = parseFloat((holding.shares - shareCount).toFixed(6));
    if (holding.shares < 0) holding.shares = 0;
    await holding.save();

    await renderPortfolioContent(req, res);
  } catch (err) {
    console.error('Portfolio sell error:', err);
    res.status(500).render('fragments/toast', {
      layout: false,
      message: 'Error processing sale',
      type: 'error',
    });
  }
});

// ── Portfolio: Remove Holding ──
router.delete('/portfolio/remove/:id', ensureAuthenticated, verifyHtmx, async (req, res) => {
  try {
    await Portfolio.deleteOne({ _id: req.params.id, user: req.user._id });
    await renderPortfolioContent(req, res);
  } catch (err) {
    res.status(500).render('fragments/toast', {
      layout: false,
      message: 'Error removing holding',
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

// ── Portfolio Chart Data (allocation) ──
router.get('/portfolio/chart-data', ensureAuthenticated, async (req, res) => {
  try {
    const holdings = await Portfolio.find({ user: req.user._id, shares: { $gt: 0 } }).lean();
    const symbols = holdings.map((h) => h.symbol);
    const stocks = await Stock.find({ symbol: { $in: symbols } }).lean();
    const stockMap = {};
    stocks.forEach((s) => (stockMap[s.symbol] = s));
    const summary = calculatePortfolioSummary(holdings, stockMap);

    res.json({
      allocation: summary.sectorData,
      holdings: summary.holdings.map((h) => ({
        symbol: h.symbol,
        value: h.currentValue,
        percent: summary.totalCurrentValue > 0
          ? parseFloat(((h.currentValue / summary.totalCurrentValue) * 100).toFixed(1))
          : 0,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Error loading chart data' });
  }
});

// ── Alerts ──
router.post('/alerts/create', ensureAuthenticated, verifyHtmx, async (req, res) => {
  try {
    const { symbol, condition, targetPrice } = req.body;

    if (!symbol || !condition || !targetPrice) {
      return res.status(400).render('fragments/toast', {
        layout: false,
        message: 'Please fill in all fields',
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
      message: 'Error creating alert',
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
      message: 'Error removing alert',
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
