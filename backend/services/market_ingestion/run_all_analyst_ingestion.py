"""
Master Ingestion Script for Analyst Data Module
Runs all three ingestion pipelines:
1. Analyst Estimates & Price Targets
2. Buyback Announcements
3. Earnings Calendar
"""

import os
import sys
from datetime import datetime
import logging
import subprocess

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('../../logs/master_ingestion.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


def run_script(script_name, description):
    """Run a Python script and return success status"""
    logger.info("="*80)
    logger.info(f"Starting: {description}")
    logger.info("="*80)
    
    start_time = datetime.now()
    
    try:
        result = subprocess.run(
            [sys.executable, script_name],
            cwd=os.path.dirname(os.path.abspath(__file__)),
            capture_output=False,
            text=True,
            check=True
        )
        
        elapsed = datetime.now() - start_time
        logger.info(f"✓ Completed {description} in {elapsed}")
        return True
        
    except subprocess.CalledProcessError as e:
        elapsed = datetime.now() - start_time
        logger.error(f"✗ Failed {description} after {elapsed}")
        logger.error(f"Error: {e}")
        return False
    except Exception as e:
        elapsed = datetime.now() - start_time
        logger.error(f"✗ Error running {description} after {elapsed}")
        logger.error(f"Error: {e}")
        return False


def main():
    """Run all ingestion pipelines"""
    logger.info("\n" + "="*80)
    logger.info("ANALYST DATA MODULE - MASTER INGESTION")
    logger.info("="*80 + "\n")
    
    overall_start = datetime.now()
    results = {}
    
    # Run each ingestion script
    pipelines = [
        ('analyst_estimates_ingest.py', 'Analyst Estimates & Price Targets'),
        ('buyback_ingest.py', 'Buyback Announcements'),
        ('earnings_calendar_ingest.py', 'Earnings Calendar'),
    ]
    
    for script, description in pipelines:
        success = run_script(script, description)
        results[description] = success
        
        if not success:
            logger.warning(f"Pipeline '{description}' failed, but continuing with remaining pipelines...")
            logger.warning("Please check individual log files for details")
    
    # Summary
    overall_elapsed = datetime.now() - overall_start
    
    logger.info("\n" + "="*80)
    logger.info("FINAL SUMMARY")
    logger.info("="*80)
    
    for description, success in results.items():
        status = "✓ SUCCESS" if success else "✗ FAILED"
        logger.info(f"{status}: {description}")
    
    successful = sum(1 for s in results.values() if s)
    total = len(results)
    
    logger.info("")
    logger.info(f"Pipelines Succeeded: {successful}/{total}")
    logger.info(f"Total Time: {overall_elapsed}")
    logger.info("="*80)
    
    # Exit with error code if any failed
    if successful < total:
        logger.warning(f"\n{total - successful} pipeline(s) failed. Check logs for details.")
        sys.exit(1)
    else:
        logger.info("\n✓ All pipelines completed successfully!")
        sys.exit(0)


if __name__ == "__main__":
    main()
