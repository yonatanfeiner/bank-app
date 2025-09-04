import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

// Get user dashboard data
export const getDashboard = async (req, res) => {
  try {
    // req.user is available because of authenticateToken middleware
    const userId = req.userId; // We'll get this from the middleware

    // Get user data from database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get recent transactions (last 10) - both sent and received
    const recentTransactions = await Transaction.find({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    })
    .sort({ createdAt: -1 }) // Newest first (-1 = descending)
    .limit(10)
    .lean(); // .lean() returns plain JavaScript objects (faster)

    // Get total transaction count for this user
    const totalTransactions = await Transaction.countDocuments({
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ]
    });

    // Format transactions for display (as per requirements)
    const formattedTransactions = recentTransactions.map(transaction => {
      if (transaction.senderId.toString() === userId.toString()) {
        // User sent money (show with '-' sign as per requirements)
        return {
          id: transaction._id,
          type: 'sent',
          amount: -transaction.amount, // Negative for sent
          otherParty: transaction.receiverEmail,
          description: `Sent to ${transaction.receiverEmail}`,
          createdAt: transaction.createdAt,
          status: transaction.status
        };
      } else {
        // User received money (show with '+' sign as per requirements)
        return {
          id: transaction._id,
          type: 'received',
          amount: +transaction.amount, // Positive for received
          otherParty: transaction.senderEmail,
          description: `Received from ${transaction.senderEmail}`,
          createdAt: transaction.createdAt,
          status: transaction.status
        };
      }
    });

    // Prepare user response (password is already excluded by User model)
    const userResponse = {
      id: user._id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      balance: user.accountBalance,
      isPhoneVerified: user.isPhoneVerified,
      createdAt: user.createdAt,
      name: user.name
    };

    res.status(200).json({
      success: true,
      data: {
        user: userResponse,
        recentTransactions: formattedTransactions,
        totalTransactions
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching dashboard data'
    });
  }
};

// Transfer money to another user
export const transferMoney = async (req, res) => {
  try {
    const { recipientEmail, amount } = req.body;
    const senderId = req.userId;

    // Validation
    if (!recipientEmail || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Recipient email and amount are required'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be greater than 0'
      });
    }

    // Get sender
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({
        success: false,
        error: 'Sender not found'
      });
    }

    // Check if sender has enough balance
    if (sender.accountBalance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      });
    }

    // Find recipient by email
    const recipient = await User.findOne({ 
      email: recipientEmail.toLowerCase(),
      isPhoneVerified: true 
    });
    
    if (!recipient) {
      return res.status(404).json({
        success: false,
        error: 'Recipient not found or not verified'
      });
    }

    // Check if sender is not trying to send to themselves
    if (sender._id.toString() === recipient._id.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot transfer money to yourself'
      });
    }

    // Perform the transaction (this should be atomic in production)
    // In a real bank app, you'd use MongoDB transactions for this
    sender.accountBalance -= amount;
    recipient.accountBalance += amount;

    // Save both users
    await sender.save();
    await recipient.save();

    // Create transaction record
    const transaction = new Transaction({
      senderId: sender._id,
      receiverId: recipient._id,
      senderEmail: sender.email,
      receiverEmail: recipient.email,
      amount,
      type: 'transfer',
      status: 'completed'
    });

    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Transfer completed successfully',
      data: {
        transaction: {
          id: transaction._id,
          amount,
          recipient: recipient.email,
          timestamp: transaction.createdAt
        },
        newBalance: sender.accountBalance
      }
    });

    // Emit real-time updates to all connected clients (could be room-scoped)
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('transactions:new', {
          senderId: sender._id.toString(),
          receiverId: recipient._id.toString(),
          amount,
          createdAt: transaction.createdAt,
          senderEmail: sender.email,
          receiverEmail: recipient.email
        });
        io.emit('balance:updated', {
          userId: sender._id.toString(),
          newBalance: sender.accountBalance
        });
        io.emit('balance:updated', {
          userId: recipient._id.toString(),
          newBalance: recipient.accountBalance
        });
      }
    } catch {}

  } catch (error) {
    console.error('Transfer money error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during money transfer'
    });
  }
};

export const editProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, phoneNumber, email } = req.body;
    if (name) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Name must be at least 2 characters long'
        });
      }
    }
    if (phoneNumber) {
      const phoneRegex = /^\+?[0-9]\d{1,14}$/; // Simple E.164 format check
      if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid phone number format'
        });
      }
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
      }
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Update fields if provided
    if (name) user.name = name.trim();
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (email) user.email = email.toLowerCase();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          phoneNumber: user.phoneNumber,
          name: user.name,
          balance: user.accountBalance,
          isPhoneVerified: user.isPhoneVerified,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Edit profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while editing profile'
    });
  }
}