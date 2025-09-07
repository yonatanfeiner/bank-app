import dotenv from 'dotenv';

// Load environment variables FIRST - before any other imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerOptions from './config/swagger.js'
import connectDatabase from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB when app initializes
connectDatabase();

// Middleware
app.use(cors());
app.use(express.json());

// Creating JSON object in format OpenAPI Spec (standard REST API description)
const swaggerSpec = swaggerJsdoc(swaggerOptions);
// Connect swagger to the server
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Basic routes
app.get('/', (req, res) => {
  res.json({
    message: 'Bank App API is running!',
    documentation: `http://localhost:${PORT}/api-docs`
  });
});

// API Routes
// any request which start with the following route will be handled in the relevant file.
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Database health check route 
app.get('/api/health', async (req, res) => {
  try {
    // Import mongoose to check connection status
    const mongoose = (await import('mongoose')).default;
    
    const dbStatus = {
      database: {
        status: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        host: mongoose.connection.host || 'Not connected',
        name: mongoose.connection.name || 'Not connected',
        readyState: mongoose.connection.readyState
      }
    };

    res.json({
      message: 'Bank App Health Check',
      timestamp: new Date().toISOString(),
      ...dbStatus
    });
  } catch (error) {
    res.status(500).json({
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Debug route to check what's loaded
app.get('/api/debug', (req, res) => {
  res.json({
    message: 'Debug info',
    availableRoutes: [
      'GET /',
      'GET /api/debug',
      'GET /api/health', 
      'POST /api/auth/register',
      'POST /api/auth/verify-phone',
      'POST /api/auth/login',
      'POST /api/auth/logout',
      'GET /api/users/dashboard',
      'POST /api/users/transfer',
      'PATCH /api/users/edit-profile'
    ],
    swaggerInfo: 'Check /api-docs for documentation',
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      mongoUri: process.env.MONGODB_URI ? 'Set' : 'Not set'
    }
  });
});

// Global error handler for async routes
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: errors
    });
  }
  
  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(400).json({
      success: false,
      error: `Duplicate ${field}`,
      message: `A user with this ${field} already exists`
    });
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
  
  // Default error
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

export default app;