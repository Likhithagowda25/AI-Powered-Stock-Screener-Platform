import yfinance as yf


def get_daily_ohlcv(symbol, period="1y"):
    """
    Fetch daily OHLCV price data for a stock.
    Returns dict keyed by date.
    """
    ticker = yf.Ticker(symbol)
    hist = ticker.history(period=period)

    if hist.empty:
        print(f"No price data returned for {symbol}")
        return {}

    data = {}
    for index, row in hist.iterrows():
        date_str = index.strftime("%Y-%m-%d")
        data[date_str] = {
            "open": float(row["Open"]),
            "high": float(row["High"]),
            "low": float(row["Low"]),
            "close": float(row["Close"]),
            "volume": int(row["Volume"]),
        }

    return data


def get_company_metadata(symbol):
    """
    Fetch company metadata such as name, sector, industry, market cap.
    """
    ticker = yf.Ticker(symbol)
    info = ticker.info

    if not info:
        print(f"No metadata returned for {symbol}")
        return None

    return {
        "ticker": symbol,
        "name": info.get("longName"),
        "exchange": info.get("exchange"),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "market_cap": info.get("marketCap"),
    }