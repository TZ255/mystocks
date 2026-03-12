import express from 'express';
import expressLayouts from 'express-ejs-layouts';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import flash from 'connect-flash';
import path from 'path';
import { fileURLToPath } from 'url';

import sessionConfig from './config/session.js';
import configurePassport from './config/passport.js';
import { flashMiddleware } from './middleware/flash.js';
import { setLocals } from './middleware/locals.js';

// Routes
import indexRoutes from './routes/index.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import stockRoutes from './routes/stocks.js';
import portfolioRoutes from './routes/portfolio.js';
import watchlistRoutes from './routes/watchlist.js';
import alertRoutes from './routes/alerts.js';
import apiRoutes from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Helmet CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://unpkg.com',
          'https://cdn.jsdelivr.net',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdn.jsdelivr.net',
          'https://fonts.googleapis.com',
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https://lh3.googleusercontent.com'],
        connectSrc: ["'self'"],
      },
    },
  })
);

app.set('trust proxy', true)

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// Body parsing
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(sessionConfig());

// Flash messages
app.use(flash());

// Passport
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// Custom middleware
app.use(flashMiddleware);
app.use(setLocals);

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Routes
app.use('/', indexRoutes);
app.use('/auth', authLimiter, authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/stocks', stockRoutes);
app.use('/portfolio', portfolioRoutes);
app.use('/watchlist', watchlistRoutes);
app.use('/alerts', alertRoutes);
app.use('/api', apiRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('pages/error', {
    title: 'Ukurasa Haupatikani',
    message: 'Ukurasa unaoutafuta haupatikani.',
    code: 404,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('pages/error', {
    title: 'Hitilafu ya Seva',
    message: 'Kuna tatizo la kiufundi. Tafadhali jaribu tena baadaye.',
    code: 500,
  });
});

export default app;
