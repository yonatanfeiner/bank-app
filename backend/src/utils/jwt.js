// src/utils/jwt.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-key-not-for-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate JWT token
export const generateToken = (userId) => {
  try {
    const payload = {
      userId: userId.toString(), // MongoDB ObjectId to string
      iat: Math.floor(Date.now() / 1000), // Issued at
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    return token;
  } catch (error) {
    console.error('Token generation error:', error);
    throw new Error('Failed to generate token');
  }
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error('Token verification error:', error);
    return null; // Return null for invalid tokens
  }
};

// Decode token without verification (useful for debugging)
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    console.error('Token decode error:', error);
    return null;
  }
};