import User from '../models/User.js';
import VerificationCode from '../models/VerificationCode.js';
import { generateToken } from '../utils/jwt.js';
import { sendSMS } from '../services/smsService.js'; 

// Generate random 6-digit code
const generateSMSCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate random account balance for new users
const generateAccountBalance = () => {
  return Math.floor(Math.random() * 10000) + 1000; // Random balance between 1000-11000
};

export const register = async (req, res) => {
  try {
    const { email, password, phoneNumber, name } = req.body; // Destructure from req.body

    // Basic validation (Mongoose will also validate)
    if (!email || !password || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, phone number and name are required'
      });
    }
    
    // Check if user already exists with this email
    const existingUserByEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingUserByEmail) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Check if user already exists with this phone number
    const existingUserByPhone = await User.findOne({ phoneNumber });
    if (existingUserByPhone) {
      return res.status(400).json({
        success: false,
        error: 'User with this phone number already exists'
      });
    }

    // Generate SMS verification code
    const smsCode = generateSMSCode();
    
    // Create user but don't verify phone yet
    const user = new User({
      email: email.toLowerCase(),
      password, // Will be hashed automatically by middleware
      phoneNumber,
      accountBalance: generateAccountBalance(),
      isPhoneVerified: false,
      name
    });

    // Save user to database
    await user.save();

    // Create verification code record
    const verificationCode = new VerificationCode({
      phoneNumber,
      code: smsCode,
      userId: user._id,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
    });

    await verificationCode.save();

    // Send SMS 
    try {
      await sendSMS(phoneNumber, `Your bank verification code is: ${smsCode}`);
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
      // Don't fail registration if SMS fails, but log it
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your phone number.',
      data: {
        userId: user._id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        isPhoneVerified: user.isPhoneVerified
      }
    });

  } catch (error) {
    console.error('Registration error:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: errors.join(', ')
      });
    }

    // Handle duplicate key errors (unique indexes)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        error: `User with this ${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error during registration'
    });
  }
};

export const verifyPhone = async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and verification code are required'
      });
    }

    // Find the verification code
    const verificationRecord = await VerificationCode.findOne({
      phoneNumber,
      code,
      isUsed: false,
      expiresAt: { $gt: new Date() } // Not expired, $gt means greater than
    });

    if (!verificationRecord) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification code'
      });
    }

    // Find and update the user
    const user = await User.findById(verificationRecord.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update user as verified
    user.isPhoneVerified = true;
    await user.save();

    // Mark verification code as used
    verificationRecord.isUsed = true;
    await verificationRecord.save();

    // Generate JWT token for automatic login
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Phone number verified successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          phoneNumber: user.phoneNumber,
          accountBalance: user.accountBalance,
          isPhoneVerified: user.isPhoneVerified
        },
        token
      }
    });

    // Emit socket event for phone verification
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('auth:phoneVerified', { userId: user._id.toString(), email: user.email });
      }
    } catch {}

  } catch (error) {
    console.error('Phone verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during phone verification'
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user by email (including password for comparison)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check if phone is verified
    if (!user.isPhoneVerified) {
      return res.status(401).json({
        success: false,
        error: 'Please verify your phone number before logging in'
      });
    }

    // Compare password using the instance method we created
    const isPasswordMatch = await user.comparePassword(password);
    
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Update last login (optional)
    user.updatedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          phoneNumber: user.phoneNumber,
          accountBalance: user.accountBalance,
          isPhoneVerified: user.isPhoneVerified
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during login'
    });
  }
};

export const logout = async (req, res) => {
  try {
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during logout'
    });
  }
};