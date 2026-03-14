import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';
import { startStockFetcher } from './jobs/stockFetcher.js';

const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });

  // Start cron job for DSE data
  if (process.env?.NODE_ENV === "production") {
    startStockFetcher();
  }
};

start();
