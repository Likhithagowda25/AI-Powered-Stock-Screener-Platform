"""
NSE Ticker Fetcher
Dynamically fetches all NSE-listed stock tickers
"""
import requests
import pandas as pd
import logging
from pathlib import Path
from typing import List
import json

logger = logging.getLogger(__name__)


class NSETickerFetcher:
    """Fetch all NSE stock tickers dynamically"""
    
    def __init__(self):
        self.cache_file = Path(__file__).parent / 'nse_tickers_cache.json'
        
    def fetch_nse_equity_list(self) -> List[str]:
        """
        Fetch all NSE equity stocks from NSE India website
        Returns list of tickers in Yahoo Finance format (SYMBOL.NS)
        """
        try:
            # NSE India provides CSV download of all equity stocks
            url = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            
            # Parse CSV
            from io import StringIO
            df = pd.read_csv(StringIO(response.text))
            
            # Extract symbols and convert to Yahoo Finance format
            tickers = []
            for symbol in df['SYMBOL'].dropna().unique():
                ticker = f"{symbol}.NS"
                tickers.append(ticker)
            
            logger.info(f"Fetched {len(tickers)} NSE equity tickers")
            
            # Cache the results
            self._save_cache(tickers)
            
            return tickers
            
        except Exception as e:
            logger.error(f"Failed to fetch NSE tickers from website: {e}")
            # Try to use cached version
            return self._load_cache()
    
    def fetch_from_wikipedia(self) -> List[str]:
        """
        Fetch major NSE stocks from Wikipedia's NIFTY indices
        Fallback method if NSE website is unavailable
        """
        try:
            # NIFTY 500 covers most actively traded stocks
            url = "https://en.wikipedia.org/wiki/NIFTY_500"
            
            df = pd.read_html(url)[0]
            
            tickers = []
            # The first column usually contains company names or symbols
            if 'Symbol' in df.columns:
                symbols = df['Symbol'].dropna().unique()
            elif 'Company Name' in df.columns:
                # Extract symbols from a different column if available
                symbols = df.iloc[:, 0].dropna().unique()
            else:
                symbols = df.iloc[:, 0].dropna().unique()
            
            for symbol in symbols:
                ticker = f"{symbol}.NS"
                tickers.append(ticker)
            
            logger.info(f"Fetched {len(tickers)} tickers from Wikipedia NIFTY 500")
            return tickers
            
        except Exception as e:
            logger.error(f"Failed to fetch from Wikipedia: {e}")
            return []
    
    def get_all_nse_tickers(self, use_cache: bool = True, max_stocks: int = None) -> List[str]:
        """
        Get all NSE tickers with caching support
        
        Args:
            use_cache: Use cached tickers if available (default: True)
            max_stocks: Limit number of stocks to return (for testing)
        
        Returns:
            List of NSE tickers in Yahoo Finance format
        """
        # Try cache first if enabled
        if use_cache and self.cache_file.exists():
            cached = self._load_cache()
            if cached:
                logger.info(f"Using cached NSE tickers: {len(cached)} stocks")
                if max_stocks:
                    return cached[:max_stocks]
                return cached
        
        # Try to fetch from NSE website
        tickers = self.fetch_nse_equity_list()
        
        # Fallback to Wikipedia if NSE fetch failed
        if not tickers:
            logger.warning("NSE fetch failed, trying Wikipedia fallback...")
            tickers = self.fetch_from_wikipedia()
        
        # Last resort: return a curated list of major stocks
        if not tickers:
            logger.warning("All fetch methods failed, using default stock list")
            tickers = self._get_default_stock_list()
        
        if max_stocks:
            return tickers[:max_stocks]
        
        return tickers
    
    def _save_cache(self, tickers: List[str]):
        """Save tickers to cache file"""
        try:
            cache_data = {
                'tickers': tickers,
                'timestamp': pd.Timestamp.now().isoformat(),
                'count': len(tickers)
            }
            with open(self.cache_file, 'w') as f:
                json.dump(cache_data, f, indent=2)
            logger.info(f"Cached {len(tickers)} tickers to {self.cache_file}")
        except Exception as e:
            logger.error(f"Failed to save cache: {e}")
    
    def _load_cache(self) -> List[str]:
        """Load tickers from cache file"""
        try:
            if not self.cache_file.exists():
                return []
            
            with open(self.cache_file, 'r') as f:
                cache_data = json.load(f)
            
            tickers = cache_data.get('tickers', [])
            timestamp = cache_data.get('timestamp', 'unknown')
            
            logger.info(f"Loaded {len(tickers)} tickers from cache (saved: {timestamp})")
            return tickers
            
        except Exception as e:
            logger.error(f"Failed to load cache: {e}")
            return []
    
    def _get_default_stock_list(self) -> List[str]:
        """Default curated list of major NSE stocks (fallback)"""
        return [
            # IT & Services
            'TCS.NS', 'INFY.NS', 'WIPRO.NS', 'HCLTECH.NS', 'TECHM.NS', 'LTIM.NS',
            
            # Banking
            'HDFCBANK.NS', 'ICICIBANK.NS', 'KOTAKBANK.NS', 'AXISBANK.NS', 'SBIN.NS',
            
            # Finance
            'BAJFINANCE.NS', 'BAJAJFINSV.NS', 'HDFCLIFE.NS', 'SBILIFE.NS',
            
            # Energy
            'RELIANCE.NS', 'ONGC.NS', 'IOC.NS', 'BPCL.NS', 'NTPC.NS', 'POWERGRID.NS',
            
            # Auto
            'MARUTI.NS', 'M&M.NS', 'TATAMOTORS.NS', 'BAJAJ-AUTO.NS', 'HEROMOTOCO.NS',
            
            # Pharma
            'SUNPHARMA.NS', 'DRREDDY.NS', 'CIPLA.NS', 'DIVISLAB.NS', 'AUROPHARMA.NS',
            
            # FMCG
            'ITC.NS', 'HINDUNILVR.NS', 'NESTLEIND.NS', 'BRITANNIA.NS', 'DABUR.NS',
            
            # Telecom
            'BHARTIARTL.NS', 'ZEEL.NS', 'SUNTV.NS',
            
            # Cement
            'ULTRACEMCO.NS', 'GRASIM.NS', 'SHREECEM.NS', 'AMBUJACEM.NS', 'ACC.NS',
            
            # Metals
            'TATASTEEL.NS', 'HINDALCO.NS', 'JSWSTEEL.NS', 'VEDL.NS', 'HINDZINC.NS',
            
            # Retail
            'TITAN.NS', 'DMART.NS', 'TRENT.NS', 'ABFRL.NS',
            
            # Paints
            'ASIANPAINT.NS', 'BERGER.NS', 'PIDILITIND.NS',
        ]


def main():
    """Test the fetcher"""
    logging.basicConfig(level=logging.INFO)
    
    fetcher = NSETickerFetcher()
    
    # Fetch all NSE tickers
    print("Fetching all NSE tickers...")
    tickers = fetcher.get_all_nse_tickers(use_cache=False)
    
    print(f"\nTotal stocks found: {len(tickers)}")
    print(f"\nFirst 20 tickers:")
    for i, ticker in enumerate(tickers[:20], 1):
        print(f"{i}. {ticker}")
    
    print(f"\nCache file location: {fetcher.cache_file}")


if __name__ == "__main__":
    main()
