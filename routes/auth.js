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
  (req, res, next) => {
    passport.authenticate('google', (err, user, info) => {
      if (err) {
        console.error('Google OAuth error:', err);
        req.flash('error_msg', 'Authentication failed. Please try again.');
        return res.redirect('/');
      }
      if (!user) {
        console.error('Google OAuth failed — no user returned:', info);
        req.flash('error_msg', 'Could not sign in. Please try again.');
        return res.redirect('/');
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error('Login session error:', loginErr);
          req.flash('error_msg', 'Session error. Please try again.');
          return res.redirect('/');
        }
        res.redirect('/dashboard');
      });
    })(req, res, next);
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
