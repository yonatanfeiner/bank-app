import mongoose from 'mongoose';

const verificationCodeSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Verification code is required'],
    minlength: 6,
    maxlength: 6
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  expiresAt: {
    type: Date,
    required: true,
    default: Date.now,
    expires: 300 // Document expires after 5 minutes (300 seconds)
  },
  isUsed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
verificationCodeSchema.index({ phoneNumber: 1 });

export default mongoose.model('VerificationCode', verificationCodeSchema);