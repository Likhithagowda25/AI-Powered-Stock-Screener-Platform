"""
Alert Engine - Evaluates alert conditions and triggers notifications
Supports multiple alert types:
- Price below buy price by percentage
- Price vs analyst targets
- Upcoming earnings
- Recent buyback announcements
- Fundamental-based conditions
"""

import os
import sys
import logging
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import json

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment
load_dotenv("../../api-gateway/.env")

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5433"),
    "dbname": os.getenv("DB_NAME", "stock_screener"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD"),
}


def get_db_connection():
    """Create database connection"""
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)


class AlertEngine:
    """Main alert evaluation engine"""
    
    def __init__(self):
        self.conn = get_db_connection()
    
    def __del__(self):
        if hasattr(self, 'conn'):
            self.conn.close()
    
    def get_active_alerts(self):
        """Fetch all active alert subscriptions"""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT 
                id, user_id, ticker, alert_type, alert_name,
                condition_json, frequency, last_triggered, last_evaluated
            FROM alert_subscriptions
            WHERE is_active = TRUE
            ORDER BY id
        """)
        alerts = cursor.fetchall()
        cursor.close()
        return alerts
    
    def evaluate_alert(self, alert):
        """Evaluate a single alert and return trigger status"""
        alert_type = alert['alert_type']
        ticker = alert['ticker']
        condition = alert['condition_json']
        
        try:
            if alert_type == 'price_below_buy_price':
                return self.check_price_below_buy_price(alert)
            elif alert_type == 'price_vs_analyst':
                return self.check_price_vs_analyst(ticker, condition)
            elif alert_type == 'earnings_upcoming':
                return self.check_earnings_upcoming(ticker, condition)
            elif alert_type == 'buyback_announced':
                return self.check_buyback_announced(ticker, condition)
            elif alert_type == 'fundamental_condition':
                return self.check_fundamental_condition(ticker, condition)
            else:
                logger.warning(f"Unknown alert type: {alert_type}")
                return False, None
                
        except Exception as e:
            logger.error(f"Error evaluating alert {alert['id']}: {e}")
            return False, None
    
    def check_price_below_buy_price(self, alert):
        """Check if current price is below buy price by threshold percent"""
        user_id = alert['user_id']
        ticker = alert['ticker']
        condition = alert['condition_json']
        threshold_percent = condition.get('threshold_percent', 10)
        
        cursor = self.conn.cursor()
        
        # Get portfolio holding
        cursor.execute("""
            SELECT average_buy_price
            FROM portfolio_holdings ph
            JOIN user_portfolios up ON ph.portfolio_id = up.portfolio_id
            WHERE up.user_id = %s AND ph.ticker = %s
        """, (user_id, ticker))
        
        portfolio = cursor.fetchone()
        if not portfolio or not portfolio['average_buy_price']:
            cursor.close()
            return False, None
        
        buy_price = float(portfolio['average_buy_price'])
        
        # Get current price
        cursor.execute("""
            SELECT close
            FROM price_history
            WHERE ticker = %s
            ORDER BY date DESC
            LIMIT 1
        """, (ticker,))
        
        price_data = cursor.fetchone()
        cursor.close()
        
        if not price_data:
            return False, None
        
        current_price = float(price_data['close'])
        price_drop_percent = ((buy_price - current_price) / buy_price) * 100
        
        if price_drop_percent >= threshold_percent:
            message = (f"{ticker} is down {price_drop_percent:.2f}% from your buy price. "
                      f"Current: ₹{current_price:.2f}, Buy Price: ₹{buy_price:.2f}")
            data = {
                'current_price': current_price,
                'buy_price': buy_price,
                'drop_percent': price_drop_percent,
                'threshold': threshold_percent
            }
            return True, {'message': message, 'data': data}
        
        return False, None
    
    def check_price_vs_analyst(self, ticker, condition):
        """Check price vs analyst targets"""
        comparison = condition.get('comparison', 'below_low_target')
        
        cursor = self.conn.cursor()
        
        # Get latest analyst targets
        cursor.execute("""
            SELECT price_target_low, price_target_avg, price_target_high
            FROM analyst_estimates
            WHERE ticker = %s
            ORDER BY estimate_date DESC
            LIMIT 1
        """, (ticker,))
        
        analyst = cursor.fetchone()
        
        if not analyst:
            cursor.close()
            return False, None
        
        # Get current price
        cursor.execute("""
            SELECT close
            FROM price_history
            WHERE ticker = %s
            ORDER BY date DESC
            LIMIT 1
        """, (ticker,))
        
        price_data = cursor.fetchone()
        cursor.close()
        
        if not price_data:
            return False, None
        
        current_price = float(price_data['close'])
        
        triggered = False
        message = ""
        
        if comparison == 'below_low_target' and analyst['price_target_low']:
            target = float(analyst['price_target_low'])
            if current_price < target:
                triggered = True
                upside = ((target - current_price) / current_price) * 100
                message = (f"{ticker} is trading below analyst low target. "
                          f"Current: ₹{current_price:.2f}, Target: ₹{target:.2f} "
                          f"(Upside: {upside:.2f}%)")
        
        elif comparison == 'below_avg_target' and analyst['price_target_avg']:
            target = float(analyst['price_target_avg'])
            if current_price < target:
                triggered = True
                upside = ((target - current_price) / current_price) * 100
                message = (f"{ticker} is trading below analyst average target. "
                          f"Current: ₹{current_price:.2f}, Target: ₹{target:.2f} "
                          f"(Upside: {upside:.2f}%)")
        
        if triggered:
            data = {
                'current_price': current_price,
                'target_low': float(analyst['price_target_low']) if analyst['price_target_low'] else None,
                'target_avg': float(analyst['price_target_avg']) if analyst['price_target_avg'] else None,
                'target_high': float(analyst['price_target_high']) if analyst['price_target_high'] else None,
            }
            return True, {'message': message, 'data': data}
        
        return False, None
    
    def check_earnings_upcoming(self, ticker, condition):
        """Check if earnings are upcoming within specified days"""
        days_before = condition.get('days_before', 30)
        
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT earnings_date, fiscal_quarter, fiscal_year, estimate_eps
            FROM earnings_calendar
            WHERE ticker = %s
              AND earnings_date >= CURRENT_DATE
              AND earnings_date <= CURRENT_DATE + INTERVAL '%s days'
              AND status = 'scheduled'
            ORDER BY earnings_date ASC
            LIMIT 1
        """, (ticker, days_before))
        
        earnings = cursor.fetchone()
        cursor.close()
        
        if earnings:
            days_until = (earnings['earnings_date'] - datetime.now().date()).days
            message = (f"{ticker} earnings scheduled in {days_until} days "
                      f"({earnings['earnings_date']}). "
                      f"Quarter: {earnings['fiscal_quarter']} {earnings['fiscal_year']}")
            
            data = {
                'earnings_date': str(earnings['earnings_date']),
                'days_until': days_until,
                'fiscal_quarter': earnings['fiscal_quarter'],
                'fiscal_year': earnings['fiscal_year'],
                'estimate_eps': float(earnings['estimate_eps']) if earnings['estimate_eps'] else None
            }
            return True, {'message': message, 'data': data}
        
        return False, None
    
    def check_buyback_announced(self, ticker, condition):
        """Check if buyback was recently announced"""
        days_lookback = condition.get('days_lookback', 90)
        
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT announcement_date, amount, buyback_percentage, status
            FROM buybacks
            WHERE ticker = %s
              AND announcement_date >= CURRENT_DATE - INTERVAL '%s days'
            ORDER BY announcement_date DESC
            LIMIT 1
        """, (ticker, days_lookback))
        
        buyback = cursor.fetchone()
        cursor.close()
        
        if buyback:
            days_ago = (datetime.now().date() - buyback['announcement_date']).days
            message = (f"{ticker} announced buyback {days_ago} days ago. "
                      f"Amount: ₹{buyback['amount']:,.0f}, "
                      f"Percentage: {buyback['buyback_percentage']}%, "
                      f"Status: {buyback['status']}")
            
            data = {
                'announcement_date': str(buyback['announcement_date']),
                'days_ago': days_ago,
                'amount': float(buyback['amount']) if buyback['amount'] else None,
                'percentage': float(buyback['buyback_percentage']) if buyback['buyback_percentage'] else None,
                'status': buyback['status']
            }
            return True, {'message': message, 'data': data}
        
        return False, None
    
    def check_fundamental_condition(self, ticker, condition):
        """Check fundamental-based conditions"""
        cursor = self.conn.cursor()
        
        # Get latest fundamentals
        cursor.execute("""
            SELECT *
            FROM fundamentals_quarterly
            WHERE ticker = %s
            ORDER BY quarter_end DESC
            LIMIT 1
        """, (ticker,))
        
        fundamentals = cursor.fetchone()
        cursor.close()
        
        if not fundamentals:
            return False, None
        
        # Evaluate conditions
        conditions_met = []
        conditions_failed = []
        
        for field, rule in condition.items():
            if field not in fundamentals:
                continue
            
            value = fundamentals[field]
            if value is None:
                continue
            
            operator = rule.get('operator')
            threshold = rule.get('value')
            
            result = False
            if operator == '<':
                result = value < threshold
            elif operator == '>':
                result = value > threshold
            elif operator == '<=':
                result = value <= threshold
            elif operator == '>=':
                result = value >= threshold
            elif operator == '==':
                result = value == threshold
            
            if result:
                conditions_met.append(f"{field} {operator} {threshold} (actual: {value})")
            else:
                conditions_failed.append(f"{field} {operator} {threshold} (actual: {value})")
        
        if conditions_met and not conditions_failed:
            message = f"{ticker} meets fundamental conditions: {', '.join(conditions_met)}"
            data = {
                'conditions_met': conditions_met,
                'quarter_end': str(fundamentals['quarter_end'])
            }
            return True, {'message': message, 'data': data}
        
        return False, None
    
    def create_notification(self, alert, result):
        """Create notification for triggered alert"""
        cursor = self.conn.cursor()
        
        cursor.execute("""
            INSERT INTO notifications (
                user_id, alert_id, ticker, notification_type,
                title, message, data_json, is_read, triggered_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            alert['user_id'],
            alert['id'],
            alert['ticker'],
            alert['alert_type'],
            alert['alert_name'],
            result['message'],
            json.dumps(result['data']) if result.get('data') else None,
            False,
            datetime.now()
        ))
        
        notification_id = cursor.fetchone()['id']
        self.conn.commit()
        cursor.close()
        
        return notification_id
    
    def update_alert_status(self, alert_id, triggered, error_message=None):
        """Update alert subscription status after evaluation"""
        cursor = self.conn.cursor()
        
        if triggered:
            cursor.execute("""
                UPDATE alert_subscriptions
                SET last_triggered = NOW(),
                    last_evaluated = NOW(),
                    trigger_count = trigger_count + 1
                WHERE id = %s
            """, (alert_id,))
        else:
            cursor.execute("""
                UPDATE alert_subscriptions
                SET last_evaluated = NOW()
                WHERE id = %s
            """, (alert_id,))
        
        self.conn.commit()
        cursor.close()
    
    def log_execution(self, alert_id, triggered, error_message=None, result=None):
        """Log alert execution for audit"""
        cursor = self.conn.cursor()
        
        status = 'success' if not error_message else 'error'
        
        cursor.execute("""
            INSERT INTO alert_execution_log (
                alert_id, executed_at, status, triggered,
                error_message, evaluation_result
            ) VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            alert_id,
            datetime.now(),
            status,
            triggered,
            error_message,
            json.dumps(result) if result else None
        ))
        
        self.conn.commit()
        cursor.close()
    
    def should_skip_alert(self, alert):
        """Check if alert should be skipped based on last trigger time"""
        if not alert['last_triggered']:
            return False
        
        # Don't trigger same alert within 24 hours
        last_trigger = alert['last_triggered']
        hours_since_trigger = (datetime.now() - last_trigger).total_seconds() / 3600
        
        if hours_since_trigger < 24:
            logger.debug(f"Skipping alert {alert['id']} - triggered {hours_since_trigger:.1f}h ago")
            return True
        
        return False
    
    def run(self):
        """Main execution loop"""
        logger.info("="*60)
        logger.info("Starting Alert Engine Evaluation")
        logger.info("="*60)
        
        alerts = self.get_active_alerts()
        logger.info(f"Found {len(alerts)} active alerts to evaluate")
        
        evaluated = 0
        triggered = 0
        skipped = 0
        errors = 0
        
        for alert in alerts:
            alert_id = alert['id']
            alert_name = alert['alert_name']
            ticker = alert['ticker'] or 'N/A'
            
            try:
                # Check if should skip
                if self.should_skip_alert(alert):
                    skipped += 1
                    continue
                
                logger.info(f"Evaluating Alert {alert_id}: {alert_name} ({ticker})")
                
                # Evaluate alert
                is_triggered, result = self.evaluate_alert(alert)
                
                if is_triggered and result:
                    logger.info(f"✓ Alert TRIGGERED: {alert_name}")
                    
                    # Create notification
                    notification_id = self.create_notification(alert, result)
                    logger.info(f"  Created notification {notification_id}")
                    
                    # Update alert status
                    self.update_alert_status(alert_id, True)
                    
                    # Log execution
                    self.log_execution(alert_id, True, None, result)
                    
                    triggered += 1
                else:
                    logger.debug(f"  Alert not triggered")
                    self.update_alert_status(alert_id, False)
                    self.log_execution(alert_id, False)
                
                evaluated += 1
                
            except Exception as e:
                logger.error(f"Error processing alert {alert_id}: {e}")
                self.log_execution(alert_id, False, str(e))
                errors += 1
        
        logger.info("\n" + "="*60)
        logger.info("Alert Engine Summary")
        logger.info("="*60)
        logger.info(f"Total alerts: {len(alerts)}")
        logger.info(f"Evaluated: {evaluated}")
        logger.info(f"Triggered: {triggered}")
        logger.info(f"Skipped: {skipped}")
        logger.info(f"Errors: {errors}")
        logger.info("="*60)


if __name__ == "__main__":
    engine = AlertEngine()
    engine.run()
