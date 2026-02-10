FIELD_MAP = {
    # From companies table
    "market_cap": "companies.market_cap",
    "sector": "companies.sector",
    "industry": "companies.industry",
    "exchange": "companies.exchange",
    "company_name": "companies.name",
    
    # From fundamentals_quarterly table
    "pe_ratio": "fundamentals_quarterly.pe_ratio",
    "pb_ratio": "fundamentals_quarterly.pb_ratio",
    "price_to_book": "fundamentals_quarterly.pb_ratio",
    "net_income": "fundamentals_quarterly.net_income",
    "net_profit": "fundamentals_quarterly.net_income",
    "revenue": "fundamentals_quarterly.revenue",
    "eps": "fundamentals_quarterly.eps",
    "operating_margin": "fundamentals_quarterly.operating_margin",
    "roe": "fundamentals_quarterly.roe",
    "roa": "fundamentals_quarterly.roa",
    "quarter": "fundamentals_quarterly.quarter",
    
    # Derived metrics (computed dynamically)
    "peg_ratio": "derived.peg_ratio",  # Computed from pe_ratio / eps_growth
    "debt_to_fcf": "derived.debt_to_fcf",  # Computed from total_debt / free_cash_flow
    "eps_cagr": "derived.eps_cagr",  # Computed from historical EPS
    "revenue_cagr": "derived.revenue_cagr",  # Computed from historical revenue
    "fcf_margin": "derived.fcf_margin",  # Computed from free_cash_flow / revenue
    "earnings_consistency_score": "derived.earnings_consistency",  # Computed from earnings variance
    
    # Fields that need to be added to schema or calculated
    "promoter_holding": "50",  # TODO: Add ownership table
    "revenue_growth_yoy": "0",  # TODO: Calculate from historical data
    "earnings_growth_yoy": "0",  # TODO: Calculate from historical data
    "eps_growth": "0",  # TODO: Calculate from historical EPS data
    "ebitda": "0",  # TODO: Add to fundamentals table
    "total_debt": "0",  # TODO: Calculate from debt_profile
    "free_cash_flow": "0",  # TODO: Calculate from cashflow_statements
    
    # Additional valuation metrics
    "price_to_sales": "fundamentals_quarterly.price_to_sales",
    "ev_to_ebitda": "fundamentals_quarterly.ev_to_ebitda",
    "dividend_yield": "fundamentals_quarterly.dividend_yield",
    
    # Profitability metrics
    "net_margin": "fundamentals_quarterly.net_margin",
    "gross_profit": "fundamentals_quarterly.gross_profit",
    "operating_profit": "fundamentals_quarterly.operating_profit",
    
    # Liquidity metrics
    "current_ratio": "fundamentals_quarterly.current_ratio",
    "quick_ratio": "fundamentals_quarterly.quick_ratio",
    
    # Leverage metrics
    "debt_to_equity": "fundamentals_quarterly.debt_to_equity",
}

# Time-series capable fields
TIME_SERIES_FIELDS = {
    "net_profit", "revenue", "eps", "free_cash_flow", "ebitda",
    "operating_profit", "gross_profit", "net_income"
}

# Derived metrics that require special computation
DERIVED_METRICS = {
    "peg_ratio", "debt_to_fcf", "eps_cagr", "revenue_cagr",
    "fcf_margin", "earnings_consistency_score"
}
