"""
Data Validation Script for Analyst Module
Performs comprehensive validation checks on ingested data
"""

import os
import sys
from datetime import datetime
import logging
import psycopg2
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('../../logs/data_validation.log'),
        logging.StreamHandler(sys.stdout)
    ]
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
    return psycopg2.connect(**DB_CONFIG)


def validate_analyst_estimates(cursor):
    """Validate analyst estimates data"""
    logger.info("\n--- Analyst Estimates Validation ---")
    
    checks = []
    
    # Total records
    cursor.execute("SELECT COUNT(*) FROM analyst_estimates")
    total = cursor.fetchone()[0]
    checks.append(('Total Records', total, total > 0))
    
    # Records with price targets
    cursor.execute("SELECT COUNT(*) FROM analyst_estimates WHERE price_target_avg IS NOT NULL")
    with_targets = cursor.fetchone()[0]
    checks.append(('With Price Targets', with_targets, with_targets > 0))
    
    # Records with EPS estimates
    cursor.execute("SELECT COUNT(*) FROM analyst_estimates WHERE eps_estimate IS NOT NULL")
    with_eps = cursor.fetchone()[0]
    checks.append(('With EPS Estimates', with_eps, with_eps > 0))
    
    # Invalid price target ranges
    cursor.execute("""
        SELECT COUNT(*) FROM analyst_estimates 
        WHERE (price_target_low > price_target_avg) 
           OR (price_target_avg > price_target_high)
           OR (price_target_low > price_target_high)
    """)
    invalid_ranges = cursor.fetchone()[0]
    checks.append(('Invalid Target Ranges', invalid_ranges, invalid_ranges == 0))
    
    # Records with analyst count
    cursor.execute("SELECT COUNT(*) FROM analyst_estimates WHERE analyst_count > 0")
    with_count = cursor.fetchone()[0]
    checks.append(('With Analyst Count', with_count, with_count > 0))
    
    # Average analyst count
    cursor.execute("SELECT AVG(analyst_count) FROM analyst_estimates WHERE analyst_count > 0")
    avg_count = cursor.fetchone()[0]
    if avg_count:
        checks.append(('Avg Analysts per Stock', round(avg_count, 2), avg_count >= 1))
    
    # Records with consensus rating
    cursor.execute("SELECT COUNT(*) FROM analyst_estimates WHERE consensus_rating IS NOT NULL")
    with_rating = cursor.fetchone()[0]
    checks.append(('With Consensus Rating', with_rating, with_rating > 0))
    
    # Rating distribution
    cursor.execute("""
        SELECT consensus_rating, COUNT(*) 
        FROM analyst_estimates 
        WHERE consensus_rating IS NOT NULL 
        GROUP BY consensus_rating 
        ORDER BY COUNT(*) DESC
    """)
    ratings = cursor.fetchall()
    logger.info("\nConsensus Rating Distribution:")
    for rating, count in ratings:
        logger.info(f"  {rating}: {count}")
    
    return checks


def validate_buybacks(cursor):
    """Validate buyback data"""
    logger.info("\n--- Buyback Announcements Validation ---")
    
    checks = []
    
    # Total buybacks
    cursor.execute("SELECT COUNT(*) FROM buybacks")
    total = cursor.fetchone()[0]
    checks.append(('Total Buybacks', total, total >= 0))
    
    # Active buybacks
    cursor.execute("SELECT COUNT(*) FROM buybacks WHERE status IN ('announced', 'ongoing')")
    active = cursor.fetchone()[0]
    checks.append(('Active Buybacks', active, active >= 0))
    
    # Completed buybacks
    cursor.execute("SELECT COUNT(*) FROM buybacks WHERE status = 'completed'")
    completed = cursor.fetchone()[0]
    checks.append(('Completed Buybacks', completed, completed >= 0))
    
    # Buybacks with amount
    cursor.execute("SELECT COUNT(*) FROM buybacks WHERE amount > 0")
    with_amount = cursor.fetchone()[0]
    if total > 0:
        checks.append(('With Amount', with_amount, with_amount > 0))
    
    # Invalid price ranges
    cursor.execute("""
        SELECT COUNT(*) FROM buybacks 
        WHERE price_range_low > price_range_high
    """)
    invalid_prices = cursor.fetchone()[0]
    checks.append(('Invalid Price Ranges', invalid_prices, invalid_prices == 0))
    
    # Invalid date ranges
    cursor.execute("""
        SELECT COUNT(*) FROM buybacks 
        WHERE start_date > end_date
    """)
    invalid_dates = cursor.fetchone()[0]
    checks.append(('Invalid Date Ranges', invalid_dates, invalid_dates == 0))
    
    # Buyback type distribution
    cursor.execute("""
        SELECT buyback_type, COUNT(*) 
        FROM buybacks 
        WHERE buyback_type IS NOT NULL 
        GROUP BY buyback_type
    """)
    types = cursor.fetchall()
    if types:
        logger.info("\nBuyback Type Distribution:")
        for btype, count in types:
            logger.info(f"  {btype}: {count}")
    
    # Status distribution
    cursor.execute("""
        SELECT status, COUNT(*) 
        FROM buybacks 
        WHERE status IS NOT NULL 
        GROUP BY status 
        ORDER BY COUNT(*) DESC
    """)
    statuses = cursor.fetchall()
    if statuses:
        logger.info("\nBuyback Status Distribution:")
        for status, count in statuses:
            logger.info(f"  {status}: {count}")
    
    return checks


