"""
Multi-API Data Provider Service
Aggregates data from multiple free APIs to fill gaps where yfinance returns N/A

Supported APIs:
1. yfinance (Primary) - Free, no API key
2. Alpha Vantage (Fallback) - 25 req/day free
3. Financial Modeling Prep (Fallback) - 250 req/day free  
4. Twelve Data (Fallback) - 800 req/day free
"""

import os
import time
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from pathlib import Path
import requests
import yfinance as yf
from dotenv import load_dotenv

# Load environment variables from api-gateway/.env
env_path = Path(__file__).parent.parent.parent / 'api-gateway' / '.env'
load_dotenv(env_path)

logger = logging.getLogger(__name__)


@dataclass
class APIQuota:
    """Track API usage quota"""
    name: str
    daily_limit: int
    requests_today: int = 0
    last_reset: datetime = None
    
    def can_make_request(self) -> bool:
        self._reset_if_new_day()
        return self.requests_today < self.daily_limit
    
    def record_request(self):
        self._reset_if_new_day()
        self.requests_today += 1
    
    def _reset_if_new_day(self):
        today = datetime.now().date()
        if self.last_reset is None or self.last_reset.date() < today:
            self.requests_today = 0
            self.last_reset = datetime.now()
    
    def remaining(self) -> int:
        self._reset_if_new_day()
        return self.daily_limit - self.requests_today


class BaseDataProvider:
    """Base class for data providers"""
    
    def __init__(self, name: str, daily_limit: int = 0):
        self.name = name
        self.quota = APIQuota(name=name, daily_limit=daily_limit)
    
    def fetch_stock_data(self, ticker: str) -> Dict[str, Any]:
        raise NotImplementedError
    
    def fetch_fundamentals(self, ticker: str) -> Dict[str, Any]:
        raise NotImplementedError
    
    def can_fetch(self) -> bool:
        return self.quota.can_make_request()


