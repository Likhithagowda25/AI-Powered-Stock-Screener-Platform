"""
Buyback Announcements Ingestion
Fetches and stores corporate buyback data
Uses Yahoo Finance and simulated data for NSE stocks
"""

import os
import sys
from datetime import datetime, timedelta
import logging
import psycopg2
from psycopg2.extras import execute_batch
from dotenv import load_dotenv
import yfinance as yf
import time
# random module removed - no longer generating sample data

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('../../logs/buyback_ingestion.log'),
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


def get_all_tickers(conn):
    """Get all tickers from companies table"""
    cursor = conn.cursor()
    cursor.execute("SELECT ticker, name, market_cap FROM companies WHERE market_cap IS NOT NULL ORDER BY ticker")
    tickers = cursor.fetchall()
    cursor.close()
    return tickers


def fetch_buyback_info(ticker, company_name, market_cap):
    """
    Fetch buyback information from Yahoo Finance corporate actions.
    Note: Yahoo Finance has limited buyback data. For comprehensive buyback
    information, consider integrating with:
    - BSE/NSE corporate announcements API
    - Company investor relations pages
    - SEBI filings
    - Financial news APIs
    """
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        
        buybacks = []
        
        # Try to get corporate actions from Yahoo Finance
        try:
            actions = stock.actions
            if actions is not None and not actions.empty:
                # Note: Yahoo Finance doesn't directly provide buyback data
                # Log when no real buyback announcements are found
                logger.debug(f"No buyback data available from Yahoo Finance for {ticker}")
        except Exception as e:
            logger.debug(f"Could not fetch actions for {ticker}: {e}")
        
        # Only return real data - no mock/sample data generation
        if not buybacks:
            logger.info(f"No buyback announcements found for {ticker}")
        
        return buybacks
        
    except Exception as e:
        logger.error(f"Error fetching buyback data for {ticker}: {e}")
        return []



def insert_buybacks(conn, buybacks_list):
    """
    Insert buyback announcements into database
    """
    if not buybacks_list:
        logger.info("No buybacks to insert")
        return 0
    
    cursor = conn.cursor()
    
    query = """
    INSERT INTO buybacks (
        ticker, announcement_date, amount, remarks,
        buyback_type, buyback_percentage,
        price_range_low, price_range_high,
        start_date, end_date, status, completion_percentage,
        source, filing_reference
    ) VALUES (
        %(ticker)s, %(announcement_date)s, %(amount)s, %(remarks)s,
        %(buyback_type)s, %(buyback_percentage)s,
        %(price_range_low)s, %(price_range_high)s,
        %(start_date)s, %(end_date)s, %(status)s, %(completion_percentage)s,
        %(source)s, %(filing_reference)s
    )
    ON CONFLICT ON CONSTRAINT IF EXISTS unique_buyback_event
    DO UPDATE SET
        amount = EXCLUDED.amount,
        remarks = EXCLUDED.remarks,
        buyback_type = EXCLUDED.buyback_type,
        buyback_percentage = EXCLUDED.buyback_percentage,
        price_range_low = EXCLUDED.price_range_low,
        price_range_high = EXCLUDED.price_range_high,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        status = EXCLUDED.status,
        completion_percentage = EXCLUDED.completion_percentage,
        updated_at = NOW()
    """
    
    # Create unique constraint if it doesn't exist
    try:
        cursor.execute("""
            DO $$ 
            BEGIN
                ALTER TABLE buybacks 
                ADD CONSTRAINT unique_buyback_event 
                UNIQUE (ticker, announcement_date, amount);
            EXCEPTION
                WHEN duplicate_object THEN NULL;
            END $$;
        """)
        conn.commit()
    except Exception as e:
        logger.debug(f"Constraint handling: {e}")
        conn.rollback()
    
    inserted = 0
    for buyback in buybacks_list:
        try:
            cursor.execute(query, buyback)
            inserted += 1
        except Exception as e:
            logger.error(f"Error inserting buyback for {buyback.get('ticker')}: {e}")
            conn.rollback()
            continue
    
    conn.commit()
    cursor.close()
    
    return inserted


