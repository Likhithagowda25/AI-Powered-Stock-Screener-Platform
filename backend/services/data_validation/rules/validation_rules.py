"""
Validation Rules for Financial Data
Defines all validation rules and thresholds
"""

# Mandatory fields that must be present
MANDATORY_FIELDS = {
    'fundamentals': ['ticker', 'quarter', 'revenue', 'net_income'],
    'price_history': ['ticker', 'date', 'close', 'volume']
}

# Optional but important fields
IMPORTANT_FIELDS = {
    'fundamentals': ['ebitda', 'eps', 'total_assets', 'total_debt', 'free_cash_flow'],
    'price_history': ['open', 'high', 'low']
}

# Fields that should never be negative
NON_NEGATIVE_FIELDS = [
    'revenue', 'total_assets', 'volume', 'market_cap',
    'promoter_holding', 'institutional_holding'
]

# Fields that can be negative
ALLOWED_NEGATIVE_FIELDS = [
    'net_income', 'free_cash_flow', 'ebitda', 'operating_income'
]

# Ratio validation ranges
RATIO_RANGES = {
    'promoter_holding': (0, 100),
    'institutional_holding': (0, 100),
    'debt_to_equity': (0, 20),  # Extreme values above 20 are flagged
    'current_ratio': (0, 50),
    'pe_ratio': (-100, 500),  # Can be negative if company has losses
    'pb_ratio': (0, 100),
    'roe': (-100, 200),
    'roa': (-100, 100),
}

# Anomaly detection thresholds
ANOMALY_THRESHOLDS = {
    'revenue_change_pct': 300,  # Flag if revenue changes > 300% QoQ
    'net_income_change_pct': 500,
    'price_change_pct': 100,  # Flag if stock price changes > 100% in a day
    'volume_spike': 10,  # Flag if volume > 10x average
}

# Severity levels
SEVERITY = {
    'CRITICAL': 'CRITICAL',  # Must fix before DB insert
    'HIGH': 'HIGH',  # Should fix, log prominently
    'MEDIUM': 'MEDIUM',  # Review and decide
    'LOW': 'LOW'  # Informational
}

# Fallback actions
FALLBACK_ACTIONS = {
    'SKIP': 'skip',  # Skip the record entirely
    'FLAG': 'flag',  # Insert but mark as suspect
    'IMPUTE': 'impute',  # Fill with calculated/interpolated value
    'MANUAL': 'manual'  # Requires manual review
}
