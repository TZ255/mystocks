export const flashMiddleware = (req, res, next) => {
  // Only call req.flash() when flash data exists in the session.
  // connect-flash sets req.session.flash = {} on every call, which modifies the session and causes empty sessions to be persisted to the database.
  if (req.session?.flash && Object.keys(req.session.flash).length > 0) {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
  } else {
    res.locals.success_msg = [];
    res.locals.error_msg = [];
    res.locals.error = [];
  }
  next();
};
