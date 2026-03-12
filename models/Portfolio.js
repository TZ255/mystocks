import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['buy', 'sell'], required: true },
  shares: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true },
  notes: { type: String, default: '' },
}, { _id: true, timestamps: true });

const portfolioSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    symbol: { type: String, required: true, uppercase: true },
    shares: { type: Number, required: true, min: 0 },
    avgBuyPrice: { type: Number, required: true, min: 0 },
    purchaseDate: { type: Date, default: Date.now },
    notes: { type: String, default: '' },
    transactions: [transactionSchema],
  },
  { timestamps: true }
);

portfolioSchema.index({ user: 1, symbol: 1 }, { unique: true });

export default mongoose.model('Portfolio', portfolioSchema);
