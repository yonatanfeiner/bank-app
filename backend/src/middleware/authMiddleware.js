import { verifyToken } from '../utils/jwt.js';
import User from '../models/User.js';

// Middleware to protect routes that require authentication
export const authenticateToken = async (req, res, next) => {
  try {
    // Step 1: Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // cut the "Bearer " part

    // Step 2: Check if token exists in the localStorage
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    // Step 3: Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Step 4: Get user from database to make sure they still exist
    const user = await User.findById(decoded.userId); 
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Step 5: Check if phone is verified
    if (!user.isPhoneVerified) {
      return res.status(401).json({
        success: false,
        error: 'Phone number not verified'
      });
    }

    // Step 6: Add user data to request object for use in controllers
    req.user = user; // Full user object
    req.userId = user._id; // Just the ID for convenience

    // Step 7: Continue to the next middleware/controller
    next();

  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};