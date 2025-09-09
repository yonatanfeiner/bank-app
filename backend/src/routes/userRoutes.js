import express from 'express';
import { getDashboard, transferMoney } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { editProfile } from '../controllers/userController.js';

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

/**
 * @swagger
 * /api/users/edit-profile:
 *   patch:
 *     summary: Edit user profile
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "newemail@example.com"
 *               phoneNumber:
 *                 type: string
 *                 example: "+1234567890"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "newPassword123"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Profile updated successfully"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *                     balance:
 *                       type: number
 *                     isPhoneVerified:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request (invalid data)
 *       401:
 *         description: Unauthorized - invalid or missing token
 */
router.patch('/edit-profile', authenticateToken, editProfile);

export default router;