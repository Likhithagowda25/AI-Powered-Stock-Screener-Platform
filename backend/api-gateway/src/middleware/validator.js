const { validationResult } = require('express-validator');
const { ApiError } = require('./errorHandler');

/**
 * Validation middleware
 * Checks validation results and throws error if invalid
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => ({
      field: err.param,
      message: err.msg,
    }));
    
    throw new ApiError(
      400,
      'Validation failed',
      'VALIDATION_ERROR'
    );
  }
  
  next();
};

module.exports = validate;
