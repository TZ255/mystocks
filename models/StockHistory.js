import mongoose from 'mongoose';

const stockHistorySchema = new mongoose.Schema({
  symbol: { type: String, required: true, uppercase: true },
  date: { type: Date, required: true },
  open: { type: Number, default: 0 },
  high: { type: Number, default: 0 },
  low: { type: Number, default: 0 },
  close: { type: Number, default: 0 },
  volume: { type: Number, default: 0 },
  turnover: { type: Number, default: 0 },
  deals: { type: Number, default: 0 },
});

stockHistorySchema.index({ symbol: 1, date: -1 });
stockHistorySchema.index({ symbol: 1, date: 1 }, { unique: true });

export default mongoose.model('StockHistory', stockHistorySchema);
