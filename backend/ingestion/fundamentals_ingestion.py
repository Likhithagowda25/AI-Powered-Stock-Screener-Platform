import os
import json
import psycopg2
from psycopg2.extras import execute_batch
from dotenv import load_dotenv

load_dotenv(".env")

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "port": os.getenv("DB_PORT"),
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
}

def get_db_connection():
    """Create and return a PostgreSQL database connection."""
    return psycopg2.connect(**DB_CONFIG)


def load_quarterly_fundamentals(json_file_path):
    """Load quarterly fundamentals from JSON file."""
    with open(json_file_path, 'r') as f:
        data = json.load(f)
    
    ticker = data.get('symbol')
    records = []
    
    for entry in data.get('data', []):
        # Extract quarter info
        quarter = entry.get('quarter', '')
        fiscal_year = entry.get('fiscal_year')
        date = entry.get('date')
        
        # Skip if no quarter info
        if not quarter or not date:
            continue
        
        # Format quarter as YYYY-QX
        quarter_str = f"{fiscal_year}-{quarter.split()[-1]}" if fiscal_year and quarter else None
        
        if not quarter_str:
            continue
        
        # Extract key fundamentals matching database schema
        record = {
            'ticker': ticker,
            'quarter': quarter_str,
            'revenue': entry.get('revenue'),
            'net_income': entry.get('net_income'),
            'eps': entry.get('diluted_eps'),
            'ebitda': entry.get('ebitda'),
            'operating_margin': entry.get('operating_margin'),
            'roe': entry.get('roe'),
            'roa': entry.get('roa'),
        }
        
        records.append(record)
    
    return records


def run_fundamentals_ingestion():
    """Main ingestion pipeline for fundamentals data."""
    print("Starting fundamentals data ingestion")
    
    # Path to quarterly fundamentals
    quarterly_path = os.path.join(
        os.path.dirname(__file__),
        '../../data/raw/fundamentals/quarterly'
    )
    
    if not os.path.exists(quarterly_path):
        print(f"Path not found: {quarterly_path}")
        return
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get all JSON files
    json_files = [f for f in os.listdir(quarterly_path) if f.endswith('.json')]
    
    for json_file in json_files:
        file_path = os.path.join(quarterly_path, json_file)
        print(f"Processing: {json_file}")
        
        try:
            records = load_quarterly_fundamentals(file_path)
            
            if not records:
                print(f"No records found in {json_file}")
                continue
            
            # Insert records
            for record in records:
                cursor.execute(
                    """
                    INSERT INTO fundamentals_quarterly (
                        ticker, quarter, revenue, net_income, eps, ebitda,
                        operating_margin, roe, roa
                    )
                    VALUES (
                        %(ticker)s, %(quarter)s, %(revenue)s, %(net_income)s, 
                        %(eps)s, %(ebitda)s, %(operating_margin)s, %(roe)s, %(roa)s
                    )
                    ON CONFLICT (ticker, quarter) DO UPDATE SET
                        revenue = EXCLUDED.revenue,
                        net_income = EXCLUDED.net_income,
                        eps = EXCLUDED.eps,
                        ebitda = EXCLUDED.ebitda,
                        operating_margin = EXCLUDED.operating_margin,
                        roe = EXCLUDED.roe,
                        roa = EXCLUDED.roa;
                    """,
                    record
                )
            
            conn.commit()
            print(f"Inserted {len(records)} fundamentals records from {json_file}")
            
        except Exception as e:
            print(f"Error processing {json_file}: {e}")
            conn.rollback()
    
    cursor.close()
    conn.close()
    print("Fundamentals ingestion completed")


if __name__ == "__main__":
    run_fundamentals_ingestion()

# Command to run:
# python -m backend.ingestion.fundamentals_ingestion
