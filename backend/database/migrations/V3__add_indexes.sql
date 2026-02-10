CREATE INDEX idx_companies_ticker ON companies(ticker);

CREATE INDEX idx_fundamentals_quarterly_ticker ON fundamentals_quarterly(ticker);
CREATE INDEX idx_fundamentals_quarterly_pe ON fundamentals_quarterly(pe_ratio);
CREATE INDEX idx_fundamentals_quarterly_revenue ON fundamentals_quarterly(revenue);
CREATE INDEX idx_fundamentals_quarterly_eps ON fundamentals_quarterly(eps);

CREATE INDEX idx_analyst_estimates_ticker ON analyst_estimates(ticker);
CREATE INDEX idx_analyst_estimates_date ON analyst_estimates(estimate_date);

CREATE INDEX idx_price_history_ticker_time
ON price_history (ticker, time DESC);

CREATE INDEX idx_price_history_recent 
ON price_history (ticker, time DESC) 
WHERE time >= NOW() - INTERVAL '1 year';

CREATE INDEX idx_buybacks_ticker ON buybacks(ticker);
CREATE INDEX idx_buybacks_date ON buybacks(announcement_date);

CREATE INDEX idx_cashflow_ticker ON cashflow_statements(ticker);
CREATE INDEX idx_cashflow_period ON cashflow_statements(period);