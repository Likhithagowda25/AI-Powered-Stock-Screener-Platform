const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const config = require('./config');
const logger = require('./config/logger');
const requestLogger = require('./middleware/requestLogger');
const { rateLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const routes = require('./routes');
const llmRoutes = require('./routes/llm.routes');
const app = express();

app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use(requestLogger);
app.use(rateLimiter);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Stock Screener API Gateway',
    version: config.apiVersion,
    environment: config.env,
  });
});

// LLM routes
app.use('/llm', llmRoutes);

// Mount routes at /api (matching frontend config)
app.use(`${config.apiPrefix}`, routes);
app.use(notFoundHandler);
app.use(errorHandler);
module.exports = app;

