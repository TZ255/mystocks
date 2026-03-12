import mongoose from 'mongoose';

const portfolioSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    symbol: { type: String, required: true, uppercase: true },
    shares: { type: Number, required: true, min: 0 },
    avgBuyPrice: { type: Number, required: true, min: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

portfolioSchema.index({ user: 1, symbol: 1 }, { unique: true });

export default mongoose.model('Portfolio', portfolioSchema);
