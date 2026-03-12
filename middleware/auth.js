export const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error_msg', 'Tafadhali ingia kwanza');
  res.redirect('/');
};

export const ensureGuest = (req, res, next) => {
  console.log('Guest Ensured')
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  next();
};
