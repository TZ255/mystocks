export const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error_msg', 'Please sign in first');
  res.redirect('/');
};

export const ensureGuest = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  next();
};
