"""
Anomaly Detector
Detects unrealistic spikes, outliers, and data quality issues
"""
import sys
import pandas as pd
import numpy as np
from typing import List, Dict
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from rules.validation_rules import (
    NON_NEGATIVE_FIELDS, RATIO_RANGES, ANOMALY_THRESHOLDS,
    SEVERITY, FALLBACK_ACTIONS
)


class AnomalyDetector:
    """Detects anomalies in financial data"""
    
    def __init__(self):
        self.issues = []
    
    def validate_fundamentals(self, df: pd.DataFrame) -> List[Dict]:
        """Detect anomalies in fundamentals data"""
        issues = []
        
        for ticker in df['ticker'].unique():
            ticker_data = df[df['ticker'] == ticker].sort_values('date')
            
            # Check for negative values where not allowed
            issues.extend(self._check_negative_values(ticker, ticker_data))
            
            # Check ratio ranges
            issues.extend(self._check_ratio_ranges(ticker, ticker_data))
            
            # Check for unrealistic spikes
            issues.extend(self._check_revenue_spikes(ticker, ticker_data))
            issues.extend(self._check_net_income_spikes(ticker, ticker_data))
            
            # Check for duplicates
            issues.extend(self._check_duplicates(ticker, ticker_data))
        
        return issues
    
    def validate_price_history(self, df: pd.DataFrame) -> List[Dict]:
        """Detect anomalies in price history"""
        issues = []
        
        for ticker in df['ticker'].unique():
            ticker_data = df[df['ticker'] == ticker].sort_values('date')
            
            # Check for price spikes
            issues.extend(self._check_price_spikes(ticker, ticker_data))
            
            # Check for volume spikes
            issues.extend(self._check_volume_spikes(ticker, ticker_data))
            
            # Check OHLC consistency
            issues.extend(self._check_ohlc_consistency(ticker, ticker_data))
        
        return issues
    
    def _check_negative_values(self, ticker: str, df: pd.DataFrame) -> List[Dict]:
        """Check for negative values in fields that should always be positive"""
        issues = []
        
        for field in NON_NEGATIVE_FIELDS:
            if field in df.columns:
                negative_count = (df[field] < 0).sum()
                if negative_count > 0:
                    issues.append({
                        'ticker': ticker,
                        'field': field,
                        'issue_type': 'negative_value',
                        'severity': SEVERITY['CRITICAL'],
                        'count': negative_count,
                        'action': FALLBACK_ACTIONS['SKIP'],
                        'message': f"Found {negative_count} negative values in {field} (should always be >= 0)"
                    })
        
        return issues
    
    def _check_ratio_ranges(self, ticker: str, df: pd.DataFrame) -> List[Dict]:
        """Check if ratios are within acceptable ranges"""
        issues = []
        
        for field, (min_val, max_val) in RATIO_RANGES.items():
            if field in df.columns:
                out_of_range = ((df[field] < min_val) | (df[field] > max_val)).sum()
                if out_of_range > 0:
                    actual_min = df[field].min()
                    actual_max = df[field].max()
                    issues.append({
                        'ticker': ticker,
                        'field': field,
                        'issue_type': 'ratio_out_of_range',
                        'severity': SEVERITY['HIGH'],
                        'count': out_of_range,
                        'expected_range': (min_val, max_val),
                        'actual_range': (actual_min, actual_max),
                        'action': FALLBACK_ACTIONS['FLAG'],
                        'message': f"{field} has {out_of_range} values outside range [{min_val}, {max_val}]"
                    })
        
        return issues
    
    def _check_revenue_spikes(self, ticker: str, df: pd.DataFrame) -> List[Dict]:
        """Check for unrealistic revenue spikes"""
        issues = []
        
        if 'revenue' not in df.columns or len(df) < 2:
            return issues
        
        df = df.sort_values('date')
        df['revenue_pct_change'] = df['revenue'].pct_change() * 100
        
        threshold = ANOMALY_THRESHOLDS['revenue_change_pct']
        spikes = df[abs(df['revenue_pct_change']) > threshold]
        
        if not spikes.empty:
            for idx, row in spikes.iterrows():
                issues.append({
                    'ticker': ticker,
                    'field': 'revenue',
                    'issue_type': 'revenue_spike',
                    'severity': SEVERITY['HIGH'],
                    'quarter': row.get('quarter', 'Unknown'),
                    'change_pct': row['revenue_pct_change'],
                    'threshold': threshold,
                    'action': FALLBACK_ACTIONS['MANUAL'],
                    'message': f"Revenue changed by {row['revenue_pct_change']:.1f}% (threshold: {threshold}%)"
                })
        
        return issues
    
    def _check_net_income_spikes(self, ticker: str, df: pd.DataFrame) -> List[Dict]:
        """Check for unrealistic net income spikes"""
        issues = []
        
        if 'net_income' not in df.columns or len(df) < 2:
            return issues
        
        df = df.sort_values('date')
        df['ni_pct_change'] = df['net_income'].pct_change() * 100
        
        threshold = ANOMALY_THRESHOLDS['net_income_change_pct']
        spikes = df[abs(df['ni_pct_change']) > threshold]
        
        if not spikes.empty:
            for idx, row in spikes.iterrows():
                issues.append({
                    'ticker': ticker,
                    'field': 'net_income',
                    'issue_type': 'net_income_spike',
                    'severity': SEVERITY['MEDIUM'],
                    'quarter': row.get('quarter', 'Unknown'),
                    'change_pct': row['ni_pct_change'],
                    'action': FALLBACK_ACTIONS['FLAG'],
                    'message': f"Net income changed by {row['ni_pct_change']:.1f}%"
                })
        
        return issues
    
    def _check_price_spikes(self, ticker: str, df: pd.DataFrame) -> List[Dict]:
        """Check for unrealistic price spikes"""
        issues = []
        
        if 'close' not in df.columns or len(df) < 2:
            return issues
        
        df = df.sort_values('date')
        df['price_pct_change'] = df['close'].pct_change() * 100
        
        threshold = ANOMALY_THRESHOLDS['price_change_pct']
        spikes = df[abs(df['price_pct_change']) > threshold]
        
        if not spikes.empty:
            for idx, row in spikes.iterrows():
                issues.append({
                    'ticker': ticker,
                    'field': 'close',
                    'issue_type': 'price_spike',
                    'severity': SEVERITY['HIGH'],
                    'date': str(row.get('date', 'Unknown')),
                    'change_pct': row['price_pct_change'],
                    'action': FALLBACK_ACTIONS['MANUAL'],
                    'message': f"Price changed by {row['price_pct_change']:.1f}% in one day"
                })
        
        return issues
    
    def _check_volume_spikes(self, ticker: str, df: pd.DataFrame) -> List[Dict]:
        """Check for unusual volume spikes"""
        issues = []
        
        if 'volume' not in df.columns or len(df) < 10:
            return issues
        
        avg_volume = df['volume'].mean()
        threshold_multiplier = ANOMALY_THRESHOLDS['volume_spike']
        
        spikes = df[df['volume'] > avg_volume * threshold_multiplier]
        
        if not spikes.empty:
            issues.append({
                'ticker': ticker,
                'field': 'volume',
                'issue_type': 'volume_spike',
                'severity': SEVERITY['LOW'],
                'count': len(spikes),
                'avg_volume': avg_volume,
                'action': FALLBACK_ACTIONS['FLAG'],
                'message': f"Found {len(spikes)} days with volume > {threshold_multiplier}x average"
            })
        
        return issues
    
    def _check_ohlc_consistency(self, ticker: str, df: pd.DataFrame) -> List[Dict]:
        """Check if Open, High, Low, Close are consistent"""
        issues = []
        
        required = ['open', 'high', 'low', 'close']
        if not all(col in df.columns for col in required):
            return issues
        
        # High should be >= Open, Low, Close
        invalid_high = ((df['high'] < df['open']) | 
                       (df['high'] < df['low']) | 
                       (df['high'] < df['close'])).sum()
        
        # Low should be <= Open, High, Close
        invalid_low = ((df['low'] > df['open']) | 
                      (df['low'] > df['high']) | 
                      (df['low'] > df['close'])).sum()
        
        if invalid_high > 0 or invalid_low > 0:
            issues.append({
                'ticker': ticker,
                'field': 'ohlc',
                'issue_type': 'ohlc_inconsistency',
                'severity': SEVERITY['CRITICAL'],
                'invalid_high': invalid_high,
                'invalid_low': invalid_low,
                'action': FALLBACK_ACTIONS['SKIP'],
                'message': f"OHLC inconsistency: {invalid_high + invalid_low} records"
            })
        
        return issues
    
    def _check_duplicates(self, ticker: str, df: pd.DataFrame) -> List[Dict]:
        """Check for duplicate records"""
        issues = []
        
        if 'quarter' in df.columns:
            duplicates = df[df.duplicated(subset=['ticker', 'quarter'], keep=False)]
            if not duplicates.empty:
                issues.append({
                    'ticker': ticker,
                    'field': 'quarter',
                    'issue_type': 'duplicate_records',
                    'severity': SEVERITY['CRITICAL'],
                    'count': len(duplicates),
                    'quarters': duplicates['quarter'].unique().tolist(),
                    'action': FALLBACK_ACTIONS['SKIP'],
                    'message': f"Found {len(duplicates)} duplicate quarter records"
                })
        
        return issues
