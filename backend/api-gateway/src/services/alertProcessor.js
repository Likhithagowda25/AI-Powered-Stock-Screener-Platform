/**
 * Alert Processor Service
 * Background job to evaluate alert conditions against market data
 */

const db = require('../config/database');
const logger = require('../config/logger');
const alertService = require('./alertService');
const companyService = require('./companyService');
const notificationService = require('./notificationService');

class AlertProcessor {
  constructor() {
    this.isRunning = false;
    this.checkInterval = 60000; // Check every 1 minute
    this.timer = null;
  }

  /**
   * Start the alert processor
   */
  start() {
    if (this.isRunning) {
      logger.warn('Alert processor is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting Alert Processor...');
    
    // Initial check
    this.processAlerts();

    // Schedule periodic checks
    this.timer = setInterval(() => {
      this.processAlerts();
    }, this.checkInterval);
  }

  /**
   * Stop the alert processor
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    logger.info('Alert Processor stopped');
  }

  /**
   * Main processing loop
   */
  async processAlerts() {
    try {
      logger.debug('Processing alerts...');
      
      // 1. Fetch active alerts
      // We need a method to get ALL active alerts, not just for a user
      // Adding a direct DB query here for efficiency or we could extend alertService
      const query = `
        SELECT * FROM alert_subscriptions 
        WHERE is_active = true 
        AND (last_triggered IS NULL OR last_triggered < NOW() - INTERVAL '1 day')
      `; // Simple rate limiting: max 1 trigger per day per alert
      
      const result = await db.query(query);
      const alerts = result.rows;

      if (alerts.length === 0) {
        return;
      }

      logger.info(`Evaluating ${alerts.length} active alerts`);

      // 2. Group by ticker to minimize data fetching
      const alertsByTicker = alerts.reduce((acc, alert) => {
        if (alert.ticker) {
          if (!acc[alert.ticker]) acc[alert.ticker] = [];
          acc[alert.ticker].push(alert);
        }
        return acc;
      }, {});

      // 3. Process each ticker
      for (const [ticker, tickerAlerts] of Object.entries(alertsByTicker)) {
        try {
          // Fetch real-time data AND metadata
          const [quote, metadata, fundamentals] = await Promise.all([
            companyService.getRealTimeQuote(ticker).catch(e => null),
            companyService.getCompanyMetadata(ticker).catch(e => null),
            companyService.getLatestFundamentals(ticker).catch(e => null)
          ]);
          
          if (!quote && !metadata && !fundamentals) {
            logger.warn(`No data found for ${ticker}`);
            continue;
          }

          // Evaluate each alert for this ticker
          for (const alert of tickerAlerts) {
            await this.evaluateAlert(alert, quote, metadata, fundamentals);
          }
        } catch (err) {
          logger.error(`Error processing ticker ${ticker}`, { error: err.message });
        }
      }

    } catch (error) {
      logger.error('Error in Alert Processor loop', { error: error.message });
    }
  }

  /**
   * Evaluate a single alert against market data
   */
  async evaluateAlert(alert, quote, metadata, fundamentals) {
    try {
      let triggered = false;
      let message = '';
      const condition = alert.condition_json || {};

      switch (alert.alert_type) {
        case 'price_threshold':
        case 'price_below_buy_price':
          if (quote) {
            triggered = this.checkPriceThreshold(condition, quote.price);
            message = `Price reached ${quote.price}`;
          }
          break;
          
        case 'price_vs_analyst':
           // Skipping (Data not available)
           break;

        case 'earnings_upcoming':
          if (metadata && metadata.next_earnings_date) {
            triggered = this.checkEarningsUpcoming(condition, metadata.next_earnings_date);
            message = `Earnings report coming up on ${new Date(metadata.next_earnings_date).toLocaleDateString()}`;
          }
          break;

        case 'buyback_announced':
          if (metadata && metadata.last_buyback_date) {
            triggered = this.checkBuybackAnnounced(condition, metadata.last_buyback_date);
            message = `Buyback announced on ${new Date(metadata.last_buyback_date).toLocaleDateString()}`;
          }
          break;
          
        case 'fundamental_condition':
           if (fundamentals) {
             triggered = this.checkFundamentalCondition(condition, fundamentals);
             const metricName = condition.fundamental_metric || 'Metric';
             const actualVal = fundamentals[condition.fundamental_metric];
             message = `${metricName.toUpperCase()} is ${actualVal} (${condition.fundamental_operator} ${condition.fundamental_value})`;
           }
           break;
      }

      // If triggered, create notification and update state
      if (triggered) {
        // Use quote data if available, otherwise just basic info
        const dataJson = quote ? { price: quote.price, change: quote.changePercent } : {};
        if (fundamentals) dataJson.fundamentals = fundamentals;
        
        await this.triggerAlert(alert, message, dataJson);
      }

    } catch (err) {
      logger.error(`Error evaluating alert ${alert.id}`, { error: err.message });
    }
  }

  checkPriceThreshold(condition, currentPrice) {
    const { operator, value, threshold_percent } = condition;
    
    // Handle "Price Below Buy Price" logic
    if (threshold_percent && !value) {
        // MVP simplification: this logic requires a reference price (avg buy price)
        // Ideally this should be passed in or looked up. 
        // For now, if no value is present, we can't evaluate.
        return false; 
    }

    if (!value) return false;

    switch (operator) {
      case '>': return currentPrice > value;
      case '>=': return currentPrice >= value;
      case '<': return currentPrice < value;
      case '<=': return currentPrice <= value;
      case '=': return currentPrice === value;
      default: return false;
    }
  }

  checkEarningsUpcoming(condition, nextEarningsDate) {
    if (!condition.days_before) return false;
    
    const today = new Date();
    const targetDate = new Date(nextEarningsDate);
    
    // Calculate difference in days
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Trigger if the event is in the future AND within the window (e.g. 0 to 3 days close)
    return diffDays >= 0 && diffDays <= condition.days_before;
  }

  checkBuybackAnnounced(condition, lastBuybackDate) {
    if (!condition.days_lookback) return false;

    const today = new Date();
    const eventDate = new Date(lastBuybackDate);
    
    // Calculate difference in days
    const diffTime = today - eventDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Trigger if the event happened in the past AND within the lookback window
    return diffDays >= 0 && diffDays <= condition.days_lookback;
  }

  checkFundamentalCondition(condition, fundamentals) {
    const { fundamental_metric, fundamental_operator, fundamental_value } = condition;
    
    // Safety check: if no metric or value provided
    if (!fundamental_metric || !fundamental_value || !fundamentals) return false;

    // Get the actual value from the fetched fundamentals object
    // Map 'pe_ratio' -> fundamentals.pe_ratio, etc.
    const actualValue = Number(fundamentals[fundamental_metric]);

    // If actual value is invalid (NaN or null), can't compare
    if (actualValue === null || isNaN(actualValue)) return false;

    const targetValue = Number(fundamental_value);

    switch (fundamental_operator) {
      case 'above': return actualValue > targetValue;
      case 'below': return actualValue < targetValue;
      case 'equals': return actualValue === targetValue; // rare for floats
      default: return false;
    }
  }

  /**
   * Trigger the alert actions
   */
  async triggerAlert(alert, triggerMessage, quote) {
    logger.info(`Triggering alert ${alert.id} for user ${alert.user_id}`);

    // 1. Create Notification
    await notificationService.createNotification(alert.user_id, {
      alert_id: alert.id,
      ticker: alert.ticker,
      notification_type: 'alert_triggered',
      title: `Alert: ${alert.alert_name}`,
      message: `${alert.ticker}: ${triggerMessage}`,
      data_json: { price: quote.price, change: quote.changePercent }
    });

    // 2. Update Alert State (last_triggered)
    const updateQuery = `
      UPDATE alert_subscriptions 
      SET last_triggered = NOW(), 
          trigger_count = trigger_count + 1,
          last_evaluated = NOW()
      WHERE id = $1
    `;
    await db.query(updateQuery, [alert.id]);
  }
}

module.exports = new AlertProcessor();
