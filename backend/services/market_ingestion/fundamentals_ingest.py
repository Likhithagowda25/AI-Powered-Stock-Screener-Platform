"""
Fundamentals Ingestion Pipeline
Fetches and stores quarterly/annual financial statements

Features:
- Income statement ingestion
- Balance sheet ingestion
- Cash flow statement ingestion
- Financial ratios calculation
- Data normalization and validation
"""

import os
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import yfinance as yf

# Configure logging
log_dir = Path(__file__).parent.parent.parent / 'logs'
log_dir.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_dir / f'fundamentals_ingestion_{datetime.now().strftime("%Y%m%d")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class FundamentalsIngestionPipeline:
    """Pipeline for ingesting fundamental financial data"""
    
    def __init__(self, provider: str = 'yahoo'):
        """Initialize pipeline"""
        self.provider = provider
        
        # Database connection
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': int(os.getenv('DB_PORT', '5433')),
            'database': os.getenv('DB_NAME', 'stock_screener'),
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', '25101974')
        }
        
        # Storage paths
        self.storage_root = Path(__file__).parent.parent.parent.parent / 'storage'
        self.processed_dir = self.storage_root / 'processed' / 'fundamentals' / datetime.now().strftime('%Y-%m-%d')
        self.processed_dir.mkdir(parents=True, exist_ok=True)
        
        # Data processed directory for CSV files
        self.data_processed_dir = Path(__file__).parent.parent.parent.parent / 'data' / 'processed' / 'fundamentals'
        self.data_processed_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Initialized FundamentalsIngestionPipeline with provider: {provider}")
    
    def get_db_connection(self):
        """Get database connection"""
        try:
            conn = psycopg2.connect(**self.db_config)
            logger.info("PostgreSQL connection established")
            return conn
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise
    
    def save_processed_data(self, data: Dict, filename: str):
        """Save processed data to file"""
        filepath = self.processed_dir / filename
        try:
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            logger.debug(f"Saved processed data to {filepath}")
        except Exception as e:
            logger.error(f"Failed to save processed data: {e}")
    
    def save_normalized_csv(self, data: List[Dict], symbol: str, period: str):
        """Save normalized data as CSV to data/processed/fundamentals/"""
        try:
            # Create period-specific directory
            period_dir = self.data_processed_dir / period
            period_dir.mkdir(exist_ok=True)
            
            # Convert to DataFrame
            df = pd.DataFrame(data)
            
            # Select and order columns for CSV output
            csv_columns = [
                'ticker', 'date', 'quarter', 'revenue', 'gross_profit', 'ebitda', 
                'operating_income', 'net_income', 'diluted_eps', 'total_debt', 
                'cash_and_equivalents', 'free_cash_flow', 'debt_to_equity', 
                'debt_to_fcf_ratio', 'pe_ratio', 'peg_ratio', 'pb_ratio', 'ps_ratio',
                'promoter_holding', 'institutional_holding', 'price_target_high',
                'price_target_low', 'price_target_avg', 'eps_estimate',
                'buybacks', 'dividends', 'splits', 'roe', 'roa', 'operating_margin',
                'ebitda_margin', 'current_ratio', 'total_assets', 'operating_cash_flow'
            ]
            
            # Keep only columns that exist in the data
            available_columns = [col for col in csv_columns if col in df.columns]
            df_output = df[available_columns]
            
            # Save CSV
            csv_filename = f"{symbol}_{period}_normalized.csv"
            csv_path = period_dir / csv_filename
            df_output.to_csv(csv_path, index=False)
            logger.info(f"Saved normalized CSV: {csv_path}")
            
        except Exception as e:
            logger.error(f"Failed to save normalized CSV for {symbol}: {e}")
    
    def safe_get(self, row, key: str) -> Optional[float]:
        """Safely get value from row, handling missing keys and NaN"""
        try:
            if key in row.index:
                val = row[key]
                if pd.notna(val):
                    return float(val)
            return None
        except Exception:
            return None
    
    def fetch_income_statement(self, symbol: str, period: str = 'quarterly') -> List[Dict]:
        """
        Fetch income statement data
        
        Args:
            symbol: Stock symbol
            period: 'quarterly' or 'annual'
        
        Returns:
            List of income statement records
        """
        try:
            ticker = yf.Ticker(symbol)
            
            if period == 'quarterly':
                df = ticker.quarterly_financials
            else:
                df = ticker.financials
            
            if df is None or df.empty:
                return []
            
            # Transpose so dates are rows
            df = df.T
            df = df.sort_index()
            
            records = []
            for date, row in df.iterrows():
                fiscal_year = date.year
                fiscal_quarter = f"Q{((date.month - 1) // 3) + 1} {fiscal_year}"
                
                records.append({
                    'ticker': symbol,
                    'date': date.strftime('%Y-%m-%d'),
                    'quarter': fiscal_quarter,
                    'fiscal_year': fiscal_year,
                    'revenue': self.safe_get(row, 'Total Revenue'),
                    'gross_profit': self.safe_get(row, 'Gross Profit'),
                    'operating_income': self.safe_get(row, 'Operating Income'),
                    'ebitda': self.safe_get(row, 'EBITDA'),
                    'net_income': self.safe_get(row, 'Net Income'),
                    'diluted_eps': None,
                })
            
            return records
            
        except Exception as e:
            logger.error(f"Error fetching income statement for {symbol}: {e}")
            return []
    
    def fetch_balance_sheet(self, symbol: str, period: str = 'quarterly') -> List[Dict]:
        """
        Fetch balance sheet data
        
        Args:
            symbol: Stock symbol
            period: 'quarterly' or 'annual'
        
        Returns:
            List of balance sheet records
        """
        try:
            ticker = yf.Ticker(symbol)
            
            if period == 'quarterly':
                df = ticker.quarterly_balance_sheet
            else:
                df = ticker.balance_sheet
            
            if df is None or df.empty:
                return []
            
            df = df.T
            df = df.sort_index()
            
            records = []
            for date, row in df.iterrows():
                fiscal_quarter = f"Q{((date.month - 1) // 3) + 1} {date.year}"
                
                records.append({
                    'ticker': symbol,
                    'date': date.strftime('%Y-%m-%d'),
                    'quarter': fiscal_quarter,
                    'total_assets': self.safe_get(row, 'Total Assets'),
                    'current_assets': self.safe_get(row, 'Current Assets'),
                    'total_liabilities': self.safe_get(row, 'Total Liabilities Net Minority Interest'),
                    'current_liabilities': self.safe_get(row, 'Current Liabilities'),
                    'total_debt': self.safe_get(row, 'Total Debt'),
                    'total_equity': self.safe_get(row, 'Total Equity Gross Minority Interest'),
                    'cash_and_equivalents': self.safe_get(row, 'Cash And Cash Equivalents'),
                })
            
            return records
            
        except Exception as e:
            logger.error(f"Error fetching balance sheet for {symbol}: {e}")
            return []
    
    def fetch_cash_flow(self, symbol: str, period: str = 'quarterly') -> List[Dict]:
        """
        Fetch cash flow statement data
        
        Args:
            symbol: Stock symbol
            period: 'quarterly' or 'annual'
        
        Returns:
            List of cash flow records
        """
        try:
            ticker = yf.Ticker(symbol)
            
            if period == 'quarterly':
                df = ticker.quarterly_cashflow
            else:
                df = ticker.cashflow
            
            if df is None or df.empty:
                return []
            
            df = df.T
            df = df.sort_index()
            
            records = []
            for date, row in df.iterrows():
                fiscal_quarter = f"Q{((date.month - 1) // 3) + 1} {date.year}"
                
                operating_cf = self.safe_get(row, 'Operating Cash Flow')
                capex = self.safe_get(row, 'Capital Expenditure')
                
                # Calculate Free Cash Flow
                free_cash_flow = None
                if operating_cf is not None and capex is not None:
                    free_cash_flow = operating_cf + capex  # capex is negative
                
                records.append({
                    'ticker': symbol,
                    'date': date.strftime('%Y-%m-%d'),
                    'quarter': fiscal_quarter,
                    'operating_cash_flow': operating_cf,
                    'investing_cash_flow': self.safe_get(row, 'Investing Cash Flow'),
                    'financing_cash_flow': self.safe_get(row, 'Financing Cash Flow'),
                    'capex': capex,
                    'free_cash_flow': free_cash_flow,
                })
            
            return records
            
        except Exception as e:
            logger.error(f"Error fetching cash flow for {symbol}: {e}")
            return []
    
    def fetch_market_data(self, symbol: str) -> Dict:
        """Fetch current market data and ratios"""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            return {
                'pe_ratio': info.get('trailingPE') or info.get('forwardPE'),
                'peg_ratio': info.get('pegRatio'),
                'pb_ratio': info.get('priceToBook'),
                'ps_ratio': info.get('priceToSalesTrailing12Months'),
                'price_target_high': info.get('targetHighPrice'),
                'price_target_low': info.get('targetLowPrice'),
                'price_target_avg': info.get('targetMeanPrice'),
            }
        except Exception as e:
            logger.warning(f"Error fetching market data for {symbol}: {e}")
            return {}
    
    def fetch_shareholding_data(self, symbol: str) -> Dict:
        """Fetch shareholding information"""
        try:
            ticker = yf.Ticker(symbol)
            
            # Get institutional holders
            institutional = ticker.institutional_holders
            institutional_pct = 0
            if institutional is not None and not institutional.empty:
                institutional_pct = institutional['% Out'].sum() if '% Out' in institutional.columns else 0
            
            # Get major holders (includes insider/promoter data)
            major_holders = ticker.major_holders
            promoter_pct = 0
            if major_holders is not None and not major_holders.empty:
                # First row typically shows insider percentage
                if len(major_holders) > 0:
                    promoter_pct = major_holders.iloc[0, 0] if isinstance(major_holders.iloc[0, 0], (int, float)) else 0
            
            return {
                'promoter_holding': promoter_pct,
                'institutional_holding': institutional_pct,
            }
        except Exception as e:
            logger.warning(f"Error fetching shareholding data for {symbol}: {e}")
            return {}
    
    def fetch_estimates_and_actions(self, symbol: str) -> Dict:
        """Fetch analyst estimates, buybacks, dividends, splits"""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            # Get earnings estimates
            earnings_estimate = ticker.earnings_estimate
            eps_estimate = None
            if earnings_estimate is not None and not earnings_estimate.empty:
                current_quarter = earnings_estimate.columns[0] if len(earnings_estimate.columns) > 0 else None
                if current_quarter:
                    eps_estimate = earnings_estimate.loc['Avg. Estimate', current_quarter] if 'Avg. Estimate' in earnings_estimate.index else None
            
            # Get dividends
            dividends = ticker.dividends
            latest_dividend = dividends.iloc[-1] if dividends is not None and not dividends.empty else None
            
            # Get splits
            splits = ticker.splits
            latest_split = splits.iloc[-1] if splits is not None and not splits.empty else None
            
            return {
                'eps_estimate': eps_estimate,
                'latest_dividend': latest_dividend,
                'latest_split': latest_split,
                'buybacks': info.get('sharesOutstanding'),  # Share buyback info not directly available
            }
        except Exception as e:
            logger.warning(f"Error fetching estimates/actions for {symbol}: {e}")
            return {}
    
    def fetch_all_fundamentals(self, symbol: str) -> Dict:
        """
        Fetch all fundamental data for a symbol
        
        Returns:
            Dict with all financial statements (quarterly and annual)
        """
        return {
            'income_quarterly': self.fetch_income_statement(symbol, 'quarterly'),
            'income_annual': self.fetch_income_statement(symbol, 'annual'),
            'balance_quarterly': self.fetch_balance_sheet(symbol, 'quarterly'),
            'balance_annual': self.fetch_balance_sheet(symbol, 'annual'),
            'cashflow_quarterly': self.fetch_cash_flow(symbol, 'quarterly'),
            'cashflow_annual': self.fetch_cash_flow(symbol, 'annual'),
            'market_data': self.fetch_market_data(symbol),
            'shareholding': self.fetch_shareholding_data(symbol),
            'estimates': self.fetch_estimates_and_actions(symbol),
        }
    
    def merge_financial_data(self, income: List[Dict], balance: List[Dict], cashflow: List[Dict], 
                            market_data: Dict, shareholding: Dict, estimates: Dict) -> List[Dict]:
        """
        Merge income, balance sheet, cash flow, and market data by date
        
        Returns:
            List of merged financial records
        """
        # Create lookup dictionaries
        balance_lookup = {(r['ticker'], r['date']): r for r in balance}
        cashflow_lookup = {(r['ticker'], r['date']): r for r in cashflow}
        
        merged = []
        for inc in income:
            key = (inc['ticker'], inc['date'])
            bal = balance_lookup.get(key, {})
            cf = cashflow_lookup.get(key, {})
            
            # Merge all data
            record = {
                **inc,
                'total_assets': bal.get('total_assets'),
                'total_liabilities': bal.get('total_liabilities'),
                'total_equity': bal.get('total_equity'),
                'total_debt': bal.get('total_debt'),
                'cash_and_equivalents': bal.get('cash_and_equivalents'),
                'current_assets': bal.get('current_assets'),
                'current_liabilities': bal.get('current_liabilities'),
                'operating_cash_flow': cf.get('operating_cash_flow'),
                'investing_cash_flow': cf.get('investing_cash_flow'),
                'financing_cash_flow': cf.get('financing_cash_flow'),
                'free_cash_flow': cf.get('free_cash_flow'),
                'capex': cf.get('capex'),
                # Add market data
                'pe_ratio': market_data.get('pe_ratio'),
                'peg_ratio': market_data.get('peg_ratio'),
                'pb_ratio': market_data.get('pb_ratio'),
                'ps_ratio': market_data.get('ps_ratio'),
                'price_target_high': market_data.get('price_target_high'),
                'price_target_low': market_data.get('price_target_low'),
                'price_target_avg': market_data.get('price_target_avg'),
                # Add shareholding
                'promoter_holding': shareholding.get('promoter_holding'),
                'institutional_holding': shareholding.get('institutional_holding'),
                # Add estimates
                'eps_estimate': estimates.get('eps_estimate'),
                'dividends': estimates.get('latest_dividend'),
                'splits': estimates.get('latest_split'),
                'buybacks': estimates.get('buybacks'),
            }
            
            # Calculate derived metrics
            record = self.calculate_derived_metrics(record)
            
            merged.append(record)
        
        return merged
        cashflow_lookup = {(r['ticker'], r['date']): r for r in cashflow}
        
        merged = []
        for inc in income:
            key = (inc['ticker'], inc['date'])
            bal = balance_lookup.get(key, {})
            cf = cashflow_lookup.get(key, {})
            
            # Merge all data
            record = {
                **inc,
                'total_assets': bal.get('total_assets'),
                'total_liabilities': bal.get('total_liabilities'),
                'total_equity': bal.get('total_equity'),
                'total_debt': bal.get('total_debt'),
                'cash_and_equivalents': bal.get('cash_and_equivalents'),
                'current_assets': bal.get('current_assets'),
                'current_liabilities': bal.get('current_liabilities'),
                'operating_cash_flow': cf.get('operating_cash_flow'),
                'investing_cash_flow': cf.get('investing_cash_flow'),
                'financing_cash_flow': cf.get('financing_cash_flow'),
                'free_cash_flow': cf.get('free_cash_flow'),
                'capex': cf.get('capex'),
            }
            
            # Calculate derived metrics
            record = self.calculate_derived_metrics(record)
            
            merged.append(record)
        
        return merged
    
    def calculate_derived_metrics(self, record: Dict) -> Dict:
        """Calculate derived financial metrics"""
        try:
            # Debt to Equity
            if record.get('total_debt') and record.get('total_equity'):
                record['debt_to_equity'] = record['total_debt'] / record['total_equity']
            else:
                record['debt_to_equity'] = None
            
            # Current Ratio
            if record.get('current_assets') and record.get('current_liabilities') and record['current_liabilities'] > 0:
                record['current_ratio'] = record['current_assets'] / record['current_liabilities']
            else:
                record['current_ratio'] = None
            
            # Operating Margin
            if record.get('operating_income') and record.get('revenue') and record['revenue'] > 0:
                record['operating_margin'] = (record['operating_income'] / record['revenue']) * 100
            else:
                record['operating_margin'] = None
            
            # Net Profit Margin
            if record.get('net_income') and record.get('revenue') and record['revenue'] > 0:
                record['net_profit_margin'] = (record['net_income'] / record['revenue']) * 100
            else:
                record['net_profit_margin'] = None
            
            # ROE (Return on Equity)
            if record.get('net_income') and record.get('total_equity') and record['total_equity'] > 0:
                record['roe'] = (record['net_income'] / record['total_equity']) * 100
            else:
                record['roe'] = None
            
            # ROA (Return on Assets)
            if record.get('net_income') and record.get('total_assets') and record['total_assets'] > 0:
                record['roa'] = (record['net_income'] / record['total_assets']) * 100
            else:
                record['roa'] = None
            
            # Debt to FCF
            if record.get('total_debt') and record.get('free_cash_flow') and record['free_cash_flow'] > 0:
                record['debt_to_fcf_ratio'] = record['total_debt'] / record['free_cash_flow']
            else:
                record['debt_to_fcf_ratio'] = None
            
            # EBITDA Margin
            if record.get('ebitda') and record.get('revenue') and record['revenue'] > 0:
                record['ebitda_margin'] = (record['ebitda'] / record['revenue']) * 100
            else:
                record['ebitda_margin'] = None
            
        except Exception as e:
            logger.warning(f"Error calculating derived metrics: {e}")
        
        return record
    
    def safe_int(self, val) -> Optional[int]:
        """Convert value to int safely, handling NaN"""
        if pd.isna(val) or val is None:
            return None
        try:
            return int(val)
        except (ValueError, OverflowError, TypeError):
            return None
    
    def safe_float(self, val) -> Optional[float]:
        """Convert value to float safely, handling NaN"""
        if pd.isna(val) or val is None:
            return None
        try:
            return float(val)
        except (ValueError, OverflowError, TypeError):
            return None
    
    def ensure_company_exists(self, ticker: str, cursor):
        """Ensure company exists in companies table"""
        cursor.execute("SELECT ticker FROM companies WHERE ticker = %s", (ticker,))
        result = cursor.fetchone()
        
        if not result:
            # Extract exchange and name from ticker
            exchange = 'NSE' if '.NS' in ticker else 'BSE' if '.BO' in ticker else 'NASDAQ'
            name = ticker.replace('.NS', '').replace('.BO', '')
            
            # Insert new company
            cursor.execute(
                """INSERT INTO companies (ticker, name, exchange) 
                   VALUES (%s, %s, %s) 
                   ON CONFLICT (ticker) DO NOTHING""",
                (ticker, name, exchange)
            )
            logger.info(f"Created company record: {ticker}")
    
    def quarter_to_timestamp(self, quarter_str: str) -> Optional[str]:
        """Convert quarter string (Q1 2024) to ISO timestamp"""
        try:
            parts = quarter_str.strip().split()
            if len(parts) != 2:
                return None
            
            quarter = parts[0]  # Q1, Q2, Q3, Q4
            year = int(parts[1])
            
            # Map quarter to month (end of quarter)
            quarter_map = {
                'Q1': '03-31',
                'Q2': '06-30',
                'Q3': '09-30',
                'Q4': '12-31'
            }
            
            month_day = quarter_map.get(quarter)
            if not month_day:
                return None
            
            return f"{year}-{month_day}"
        except Exception as e:
            logger.warning(f"Failed to convert quarter to timestamp: {quarter_str} - {e}")
            return None
    
    def normalize_currency(self, value: Optional[float], from_currency: str = 'INR', to_currency: str = 'USD') -> Optional[float]:
        """Convert currency values (INR to USD)"""
        if value is None:
            return None
        
        # Approximate exchange rates (should fetch from API in production)
        exchange_rates = {
            ('INR', 'USD'): 0.012,  # 1 INR = 0.012 USD
            ('USD', 'INR'): 83.0,   # 1 USD = 83 INR
            ('INR', 'INR'): 1.0,
            ('USD', 'USD'): 1.0
        }
        
        rate = exchange_rates.get((from_currency, to_currency), 1.0)
        return value * rate
    
    def standardize_field_names(self, record: Dict) -> Dict:
        """Standardize field names across different data sources"""
        # Field name mapping from various sources to our standard
        field_mapping = {
            # Income statement variations
            'Total Revenue': 'revenue',
            'totalRevenue': 'revenue',
            'sales': 'revenue',
            'Net Income': 'net_income',
            'netIncome': 'net_income',
            'profit': 'net_income',
            'EBITDA': 'ebitda',
            'Operating Income': 'operating_income',
            'operatingIncome': 'operating_income',
            
            # Balance sheet variations
            'Total Assets': 'total_assets',
            'totalAssets': 'total_assets',
            'Total Debt': 'total_debt',
            'totalDebt': 'total_debt',
            'Total Equity': 'total_equity',
            'totalEquity': 'total_equity',
            'stockholdersEquity': 'total_equity',
            'Current Assets': 'current_assets',
            'currentAssets': 'current_assets',
            'Current Liabilities': 'current_liabilities',
            'currentLiabilities': 'current_liabilities',
            
            # Cash flow variations
            'Operating Cash Flow': 'operating_cash_flow',
            'operatingCashFlow': 'operating_cash_flow',
            'Free Cash Flow': 'free_cash_flow',
            'freeCashFlow': 'free_cash_flow',
        }
        
        standardized = {}
        for key, value in record.items():
            # Use mapped name if exists, otherwise keep original
            std_key = field_mapping.get(key, key.lower().replace(' ', '_'))
            standardized[std_key] = value
        
        return standardized
    
    def ingest_fundamentals(self, symbols: List[str], period: str = 'quarterly') -> int:
        """
        Ingest fundamental data for given symbols
        
        Args:
            symbols: List of stock symbols
            period: 'quarterly' or 'annual'
        
        Returns:
            Number of records successfully ingested
        """
        logger.info(f"Starting {period} fundamentals ingestion for {len(symbols)} symbols")
        
        conn = self.get_db_connection()
        cursor = conn.cursor()
        total_records = 0
        
        for symbol in symbols:
            try:
                # Fetch all fundamental data
                logger.info(f"Fetching data for {symbol}...")
                data = self.fetch_all_fundamentals(symbol)
                
                # Select appropriate period data
                if period == 'quarterly':
                    income = data['income_quarterly']
                    balance = data['balance_quarterly']
                    cashflow = data['cashflow_quarterly']
                else:
                    income = data['income_annual']
                    balance = data['balance_annual']
                    cashflow = data['cashflow_annual']
                
                if not income:
                    logger.warning(f"No {period} data for {symbol}")
                    continue
                
                # Get additional data
                market_data = data.get('market_data', {})
                shareholding = data.get('shareholding', {})
                estimates = data.get('estimates', {})
                
                # Merge financial statements
                merged_data = self.merge_financial_data(income, balance, cashflow, 
                                                       market_data, shareholding, estimates)
                
                # Save processed JSON data
                self.save_processed_data(
                    {'symbol': symbol, 'period': period, 'data': merged_data},
                    f'{period}_{symbol}.json'
                )
                
                # Save normalized CSV
                self.save_normalized_csv(merged_data, symbol, period)
                
                # Prepare for database insertion with preprocessing
                for record in merged_data:
                    # Ensure company exists in companies table (normalization)
                    self.ensure_company_exists(record['ticker'], cursor)
                    
                    # Standardize field names
                    record = self.standardize_field_names(record)
                    
                    # Convert reporting period to ISO timestamp
                    period_timestamp = self.quarter_to_timestamp(record.get('quarter', ''))
                    
                    values = (
                        record['ticker'],
                        record.get('quarter'),
                        self.safe_int(record.get('revenue')),
                        self.safe_int(record.get('net_income')),
                        self.safe_float(record.get('diluted_eps') or record.get('eps_estimate')),
                        self.safe_float(record.get('operating_margin')),
                        self.safe_float(record.get('roe')),
                        self.safe_float(record.get('roa')),
                        self.safe_float(record.get('pe_ratio')),
                        self.safe_float(record.get('pb_ratio')),
                        self.safe_float(record.get('debt_to_equity')),
                        self.safe_float(record.get('current_ratio')),
                        self.safe_int(record.get('total_assets')),
                        self.safe_int(record.get('total_debt')),
                        self.safe_int(record.get('free_cash_flow')),
                        self.safe_int(record.get('ebitda')),
                        self.safe_float(record.get('ebitda_margin')),
                        self.safe_int(record.get('operating_cash_flow')),
                        datetime.now()
                    )
                    
                    # Insert individual record
                    insert_query = """
                        INSERT INTO fundamentals_quarterly 
                        (ticker, quarter, revenue, net_income, eps, operating_margin, roe, roa, 
                         pe_ratio, pb_ratio, debt_to_equity, current_ratio, total_assets, total_debt, 
                         free_cash_flow, ebitda, ebitda_margin, operating_cash_flow, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                    """
                    
                    cursor.execute(insert_query, values)
                
                conn.commit()
                
                total_records += len(merged_data)
                logger.info(f"[OK] Ingested {len(merged_data)} {period} records for {symbol}")
                
            except Exception as e:
                logger.error(f"[FAILED] Failed to ingest fundamentals for {symbol}: {e}")
                conn.rollback()
                continue
        
        cursor.close()
        conn.close()
        
        logger.info(f"{period.capitalize()} fundamentals ingestion complete: {total_records} total records")
        return total_records
    
    def run_full_ingestion(self, symbols: List[str]):
        """Run complete fundamentals ingestion"""
        logger.info("="*60)
        logger.info("STARTING FUNDAMENTALS INGESTION PIPELINE")
        logger.info("="*60)
        logger.info(f"Provider: {self.provider}")
        logger.info(f"Symbols: {len(symbols)}")
        logger.info("="*60)
        
        start_time = datetime.now()
        
        # Ingest quarterly data
        logger.info("\n[1/2] Ingesting quarterly fundamentals...")
        quarterly_records = self.ingest_fundamentals(symbols, period='quarterly')
        
        # Ingest annual data
        logger.info("\n[2/2] Ingesting annual fundamentals...")
        annual_records = self.ingest_fundamentals(symbols, period='annual')
        
        # Summary
        elapsed = datetime.now() - start_time
        logger.info("\n" + "="*60)
        logger.info("FUNDAMENTALS INGESTION COMPLETE")
        logger.info("="*60)
        logger.info(f"Quarterly records: {quarterly_records}")
        logger.info(f"Annual records: {annual_records}")
        logger.info(f"Total records: {quarterly_records + annual_records}")
        logger.info(f"Time elapsed: {elapsed}")
        logger.info(f"Processed data saved to: {self.processed_dir}")
        logger.info("="*60)


