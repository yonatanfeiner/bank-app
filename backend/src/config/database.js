import mongoose from 'mongoose';

const connectDatabase = async () => {
  try {
    // Debug the MongoDB URI
    console.log('🔍 Database Connection Debug:');
    console.log('  - MONGODB_URI exists:', !!process.env.MONGODB_URI);
    console.log('  - MONGODB_URI value:', process.env.MONGODB_URI ? 'Set (hidden for security)' : 'undefined');
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Modern options (deprecated options removed)
      dbName: 'bankapp', // Explicitly set database name
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

export default connectDatabase;