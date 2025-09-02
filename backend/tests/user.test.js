// tests/user.test.js
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Transaction from '../src/models/Transaction.js';
import { generateToken } from '../src/utils/jwt.js';

const MONGODB_URI_TEST = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/bankapp-test';

describe('User Endpoints', () => {
  
  beforeAll(async () => {
    await mongoose.connect(MONGODB_URI_TEST);
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Transaction.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('GET /api/users/dashboard', () => {
    
    test('should get dashboard data for authenticated user', async () => {
      // Create User
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        phoneNumber: '+1234567890',
        accountBalance: 5000,
        isPhoneVerified: true
      });

      // Create few transactions
      await Transaction.create({
        senderId: user._id,
        receiverId: new mongoose.Types.ObjectId(),
        senderEmail: user.email,
        receiverEmail: 'recipient@example.com',
        amount: 100,
        type: 'transfer',
        status: 'completed'
      });

      await Transaction.create({
        senderId: new mongoose.Types.ObjectId(),
        receiverId: user._id,
        senderEmail: 'sender@example.com',
        receiverEmail: user.email,
        amount: 200,
        type: 'transfer',
        status: 'completed'
      });

      // Create Tokens for authentication
      const token = generateToken(user._id);

      const response = await request(app)
        .get('/api/users/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('recentTransactions');
      expect(response.body.data).toHaveProperty('totalTransactions');

      // Check user data
      expect(response.body.data.user).toHaveProperty('email', user.email);
      expect(response.body.data.user).toHaveProperty('balance', 5000);
      expect(response.body.data.user).not.toHaveProperty('password');

      // Check transactions
      expect(response.body.data.recentTransactions).toHaveLength(2);
      expect(response.body.data.totalTransactions).toBe(2);

      // 
      const sentTransaction = response.body.data.recentTransactions.find(t => t.type === 'sent');
      const receivedTransaction = response.body.data.recentTransactions.find(t => t.type === 'received');
      
      expect(sentTransaction.amount).toBe(-100); // negative for send
      expect(receivedTransaction.amount).toBe(200); // positive for receive
    });

    test('should reject unauthorized request', async () => {
      const response = await request(app)
        .get('/api/users/dashboard')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toMatch(/token.*required/i);
    });

    test('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/users/dashboard')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toMatch(/invalid.*token/i);
    });
  });

  describe('POST /api/users/transfer (if implemented)', () => {
    
    test('should transfer money successfully', async () => {
      // יצור שני משתמשים
      const sender = await User.create({
        email: 'sender@example.com',
        password: 'password123',
        phoneNumber: '+1111111111',
        accountBalance: 1000,
        isPhoneVerified: true
      });

      const recipient = await User.create({
        email: 'recipient@example.com',
        password: 'password123',
        phoneNumber: '+2222222222',
        accountBalance: 500,
        isPhoneVerified: true
      });

      const token = generateToken(sender._id);

      const response = await request(app)
        .post('/api/users/transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientEmail: 'recipient@example.com',
          amount: 200
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('newBalance', 800); // 1000 - 200

    // Check updated recipient 
      const updatedSender = await User.findById(sender._id);
      const updatedRecipient = await User.findById(recipient._id);

      expect(updatedSender.accountBalance).toBe(800);
      expect(updatedRecipient.accountBalance).toBe(700); // 500 + 200

      // Check transaction record
      const transaction = await Transaction.findOne({
        senderId: sender._id,
        receiverId: recipient._id
      });
      expect(transaction).toBeTruthy();
      expect(transaction.amount).toBe(200);
    });

    test('should reject transfer with insufficient funds', async () => {
      const sender = await User.create({
        email: 'sender@example.com',
        password: 'password123',
        phoneNumber: '+1111111111',
        accountBalance: 100, // low balance
        isPhoneVerified: true
      });

      const recipient = await User.create({
        email: 'recipient@example.com',
        password: 'password123',
        phoneNumber: '+2222222222',
        accountBalance: 500,
        isPhoneVerified: true
      });

      const token = generateToken(sender._id);

      const response = await request(app)
        .post('/api/users/transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientEmail: 'recipient@example.com',
          amount: 200 // more than the balance
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toMatch(/insufficient.*balance/i);
    });

    test('should reject transfer to non-existent recipient', async () => {
      const sender = await User.create({
        email: 'sender@example.com',
        password: 'password123',
        phoneNumber: '+1111111111',
        accountBalance: 1000,
        isPhoneVerified: true
      });

      const token = generateToken(sender._id);

      const response = await request(app)
        .post('/api/users/transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientEmail: 'nonexistent@example.com',
          amount: 200
        })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toMatch(/recipient.*not found/i);
    });

    test('should reject self-transfer', async () => {
      const user = await User.create({
        email: 'user@example.com',
        password: 'password123',
        phoneNumber: '+1111111111',
        accountBalance: 1000,
        isPhoneVerified: true
      });

      const token = generateToken(user._id);

      const response = await request(app)
        .post('/api/users/transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientEmail: 'user@example.com', // same email
          amount: 200
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toMatch(/cannot.*transfer.*yourself/i);
    });
  });
});