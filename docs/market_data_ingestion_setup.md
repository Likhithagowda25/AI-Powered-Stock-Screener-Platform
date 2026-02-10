# Market Data Provider Integration & Ingestion

## Provider
Alpha Vantage

## Pipeline Flow
External API → market_data_service → data_ingestion → raw storage → database

## Environment Variables
- MARKETDATA_API_KEY
- MARKETDATA_BASE_URL

## Execution
python backend/ingestion/data_ingestion.py


Deliverable -> Purpose

market_data_service.py → API communication
data_ingestion.py → Pipeline orchestration
storage/raw → Raw audit storage
db_validation.sql → DB verification
logs/ → Monitoring & debugging

✔ API integration  
✔ Ingestion pipeline (raw stage)  
✔ Logging  
✔ Validation scripts  

