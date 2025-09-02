export default {
  // Test environment
  testEnvironment: 'node',
  
  // Transform files
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  
  // Test files patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.test.js'
  ],
  
  // Files to ignore
  testIgnore: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Coverage settings
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/**', // אל תבדוק קבצי הגדרות
    '!src/models/**', // מודלים הם בעיקר schema definitions
    '!**/node_modules/**'
  ],
  
  // Coverage thresholds (optional - מגדיר מינימום coverage)
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  // Verbose output
  verbose: true,
  
  // Clear mocks after each test
  clearMocks: true,
  
  // Exit on first test failure (optional)
  bail: false
};