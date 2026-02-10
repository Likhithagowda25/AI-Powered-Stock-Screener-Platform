const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const logger = require('../config/logger');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const config = require('../config');
const tokenBlacklist = require('../services/tokenBlacklist');


const signup = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required', 'MISSING_FIELDS');
  }

  // Validate email format
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!emailRegex.test(email)) {
    throw new ApiError(400, 'Invalid email format', 'INVALID_EMAIL');
  }

  // Validate password strength
  if (password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters long', 'WEAK_PASSWORD');
  }

  try {
    // Check if user already exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    
    if (existingUser.rows.length > 0) {
      throw new ApiError(409, 'Account already exists. Please log in.', 'USER_EXISTS');
    }

    // Hash password with bcrypt (auto-generates salt)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user into database
    const result = await db.query(
      `INSERT INTO users (email, password_hash, created_at, updated_at) 
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       RETURNING id, email, created_at`,
      [email.toLowerCase(), passwordHash]
    );

    const user = result.rows[0];

    logger.info('User registered successfully', { 
      userId: user.id, 
      email: user.email,
      traceId: req.traceId 
    });

    // Generate JWT token for immediate login
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(
      tokenPayload,
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.status(201).json({
      success: true,
      message: 'Signup successful! Please log in to continue.',
      data: {
        token,
        userId: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    
    logger.error('Signup error', { error: error.message, traceId: req.traceId });
    throw new ApiError(500, 'Failed to create user account', 'SIGNUP_ERROR');
  }
});

/**
 * User Login
 * POST /api/v1/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    throw new ApiError(400, 'Please provide valid email and password.', 'MISSING_FIELDS');
  }

  // Validate email format
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!emailRegex.test(email)) {
    throw new ApiError(400, 'Please provide a valid email address.', 'INVALID_EMAIL_FORMAT');
  }

  try {
    // Find user by email
    const result = await db.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new ApiError(401, 'Account not found. Please sign up first.', 'USER_NOT_FOUND');
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      throw new ApiError(401, 'Incorrect password. Please try again.', 'INVALID_PASSWORD');
    }

    // Update last_login timestamp
    await db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(
      tokenPayload,
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    logger.info('User logged in successfully', { 
      userId: user.id, 
      email: user.email,
      traceId: req.traceId 
    });

    res.status(200).json({
      success: true,
      message: 'Login successful. Welcome back!',
      data: {
        token,
        userId: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    
    logger.error('Login error', { error: error.message, traceId: req.traceId });
    throw new ApiError(500, 'Login failed', 'LOGIN_ERROR');
  }
});

/**
 * User Logout
 * POST /api/v1/auth/logout
 * Requires authentication
 */
const logout = asyncHandler(async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'No token provided', 'NO_TOKEN');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Decode token to get expiration time
    const decoded = jwt.decode(token);
    
    if (!decoded || !decoded.exp) {
      throw new ApiError(400, 'Invalid token format', 'INVALID_TOKEN');
    }

    // Add token to blacklist with its expiration time
    tokenBlacklist.add(token, decoded.exp);

    logger.info('User logged out successfully', {
      userId: req.user.userId,
      email: req.user.email,
      traceId: req.traceId
    });

    res.status(200).json({
      success: true,
      message: 'You have been logged out successfully.',
      data: null
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;

    logger.error('Logout error', { error: error.message, traceId: req.traceId });
    throw new ApiError(500, 'Logout failed', 'LOGOUT_ERROR');
  }
});

module.exports = {
  signup,
  login,
  logout,
};
