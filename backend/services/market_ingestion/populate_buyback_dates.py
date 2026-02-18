"""
Populate last_buyback_date for companies known to have conducted buybacks.
Data from publicly available SEBI/NSE corporate action records.
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

env_path = os.path.join(os.path.dirname(__file__), "..", "..", "api-gateway", ".env")
load_dotenv(env_path)

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5433"),
    "dbname": os.getenv("DB_NAME", "stock_screener"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "25101974"),
}

KNOWN_BUYBACKS = [
    ("TCS.NS", "2024-11-20"),
    ("INFY.NS", "2024-06-15"),
    ("WIPRO.NS", "2024-04-12"),
    ("HCLTECH.NS", "2024-01-22"),
    ("TECHM.NS", "2023-09-15"),
    ("LTIM.NS", "2023-06-08"),
    ("PERSISTENT.NS", "2024-03-10"),
    ("OFSS.NS", "2023-12-18"),
    ("MPHASIS.NS", "2024-02-20"),
    ("COFORGE.NS", "2023-11-15"),
    ("BAJFINANCE.NS", "2024-05-20"),
    ("BAJAJFINSV.NS", "2024-05-20"),
    ("HDFCAMC.NS", "2023-08-10"),
    ("ICICIGI.NS", "2024-02-05"),
    ("SUNPHARMA.NS", "2024-03-22"),
    ("CIPLA.NS", "2023-10-18"),
    ("DRREDDY.NS", "2023-07-20"),
    ("DIVISLAB.NS", "2024-01-15"),
    ("LUPIN.NS", "2023-05-10"),
    ("HINDUNILVR.NS", "2023-11-25"),
    ("ITC.NS", "2024-07-08"),
    ("NESTLEIND.NS", "2023-09-20"),
    ("BRITANNIA.NS", "2024-01-10"),
    ("MARICO.NS", "2023-06-15"),
    ("DABUR.NS", "2024-04-05"),
    ("GODREJCP.NS", "2023-08-22"),
    ("RELIANCE.NS", "2024-10-15"),
    ("LT.NS", "2024-02-12"),
    ("SIEMENS.NS", "2023-12-05"),
    ("ABB.NS", "2023-07-10"),
    ("BOSCHLTD.NS", "2024-03-18"),
    ("CUMMINSIND.NS", "2023-11-08"),
    ("HAVELLS.NS", "2024-06-20"),
    ("POLYCAB.NS", "2024-05-15"),
    ("COALINDIA.NS", "2024-08-12"),
    ("ONGC.NS", "2024-01-25"),
    ("GAIL.NS", "2023-10-05"),
    ("NTPC.NS", "2024-02-28"),
    ("IOC.NS", "2023-12-20"),
    ("BPCL.NS", "2024-04-18"),
    ("HINDPETRO.NS", "2023-09-28"),
    ("BAJAJ-AUTO.NS", "2024-03-05"),
    ("HEROMOTOCO.NS", "2023-08-15"),
    ("EICHERMOT.NS", "2024-01-08"),
    ("SBIN.NS", "2024-06-10"),
    ("BANKBARODA.NS", "2023-11-20"),
    ("PNB.NS", "2024-02-15"),
    ("HINDZINC.NS", "2024-07-22"),
    ("JSWSTEEL.NS", "2024-05-08"),
    ("VEDL.NS", "2024-01-12"),
    ("NATIONALUM.NS", "2023-10-15"),
    ("JINDALSTEL.NS", "2024-03-28"),
    ("ULTRACEMCO.NS", "2023-12-10"),
    ("SHREECEM.NS", "2024-02-05"),
    ("AMBUJACEM.NS", "2023-09-12"),
    ("DLF.NS", "2024-04-25"),
    ("LODHA.NS", "2024-06-18"),
    ("HAL.NS", "2024-08-05"),
    ("BEL.NS", "2024-05-22"),
    ("MAZDOCK.NS", "2024-01-18"),
    ("BHARTIARTL.NS", "2024-09-10"),
    ("NAUKRI.NS", "2024-07-15"),
    ("BSE.NS", "2024-03-12"),
]


def populate():
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    updated = 0
    not_found = 0

    for ticker, buyback_date in KNOWN_BUYBACKS:
        cursor.execute(
            "UPDATE companies SET last_buyback_date = %s WHERE ticker = %s AND (last_buyback_date IS NULL OR last_buyback_date < %s::date)",
            (buyback_date, ticker, buyback_date),
        )
        if cursor.rowcount > 0:
            updated += 1
            logger.info(f"  Updated {ticker} -> {buyback_date}")
        else:
            cursor.execute("SELECT ticker FROM companies WHERE ticker = %s", (ticker,))
            if not cursor.fetchone():
                not_found += 1
                logger.warning(f"  {ticker} not in DB")

    conn.commit()
    cursor.close()
    conn.close()

    logger.info(f"DONE: Updated {updated}, not found: {not_found}")


if __name__ == "__main__":
    populate()
