"""
Data Validation Module
Main entry point for validating financial data before database insertion
"""
import os
import sys
import json
import logging
import pandas as pd
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from validators.missing_data_validator import MissingDataValidator
from validators.anomaly_detector import AnomalyDetector
from validators.schema_validator import SchemaValidator
from rules.validation_rules import SEVERITY, FALLBACK_ACTIONS

# Setup logging
log_dir = Path(__file__).parent / 'logs'
log_dir.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_dir / f'validation_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class DataValidator:
    """Main data validation orchestrator"""
    
    def __init__(self):
        self.missing_validator = MissingDataValidator()
        self.anomaly_detector = AnomalyDetector()
        self.schema_validator = SchemaValidator()
        self.report_dir = Path(__file__).parent / 'reports'
        self.report_dir.mkdir(exist_ok=True)
    
    def validate_fundamentals(self, data: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
        """
        Validate fundamentals data
        
        Args:
            data: DataFrame with fundamentals data
        
        Returns:
            Tuple of (cleaned_data, validation_report)
        """
        logger.info(f"Starting fundamentals validation for {len(data)} records")
        
        issues = []
        
        # Run schema validation
        logger.info("Validating schema and data types...")
        schema_issues = self.schema_validator.validate_fundamentals(data)
        issues.extend(schema_issues)
        
        # Run missing data validation
        logger.info("Checking for missing data...")
        missing_issues = self.missing_validator.validate_fundamentals(data)
        issues.extend(missing_issues)
        
        # Run anomaly detection
        logger.info("Detecting anomalies...")
        anomaly_issues = self.anomaly_detector.validate_fundamentals(data)
        issues.extend(anomaly_issues)
        
        # Process issues and clean data
        cleaned_data, report = self._process_issues(data, issues, 'fundamentals')
        
        logger.info(f"Validation complete. Found {len(issues)} issues.")
        logger.info(f"Clean records: {len(cleaned_data)}/{len(data)}")
        
        return cleaned_data, report
    
    def validate_price_history(self, data: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
        """
        Validate price history data
        
        Args:
            data: DataFrame with price history
        
        Returns:
            Tuple of (cleaned_data, validation_report)
        """
        logger.info(f"Starting price history validation for {len(data)} records")
        
        issues = []
        
        # Run schema validation
        logger.info("Validating schema and data types...")
        schema_issues = self.schema_validator.validate_price_history(data)
        issues.extend(schema_issues)
        
        # Run missing data validation
        logger.info("Checking for missing data...")
        missing_issues = self.missing_validator.validate_price_history(data)
        issues.extend(missing_issues)
        
        # Run anomaly detection
        logger.info("Detecting anomalies...")
        anomaly_issues = self.anomaly_detector.validate_price_history(data)
        issues.extend(anomaly_issues)
        
        # Process issues and clean data
        cleaned_data, report = self._process_issues(data, issues, 'price_history')
        
        logger.info(f"Validation complete. Found {len(issues)} issues.")
        logger.info(f"Clean records: {len(cleaned_data)}/{len(data)}")
        
        return cleaned_data, report
    
    def _process_issues(self, data: pd.DataFrame, issues: List[Dict], 
                       data_type: str) -> Tuple[pd.DataFrame, Dict]:
        """Process validation issues and apply fallback actions"""
        
        critical_issues = [i for i in issues if i['severity'] == SEVERITY['CRITICAL']]
        high_issues = [i for i in issues if i['severity'] == SEVERITY['HIGH']]
        medium_issues = [i for i in issues if i['severity'] == SEVERITY['MEDIUM']]
        low_issues = [i for i in issues if i['severity'] == SEVERITY['LOW']]
        
        # Apply fallback actions
        cleaned_data = data.copy()
        skipped_tickers = set()
        flagged_records = []
        
        for issue in issues:
            ticker = issue.get('ticker')
            action = issue.get('action')
            
            if action == FALLBACK_ACTIONS['SKIP']:
                if ticker:
                    skipped_tickers.add(ticker)
                    logger.warning(f"SKIP: {ticker} - {issue['message']}")
            
            elif action == FALLBACK_ACTIONS['FLAG']:
                flagged_records.append(issue)
                logger.info(f"FLAG: {ticker} - {issue['message']}")
            
            elif action == FALLBACK_ACTIONS['MANUAL']:
                logger.warning(f"MANUAL REVIEW REQUIRED: {ticker} - {issue['message']}")
        
        # Remove skipped tickers
        if skipped_tickers:
            cleaned_data = cleaned_data[~cleaned_data['ticker'].isin(skipped_tickers)]
            logger.info(f"Skipped {len(skipped_tickers)} tickers: {', '.join(skipped_tickers)}")
        
        # Create validation report
        report = {
            'timestamp': datetime.now().isoformat(),
            'data_type': data_type,
            'total_records': len(data),
            'clean_records': len(cleaned_data),
            'skipped_records': len(data) - len(cleaned_data),
            'total_issues': len(issues),
            'severity_breakdown': {
                'critical': len(critical_issues),
                'high': len(high_issues),
                'medium': len(medium_issues),
                'low': len(low_issues)
            },
            'skipped_tickers': list(skipped_tickers),
            'flagged_count': len(flagged_records),
            'issues': issues
        }
        
        # Save report
        self._save_report(report, data_type)
        self._create_csv_report(report, data_type, datetime.now().strftime("%Y%m%d_%H%M%S"))
        
        return cleaned_data, report
    
    def _save_report(self, report: Dict, data_type: str):
        """Save validation report to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"validation_report_{data_type}_{timestamp}.json"
        filepath = self.report_dir / filename
        
        with open(filepath, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        logger.info(f"Validation report saved: {filepath}")
        
        # Also create a summary markdown file
        self._create_summary_report(report, data_type, timestamp)
    
    def _create_summary_report(self, report: Dict, data_type: str, timestamp: str):
        """Create a human-readable summary report"""
        filename = f"validation_summary_{data_type}_{timestamp}.md"
        filepath = self.report_dir / filename
        
        with open(filepath, 'w') as f:
            f.write(f"# Data Validation Report - {data_type}\n\n")
            f.write(f"**Generated:** {report['timestamp']}\n\n")
            
            f.write("## Summary\n\n")
            f.write(f"- Total Records: {report['total_records']}\n")
            f.write(f"- Clean Records: {report['clean_records']}\n")
            f.write(f"- Skipped Records: {report['skipped_records']}\n")
            f.write(f"- Total Issues: {report['total_issues']}\n\n")
            
            f.write("## Severity Breakdown\n\n")
            for severity, count in report['severity_breakdown'].items():
                f.write(f"- **{severity.upper()}**: {count}\n")
            f.write("\n")
            
            if report['skipped_tickers']:
                f.write("## Skipped Tickers\n\n")
                for ticker in report['skipped_tickers']:
                    f.write(f"- {ticker}\n")
                f.write("\n")
            
            f.write("## Issues by Type\n\n")
            issue_types = {}
            for issue in report['issues']:
                issue_type = issue.get('issue_type', 'unknown')
                if issue_type not in issue_types:
                    issue_types[issue_type] = []
                issue_types[issue_type].append(issue)
            
            for issue_type, issues in issue_types.items():
                f.write(f"### {issue_type.replace('_', ' ').title()}\n\n")
                f.write(f"Count: {len(issues)}\n\n")
                for issue in issues[:5]:  # Show first 5
                    f.write(f"- **{issue.get('ticker', 'N/A')}**: {issue.get('message', 'No message')}\n")
                if len(issues) > 5:
                    f.write(f"- ... and {len(issues) - 5} more\n")
                f.write("\n")
        
        logger.info(f"Summary report saved: {filepath}")
    
    def _create_csv_report(self, report: Dict, data_type: str, timestamp: str):
        """Create CSV report with issues"""
        filename = f"validation_summary_{data_type}_{timestamp}.csv"
        filepath = self.report_dir / filename
        
        # Convert issues to DataFrame
        if not report['issues']:
            logger.info("No issues to report in CSV")
            return
        
        issues_df = pd.DataFrame(report['issues'])
        
        # Select relevant columns for CSV
        csv_columns = [
            'ticker', 'issue_type', 'severity', 'field', 
            'count', 'percentage', 'action', 'message'
        ]
        
        # Keep only columns that exist
        available_columns = [col for col in csv_columns if col in issues_df.columns]
        csv_df = issues_df[available_columns]
        
        # Add affected period if available
        if 'quarter' in issues_df.columns:
            csv_df.insert(3, 'affected_period', issues_df['quarter'])
        elif 'date' in issues_df.columns:
            csv_df.insert(3, 'affected_period', issues_df['date'])
        else:
            csv_df.insert(3, 'affected_period', 'N/A')
        
        # Rename columns for readability
        csv_df.columns = [col.replace('_', ' ').title() for col in csv_df.columns]
        
        # Save to CSV
        csv_df.to_csv(filepath, index=False)
        logger.info(f"CSV report saved: {filepath}")


def main():
    """Validate all fundamentals data and generate consolidated reports"""
    validator = DataValidator()
    
    # Path to fundamentals data
    data_path = Path(__file__).parent.parent.parent.parent / 'data' / 'processed' / 'fundamentals'
    
    all_quarterly_data = []
    all_annual_data = []
    
    # Load all quarterly data
    logger.info("Loading quarterly data...")
    quarterly_dir = data_path / 'quarterly'
    if quarterly_dir.exists():
        for file in quarterly_dir.glob('*_normalized.csv'):
            try:
                df = pd.read_csv(file)
                all_quarterly_data.append(df)
                logger.info(f"Loaded {file.name}: {len(df)} records")
            except Exception as e:
                logger.error(f"Error loading {file.name}: {e}")
    
    # Load all annual data
    logger.info("Loading annual data...")
    annual_dir = data_path / 'annual'
    if annual_dir.exists():
        for file in annual_dir.glob('*_normalized.csv'):
            try:
                df = pd.read_csv(file)
                all_annual_data.append(df)
                logger.info(f"Loaded {file.name}: {len(df)} records")
            except Exception as e:
                logger.error(f"Error loading {file.name}: {e}")
    
    # Validate consolidated quarterly data
    if all_quarterly_data:
        logger.info(f"\n{'='*60}")
        logger.info("VALIDATING QUARTERLY FUNDAMENTALS")
        logger.info(f"{'='*60}")
        quarterly_df = pd.concat(all_quarterly_data, ignore_index=True)
        cleaned_quarterly, quarterly_report = validator.validate_fundamentals(quarterly_df)
        
        # Save reports
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        validator._save_report(quarterly_report, 'quarterly')
        validator._create_summary_report(quarterly_report, 'quarterly', timestamp)
        validator._create_csv_report(quarterly_report, 'quarterly', timestamp)
    
    # Validate consolidated annual data
    if all_annual_data:
        logger.info(f"\n{'='*60}")
        logger.info("VALIDATING ANNUAL FUNDAMENTALS")
        logger.info(f"{'='*60}")
        annual_df = pd.concat(all_annual_data, ignore_index=True)
        cleaned_annual, annual_report = validator.validate_fundamentals(annual_df)
        
        # Save reports
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        validator._save_report(annual_report, 'annual')
        validator._create_summary_report(annual_report, 'annual', timestamp)
        validator._create_csv_report(annual_report, 'annual', timestamp)
    
    logger.info(f"\n{'='*60}")
    logger.info("VALIDATION COMPLETE")
    logger.info(f"{'='*60}")
    logger.info(f"Quarterly: {len(quarterly_df)} records processed")
    logger.info(f"Annual: {len(annual_df)} records processed")
    logger.info(f"Reports saved to: {validator.report_dir}")
    logger.info(f"{'='*60}")


if __name__ == "__main__":
    main()
