"""
Analyst Estimates & Price Targets Ingestion
Fetches and stores analyst estimates and price targets from Yahoo Finance
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

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('../../logs/analyst_ingestion.log'),
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
    cursor.execute("SELECT DISTINCT ticker FROM companies ORDER BY ticker")
    tickers = [row[0] for row in cursor.fetchall()]
    cursor.close()
    return tickers


def fetch_analyst_estimates(ticker):
    """
    Fetch analyst estimates and price targets from Yahoo Finance
    Returns dict with analyst data or None if not available
    """
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        
        if not info:
            logger.warning(f"No info available for {ticker}")
            return None
        
        # Extract analyst data
        analyst_data = {
            'ticker': ticker,
            'estimate_date': datetime.now().date(),
            'eps_estimate': info.get('forwardEps'),
            'revenue_estimate': info.get('revenueEstimates', {}).get('avg') if isinstance(info.get('revenueEstimates'), dict) else None,
            'price_target_low': info.get('targetLowPrice'),
            'price_target_avg': info.get('targetMeanPrice'),
            'price_target_high': info.get('targetHighPrice'),
            'analyst_count': info.get('numberOfAnalystOpinions'),
            'consensus_rating': map_recommendation_to_rating(info.get('recommendationKey')),
        }
        
        # Get recommendation details if available
        try:
            recommendations = stock.recommendations
            if recommendations is not None and not recommendations.empty:
                latest_rec = recommendations.iloc[-1] if len(recommendations) > 0 else None
                if latest_rec is not None:
                    analyst_data.update({
                        'strong_buy_count': int(latest_rec.get('strongBuy', 0)) if 'strongBuy' in latest_rec else 0,
                        'buy_count': int(latest_rec.get('buy', 0)) if 'buy' in latest_rec else 0,
                        'hold_count': int(latest_rec.get('hold', 0)) if 'hold' in latest_rec else 0,
                        'sell_count': int(latest_rec.get('sell', 0)) if 'sell' in latest_rec else 0,
                        'strong_sell_count': int(latest_rec.get('strongSell', 0)) if 'strongSell' in latest_rec else 0,
                    })
        except Exception as e:
            logger.debug(f"Could not fetch recommendations for {ticker}: {e}")
        
        # Determine revision trend (simple heuristic based on ratings)
        if analyst_data.get('strong_buy_count', 0) + analyst_data.get('buy_count', 0) > \
           analyst_data.get('sell_count', 0) + analyst_data.get('strong_sell_count', 0):
            analyst_data['revision_trend'] = 'positive'
        elif analyst_data.get('sell_count', 0) + analyst_data.get('strong_sell_count', 0) > \
             analyst_data.get('strong_buy_count', 0) + analyst_data.get('buy_count', 0):
            analyst_data['revision_trend'] = 'negative'
        else:
            analyst_data['revision_trend'] = 'neutral'
        
        return analyst_data
        
    except Exception as e:
        logger.error(f"Error fetching analyst data for {ticker}: {e}")
        return None


def map_recommendation_to_rating(rec_key):
    """Map Yahoo Finance recommendation key to standard rating"""
    mapping = {
        'strong_buy': 'Strong Buy',
        'buy': 'Buy',
        'hold': 'Hold',
        'sell': 'Sell',
        'strong_sell': 'Strong Sell',
        'underperform': 'Sell',
        'outperform': 'Buy',
    }
    return mapping.get(rec_key, 'Hold') if rec_key else 'Hold'


def insert_analyst_estimates(conn, estimates_list):
    """
    Insert analyst estimates into database
    Uses INSERT ON CONFLICT to update existing records
    """
    if not estimates_list:
        logger.info("No analyst estimates to insert")
        return 0
    
    cursor = conn.cursor()
    
    query = """
    INSERT INTO analyst_estimates (
        ticker, estimate_date, eps_estimate, revenue_estimate,
        price_target_low, price_target_avg, price_target_high,
        analyst_count, consensus_rating,
        strong_buy_count, buy_count, hold_count, sell_count, strong_sell_count,
        revision_trend
    ) VALUES (
        %(ticker)s, %(estimate_date)s, %(eps_estimate)s, %(revenue_estimate)s,
        %(price_target_low)s, %(price_target_avg)s, %(price_target_high)s,
        %(analyst_count)s, %(consensus_rating)s,
        %(strong_buy_count)s, %(buy_count)s, %(hold_count)s, %(sell_count)s, %(strong_sell_count)s,
        %(revision_trend)s
    )
    ON CONFLICT (ticker, estimate_date) 
    DO UPDATE SET
        eps_estimate = EXCLUDED.eps_estimate,
        revenue_estimate = EXCLUDED.revenue_estimate,
        price_target_low = EXCLUDED.price_target_low,
        price_target_avg = EXCLUDED.price_target_avg,
        price_target_high = EXCLUDED.price_target_high,
        analyst_count = EXCLUDED.analyst_count,
        consensus_rating = EXCLUDED.consensus_rating,
        strong_buy_count = EXCLUDED.strong_buy_count,
        buy_count = EXCLUDED.buy_count,
        hold_count = EXCLUDED.hold_count,
        sell_count = EXCLUDED.sell_count,
        strong_sell_count = EXCLUDED.strong_sell_count,
        revision_trend = EXCLUDED.revision_trend,
        updated_at = NOW()
    """
    
    # Add unique constraint if it doesn't exist
    try:
        cursor.execute("""
            ALTER TABLE analyst_estimates 
            ADD CONSTRAINT IF NOT EXISTS unique_analyst_estimate_ticker_date 
            UNIQUE (ticker, estimate_date)
        """)
        conn.commit()
    except Exception as e:
        logger.debug(f"Constraint may already exist: {e}")
        conn.rollback()
    
    inserted = 0
    for estimate in estimates_list:
        try:
            cursor.execute(query, estimate)
            inserted += 1
        except Exception as e:
            logger.error(f"Error inserting estimate for {estimate.get('ticker')}: {e}")
            conn.rollback()
            continue
    
    conn.commit()
    cursor.close()
    
    return inserted


def validate_analyst_data(conn):
    """Validate analyst estimates data quality"""
    cursor = conn.cursor()
    
    validation_results = {
        'total_records': 0,
        'records_with_targets': 0,
        'records_with_estimates': 0,
        'invalid_target_ranges': 0,
        'records_with_analyst_count': 0,
    }
    
    # Total records
    cursor.execute("SELECT COUNT(*) FROM analyst_estimates")
    validation_results['total_records'] = cursor.fetchone()[0]
    
    # Records with price targets
    cursor.execute("""
        SELECT COUNT(*) FROM analyst_estimates 
        WHERE price_target_avg IS NOT NULL
    """)
    validation_results['records_with_targets'] = cursor.fetchone()[0]
    
    # Records with EPS estimates
    cursor.execute("""
        SELECT COUNT(*) FROM analyst_estimates 
        WHERE eps_estimate IS NOT NULL
    """)
    validation_results['records_with_estimates'] = cursor.fetchone()[0]
    
    # Invalid target ranges (low > avg or avg > high)
    cursor.execute("""
        SELECT COUNT(*) FROM analyst_estimates 
        WHERE price_target_low > price_target_avg 
           OR price_target_avg > price_target_high
    """)
    validation_results['invalid_target_ranges'] = cursor.fetchone()[0]
    
    # Records with analyst count
    cursor.execute("""
        SELECT COUNT(*) FROM analyst_estimates 
        WHERE analyst_count > 0
    """)
    validation_results['records_with_analyst_count'] = cursor.fetchone()[0]
    
    cursor.close()
    
    return validation_results


def run_analyst_ingestion(batch_size=10):
    """
    Main function to run analyst estimates ingestion
    """
    logger.info("="*60)
    logger.info("Starting Analyst Estimates Ingestion")
    logger.info("="*60)
    
    start_time = datetime.now()
    
    conn = get_db_connection()
    tickers = get_all_tickers(conn)
    
    logger.info(f"Found {len(tickers)} tickers to process")
    
    estimates_batch = []
    processed = 0
    successful = 0
    failed = 0
    
    for ticker in tickers:
        logger.info(f"Processing {ticker}...")
        
        analyst_data = fetch_analyst_estimates(ticker)
        
        if analyst_data and (analyst_data.get('price_target_avg') or analyst_data.get('eps_estimate')):
            estimates_batch.append(analyst_data)
            successful += 1
        else:
            logger.warning(f"No analyst data available for {ticker}")
            failed += 1
        
        processed += 1
        
        # Insert in batches
        if len(estimates_batch) >= batch_size:
            inserted = insert_analyst_estimates(conn, estimates_batch)
            logger.info(f"Inserted batch of {inserted} estimates")
            estimates_batch = []
        
        # Rate limiting
        time.sleep(0.5)
        
        # Progress update
        if processed % 20 == 0:
            logger.info(f"Progress: {processed}/{len(tickers)} tickers ({(processed/len(tickers)*100):.1f}%)")
    
    # Insert remaining
    if estimates_batch:
        inserted = insert_analyst_estimates(conn, estimates_batch)
        logger.info(f"Inserted final batch of {inserted} estimates")
    
    # Validation
    logger.info("\n" + "="*60)
    logger.info("Validating Data Quality")
    logger.info("="*60)
    
    validation = validate_analyst_data(conn)
    for key, value in validation.items():
        logger.info(f"{key}: {value}")
    
    conn.close()
    
    elapsed = datetime.now() - start_time
    
    logger.info("\n" + "="*60)
    logger.info("Ingestion Summary")
    logger.info("="*60)
    logger.info(f"Total tickers processed: {processed}")
    logger.info(f"Successfully fetched: {successful}")
    logger.info(f"Failed/No data: {failed}")
    logger.info(f"Time elapsed: {elapsed}")
    logger.info("="*60)


if __name__ == "__main__":
    run_analyst_ingestion()
