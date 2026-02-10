"""
Data Quality Tracker
Tracks missing/N/A fields per stock and generates quality reports
"""

import os
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, asdict
import psycopg2

logger = logging.getLogger(__name__)


@dataclass
class StockDataQuality:
    """Data quality record for a single stock"""
    ticker: str
    total_fields: int
    populated_fields: int
    missing_fields: List[str]
    data_sources: List[str]
    last_updated: str
    quality_score: float  # Percentage of populated fields
    
    @classmethod
    def from_data(cls, ticker: str, data: Dict[str, Any], priority_fields: List[str]):
        missing = []
        populated = 0
        
        for field in priority_fields:
            if field in data and data[field] is not None:
                populated += 1
            else:
                missing.append(field)
        
        total = len(priority_fields)
        score = (populated / total * 100) if total > 0 else 0
        
        return cls(
            ticker=ticker,
            total_fields=total,
            populated_fields=populated,
            missing_fields=missing,
            data_sources=data.get('_sources', ['unknown']),
            last_updated=datetime.now().isoformat(),
            quality_score=round(score, 1)
        )


class DataQualityTracker:
    """Track and report on data quality across all stocks"""
    
    # Fields we care about for quality tracking
    PRIORITY_FIELDS = [
        'name', 'sector', 'industry', 'market_cap', 'current_price',
        'pe_ratio', 'pb_ratio', 'peg_ratio', 'roe', 'roa',
        'debt_to_equity', 'revenue', 'net_income', 'eps', 
        'dividend_yield', 'operating_margin', 'current_ratio'
    ]
    
    def __init__(self, storage_dir: Path = None):
        self.storage_dir = storage_dir or Path(__file__).parent / 'quality_reports'
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.quality_records: Dict[str, StockDataQuality] = {}
    
    def record_stock_quality(self, ticker: str, data: Dict[str, Any]):
        """Record quality metrics for a single stock"""
        quality = StockDataQuality.from_data(ticker, data, self.PRIORITY_FIELDS)
        self.quality_records[ticker] = quality
        return quality
    
    def record_batch_quality(self, batch_data: List[Dict[str, Any]]):
        """Record quality for a batch of stocks"""
        for data in batch_data:
            ticker = data.get('ticker')
            if ticker:
                self.record_stock_quality(ticker, data)
    
    def get_missing_field_summary(self) -> Dict[str, int]:
        """Get count of how many stocks are missing each field"""
        field_counts = {field: 0 for field in self.PRIORITY_FIELDS}
        
        for quality in self.quality_records.values():
            for field in quality.missing_fields:
                if field in field_counts:
                    field_counts[field] += 1
        
        # Sort by count (most missing first)
        return dict(sorted(field_counts.items(), key=lambda x: x[1], reverse=True))
    
    def get_stocks_needing_fallback(self, min_score: float = 80.0) -> List[str]:
        """Get tickers that need fallback API calls (below quality threshold)"""
        return [
            ticker for ticker, quality in self.quality_records.items()
            if quality.quality_score < min_score
        ]
    
    def get_worst_quality_stocks(self, limit: int = 20) -> List[StockDataQuality]:
        """Get stocks with worst data quality"""
        sorted_records = sorted(
            self.quality_records.values(),
            key=lambda x: x.quality_score
        )
        return sorted_records[:limit]
    
    def get_best_quality_stocks(self, limit: int = 20) -> List[StockDataQuality]:
        """Get stocks with best data quality"""
        sorted_records = sorted(
            self.quality_records.values(),
            key=lambda x: x.quality_score,
            reverse=True
        )
        return sorted_records[:limit]
    
    def calculate_overall_metrics(self) -> Dict[str, Any]:
        """Calculate overall data quality metrics"""
        if not self.quality_records:
            return {}
        
        scores = [q.quality_score for q in self.quality_records.values()]
        
        return {
            'total_stocks': len(self.quality_records),
            'average_quality_score': round(sum(scores) / len(scores), 1),
            'min_quality_score': min(scores),
            'max_quality_score': max(scores),
            'stocks_above_80_percent': len([s for s in scores if s >= 80]),
            'stocks_below_50_percent': len([s for s in scores if s < 50]),
            'timestamp': datetime.now().isoformat()
        }
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive quality report"""
        return {
            'summary': self.calculate_overall_metrics(),
            'missing_field_counts': self.get_missing_field_summary(),
            'worst_stocks': [asdict(q) for q in self.get_worst_quality_stocks(10)],
            'best_stocks': [asdict(q) for q in self.get_best_quality_stocks(10)],
            'stocks_needing_fallback': self.get_stocks_needing_fallback(80.0)[:50],
            'generated_at': datetime.now().isoformat()
        }
    
    def save_report(self, filename: str = None):
        """Save quality report to file"""
        if not filename:
            filename = f"quality_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        filepath = self.storage_dir / filename
        report = self.generate_report()
        
        with open(filepath, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"Quality report saved to {filepath}")
        return filepath
    
    def print_summary(self):
        """Print quality summary to console"""
        metrics = self.calculate_overall_metrics()
        missing = self.get_missing_field_summary()
        
        print("\n" + "=" * 60)
        print("DATA QUALITY REPORT")
        print("=" * 60)
        
        print(f"\nOverall Metrics:")
        print(f"  Total stocks analyzed: {metrics.get('total_stocks', 0)}")
        print(f"  Average quality score: {metrics.get('average_quality_score', 0)}%")
        print(f"  Stocks ≥80% complete: {metrics.get('stocks_above_80_percent', 0)}")
        print(f"  Stocks <50% complete: {metrics.get('stocks_below_50_percent', 0)}")
        
        print(f"\nMost Missing Fields:")
        for field, count in list(missing.items())[:10]:
            pct = (count / metrics.get('total_stocks', 1)) * 100
            print(f"  {field:20} - {count:4} stocks ({pct:.1f}%)")
        
        print(f"\nWorst Quality Stocks:")
        for quality in self.get_worst_quality_stocks(5):
            print(f"  {quality.ticker:15} - {quality.quality_score}% complete")
        
        print("=" * 60)
    
    def check_database_quality(self, db_config: Dict) -> Dict[str, Any]:
        """Check data quality directly from database"""
        try:
            conn = psycopg2.connect(**db_config)
            cursor = conn.cursor()
            
            # Count NULL values for each important column
            null_counts = {}
            total_count = 0
            
            # Get total count
            cursor.execute("SELECT COUNT(*) FROM fundamentals")
            total_count = cursor.fetchone()[0]
            
            if total_count == 0:
                return {'error': 'No data in fundamentals table'}
            
            # Check NULL counts for important columns
            columns_to_check = [
                'pe_ratio', 'pb_ratio', 'roe', 'roa', 'debt_to_equity',
                'revenue', 'net_income', 'eps', 'operating_margin'
            ]
            
            for col in columns_to_check:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM fundamentals WHERE {col} IS NULL")
                    null_counts[col] = cursor.fetchone()[0]
                except Exception as e:
                    null_counts[col] = f"Error: {e}"
            
            cursor.close()
            conn.close()
            
            return {
                'total_records': total_count,
                'null_counts': null_counts,
                'completeness': {
                    col: round((1 - count/total_count) * 100, 1) 
                    for col, count in null_counts.items() 
                    if isinstance(count, int)
                }
            }
            
        except Exception as e:
            logger.error(f"Database quality check failed: {e}")
            return {'error': str(e)}


if __name__ == "__main__":
    # Test the tracker
    logging.basicConfig(level=logging.INFO)
    
    tracker = DataQualityTracker()
    
    # Simulate some data
    test_data = [
        {
            'ticker': 'TCS.NS',
            'name': 'Tata Consultancy Services',
            'sector': 'Technology',
            'pe_ratio': 25.5,
            'roe': 0.35,
            '_sources': ['yfinance']
        },
        {
            'ticker': 'RELIANCE.NS',
            'name': 'Reliance Industries',
            'sector': 'Energy',
            'pe_ratio': None,  # Missing
            'roe': None,  # Missing
            '_sources': ['yfinance']
        }
    ]
    
    tracker.record_batch_quality(test_data)
    tracker.print_summary()