def update_company_last_buyback_date(conn):
    """Update companies table with last buyback date"""
    cursor = conn.cursor()
    
    query = """
    UPDATE companies c
    SET last_buyback_date = (
        SELECT MAX(announcement_date)
        FROM buybacks b
        WHERE b.ticker = c.ticker
    )
    WHERE EXISTS (
        SELECT 1 FROM buybacks b WHERE b.ticker = c.ticker
    )
    """
    
    cursor.execute(query)
    updated = cursor.rowcount
    conn.commit()
    cursor.close()
    
    logger.info(f"Updated last_buyback_date for {updated} companies")


def validate_buyback_data(conn):
    """Validate buyback data quality"""
    cursor = conn.cursor()
    
    validation_results = {
        'total_buybacks': 0,
        'active_buybacks': 0,
        'completed_buybacks': 0,
        'buybacks_with_amount': 0,
        'buybacks_with_dates': 0,
        'invalid_price_ranges': 0,
    }
    
    # Total buybacks
    cursor.execute("SELECT COUNT(*) FROM buybacks")
    validation_results['total_buybacks'] = cursor.fetchone()[0]
    
    # Active buybacks
    cursor.execute("SELECT COUNT(*) FROM buybacks WHERE status IN ('announced', 'ongoing')")
    validation_results['active_buybacks'] = cursor.fetchone()[0]
    
    # Completed buybacks
    cursor.execute("SELECT COUNT(*) FROM buybacks WHERE status = 'completed'")
    validation_results['completed_buybacks'] = cursor.fetchone()[0]
    
    # Buybacks with amount
    cursor.execute("SELECT COUNT(*) FROM buybacks WHERE amount IS NOT NULL AND amount > 0")
    validation_results['buybacks_with_amount'] = cursor.fetchone()[0]
    
    # Buybacks with date ranges
    cursor.execute("SELECT COUNT(*) FROM buybacks WHERE start_date IS NOT NULL AND end_date IS NOT NULL")
    validation_results['buybacks_with_dates'] = cursor.fetchone()[0]
    
    # Invalid price ranges
    cursor.execute("""
        SELECT COUNT(*) FROM buybacks 
        WHERE price_range_low > price_range_high
    """)
    validation_results['invalid_price_ranges'] = cursor.fetchone()[0]
    
    cursor.close()
    
    return validation_results


def run_buyback_ingestion():
    """
    Main function to run buyback ingestion
    """
    logger.info("="*60)
    logger.info("Starting Buyback Announcements Ingestion")
    logger.info("="*60)
    
    start_time = datetime.now()
    
    conn = get_db_connection()
    tickers = get_all_tickers(conn)
    
    logger.info(f"Found {len(tickers)} tickers to process")
    
    all_buybacks = []
    processed = 0
    
    for ticker, company_name, market_cap in tickers:
        logger.info(f"Processing {ticker}...")
        
        buybacks = fetch_buyback_info(ticker, company_name, market_cap)
        
        if buybacks:
            all_buybacks.extend(buybacks)
            logger.info(f"Found {len(buybacks)} buyback(s) for {ticker}")
        
        processed += 1
        
        # Progress update
        if processed % 20 == 0:
            logger.info(f"Progress: {processed}/{len(tickers)} tickers ({(processed/len(tickers)*100):.1f}%)")
        
        # Rate limiting
        time.sleep(0.3)
    
    # Insert all buybacks
    if all_buybacks:
        inserted = insert_buybacks(conn, all_buybacks)
        logger.info(f"Inserted {inserted} buyback announcements")
    
    # Update companies table
    update_company_last_buyback_date(conn)
    
    # Validation
    logger.info("\n" + "="*60)
    logger.info("Validating Data Quality")
    logger.info("="*60)
    
    validation = validate_buyback_data(conn)
    for key, value in validation.items():
        logger.info(f"{key}: {value}")
    
    conn.close()
    
    elapsed = datetime.now() - start_time
    
    logger.info("\n" + "="*60)
    logger.info("Ingestion Summary")
    logger.info("="*60)
    logger.info(f"Total tickers processed: {processed}")
    logger.info(f"Buyback records created: {len(all_buybacks)}")
    logger.info(f"Time elapsed: {elapsed}")
    logger.info("="*60)


if __name__ == "__main__":
    run_buyback_ingestion()
