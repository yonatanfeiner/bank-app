import mongoose from 'mongoose';

// הגדר timeout ארוך יותר עבור בדיקות מסד נתונים
jest.setTimeout(30000);

// Global test database URI
global.MONGODB_URI_TEST = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/bankapp-test';

// Mock console.log during tests to reduce noise (optional)
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    log: jest.fn(), // Mock console.log
    info: jest.fn(), // Mock console.info
    warn: console.warn, // Keep warnings
    error: console.error, // Keep errors
  };
}

// Global setup before all tests
beforeAll(async () => {
  // בדוק שיש connection string לטסטים
  if (!global.MONGODB_URI_TEST.includes('test')) {
    throw new Error('Test database URI must contain "test" for safety');
  }
});

// ============================================================================

