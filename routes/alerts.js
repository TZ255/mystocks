import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import Alert from '../models/Alert.js';
import Stock from '../models/Stock.js';

const router = Router();

// @route GET /alerts
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const alerts = await Alert.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    const allStocks = await Stock.find().sort({ symbol: 1 }).lean();

    res.render('pages/alerts', {
      title: 'Arifa za Bei - HisaZangu',
      alerts,
      allStocks,
    });
  } catch (err) {
    console.error('Alerts error:', err);
    req.flash('error_msg', 'Hitilafu katika kupakia arifa');
    res.redirect('/dashboard');
  }
});

export default router;
