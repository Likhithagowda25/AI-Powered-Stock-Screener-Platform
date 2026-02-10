const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authenticate');
const { validateRequest } = require('../middleware/errorHandler');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post(
  '/signup',
  authLimiter, // Rate limiting for signup
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number'),
    validateRequest,
  ],
  authController.signup
);

router.post(
  '/login',
  authLimiter, // Rate limiting for login
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    validateRequest,
  ],
  authController.login
);

// Logout endpoint - requires authentication
router.post('/logout', authenticate, authController.logout);

module.exports = router;
