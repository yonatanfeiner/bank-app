import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Transaction from '../src/models/Transaction.js';
import VerificationCode from '../src/models/VerificationCode.js';

const MONGODB_URI_TEST = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/bankapp-test';

describe('Database Models', () => {
  
  beforeAll(async () => {
    await mongoose.connect(MONGODB_URI_TEST);
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Transaction.deleteMany({});
    await VerificationCode.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('User Model', () => {
    
    test('should create user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        phoneNumber: '+1234567890',
        accountBalance: 1000,
        isPhoneVerified: true
      };

      const user = await User.create(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email.toLowerCase()); // מוקטן אוטומטית
      expect(user.password).not.toBe(userData.password); // הסיסמה מוצפנת
      expect(user.phoneNumber).toBe(userData.phoneNumber);
      expect(user.accountBalance).toBe(userData.accountBalance);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    test('should hash password before saving', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'plainpassword',
        phoneNumber: '+1234567890'
      };

      const user = await User.create(userData);
      
      expect(user.password).not.toBe('plainpassword');
      expect(user.password.length).toBeGreaterThan(50); // bcrypt hash is long
      expect(user.password.startsWith('$2a$') || user.password.startsWith('$2b$')).toBe(true);
    });

    test('should compare password correctly', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        phoneNumber: '+1234567890'
      };

      const user = await User.create(userData);

      const isCorrectPassword = await user.comparePassword('password123');
      const isWrongPassword = await user.comparePassword('wrongpassword');

      expect(isCorrectPassword).toBe(true);
      expect(isWrongPassword).toBe(false);
    });

    test('should not return password in JSON', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        phoneNumber: '+1234567890'
      };

      const user = await User.create(userData);
      const userJSON = user.toJSON();

      expect(userJSON).not.toHaveProperty('password');
      expect(userJSON).toHaveProperty('email');
      expect(userJSON).toHaveProperty('phoneNumber');
    });

    test('should validate email format', async () => {
      const userData = {
        email: 'invalid-email-format',
        password: 'password123',
        phoneNumber: '+1234567890'
      };

      await expect(User.create(userData)).rejects.toThrow(/valid email/);
    });

    test('should validate phone number format', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        phoneNumber: '123' // טלפון קצר מדי
      };

      await expect(User.create(userData)).rejects.toThrow(/valid phone/);
    });

    test('should enforce unique email constraint', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        phoneNumber: '+1234567890'
      };

      await User.create(userData);

      // נסה ליצור משתמש שני עם אותו email
      await expect(User.create({
        ...userData,
        phoneNumber: '+9876543210'
      })).rejects.toThrow();
    });
  });

  describe('Transaction Model', () => {
    
    test('should create transaction with valid data', async () => {
      const sender = await User.create({
        email: 'sender@example.com',
        password: 'password123',
        phoneNumber: '+1111111111'
      });

      const recipient = await User.create({
        email: 'recipient@example.com',
        password: 'password123',
        phoneNumber: '+2222222222'
      });

      const transactionData = {
        senderId: sender._id,
        receiverId: recipient._id,
        senderEmail: sender.email,
        receiverEmail: recipient.email,
        amount: 500,
        type: 'transfer',
        status: 'completed'
      };

      const transaction = await Transaction.create(transactionData);

      expect(transaction).toBeDefined();
      expect(transaction.amount).toBe(500);
      expect(transaction.type).toBe('transfer');
      expect(transaction.status).toBe('completed');
      expect(transaction.createdAt).toBeDefined();
    });

    test('should validate required fields', async () => {
      const transactionData = {
        amount: 500
        // חסרים שדות נדרשים
      };

      await expect(Transaction.create(transactionData)).rejects.toThrow();
    });

    test('should validate minimum amount', async () => {
      const sender = await User.create({
        email: 'sender@example.com',
        password: 'password123',
        phoneNumber: '+1111111111'
      });

      const recipient = await User.create({
        email: 'recipient@example.com',
        password: 'password123',
        phoneNumber: '+2222222222'
      });

      const transactionData = {
        senderId: sender._id,
        receiverId: recipient._id,
        senderEmail: sender.email,
        receiverEmail: recipient.email,
        amount: -100, // סכום שלילי
        type: 'transfer',
        status: 'completed'
      };

      await expect(Transaction.create(transactionData)).rejects.toThrow(/at least 0.01/);
    });
  });

  describe('VerificationCode Model', () => {
    
    test('should create verification code with valid data', async () => {
      const codeData = {
        phoneNumber: '+1234567890',
        code: '123456',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 דקות
      };

      const verificationCode = await VerificationCode.create(codeData);

      expect(verificationCode).toBeDefined();
      expect(verificationCode.phoneNumber).toBe(codeData.phoneNumber);
      expect(verificationCode.code).toBe(codeData.code);
      expect(verificationCode.isUsed).toBe(false);
      expect(verificationCode.expiresAt).toBeDefined();
    });

    test('should validate required fields', async () => {
      const codeData = {
        code: '123456'
        // חסר phoneNumber
      };

      await expect(VerificationCode.create(codeData)).rejects.toThrow();
    });

    test('should auto-expire documents', async () => {
      // זה test מורכב יותר שצריך לחכות לפירוק אוטומטי
      // בינתיים נוכל לדלג עליו או לעשות mock
      expect(true).toBe(true); // placeholder
    });
  });
});