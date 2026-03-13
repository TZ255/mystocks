import { Router } from 'express';
import passport from 'passport';

const router = Router();

// @route GET /auth/google
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// @route GET /auth/google/callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/',
    failureMessage: true,
  }),
  (req, res) => {
    // Session is already established by passport at this point
    res.redirect('/dashboard');
  }
);

// @route GET /auth/logout
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash('success_msg', 'You have been signed out');
    res.redirect('/');
  });
});

export default router;
