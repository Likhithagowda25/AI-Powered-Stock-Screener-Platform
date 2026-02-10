"""
API Configuration and Rate Limit Management
Centralized configuration for all market data API providers
"""

import os
from dataclasses import dataclass
from typing import Dict, Optional
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from api-gateway/.env
env_path = Path(__file__).parent.parent.parent / 'api-gateway' / '.env'
load_dotenv(env_path)


@dataclass
class APIConfig:
    """Configuration for a single API provider"""
    name: str
    api_key: Optional[str]
    daily_limit: int
    rate_limit_per_minute: int
    base_url: str
    enabled: bool = True
    
    @property
    def is_configured(self) -> bool:
        return bool(self.api_key) and self.enabled


# API Configurations
YFINANCE_CONFIG = APIConfig(
    name="yfinance",
    api_key=None,  # No API key needed
    daily_limit=999999,  # Effectively unlimited
    rate_limit_per_minute=60,
    base_url="https://query1.finance.yahoo.com",
    enabled=True
)

ALPHA_VANTAGE_CONFIG = APIConfig(
    name="alpha_vantage",
    api_key=os.getenv("ALPHA_VANTAGE_API_KEY"),
    daily_limit=25,  # Free tier
    rate_limit_per_minute=5,
    base_url="https://www.alphavantage.co/query",
    enabled=bool(os.getenv("ALPHA_VANTAGE_API_KEY"))
)

FMP_CONFIG = APIConfig(
    name="financial_modeling_prep",
    api_key=os.getenv("FMP_API_KEY"),
    daily_limit=250,  # Free tier
    rate_limit_per_minute=30,
    base_url="https://financialmodelingprep.com/api/v3",
    enabled=bool(os.getenv("FMP_API_KEY"))
)

TWELVE_DATA_CONFIG = APIConfig(
    name="twelve_data",
    api_key=os.getenv("TWELVE_DATA_API_KEY"),
    daily_limit=800,  # Free tier
    rate_limit_per_minute=8,
    base_url="https://api.twelvedata.com",
    enabled=bool(os.getenv("TWELVE_DATA_API_KEY"))
)

# All configurations
ALL_CONFIGS: Dict[str, APIConfig] = {
    "yfinance": YFINANCE_CONFIG,
    "alpha_vantage": ALPHA_VANTAGE_CONFIG,
    "fmp": FMP_CONFIG,
    "twelve_data": TWELVE_DATA_CONFIG
}


def get_config(provider_name: str) -> Optional[APIConfig]:
    """Get configuration for a specific provider"""
    return ALL_CONFIGS.get(provider_name)


def get_enabled_providers() -> Dict[str, APIConfig]:
    """Get all enabled/configured providers"""
    return {name: config for name, config in ALL_CONFIGS.items() if config.is_configured or config.name == "yfinance"}


def get_total_daily_capacity() -> int:
    """Calculate total API requests available per day"""
    total = 0
    for config in ALL_CONFIGS.values():
        if config.is_configured or config.name == "yfinance":
            total += config.daily_limit
    return total


def print_config_status():
    """Print configuration status for all providers"""
    print("=" * 50)
    print("API Configuration Status")
    print("=" * 50)
    
    for name, config in ALL_CONFIGS.items():
        status = "✅ Configured" if config.is_configured or name == "yfinance" else "❌ Not configured"
        limit = f"{config.daily_limit}/day" if config.is_configured or name == "yfinance" else "N/A"
        print(f"{name:20} | {status:15} | Limit: {limit}")
    
    print("-" * 50)
    print(f"Total daily capacity: {get_total_daily_capacity()} requests")
    print("=" * 50)


# Database configuration
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5433")),
    "database": os.getenv("DB_NAME", "stock_screener"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "25101974")
}


if __name__ == "__main__":
    print_config_status()
