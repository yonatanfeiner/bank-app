import User from '../src/models/User.js';
import Transaction from '../src/models/Transaction.js';
import VerificationCode from '../src/models/VerificationCode.js';
import { generateToken } from '../src/utils/jwt.js';

// צור משתמש מאומת לטסטים
export const createTestUser = async (userData = {}) => {
  const defaultData = {
    email: 'test@example.com',
    password: 'password123',
    phoneNumber: '+1234567890',
    accountBalance: 1000,
    isPhoneVerified: true
  };

  const user = await User.create({ ...defaultData, ...userData });
  const token = generateToken(user._id);

  return { user, token };
};

// צור שני משתמשים לטסטי העברות כסף
export const createTestUsers = async () => {
  const sender = await createTestUser({
    email: 'sender@example.com',
    phoneNumber: '+1111111111',
    accountBalance: 2000
  });

  const recipient = await createTestUser({
    email: 'recipient@example.com',
    phoneNumber: '+2222222222',
    accountBalance: 500
  });

  return { sender, recipient };
};

// צור קוד אימות לטסטים
export const createTestVerificationCode = async (phoneNumber, code = '123456') => {
  return await VerificationCode.create({
    phoneNumber,
    code,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 דקות
    isUsed: false
  });
};

// צור transaction לטסטים
export const createTestTransaction = async (senderId, receiverId, amount = 100) => {
  const sender = await User.findById(senderId);
  const recipient = await User.findById(receiverId);

  return await Transaction.create({
    senderId,
    receiverId,
    senderEmail: sender.email,
    receiverEmail: recipient.email,
    amount,
    type: 'transfer',
    status: 'completed'
  });
};

// נקה את כל הטבלאות
export const clearDatabase = async () => {
  await User.deleteMany({});
  await Transaction.deleteMany({});
  await VerificationCode.deleteMany({});
};

// המתן לפעולה async (עבור timing tests)
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));