class YFinanceProvider(BaseDataProvider):
    """Primary data provider using yfinance (no API limit)"""
    
    def __init__(self):
        super().__init__("yfinance", daily_limit=999999)  # Effectively unlimited
    
    def fetch_stock_data(self, ticker: str) -> Dict[str, Any]:
        """Fetch comprehensive stock data from Yahoo Finance"""
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            
            if not info:
                return {}
            
            self.quota.record_request()
            
            return {
                'ticker': ticker,
                'name': info.get('longName') or info.get('shortName'),
                'sector': info.get('sector'),
                'industry': info.get('industry'),
                'exchange': info.get('exchange', 'NSE'),
                'market_cap': info.get('marketCap'),
                'current_price': info.get('currentPrice') or info.get('regularMarketPrice'),
                'pe_ratio': info.get('trailingPE') or info.get('forwardPE'),
                'pb_ratio': info.get('priceToBook'),
                'peg_ratio': info.get('pegRatio'),
                'roe': info.get('returnOnEquity'),
                'roa': info.get('returnOnAssets'),
                'debt_to_equity': info.get('debtToEquity'),
                'revenue': info.get('totalRevenue'),
                'net_income': info.get('netIncomeToCommon'),
                'eps': info.get('trailingEps'),
                'dividend_yield': info.get('dividendYield'),
                'beta': info.get('beta'),
                'fifty_two_week_high': info.get('fiftyTwoWeekHigh'),
                'fifty_two_week_low': info.get('fiftyTwoWeekLow'),
                '_source': 'yfinance',
                '_timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"yfinance error for {ticker}: {e}")
            return {'ticker': ticker, '_error': str(e), '_source': 'yfinance'}


class AlphaVantageProvider(BaseDataProvider):
    """Alpha Vantage data provider (25 requests/day free)"""
    
    def __init__(self, api_key: str = None):
        super().__init__("alpha_vantage", daily_limit=25)
        self.api_key = api_key or os.getenv('ALPHA_VANTAGE_API_KEY')
        self.base_url = "https://www.alphavantage.co/query"
    
    def _convert_nse_ticker(self, ticker: str) -> str:
        """Convert NSE ticker format for Alpha Vantage"""
        # Alpha Vantage uses BSE: or NSE: prefix for Indian stocks
        if ticker.endswith('.NS'):
            return ticker.replace('.NS', '.BSE')  # Try BSE format
        return ticker
    
    def fetch_stock_data(self, ticker: str) -> Dict[str, Any]:
        """Fetch stock data from Alpha Vantage"""
        if not self.api_key or not self.can_fetch():
            return {}
        
        try:
            av_ticker = self._convert_nse_ticker(ticker)
            
            # Get company overview
            params = {
                'function': 'OVERVIEW',
                'symbol': av_ticker,
                'apikey': self.api_key
            }
            
            response = requests.get(self.base_url, params=params, timeout=10)
            self.quota.record_request()
            
            if response.status_code != 200:
                return {}
            
            data = response.json()
            
            if 'Error Message' in data or 'Note' in data:
                return {}
            
            return {
                'ticker': ticker,
                'name': data.get('Name'),
                'sector': data.get('Sector'),
                'industry': data.get('Industry'),
                'pe_ratio': self._safe_float(data.get('PERatio')),
                'peg_ratio': self._safe_float(data.get('PEGRatio')),
                'pb_ratio': self._safe_float(data.get('PriceToBookRatio')),
                'roe': self._safe_float(data.get('ReturnOnEquityTTM')),
                'roa': self._safe_float(data.get('ReturnOnAssetsTTM')),
                'eps': self._safe_float(data.get('EPS')),
                'revenue': self._safe_float(data.get('RevenueTTM')),
                'profit_margin': self._safe_float(data.get('ProfitMargin')),
                'operating_margin': self._safe_float(data.get('OperatingMarginTTM')),
                'dividend_yield': self._safe_float(data.get('DividendYield')),
                'beta': self._safe_float(data.get('Beta')),
                '_source': 'alpha_vantage',
                '_timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Alpha Vantage error for {ticker}: {e}")
            return {'ticker': ticker, '_error': str(e), '_source': 'alpha_vantage'}
    
    def _safe_float(self, value) -> Optional[float]:
        try:
            if value is None or value == 'None' or value == '-':
                return None
            return float(value)
        except (ValueError, TypeError):
            return None


class FinancialModelingPrepProvider(BaseDataProvider):
    """Financial Modeling Prep data provider (250 requests/day free)"""
    
    def __init__(self, api_key: str = None):
        super().__init__("fmp", daily_limit=250)
        self.api_key = api_key or os.getenv('FMP_API_KEY')
        self.base_url = "https://financialmodelingprep.com/api/v3"
    
    def _convert_nse_ticker(self, ticker: str) -> str:
        """Convert NSE ticker format for FMP"""
        # FMP uses .NS suffix for NSE stocks
        return ticker  # Already in correct format
    
    def fetch_stock_data(self, ticker: str) -> Dict[str, Any]:
        """Fetch stock data from Financial Modeling Prep"""
        if not self.api_key or not self.can_fetch():
            return {}
        
        try:
            fmp_ticker = self._convert_nse_ticker(ticker)
            
            # Get company profile
            url = f"{self.base_url}/profile/{fmp_ticker}"
            params = {'apikey': self.api_key}
            
            response = requests.get(url, params=params, timeout=10)
            self.quota.record_request()
            
            if response.status_code != 200:
                return {}
            
            data = response.json()
            
            if not data or isinstance(data, dict) and 'Error Message' in data:
                return {}
            
            profile = data[0] if isinstance(data, list) and data else data
            
            return {
                'ticker': ticker,
                'name': profile.get('companyName'),
                'sector': profile.get('sector'),
                'industry': profile.get('industry'),
                'market_cap': profile.get('mktCap'),
                'current_price': profile.get('price'),
                'beta': profile.get('beta'),
                'pe_ratio': profile.get('pe') if profile.get('pe') else None,
                '_source': 'fmp',
                '_timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"FMP error for {ticker}: {e}")
            return {'ticker': ticker, '_error': str(e), '_source': 'fmp'}
    
    def fetch_ratios(self, ticker: str) -> Dict[str, Any]:
        """Fetch financial ratios from FMP"""
        if not self.api_key or not self.can_fetch():
            return {}
        
        try:
            url = f"{self.base_url}/ratios/{ticker}"
            params = {'apikey': self.api_key}
            
            response = requests.get(url, params=params, timeout=10)
            self.quota.record_request()
            
            if response.status_code != 200:
                return {}
            
            data = response.json()
            
            if not data:
                return {}
            
            latest = data[0] if isinstance(data, list) else data
            
            return {
                'ticker': ticker,
                'roe': latest.get('returnOnEquity'),
                'roa': latest.get('returnOnAssets'),
                'debt_to_equity': latest.get('debtEquityRatio'),
                'current_ratio': latest.get('currentRatio'),
                'pe_ratio': latest.get('priceEarningsRatio'),
                'pb_ratio': latest.get('priceToBookRatio'),
                '_source': 'fmp_ratios',
                '_timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"FMP ratios error for {ticker}: {e}")
            return {}


class TwelveDataProvider(BaseDataProvider):
    """Twelve Data provider (800 requests/day, 8/minute free)"""
    
    def __init__(self, api_key: str = None):
        super().__init__("twelve_data", daily_limit=800)
        self.api_key = api_key or os.getenv('TWELVE_DATA_API_KEY')
        self.base_url = "https://api.twelvedata.com"
        self.last_request_time = 0
        self.min_interval = 8  # 8 requests per minute = 7.5 seconds between requests
    
    def _rate_limit(self):
        """Enforce rate limit of 8 requests per minute"""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.min_interval:
            time.sleep(self.min_interval - elapsed)
        self.last_request_time = time.time()
    
    def fetch_stock_data(self, ticker: str) -> Dict[str, Any]:
        """Fetch real-time quote from Twelve Data"""
        if not self.api_key or not self.can_fetch():
            return {}
        
        try:
            self._rate_limit()
            
            # Get quote
            url = f"{self.base_url}/quote"
            params = {
                'symbol': ticker,
                'apikey': self.api_key
            }
            
            response = requests.get(url, params=params, timeout=10)
            self.quota.record_request()
            
            if response.status_code != 200:
                return {}
            
            data = response.json()
            
            if 'code' in data:  # Error response
                return {}
            
            return {
                'ticker': ticker,
                'name': data.get('name'),
                'current_price': float(data.get('close', 0)) if data.get('close') else None,
                'open': float(data.get('open', 0)) if data.get('open') else None,
                'high': float(data.get('high', 0)) if data.get('high') else None,
                'low': float(data.get('low', 0)) if data.get('low') else None,
                'volume': int(data.get('volume', 0)) if data.get('volume') else None,
                'change_percent': float(data.get('percent_change', 0)) if data.get('percent_change') else None,
                '_source': 'twelve_data',
                '_timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Twelve Data error for {ticker}: {e}")
            return {'ticker': ticker, '_error': str(e), '_source': 'twelve_data'}


class MultiAPIProvider:
    """
    Aggregates data from multiple APIs with intelligent fallback.
    
    Strategy:
    1. Try yfinance first (free, most data)
    2. For missing fields, try fallback APIs based on quota availability
    3. Merge data from multiple sources
    """
    
    # Fields that we want to ensure are populated
    PRIORITY_FIELDS = [
        'name', 'sector', 'industry', 'market_cap', 'current_price',
        'pe_ratio', 'pb_ratio', 'roe', 'roa', 'debt_to_equity',
        'revenue', 'net_income', 'eps', 'dividend_yield'
    ]
    
    def __init__(self):
        self.yfinance = YFinanceProvider()
        self.alpha_vantage = AlphaVantageProvider()
        self.fmp = FinancialModelingPrepProvider()
        self.twelve_data = TwelveDataProvider()
        
        self.providers = [
            self.yfinance,
            self.alpha_vantage,
            self.fmp,
            self.twelve_data
        ]
    
    def fetch_complete_data(self, ticker: str, fill_gaps: bool = True) -> Dict[str, Any]:
        """
        Fetch stock data, attempting to fill gaps from multiple APIs.
        
        Args:
            ticker: Stock ticker symbol
            fill_gaps: If True, try fallback APIs for missing fields
        
        Returns:
            Merged data dictionary with _sources list
        """
        # Start with yfinance (primary source)
        data = self.yfinance.fetch_stock_data(ticker)
        sources = ['yfinance']
        
        if not fill_gaps:
            data['_sources'] = sources
            return data
        
        # Check for missing priority fields
        missing_fields = self._get_missing_fields(data)
        
        if not missing_fields:
            data['_sources'] = sources
            return data
        
        # Try fallback APIs for missing fields
        fallback_providers = [self.alpha_vantage, self.fmp, self.twelve_data]
        
        for provider in fallback_providers:
            if not missing_fields:
                break
            
            if not provider.can_fetch():
                logger.debug(f"{provider.name} quota exhausted, skipping")
                continue
            
            logger.info(f"Trying {provider.name} for {ticker} (missing: {missing_fields})")
            
            fallback_data = provider.fetch_stock_data(ticker)
            
            if fallback_data and '_error' not in fallback_data:
                # Merge non-null values
                for field in missing_fields.copy():
                    if field in fallback_data and fallback_data[field] is not None:
                        data[field] = fallback_data[field]
                        missing_fields.remove(field)
                
                sources.append(provider.name)
        
        data['_sources'] = sources
        data['_missing_fields'] = list(missing_fields)
        
        return data
    
    def _get_missing_fields(self, data: Dict) -> set:
        """Get set of priority fields that are missing or None"""
        missing = set()
        for field in self.PRIORITY_FIELDS:
            if field not in data or data[field] is None:
                missing.add(field)
        return missing
    
    def get_quota_status(self) -> Dict[str, Dict]:
        """Get current quota status for all providers"""
        return {
            provider.name: {
                'remaining': provider.quota.remaining(),
                'used_today': provider.quota.requests_today,
                'daily_limit': provider.quota.daily_limit
            }
            for provider in self.providers
        }
    
    def fetch_batch(self, tickers: List[str], fill_gaps: bool = True) -> List[Dict[str, Any]]:
        """Fetch data for multiple tickers with progress tracking"""
        results = []
        total = len(tickers)
        
        for i, ticker in enumerate(tickers):
            logger.info(f"[{i+1}/{total}] Fetching {ticker}...")
            
            data = self.fetch_complete_data(ticker, fill_gaps=fill_gaps)
            results.append(data)
            
            # Small delay to avoid rate limiting
            if i < total - 1:
                time.sleep(0.5)
        
        return results


# Convenience function for easy import
def get_multi_api_provider() -> MultiAPIProvider:
    """Get a configured MultiAPIProvider instance"""
    return MultiAPIProvider()


if __name__ == "__main__":
    # Test the multi-API provider
    logging.basicConfig(level=logging.INFO)
    
    provider = MultiAPIProvider()
    
    # Test with a few tickers
    test_tickers = ['TCS.NS', 'RELIANCE.NS', 'HDFCBANK.NS']
    
    print("=" * 60)
    print("Multi-API Provider Test")
    print("=" * 60)
    
    for ticker in test_tickers:
        print(f"\nFetching data for {ticker}...")
        data = provider.fetch_complete_data(ticker)
        
        print(f"  Name: {data.get('name')}")
        print(f"  Sector: {data.get('sector')}")
        print(f"  PE Ratio: {data.get('pe_ratio')}")
        print(f"  ROE: {data.get('roe')}")
        print(f"  Sources: {data.get('_sources')}")
        print(f"  Missing: {data.get('_missing_fields', [])}")
    
    print("\n" + "=" * 60)
    print("API Quota Status:")
    for name, status in provider.get_quota_status().items():
        print(f"  {name}: {status['remaining']}/{status['daily_limit']} remaining")