def validate_earnings_calendar(cursor):
    """Validate earnings calendar data"""
    logger.info("\n--- Earnings Calendar Validation ---")
    
    checks = []
    
    # Total events
    cursor.execute("SELECT COUNT(*) FROM earnings_calendar")
    total = cursor.fetchone()[0]
    checks.append(('Total Earnings Events', total, total > 0))
    
    # Upcoming events
    cursor.execute("""
        SELECT COUNT(*) FROM earnings_calendar 
        WHERE earnings_date >= CURRENT_DATE AND status = 'scheduled'
    """)
    upcoming = cursor.fetchone()[0]
    checks.append(('Upcoming Events', upcoming, upcoming > 0))
    
    # Events with estimates
    cursor.execute("SELECT COUNT(*) FROM earnings_calendar WHERE estimate_eps IS NOT NULL")
    with_estimates = cursor.fetchone()[0]
    checks.append(('With EPS Estimates', with_estimates, with_estimates >= 0))
    
    # Events with actuals
    cursor.execute("SELECT COUNT(*) FROM earnings_calendar WHERE actual_eps IS NOT NULL")
    with_actuals = cursor.fetchone()[0]
    checks.append(('With Actual EPS', with_actuals, with_actuals >= 0))
    
    # Events next 7 days
    cursor.execute("""
        SELECT COUNT(*) FROM earnings_calendar 
        WHERE earnings_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
          AND status = 'scheduled'
    """)
    next_week = cursor.fetchone()[0]
    checks.append(('Next 7 Days', next_week, True))
    
    # Events next 30 days
    cursor.execute("""
        SELECT COUNT(*) FROM earnings_calendar 
        WHERE earnings_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
          AND status = 'scheduled'
    """)
    next_month = cursor.fetchone()[0]
    checks.append(('Next 30 Days', next_month, True))
    
    # Fiscal quarter distribution
    cursor.execute("""
        SELECT fiscal_quarter, COUNT(*) 
        FROM earnings_calendar 
        GROUP BY fiscal_quarter 
        ORDER BY fiscal_quarter
    """)
    quarters = cursor.fetchall()
    if quarters:
        logger.info("\nFiscal Quarter Distribution:")
        for quarter, count in quarters:
            logger.info(f"  {quarter}: {count}")
    
    # Status distribution
    cursor.execute("""
        SELECT status, COUNT(*) 
        FROM earnings_calendar 
        GROUP BY status 
        ORDER BY COUNT(*) DESC
    """)
    statuses = cursor.fetchall()
    if statuses:
        logger.info("\nEarnings Status Distribution:")
        for status, count in statuses:
            logger.info(f"  {status}: {count}")
    
    return checks


def validate_views(cursor):
    """Test that helper views are working"""
    logger.info("\n--- Helper Views Validation ---")
    
    checks = []
    
    views = [
        'latest_analyst_consensus',
        'active_buybacks',
        'upcoming_earnings',
        'stocks_below_target'
    ]
    
    for view_name in views:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {view_name}")
            count = cursor.fetchone()[0]
            checks.append((f'View: {view_name}', count, True))
            logger.info(f"  {view_name}: {count} rows")
        except Exception as e:
            checks.append((f'View: {view_name}', 0, False))
            logger.error(f"  {view_name}: ERROR - {e}")
    
    return checks


def validate_functions(cursor):
    """Test helper functions"""
    logger.info("\n--- Helper Functions Validation ---")
    
    checks = []
    
    # Test get_days_until_earnings
    try:
        cursor.execute("""
            SELECT ticker, get_days_until_earnings(ticker) as days
            FROM companies 
            WHERE next_earnings_date IS NOT NULL
            LIMIT 5
        """)
        results = cursor.fetchall()
        checks.append(('Function: get_days_until_earnings', len(results), True))
        logger.info(f"  get_days_until_earnings: Tested on {len(results)} stocks")
    except Exception as e:
        checks.append(('Function: get_days_until_earnings', 0, False))
        logger.error(f"  get_days_until_earnings: ERROR - {e}")
    
    # Test has_recent_buyback
    try:
        cursor.execute("""
            SELECT ticker, has_recent_buyback(ticker, 365) as has_buyback
            FROM companies 
            LIMIT 10
        """)
        results = cursor.fetchall()
        checks.append(('Function: has_recent_buyback', len(results), True))
        logger.info(f"  has_recent_buyback: Tested on {len(results)} stocks")
    except Exception as e:
        checks.append(('Function: has_recent_buyback', 0, False))
        logger.error(f"  has_recent_buyback: ERROR - {e}")
    
    return checks


def run_validation():
    """Run all validation checks"""
    logger.info("="*80)
    logger.info("DATA VALIDATION - ANALYST MODULE")
    logger.info("="*80)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    all_checks = []
    
    try:
        # Validate each component
        all_checks.extend(validate_analyst_estimates(cursor))
        all_checks.extend(validate_buybacks(cursor))
        all_checks.extend(validate_earnings_calendar(cursor))
        all_checks.extend(validate_views(cursor))
        all_checks.extend(validate_functions(cursor))
        
    finally:
        cursor.close()
        conn.close()
    
    # Summary
    logger.info("\n" + "="*80)
    logger.info("VALIDATION SUMMARY")
    logger.info("="*80)
    
    passed = 0
    failed = 0
    
    for check_name, value, success in all_checks:
        status = "✓" if success else "✗"
        logger.info(f"{status} {check_name}: {value}")
        
        if success:
            passed += 1
        else:
            failed += 1
    
    logger.info("")
    logger.info(f"Total Checks: {len(all_checks)}")
    logger.info(f"Passed: {passed}")
    logger.info(f"Failed: {failed}")
    logger.info("="*80)
    
    if failed > 0:
        logger.warning(f"\n{failed} validation check(s) failed!")
        return False
    else:
        logger.info("\n✓ All validation checks passed!")
        return True


if __name__ == "__main__":
    success = run_validation()
    sys.exit(0 if success else 1)
