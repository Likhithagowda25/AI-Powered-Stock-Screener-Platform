import os
import psycopg2
from dotenv import load_dotenv
from backend.services.market_data_service import get_company_metadata

load_dotenv(".env")

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "port": os.getenv("DB_PORT"),
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
}


def run_metadata_ingestion():
    print("Starting company metadata ingestion...")

    tickers = [
        "INFY.NS",
        "TCS.NS",
        "RELIANCE.NS",
        "HDFCBANK.NS",
        "ICICIBANK.NS",
    ]

    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    insert_sql = """
        INSERT INTO companies
        (ticker, name, exchange, sector, industry, market_cap)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (ticker) DO NOTHING;
    """

    for ticker in tickers:
        metadata = get_company_metadata(ticker)
        if not metadata:
            continue

        cursor.execute(
            insert_sql,
            (
                metadata["ticker"],
                metadata["name"],
                metadata["exchange"],
                metadata["sector"],
                metadata["industry"],
                metadata["market_cap"],
            ),
        )

        conn.commit()
        print(f"Inserted metadata for {ticker}")

    cursor.close()
    conn.close()
    print("Metadata ingestion completed.")


if __name__ == "__main__":
    run_metadata_ingestion()


# Command to run:
# python -m backend.ingestion.metadata_ingestion