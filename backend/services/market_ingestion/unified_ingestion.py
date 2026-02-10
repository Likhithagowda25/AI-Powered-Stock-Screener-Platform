"""
Unified Ingestion Pipeline
Single entry point for all market data ingestion with multi-API support

Features:
- Dynamic NSE ticker fetching (2200+ stocks)
- Multi-API data retrieval with fallback
- Data quality tracking
- Resume capability
- Progress logging
"""

import os
import sys
import time
import json
import logging
import argparse
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Any

import psycopg2
from psycopg2.extras import execute_batch
from dotenv import load_dotenv

# Add parent paths for imports
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent / 'ingestion'))

from nse_ticker_fetcher import NSETickerFetcher
from multi_api_provider import MultiAPIProvider
from data_quality_tracker import DataQualityTracker
from api_config import DB_CONFIG, print_config_status

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(Path(__file__).parent / 'ingestion.log')
    ]
)
logger = logging.getLogger(__name__)


class UnifiedIngestionPipeline:
    """
    Unified pipeline for ingesting stock data from multiple sources
    """
    
    def __init__(self, batch_size: int = 25, delay_between_batches: float = 2.0):
        self.batch_size = batch_size
        self.delay_between_batches = delay_between_batches
        
        # Initialize components
        self.ticker_fetcher = NSETickerFetcher()
        self.api_provider = MultiAPIProvider()
        self.quality_tracker = DataQualityTracker()
        
        # State tracking
        self.progress_file = Path(__file__).parent / 'ingestion_progress.json'
        self.stats = {
            'processed': 0,
            'errors': 0,
            'skipped': 0,
            'start_time': None,
            'end_time': None
        }
    
    def get_db_connection(self):
        """Create database connection"""
        return psycopg2.connect(
            host=DB_CONFIG['host'],
            port=DB_CONFIG['port'],
            database=DB_CONFIG['database'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password']
        )
    
    def load_progress(self) -> Dict:
        """Load progress from last run for resume capability"""
        if self.progress_file.exists():
            with open(self.progress_file, 'r') as f:
                return json.load(f)
        return {'last_processed_index': 0, 'processed_tickers': []}
    
    def save_progress(self, index: int, processed_tickers: List[str]):
        """Save progress for resume"""
        with open(self.progress_file, 'w') as f:
            json.dump({
                'last_processed_index': index,
                'processed_tickers': processed_tickers[-100:],  # Keep last 100
                'timestamp': datetime.now().isoformat()
            }, f)
    
    def clear_progress(self):
        """Clear saved progress (start fresh)"""
        if self.progress_file.exists():
            self.progress_file.unlink()
    
    def insert_company_data(self, cursor, data: Dict[str, Any]) -> bool:
        """Insert or update company data in database"""
        try:
            cursor.execute("""
                INSERT INTO companies (ticker, name, exchange, sector, industry, market_cap)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (ticker) DO UPDATE SET
                    name = COALESCE(EXCLUDED.name, companies.name),
                    exchange = COALESCE(EXCLUDED.exchange, companies.exchange),
                    sector = COALESCE(EXCLUDED.sector, companies.sector),
                    industry = COALESCE(EXCLUDED.industry, companies.industry),
                    market_cap = COALESCE(EXCLUDED.market_cap, companies.market_cap)
            """, (
                data.get('ticker'),
                data.get('name'),
                data.get('exchange', 'NSE'),
                data.get('sector'),
                data.get('industry'),
                data.get('market_cap')
            ))
            return True
        except Exception as e:
            logger.error(f"Error inserting company {data.get('ticker')}: {e}")
            return False
    
    def insert_fundamentals_data(self, cursor, data: Dict[str, Any]) -> bool:
        """Insert or update fundamentals data into fundamentals_quarterly table.
        
        Columns from migrations:
        - ticker, quarter, revenue, net_income, eps, operating_margin, 
        - roe, roa, pe_ratio, pb_ratio, peg_ratio, ebitda
        """
        try:
            # Get current quarter
            from datetime import datetime
            current_quarter = f"Q{(datetime.now().month - 1) // 3 + 1} {datetime.now().year}"
            
            # Insert into fundamentals_quarterly (matching exact schema from migrations)
            cursor.execute("""
                INSERT INTO fundamentals_quarterly (
                    ticker, quarter, revenue, net_income, eps,
                    operating_margin, roe, roa, pe_ratio, pb_ratio, peg_ratio, ebitda
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (ticker, quarter) DO UPDATE SET
                    revenue = COALESCE(EXCLUDED.revenue, fundamentals_quarterly.revenue),
                    net_income = COALESCE(EXCLUDED.net_income, fundamentals_quarterly.net_income),
                    eps = COALESCE(EXCLUDED.eps, fundamentals_quarterly.eps),
                    operating_margin = COALESCE(EXCLUDED.operating_margin, fundamentals_quarterly.operating_margin),
                    roe = COALESCE(EXCLUDED.roe, fundamentals_quarterly.roe),
                    roa = COALESCE(EXCLUDED.roa, fundamentals_quarterly.roa),
                    pe_ratio = COALESCE(EXCLUDED.pe_ratio, fundamentals_quarterly.pe_ratio),
                    pb_ratio = COALESCE(EXCLUDED.pb_ratio, fundamentals_quarterly.pb_ratio),
                    peg_ratio = COALESCE(EXCLUDED.peg_ratio, fundamentals_quarterly.peg_ratio),
                    ebitda = COALESCE(EXCLUDED.ebitda, fundamentals_quarterly.ebitda)
            """, (
                data.get('ticker'),
                current_quarter,
                data.get('revenue'),
                data.get('net_income'),
                data.get('eps'),
                data.get('operating_margin'),
                data.get('roe'),
                data.get('roa'),
                data.get('pe_ratio'),
                data.get('pb_ratio'),
                data.get('peg_ratio'),
                data.get('ebitda')
            ))
            return True
        except Exception as e:
            logger.error(f"Error inserting fundamentals for {data.get('ticker')}: {e}")
            return False
    
    def process_stock(self, ticker: str, conn, cursor, fill_gaps: bool = True) -> bool:
        """Process a single stock with multi-API support"""
        try:
            # Fetch data from multiple APIs
            data = self.api_provider.fetch_complete_data(ticker, fill_gaps=fill_gaps)
            
            if not data or '_error' in data:
                logger.warning(f"No data for {ticker}")
                self.stats['skipped'] += 1
                return False
            
            # Track data quality
            self.quality_tracker.record_stock_quality(ticker, data)
            
            # Insert into database
            success = self.insert_company_data(cursor, data)
            if success:
                self.insert_fundamentals_data(cursor, data)
            
            conn.commit()
            self.stats['processed'] += 1
            return True
            
        except Exception as e:
            logger.error(f"Error processing {ticker}: {e}")
            conn.rollback()
            self.stats['errors'] += 1
            return False
    
    def run(self, 
            max_stocks: int = None, 
            fill_gaps: bool = True,
            resume: bool = False,
            test_mode: bool = False):
        """
        Run the ingestion pipeline
        
        Args:
            max_stocks: Limit number of stocks to process
            fill_gaps: Use fallback APIs for missing data
            resume: Resume from last saved progress
            test_mode: Process only 10 stocks for testing
        """
        if test_mode:
            max_stocks = 10
            logger.info("=== TEST MODE: Processing 10 stocks ===")
        
        # Get tickers
        tickers = self.ticker_fetcher.get_all_nse_tickers(use_cache=True, max_stocks=max_stocks)
        total = len(tickers)
        
        # Handle resume
        start_index = 0
        if resume:
            progress = self.load_progress()
            start_index = progress.get('last_processed_index', 0)
            logger.info(f"Resuming from index {start_index}")
        else:
            self.clear_progress()
        
        logger.info("=" * 60)
        logger.info("UNIFIED INGESTION PIPELINE")
        logger.info("=" * 60)
        logger.info(f"Total stocks: {total}")
        logger.info(f"Starting from: {start_index}")
        logger.info(f"Batch size: {self.batch_size}")
        logger.info(f"Fill gaps: {fill_gaps}")
        logger.info("=" * 60)
        
        # Print API status
        print_config_status()
        
        # Initialize
        self.stats['start_time'] = time.time()
        conn = self.get_db_connection()
        cursor = conn.cursor()
        processed_tickers = []
        
        try:
            # Process in batches
            for i in range(start_index, total, self.batch_size):
                batch = tickers[i:i + self.batch_size]
                batch_num = (i - start_index) // self.batch_size + 1
                total_batches = (total - start_index + self.batch_size - 1) // self.batch_size
                
                logger.info(f"\n--- Batch {batch_num}/{total_batches} ---")
                
                for j, ticker in enumerate(batch):
                    global_idx = i + j + 1
                    logger.info(f"[{global_idx}/{total}] {ticker}")
                    
                    success = self.process_stock(ticker, conn, cursor, fill_gaps)
                    
                    if success:
                        processed_tickers.append(ticker)
                
                # Save progress
                self.save_progress(i + len(batch), processed_tickers)
                
                # Progress update
                elapsed = time.time() - self.stats['start_time']
                processed = i + len(batch) - start_index
                rate = processed / elapsed if elapsed > 0 else 0
                remaining = (total - i - len(batch)) / rate if rate > 0 else 0
                
                logger.info(f"Progress: {i + len(batch)}/{total} ({(i + len(batch)) / total * 100:.1f}%)")
                logger.info(f"Rate: {rate:.1f} stocks/sec | ETA: {remaining / 60:.1f} min")
                
                # Show API quota status
                quota_status = self.api_provider.get_quota_status()
                quota_str = ', '.join([f"{k}:{v['remaining']}" for k, v in quota_status.items()])
                logger.info(f"API Quotas: {quota_str}")
                
                # Delay between batches
                if i + self.batch_size < total:
                    time.sleep(self.delay_between_batches)
        
        except KeyboardInterrupt:
            logger.info("\nInterrupted by user. Progress saved.")
        finally:
            cursor.close()
            conn.close()
        
        # Final stats
        self.stats['end_time'] = time.time()
        self._print_summary()
        
        # Save quality report
        report_path = self.quality_tracker.save_report()
        logger.info(f"Quality report saved: {report_path}")
        
        # Print quality summary
        self.quality_tracker.print_summary()
    
    def _print_summary(self):
        """Print final summary"""
        elapsed = self.stats['end_time'] - self.stats['start_time']
        
        logger.info("\n" + "=" * 60)
        logger.info("INGESTION COMPLETE")
        logger.info("=" * 60)
        logger.info(f"Processed: {self.stats['processed']}")
        logger.info(f"Errors: {self.stats['errors']}")
        logger.info(f"Skipped: {self.stats['skipped']}")
        logger.info(f"Total time: {elapsed / 60:.1f} minutes")
        logger.info("=" * 60)


def main():
    parser = argparse.ArgumentParser(description='Unified Stock Data Ingestion Pipeline')
    
    parser.add_argument('--test', action='store_true', 
                        help='Test mode: process only 10 stocks')
    parser.add_argument('--limit', type=int, 
                        help='Limit number of stocks to process')
    parser.add_argument('--no-fill-gaps', action='store_true',
                        help='Disable fallback API calls for missing data')
    parser.add_argument('--resume', action='store_true',
                        help='Resume from last saved progress')
    parser.add_argument('--batch-size', type=int, default=25,
                        help='Number of stocks per batch (default: 25)')
    parser.add_argument('--api-status', action='store_true',
                        help='Show API configuration status and exit')
    
    args = parser.parse_args()
    
    if args.api_status:
        print_config_status()
        return
    
    pipeline = UnifiedIngestionPipeline(batch_size=args.batch_size)
    
    pipeline.run(
        max_stocks=args.limit,
        fill_gaps=not args.no_fill_gaps,
        resume=args.resume,
        test_mode=args.test
    )


if __name__ == "__main__":
    main()
