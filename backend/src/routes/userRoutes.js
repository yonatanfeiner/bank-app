import express from 'express';
import { getDashboard, transferMoney } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/users/dashboard:
 *   get:
 *     summary: Get user dashboard data
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     balance:
 *                       type: number
 *                 recentTransactions:
 *                   type: array
 *                 totalTransactions:
 *                   type: number
 *       401:
 *         description: Unauthorized - invalid or missing token
 */
router.get('/dashboard', authenticateToken, getDashboard);

/**
 * @swagger
 * /api/users/transfer:
 *   post:
 *     summary: Transfer money to another user
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipientEmail
 *               - amount
 *             properties:
 *               recipientEmail:
 *                 type: string
 *                 format: email
 *                 example: "jane@example.com"
 *               amount:
 *                 type: number
 *                 example: 100
 *     responses:
 *       200:
 *         description: Transfer successful
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/transfer', authenticateToken, transferMoney);

export default router;