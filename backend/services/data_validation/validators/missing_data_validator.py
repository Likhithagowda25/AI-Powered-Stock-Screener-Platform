"""
Missing Data Validator
Checks for missing values in mandatory and important fields
"""
import sys
import pandas as pd
from typing import List, Dict
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from rules.validation_rules import MANDATORY_FIELDS, IMPORTANT_FIELDS, SEVERITY, FALLBACK_ACTIONS


class MissingDataValidator:
    """Validates missing data in financial records"""
    
    def __init__(self):
        self.issues = []
    
    def validate_fundamentals(self, df: pd.DataFrame) -> List[Dict]:
        """Validate fundamentals data for missing values"""
        issues = []
        
        for ticker in df['ticker'].unique():
            ticker_data = df[df['ticker'] == ticker]
            
            # Check mandatory fields
            for field in MANDATORY_FIELDS['fundamentals']:
                missing_count = ticker_data[field].isna().sum()
                if missing_count > 0:
                    issues.append({
                        'ticker': ticker,
                        'field': field,
                        'issue_type': 'missing_mandatory',
                        'severity': SEVERITY['CRITICAL'],
                        'count': missing_count,
                        'total_records': len(ticker_data),
                        'percentage': (missing_count / len(ticker_data)) * 100,
                        'action': FALLBACK_ACTIONS['SKIP'],
                        'message': f"Missing mandatory field '{field}' in {missing_count}/{len(ticker_data)} records"
                    })
            
            # Check important fields
            for field in IMPORTANT_FIELDS['fundamentals']:
                if field in ticker_data.columns:
                    missing_count = ticker_data[field].isna().sum()
                    if missing_count > 0:
                        issues.append({
                            'ticker': ticker,
                            'field': field,
                            'issue_type': 'missing_important',
                            'severity': SEVERITY['MEDIUM'],
                            'count': missing_count,
                            'total_records': len(ticker_data),
                            'percentage': (missing_count / len(ticker_data)) * 100,
                            'action': FALLBACK_ACTIONS['FLAG'],
                            'message': f"Missing important field '{field}' in {missing_count}/{len(ticker_data)} records"
                        })
            
            # Check for missing quarters
            quarters_missing = self._check_missing_quarters(ticker_data)
            if quarters_missing:
                issues.append({
                    'ticker': ticker,
                    'field': 'quarter',
                    'issue_type': 'missing_quarters',
                    'severity': SEVERITY['HIGH'],
                    'missing_quarters': quarters_missing,
                    'action': FALLBACK_ACTIONS['MANUAL'],
                    'message': f"Missing quarters: {', '.join(quarters_missing)}"
                })
        
        return issues
    
    def validate_price_history(self, df: pd.DataFrame) -> List[Dict]:
        """Validate price history for missing values"""
        issues = []
        
        for ticker in df['ticker'].unique():
            ticker_data = df[df['ticker'] == ticker].sort_values('date')
            
            # Check mandatory fields
            for field in MANDATORY_FIELDS['price_history']:
                missing_count = ticker_data[field].isna().sum()
                if missing_count > 0:
                    issues.append({
                        'ticker': ticker,
                        'field': field,
                        'issue_type': 'missing_price_data',
                        'severity': SEVERITY['CRITICAL'],
                        'count': missing_count,
                        'action': FALLBACK_ACTIONS['SKIP'],
                        'message': f"Missing price field '{field}' in {missing_count} records"
                    })
            
            # Check for missing trading days (gaps > 7 days)
            missing_days = self._check_missing_days(ticker_data)
            if missing_days:
                issues.append({
                    'ticker': ticker,
                    'field': 'date',
                    'issue_type': 'missing_trading_days',
                    'severity': SEVERITY['MEDIUM'],
                    'gaps': missing_days,
                    'action': FALLBACK_ACTIONS['FLAG'],
                    'message': f"Found {len(missing_days)} gaps in trading history"
                })
        
        return issues
    
    def _check_missing_quarters(self, df: pd.DataFrame) -> List[str]:
        """Check for missing quarters in sequence"""
        if 'quarter' not in df.columns or df.empty:
            return []
        
        quarters = sorted(df['quarter'].dropna().unique())
        if len(quarters) < 2:
            return []
        
        # Simple check: if we have Q1, Q3 but not Q2, flag it
        missing = []
        # This is simplified - would need better quarter sequence logic
        return missing
    
    def _check_missing_days(self, df: pd.DataFrame) -> List[Dict]:
        """Check for gaps in price history"""
        if 'date' not in df.columns or len(df) < 2:
            return []
        
        df = df.sort_values('date')
        df['date'] = pd.to_datetime(df['date'])
        
        gaps = []
        for i in range(1, len(df)):
            days_diff = (df.iloc[i]['date'] - df.iloc[i-1]['date']).days
            if days_diff > 7:  # More than a week gap
                gaps.append({
                    'from_date': str(df.iloc[i-1]['date'].date()),
                    'to_date': str(df.iloc[i]['date'].date()),
                    'days': days_diff
                })
        
        return gaps