def main():
    """Main entry point"""
    
    # NSE IT & Services
    NSE_IT = ['TCS.NS', 'INFY.NS', 'WIPRO.NS', 'HCLTECH.NS', 'TECHM.NS', 'LTIM.NS', 'PERSISTENT.NS', 'COFORGE.NS']
    
    # NSE Banking
    NSE_BANKING = ['HDFCBANK.NS', 'ICICIBANK.NS', 'KOTAKBANK.NS', 'AXISBANK.NS', 'SBIN.NS', 'INDUSINDBK.NS', 'FEDERALBNK.NS']
    
    # NSE Finance & NBFCs
    NSE_FINANCE = ['BAJFINANCE.NS', 'BAJAJFINSV.NS', 'HDFCLIFE.NS', 'SBILIFE.NS', 'ICICIPRULI.NS', 'HDFCAMC.NS', 'CHOLAFIN.NS']
    
    # NSE Energy
    NSE_ENERGY = ['RELIANCE.NS', 'ONGC.NS', 'IOC.NS', 'BPCL.NS', 'NTPC.NS', 'POWERGRID.NS', 'COALINDIA.NS']
    
    # NSE Auto
    NSE_AUTO = ['MARUTI.NS', 'M&M.NS', 'TATAMOTORS.NS', 'BAJAJ-AUTO.NS', 'HEROMOTOCO.NS', 'EICHERMOT.NS']
    
    # NSE Pharma
    NSE_PHARMA = ['SUNPHARMA.NS', 'DRREDDY.NS', 'CIPLA.NS', 'DIVISLAB.NS', 'AUROPHARMA.NS', 'BIOCON.NS']
    
    # NSE FMCG
    NSE_FMCG = ['ITC.NS', 'HINDUNILVR.NS', 'NESTLEIND.NS', 'BRITANNIA.NS', 'DABUR.NS', 'GODREJCP.NS', 'MARICO.NS']
    
    # NSE Telecom
    NSE_TELECOM = ['BHARTIARTL.NS', 'ZEEL.NS', 'SUNTV.NS']
    
    # NSE Cement & Construction
    NSE_CEMENT = ['ULTRACEMCO.NS', 'GRASIM.NS', 'SHREECEM.NS', 'AMBUJACEM.NS', 'ACC.NS', 'LT.NS']
    
    # NSE Metals
    NSE_METALS = ['TATASTEEL.NS', 'HINDALCO.NS', 'JSWSTEEL.NS', 'VEDL.NS', 'HINDZINC.NS']
    
    # NSE Retail & Lifestyle
    NSE_RETAIL = ['TITAN.NS', 'DMART.NS', 'TRENT.NS', 'ABFRL.NS']
    
    # NSE Paints
    NSE_PAINTS = ['ASIANPAINT.NS', 'BERGER.NS', 'PIDILITIND.NS']
    
    # Combine all NSE symbols
    ALL_SYMBOLS = (NSE_IT + NSE_BANKING + NSE_FINANCE + NSE_ENERGY + NSE_AUTO + 
                   NSE_PHARMA + NSE_FMCG + NSE_TELECOM + NSE_CEMENT + NSE_METALS + 
                   NSE_RETAIL + NSE_PAINTS)
    
    # Initialize pipeline
    pipeline = FundamentalsIngestionPipeline(provider='yahoo')
    
    # Run full ingestion
    pipeline.run_full_ingestion(symbols=ALL_SYMBOLS)


if __name__ == "__main__":
    main()