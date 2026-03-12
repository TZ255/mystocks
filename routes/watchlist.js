import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import Watchlist from '../models/Watchlist.js';
import Stock from '../models/Stock.js';

const router = Router();

// @route GET /watchlist
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const watchlistItems = await Watchlist.find({ user: req.user._id }).lean();
    const symbols = watchlistItems.map((w) => w.symbol);
    const stocks = await Stock.find({ symbol: { $in: symbols } }).lean();

    res.render('pages/watchlist', {
      title: 'Watchlist - HisaZangu',
      watchlistItems,
      stocks,
    });
  } catch (err) {
    console.error('Watchlist error:', err);
    req.flash('error_msg', 'Error loading watchlist');
    res.redirect('/dashboard');
  }
});

export default router;
