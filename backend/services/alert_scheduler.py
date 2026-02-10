"""
Alert Scheduler
Runs alert engine on a schedule using cron-like timing
Supports daily and intraday execution
"""

import schedule
import time
import logging
import sys
from datetime import datetime
from alert_engine import AlertEngine

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('../../logs/alert_scheduler.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


def run_alert_evaluation():
    """Execute alert evaluation"""
    logger.info("="*80)
    logger.info(f"Scheduled Alert Evaluation - {datetime.now()}")
    logger.info("="*80)
    
    try:
        engine = AlertEngine()
        engine.run()
        logger.info("✓ Alert evaluation completed successfully")
    except Exception as e:
        logger.error(f"✗ Alert evaluation failed: {e}")


def main():
    """Main scheduler loop"""
    logger.info("="*80)
    logger.info("Alert Scheduler Starting")
    logger.info("="*80)
    
    # Schedule daily evaluation at 9 AM
    schedule.every().day.at("09:00").do(run_alert_evaluation)
    
    # Optional: Intraday price alert checks every 30 minutes during market hours
    # Uncomment to enable:
    # schedule.every(30).minutes.do(run_alert_evaluation)
    
    logger.info("Schedule configured:")
    logger.info("  - Daily at 09:00 AM")
    logger.info("  - (Optional intraday checks: disabled)")
    logger.info("")
    logger.info("Scheduler is running. Press Ctrl+C to stop.")
    logger.info("="*80)
    
    # Run once immediately on startup
    run_alert_evaluation()
    
    # Main loop
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    except KeyboardInterrupt:
        logger.info("\nScheduler stopped by user")
    except Exception as e:
        logger.error(f"Scheduler error: {e}")


if __name__ == "__main__":
    main()
