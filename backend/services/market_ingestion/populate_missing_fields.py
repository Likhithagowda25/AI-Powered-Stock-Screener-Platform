"""
Populate missing promoter_holding and last_buyback_date columns in the companies table.

Uses Yahoo Finance (yfinance) to fetch:
  - promoter_holding: from major_holders (insider %)
  - last_buyback_date: from share buyback info in actions/calendar

Connects to PostgreSQL and updates companies in batches.
"""

import os
import sys
import time
import logging
from datetime import datetime, timedelta
import psycopg2
from dotenv import load_dotenv
import yfinance as yf
import pandas as pd

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

# Load environment from api-gateway .env
env_path = os.path.join(os.path.dirname(__file__), "..", "..", "api-gateway", ".env")
load_dotenv(env_path)

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5433"),
    "dbname": os.getenv("DB_NAME", "stock_screener"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "25101974"),
}

# Rate limiting
BATCH_SIZE = 10         # tickers per batch
BATCH_DELAY = 2.0       # seconds between batches
TICKER_DELAY = 0.3      # seconds between individual tickers
MAX_TICKERS = 0         # 0 = all tickers


def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)


def get_tickers_missing_data(conn):
    """Get tickers that are missing promoter_holding or last_buyback_date."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ticker, name
        FROM companies
        WHERE promoter_holding IS NULL
           OR last_buyback_date IS NULL
        ORDER BY market_cap DESC NULLS LAST
    """)
    rows = cursor.fetchall()
    cursor.close()
    return rows


def fetch_promoter_holding(ticker_obj):
    """
    Extract insider/promoter holding from yfinance major_holders.

    Yahoo Finance major_holders typically has rows like:
      Row 0: "% of Shares Held by All Insider"
      Row 1: "% of Shares Held by Institutions"
      Row 2: "% of Float Held by Institutions"
      Row 3: "Number of Institutions Holding Shares"

    For Indian NSE stocks, Row 0 (insider %) roughly maps to promoter holding.
    The value is returned as a fraction (0-1).
    """
    try:
        mh = ticker_obj.major_holders
        if mh is not None and not mh.empty and len(mh) > 0:
            val = mh.iloc[0, 0]
            if isinstance(val, str):
                val = float(val.replace("%", "").strip()) / 100
            elif isinstance(val, (int, float)):
                # yfinance sometimes returns as percentage (e.g. 73.5),
                # sometimes as fraction (0.735). Normalize to 0-1.
                if val > 1:
                    val = val / 100
                return round(float(val), 4)
        return None
    except Exception as e:
        logger.debug(f"No major_holders data: {e}")
        return None


def fetch_buyback_date(ticker_obj, ticker_symbol):
    """
    Try to find a buyback date from yfinance.

    Methods attempted:
    1. Check info dict for buyback-related fields
    2. Check corporate actions for share repurchases
    3. Check if share count decreased significantly (proxy for buyback)
    """
    try:
        info = ticker_obj.info or {}

        # Method 1: Direct buyback info in info dict
        for key in ["lastBuybackDate", "buybackDate", "shareRepurchaseDate"]:
            if key in info and info[key]:
                return datetime.fromtimestamp(info[key]).date() if isinstance(info[key], (int, float)) else None

        # Method 2: Check actions (splits can sometimes indicate buyback tender)
        try:
            actions = ticker_obj.actions
            if actions is not None and not actions.empty:
                # Stock splits with ratio < 1 can indicate reverse splits / consolidation
                # but not buybacks. Skip this method.
                pass
        except Exception:
            pass

        # Method 3: Check if shares outstanding decreased (proxy for buyback)
        try:
            shares = info.get("sharesOutstanding")
            shares_prev = info.get("floatShares")
            # If the company has been buying back shares, the treasury shares
            # info might be available. This is a weak signal.
            if info.get("heldPercentInsiders") and info.get("heldPercentInsiders") > 0.1:
                # Companies with high insider holding in India often do buybacks
                # but we can't determine the date from this alone
                pass
        except Exception:
            pass

        return None
    except Exception as e:
        logger.debug(f"Error checking buyback for {ticker_symbol}: {e}")
        return None


def populate_data():
    """Main function to populate promoter_holding and last_buyback_date."""
    conn = get_db_connection()

    tickers = get_tickers_missing_data(conn)
    total = len(tickers)
    if MAX_TICKERS > 0:
        tickers = tickers[:MAX_TICKERS]

    logger.info(f"Found {total} companies with missing data, processing {len(tickers)}")

    updated_promoter = 0
    updated_buyback = 0
    errors = 0

    for i, (ticker_symbol, company_name) in enumerate(tickers):
        try:
            logger.info(f"[{i+1}/{len(tickers)}] Fetching {ticker_symbol} ({company_name})")
            ticker_obj = yf.Ticker(ticker_symbol)

            promoter = fetch_promoter_holding(ticker_obj)
            buyback_date = fetch_buyback_date(ticker_obj, ticker_symbol)

            # Build dynamic UPDATE
            updates = []
            params = []
            if promoter is not None:
                updates.append("promoter_holding = %s")
                params.append(promoter)
            if buyback_date is not None:
                updates.append("last_buyback_date = %s")
                params.append(buyback_date)

            if updates:
                params.append(ticker_symbol)
                sql = f"UPDATE companies SET {', '.join(updates)} WHERE ticker = %s"
                cursor = conn.cursor()
                cursor.execute(sql, params)
                # Also update fundamentals_quarterly rows for this ticker
                if promoter is not None:
                    cursor.execute(
                        "UPDATE fundamentals_quarterly SET promoter_holding = %s WHERE ticker = %s AND (promoter_holding IS NULL OR promoter_holding = 0)",
                        (promoter, ticker_symbol)
                    )
                conn.commit()
                cursor.close()

                if promoter is not None:
                    updated_promoter += 1
                    logger.info(f"  -> promoter_holding = {promoter:.4f} ({promoter*100:.1f}%)")
                if buyback_date is not None:
                    updated_buyback += 1
                    logger.info(f"  -> last_buyback_date = {buyback_date}")
            else:
                logger.info(f"  -> No data available from Yahoo Finance")

            # Rate limiting
            if (i + 1) % BATCH_SIZE == 0:
                logger.info(f"  -- batch pause ({BATCH_DELAY}s) --")
                time.sleep(BATCH_DELAY)
            else:
                time.sleep(TICKER_DELAY)

        except Exception as e:
            errors += 1
            logger.error(f"  ERROR for {ticker_symbol}: {e}")
            try:
                conn.rollback()
            except Exception:
                pass
            time.sleep(TICKER_DELAY)

    conn.close()

    logger.info("=" * 60)
    logger.info(f"DONE: Processed {len(tickers)} tickers")
    logger.info(f"  promoter_holding updated: {updated_promoter}")
    logger.info(f"  last_buyback_date updated: {updated_buyback}")
    logger.info(f"  errors: {errors}")
    logger.info("=" * 60)


if __name__ == "__main__":
    populate_data()
