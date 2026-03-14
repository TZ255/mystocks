import { Router } from 'express';
import { ensureGuest } from '../middleware/auth.js';
import Stock from '../models/Stock.js';

const router = Router();

// @route GET /
router.get('/', ensureGuest, async (req, res) => {
  try {
    const [totalStocks, totalVolumeAgg] = await Promise.all([
      Stock.countDocuments(),
      Stock.aggregate([{ $group: { _id: null, total: { $sum: '$volume' } } }]),
    ]);

    res.render('pages/landing', {
      title: 'HisaZangu | DSE Portfolio Tracker Tanzania | Fuatilia Hisa za Dar es Salaam Stock Exchange',
      metaDescription:
        'HisaZangu ni DSE portfolio tracker ya Tanzania inayokusaidia kufuatilia Dar es Salaam Stock Exchange stocks, watchlist, market data, na price alerts kwa urahisi.',
      metaKeywords:
        'DSE, Dar es Salaam Stock Exchange, Tanzania stocks, DSE portfolio tracker, HisaZangu, price alerts, watchlist, stock market Tanzania, hisa za Tanzania, portfolio management',
      canonicalUrl: 'https://hisazangu.com/',
      totalStocks,
      totalVolume: totalVolumeAgg[0]?.total || 0,
      layout: 'layout',
    });
  } catch (err) {
    console.error('Landing page error:', err);
    res.render('pages/landing', {
      title: 'HisaZangu | DSE Portfolio Tracker Tanzania | Fuatilia Hisa za Dar es Salaam Stock Exchange',
      metaDescription:
        'HisaZangu ni DSE portfolio tracker ya Tanzania inayokusaidia kufuatilia Dar es Salaam Stock Exchange stocks, watchlist, market data, na price alerts kwa urahisi.',
      metaKeywords:
        'DSE, Dar es Salaam Stock Exchange, Tanzania stocks, DSE portfolio tracker, HisaZangu, price alerts, watchlist, stock market Tanzania, hisa za Tanzania, portfolio management',
      canonicalUrl: 'https://hisazangu.com/',
      totalStocks: 0,
      totalVolume: 0,
      layout: 'layout',
    });
  }
});

// @route GET /privacy
router.get('/privacy', (req, res) => {
  res.render('pages/privacy', { title: 'Privacy Policy - HisaZangu' });
});

// @route GET /terms
router.get('/terms', (req, res) => {
  res.render('pages/terms', { title: 'Terms of Service - HisaZangu' });
});

export default router;
