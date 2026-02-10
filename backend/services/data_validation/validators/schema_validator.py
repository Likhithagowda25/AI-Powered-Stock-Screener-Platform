"""
Schema & Data Type Validator
Validates data types, date formats, and schema compliance
"""
import sys
import pandas as pd
import numpy as np
from typing import List, Dict
from datetime import datetime
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from rules.validation_rules import SEVERITY, FALLBACK_ACTIONS


class SchemaValidator:
    """Validates schema compliance and data types"""
    
    def __init__(self):
        self.issues = []
        self.allowed_currencies = ['INR', 'USD']
    
    def validate_fundamentals(self, df: pd.DataFrame) -> List[Dict]:
        """Validate schema for fundamentals data"""
        issues = []
        
        # Define expected numeric fields
        numeric_fields = [
            'revenue', 'gross_profit', 'ebitda', 'operating_income', 'net_income',
            'diluted_eps', 'total_debt', 'cash_and_equivalents', 'free_cash_flow',
            'debt_to_equity', 'debt_to_fcf_ratio', 'pe_ratio', 'peg_ratio', 'pb_ratio',
            'ps_ratio', 'promoter_holding', 'institutional_holding', 'price_target_high',
            'price_target_low', 'price_target_avg', 'eps_estimate', 'buybacks',
            'dividends', 'splits', 'roe', 'roa', 'operating_margin', 'ebitda_margin',
            'current_ratio', 'total_assets', 'operating_cash_flow'
        ]
        
        # Define expected string fields
        string_fields = ['ticker', 'quarter']
        
        # Define expected date fields
        date_fields = ['date']
        
        for ticker in df['ticker'].unique():
            ticker_data = df[df['ticker'] == ticker]
            
            # Validate numeric fields
            issues.extend(self._validate_numeric_types(ticker, ticker_data, numeric_fields))
            
            # Validate string fields
            issues.extend(self._validate_string_types(ticker, ticker_data, string_fields))
            
            # Validate date fields
            issues.extend(self._validate_date_types(ticker, ticker_data, date_fields))
            
            # Validate no future dates
            issues.extend(self._validate_no_future_dates(ticker, ticker_data))
        
        return issues
    
    def validate_price_history(self, df: pd.DataFrame) -> List[Dict]:
        """Validate schema for price history data"""
        issues = []
        
        numeric_fields = ['open', 'high', 'low', 'close', 'volume']
        date_fields = ['date']
        
        for ticker in df['ticker'].unique():
            ticker_data = df[df['ticker'] == ticker]
            
            issues.extend(self._validate_numeric_types(ticker, ticker_data, numeric_fields))
            issues.extend(self._validate_date_types(ticker, ticker_data, date_fields))
            issues.extend(self._validate_no_future_dates(ticker, ticker_data))
        
        return issues
    
    def _validate_numeric_types(self, ticker: str, df: pd.DataFrame, fields: List[str]) -> List[Dict]:
        """Check if numeric fields contain valid numbers"""
        issues = []
        
        for field in fields:
            if field not in df.columns:
                continue
            
            # Check for non-numeric values (excluding NaN)
            non_numeric = df[field].apply(lambda x: not isinstance(x, (int, float, np.integer, np.floating)) and pd.notna(x))
            non_numeric_count = non_numeric.sum()
            
            if non_numeric_count > 0:
                issues.append({
                    'ticker': ticker,
                    'field': field,
                    'issue_type': 'invalid_data_type',
                    'severity': SEVERITY['HIGH'],
                    'count': non_numeric_count,
                    'total_records': len(df),
                    'percentage': (non_numeric_count / len(df)) * 100,
                    'action': FALLBACK_ACTIONS['SKIP'],
                    'message': f"Field '{field}' contains {non_numeric_count} non-numeric values"
                })
        
        return issues
    
    def _validate_string_types(self, ticker: str, df: pd.DataFrame, fields: List[str]) -> List[Dict]:
        """Check if string fields contain valid strings"""
        issues = []
        
        for field in fields:
            if field not in df.columns:
                continue
            
            # Check for invalid characters in strings
            if field == 'ticker':
                # Ticker should be alphanumeric with optional dots
                invalid = df[field].apply(lambda x: not str(x).replace('.', '').replace('-', '').isalnum() if pd.notna(x) else False)
                invalid_count = invalid.sum()
                
                if invalid_count > 0:
                    issues.append({
                        'ticker': ticker,
                        'field': field,
                        'issue_type': 'invalid_string_format',
                        'severity': SEVERITY['HIGH'],
                        'count': invalid_count,
                        'total_records': len(df),
                        'percentage': (invalid_count / len(df)) * 100,
                        'action': FALLBACK_ACTIONS['SKIP'],
                        'message': f"Ticker contains {invalid_count} invalid characters"
                    })
            
            if field == 'quarter':
                # Quarter should match pattern: 2023-Q1, FY23-Q2, etc.
                invalid = df[field].apply(lambda x: not self._is_valid_quarter_format(x) if pd.notna(x) else False)
                invalid_count = invalid.sum()
                
                if invalid_count > 0:
                    issues.append({
                        'ticker': ticker,
                        'field': field,
                        'issue_type': 'invalid_quarter_format',
                        'severity': SEVERITY['MEDIUM'],
                        'count': invalid_count,
                        'total_records': len(df),
                        'percentage': (invalid_count / len(df)) * 100,
                        'action': FALLBACK_ACTIONS['FLAG'],
                        'message': f"Quarter format invalid in {invalid_count} records"
                    })
        
        return issues
    
    def _validate_date_types(self, ticker: str, df: pd.DataFrame, fields: List[str]) -> List[Dict]:
        """Check if date fields can be parsed correctly"""
        issues = []
        
        for field in fields:
            if field not in df.columns:
                continue
            
            invalid_dates = 0
            for idx, value in df[field].items():
                if pd.isna(value):
                    continue
                
                try:
                    # Try to parse as datetime
                    if not isinstance(value, (pd.Timestamp, datetime)):
                        pd.to_datetime(value)
                except (ValueError, TypeError):
                    invalid_dates += 1
            
            if invalid_dates > 0:
                issues.append({
                    'ticker': ticker,
                    'field': field,
                    'issue_type': 'invalid_date_format',
                    'severity': SEVERITY['HIGH'],
                    'count': invalid_dates,
                    'total_records': len(df),
                    'percentage': (invalid_dates / len(df)) * 100,
                    'action': FALLBACK_ACTIONS['SKIP'],
                    'message': f"Date field '{field}' has {invalid_dates} unparseable dates"
                })
        
        return issues
    
    def _validate_no_future_dates(self, ticker: str, df: pd.DataFrame) -> List[Dict]:
        """Check that no dates are in the future"""
        issues = []
        
        if 'date' not in df.columns:
            return issues
        
        today = pd.Timestamp.now()
        
        future_dates = df['date'].apply(lambda x: pd.to_datetime(x) > today if pd.notna(x) else False)
        future_count = future_dates.sum()
        
        if future_count > 0:
            issues.append({
                'ticker': ticker,
                'field': 'date',
                'issue_type': 'future_dated_records',
                'severity': SEVERITY['HIGH'],
                'count': future_count,
                'total_records': len(df),
                'percentage': (future_count / len(df)) * 100,
                'action': FALLBACK_ACTIONS['SKIP'],
                'message': f"Found {future_count} future-dated records"
            })
        
        return issues
    
    def _is_valid_quarter_format(self, quarter: str) -> bool:
        """Check if quarter string matches expected format"""
        if not isinstance(quarter, str):
            return False
        
        # Accept formats: 2023-Q1, FY23-Q2, Q1-2023, etc.
        patterns = [
            'Q1', 'Q2', 'Q3', 'Q4',  # Basic quarter check
            '2020', '2021', '2022', '2023', '2024', '2025'  # Year check
        ]
        
        return any(pattern in quarter for pattern in patterns)
