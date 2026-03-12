import mongoose from 'mongoose';

const stockSchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, unique: true, uppercase: true },
    companyName: { type: String, default: '' },
    sector: { type: String, default: '' },
    price: { type: Number, default: 0 },
    previousClose: { type: Number, default: 0 },
    change: { type: Number, default: 0 },
    changePercent: { type: Number, default: 0 },
    open: { type: Number, default: 0 },
    high: { type: Number, default: 0 },
    low: { type: Number, default: 0 },
    close: { type: Number, default: 0 },
    volume: { type: Number, default: 0 },
    deals: { type: Number, default: 0 },
    turnover: { type: Number, default: 0 },
    lastTradeDate: { type: Date },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

//stockSchema.index({ symbol: 1 });
stockSchema.index({ changePercent: -1 });

export default mongoose.model('Stock', stockSchema);
