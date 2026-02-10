import os
from datetime import datetime

import psycopg2
from psycopg2.extras import execute_batch
from dotenv import load_dotenv
import yfinance as yf


# Load environment variables from .env
load_dotenv(".env")

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "port": os.getenv("DB_PORT"),
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
}

# List of NSE stock tickers to ingest

# IT & Services
NSE_IT = ['TCS.NS', 'INFY.NS', 'WIPRO.NS', 'HCLTECH.NS', 'TECHM.NS', 'LTIM.NS', 'PERSISTENT.NS', 'COFORGE.NS', 'MPHASIS.NS', 'LTTS.NS']

# Banking & Finance
NSE_BANKING = ['HDFCBANK.NS', 'ICICIBANK.NS', 'KOTAKBANK.NS', 'AXISBANK.NS', 'SBIN.NS', 'INDUSINDBK.NS', 'BANDHANBNK.NS', 'FEDERALBNK.NS', 'IDFCFIRSTB.NS', 'PNB.NS']

# NBFCs & Financial Services
NSE_FINANCE = ['BAJFINANCE.NS', 'BAJAJFINSV.NS', 'HDFCLIFE.NS', 'SBILIFE.NS', 'ICICIPRULI.NS', 'HDFCAMC.NS', 'CHOLAFIN.NS', 'MUTHOOTFIN.NS', 'PNBHOUSING.NS']

# Energy & Oil
NSE_ENERGY = ['RELIANCE.NS', 'ONGC.NS', 'IOC.NS', 'BPCL.NS', 'NTPC.NS', 'POWERGRID.NS', 'COALINDIA.NS', 'ADANIPOWER.NS', 'TATAPOWER.NS']

# Auto & Auto Components
NSE_AUTO = ['MARUTI.NS', 'M&M.NS', 'TATAMOTORS.NS', 'BAJAJ-AUTO.NS', 'HEROMOTOCO.NS', 'EICHERMOT.NS', 'ASHOKLEY.NS', 'TVSMOTOR.NS', 'APOLLOTYRE.NS', 'MRF.NS']

# Pharma & Healthcare
NSE_PHARMA = ['SUNPHARMA.NS', 'DRREDDY.NS', 'CIPLA.NS', 'DIVISLAB.NS', 'AUROPHARMA.NS', 'TORNTPHARM.NS', 'BIOCON.NS', 'ALKEM.NS', 'LUPIN.NS', 'CADILAHC.NS']

# FMCG & Consumer
NSE_FMCG = ['ITC.NS', 'HINDUNILVR.NS', 'NESTLEIND.NS', 'BRITANNIA.NS', 'DABUR.NS', 'GODREJCP.NS', 'MARICO.NS', 'TATACONSUM.NS', 'COLPAL.NS', 'EMAMILTD.NS']

# Telecom & Media
NSE_TELECOM = ['BHARTIARTL.NS', 'IDEA.NS', 'ZEEL.NS', 'SUNTV.NS', 'PVRINOX.NS', 'DISHTV.NS']

# Cement & Construction
NSE_CEMENT = ['ULTRACEMCO.NS', 'GRASIM.NS', 'SHREECEM.NS', 'AMBUJACEM.NS', 'ACC.NS', 'RAMCOCEM.NS', 'JKCEMENT.NS', 'LT.NS', 'L&TFH.NS']

# Metals & Mining
NSE_METALS = ['TATASTEEL.NS', 'HINDALCO.NS', 'JSWSTEEL.NS', 'VEDL.NS', 'HINDZINC.NS', 'SAIL.NS', 'NMDC.NS', 'JINDALSTEL.NS', 'NATIONALUM.NS']

# Retail & Lifestyle
NSE_RETAIL = ['TITAN.NS', 'DMART.NS', 'TRENT.NS', 'ABFRL.NS', 'SHOPERSTOP.NS', 'JUBLFOOD.NS', 'WESTLIFE.NS']

# Paints & Chemicals
NSE_PAINTS = ['ASIANPAINT.NS', 'BERGER.NS', 'PIDILITIND.NS', 'AKZOINDIA.NS', 'KANSAINER.NS']

# Diversified
NSE_DIVERSIFIED = ['ADANIENT.NS', 'SIEMENS.NS', 'ABB.NS', 'HAVELLS.NS', 'VOLTAS.NS', 'CROMPTON.NS']

# Combine all NSE tickers
TICKERS = (NSE_IT + NSE_BANKING + NSE_FINANCE + NSE_ENERGY + NSE_AUTO + 
           NSE_PHARMA + NSE_FMCG + NSE_TELECOM + NSE_CEMENT + NSE_METALS + 
           NSE_RETAIL + NSE_PAINTS + NSE_DIVERSIFIED)


def get_db_connection():
    """Create and return a PostgreSQL database connection."""
    return psycopg2.connect(**DB_CONFIG)


def fetch_company_metadata(ticker):
    """
    Fetch company metadata using Yahoo Finance.
    Returns a dictionary containing basic company details.
    """
    stock = yf.Ticker(ticker)
    info = stock.info

    if not info or "symbol" not in info:
        print(f"No metadata found for {ticker}")
        return None

    return {
        "ticker": ticker,
        "name": info.get("longName"),
        "exchange": info.get("exchange"),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "market_cap": info.get("marketCap"),
    }


def fetch_price_history(ticker):
    """
    Fetch daily OHLCV price history for the last 6 months.
    Returns a list of tuples ready for database insertion.
    """
    stock = yf.Ticker(ticker)
    df = stock.history(period="6mo", interval="1d")

    if df.empty:
        print(f"No price data found for {ticker}")
        return []

    records = []
    for date, row in df.iterrows():
        records.append((
            date.to_pydatetime(),
            ticker,
            float(row["Open"]),
            float(row["High"]),
            float(row["Low"]),
            float(row["Close"]),
            int(row["Volume"]),
        ))

    return records


def run_ingestion():
    """
    Main ingestion pipeline.
    Inserts company metadata and historical price data into the database.
    """
    print("Starting data ingestion pipeline")

    conn = get_db_connection()
    cursor = conn.cursor()

    for ticker in TICKERS:
        print(f"Processing ticker: {ticker}")

        # Insert or update company metadata
        metadata = fetch_company_metadata(ticker)
        if metadata:
            cursor.execute(
                """
                INSERT INTO companies (ticker, name, exchange, sector, industry, market_cap)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (ticker) DO UPDATE
                SET
                    name = EXCLUDED.name,
                    exchange = EXCLUDED.exchange,
                    sector = EXCLUDED.sector,
                    industry = EXCLUDED.industry,
                    market_cap = EXCLUDED.market_cap;
                """,
                (
                    metadata["ticker"],
                    metadata["name"],
                    metadata["exchange"],
                    metadata["sector"],
                    metadata["industry"],
                    metadata["market_cap"],
                )
            )
            conn.commit()
            print(f"Metadata stored for {ticker}")

        # Insert historical price data
        price_records = fetch_price_history(ticker)
        if not price_records:
            print(f"No price records to insert for {ticker}")
            continue

        execute_batch(
            cursor,
            """
            INSERT INTO price_history (time, ticker, open, high, low, close, volume)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING;
            """,
            price_records
        )

        conn.commit()
        print(f"Inserted {len(price_records)} price rows for {ticker}")

    cursor.close()
    conn.close()

    print("Data ingestion completed successfully")


if __name__ == "__main__":
    run_ingestion()


# Command to run:
# python -m backend.ingestion.data_ingestion
