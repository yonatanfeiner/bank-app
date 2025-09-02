// tests/auth.test.js
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import VerificationCode from '../src/models/VerificationCode.js';

// Test database - יצור database נפרד לבדיקות
const MONGODB_URI_TEST = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/bankapp-test';

describe('Authentication Endpoints', () => {
  
  // הגדרות לפני ואחרי הבדיקות
  beforeAll(async () => {
    // חיבור למסד נתונים לבדיקות
    await mongoose.connect(MONGODB_URI_TEST);
  });

  beforeEach(async () => {
    // נקה את המסד נתונים לפני כל test
    await User.deleteMany({});
    await VerificationCode.deleteMany({});
  });

  afterAll(async () => {
    // סגור חיבור למסד נתונים
    await mongoose.connection.close();
  });

  describe('POST /api/auth/register', () => {
    
    test('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        phoneNumber: '+1234567890'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('email', userData.email);
      expect(response.body.data).toHaveProperty('isPhoneVerified', false);

      // בדוק שהמשתמש נוצר במסד הנתונים
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeTruthy();
      expect(user.accountBalance).toBeGreaterThan(0); // בדוק שיש יתרה אקראית
      
      // בדוק שנוצר קוד אימות
      const verificationCode = await VerificationCode.findOne({ phoneNumber: userData.phoneNumber });
      expect(verificationCode).toBeTruthy();
      expect(verificationCode.code).toMatch(/^\d{6}$/); // 6 ספרות
    });

    test('should reject registration with duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        phoneNumber: '+1234567890'
      };

      // יצור משתמש ראשון
      await User.create({
        ...userData,
        accountBalance: 1000,
        isPhoneVerified: true
      });

      // נסה ליצור משתמש שני עם אותו email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...userData,
          phoneNumber: '+9876543210' // טלפון שונה
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toMatch(/email.*exists/i);
    });

    test('should reject registration with invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        phoneNumber: '+1234567890'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    test('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com'
          // חסרים password ו-phoneNumber
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/auth/verify-phone', () => {
    
    test('should verify phone number with correct code', async () => {
      // הכן משתמש עם קוד אימות
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        phoneNumber: '+1234567890',
        accountBalance: 5000,
        isPhoneVerified: false
      });

      const verificationCode = await VerificationCode.create({
        phoneNumber: '+1234567890',
        code: '123456',
        userId: user._id,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 דקות
        isUsed: false
      });

      const response = await request(app)
        .post('/api/auth/verify-phone')
        .send({
          phoneNumber: '+1234567890',
          code: '123456'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('isPhoneVerified', true);

      // בדוק שהמשתמש עודכן במסד הנתונים
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.isPhoneVerified).toBe(true);

      // בדוק שהקוד סומן כמשומש
      const updatedCode = await VerificationCode.findById(verificationCode._id);
      expect(updatedCode.isUsed).toBe(true);
    });

    test('should reject invalid verification code', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        phoneNumber: '+1234567890',
        accountBalance: 5000,
        isPhoneVerified: false
      });

      await VerificationCode.create({
        phoneNumber: '+1234567890',
        code: '123456',
        userId: user._id,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        isUsed: false
      });

      const response = await request(app)
        .post('/api/auth/verify-phone')
        .send({
          phoneNumber: '+1234567890',
          code: '999999' // קוד שגוי
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toMatch(/invalid.*code/i);
    });

    test('should reject expired verification code', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        phoneNumber: '+1234567890',
        accountBalance: 5000,
        isPhoneVerified: false
      });

      await VerificationCode.create({
        phoneNumber: '+1234567890',
        code: '123456',
        userId: user._id,
        expiresAt: new Date(Date.now() - 10 * 60 * 1000), // פג תוקף לפני 10 דקות
        isUsed: false
      });

      const response = await request(app)
        .post('/api/auth/verify-phone')
        .send({
          phoneNumber: '+1234567890',
          code: '123456'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toMatch(/expired/i);
    });
  });

  describe('POST /api/auth/login', () => {
    
    test('should login with valid credentials', async () => {
      // יצור משתמש מאומת
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        phoneNumber: '+1234567890',
        accountBalance: 5000,
        isPhoneVerified: true
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('email', 'test@example.com');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    test('should reject login with incorrect password', async () => {
      await User.create({
        email: 'test@example.com',
        password: 'password123',
        phoneNumber: '+1234567890',
        accountBalance: 5000,
        isPhoneVerified: true
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toMatch(/invalid.*password/i);
    });

    test('should reject login for unverified phone', async () => {
      await User.create({
        email: 'test@example.com',
        password: 'password123',
        phoneNumber: '+1234567890',
        accountBalance: 5000,
        isPhoneVerified: false // לא מאומת
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toMatch(/verify.*phone/i);
    });

    test('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});