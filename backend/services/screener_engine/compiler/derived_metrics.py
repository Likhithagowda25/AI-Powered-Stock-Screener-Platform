"""
Derived Metrics Engine
Handles computation and validation of derived financial metrics

Module: Extended DSL Compiler
Project: AI-Powered Mobile Stock Screener & Advisory Platform
Version: 1.0.0
"""

from typing import Dict, Any, Optional, List
from decimal import Decimal, DivisionByZero, InvalidOperation
import logging

logger = logging.getLogger(__name__)


class DerivedMetricError(Exception):
    """Exception raised when derived metric computation fails"""
    pass


class DerivedMetricsEngine:
    """
    Engine for computing derived financial metrics with safety checks
    
    Responsibilities:
    - Define canonical formulas for derived metrics
    - Prevent divide-by-zero and invalid operations
    - Handle missing data gracefully
    - Version control for formula changes
    """
    
    VERSION = "1.0.0"
    
    # Metric definitions with metadata
    METRIC_DEFINITIONS = {
        "peg_ratio": {
            "name": "PEG Ratio",
            "formula": "pe_ratio / eps_growth",
            "requires": ["pe_ratio", "eps_growth"],
            "safe_computation": True,
            "typical_range": [0, 5],
            "version": "1.0.0"
        },
        "debt_to_fcf": {
            "name": "Debt to Free Cash Flow",
            "formula": "total_debt / free_cash_flow",
            "requires": ["total_debt", "free_cash_flow"],
            "safe_computation": True,
            "typical_range": [0, 20],
            "version": "1.0.0"
        },
        "eps_cagr": {
            "name": "EPS Compound Annual Growth Rate",
            "formula": "((ending_eps / beginning_eps) ^ (1/years)) - 1",
            "requires": ["eps_history", "periods"],
            "safe_computation": True,
            "typical_range": [-50, 100],
            "version": "1.0.0",
            "time_series": True
        },
        "revenue_cagr": {
            "name": "Revenue Compound Annual Growth Rate",
            "formula": "((ending_revenue / beginning_revenue) ^ (1/years)) - 1",
            "requires": ["revenue_history", "periods"],
            "safe_computation": True,
            "typical_range": [-50, 100],
            "version": "1.0.0",
            "time_series": True
        },
        "fcf_margin": {
            "name": "Free Cash Flow Margin",
            "formula": "(free_cash_flow / revenue) * 100",
            "requires": ["free_cash_flow", "revenue"],
            "safe_computation": True,
            "typical_range": [0, 50],
            "version": "1.0.0"
        },
        "earnings_consistency_score": {
            "name": "Earnings Consistency Score",
            "formula": "1 - (std_dev(earnings) / avg(earnings))",
            "requires": ["earnings_history"],
            "safe_computation": True,
            "typical_range": [0, 1],
            "version": "1.0.0",
            "time_series": True
        }
    }
    
    def __init__(self):
        """Initialize the derived metrics engine"""
        self.computation_cache = {}
        
    def validate_metric(self, metric_name: str) -> bool:
        """Check if a metric is defined and valid"""
        return metric_name in self.METRIC_DEFINITIONS
    
    def get_metric_requirements(self, metric_name: str) -> List[str]:
        """Get the required fields for computing a metric"""
        if not self.validate_metric(metric_name):
            raise DerivedMetricError(f"Unknown metric: {metric_name}")
        return self.METRIC_DEFINITIONS[metric_name]["requires"]
    
    def is_time_series_metric(self, metric_name: str) -> bool:
        """Check if a metric requires time-series data"""
        if not self.validate_metric(metric_name):
            return False
        return self.METRIC_DEFINITIONS[metric_name].get("time_series", False)
    
    def compute_peg_ratio(self, pe_ratio: float, eps_growth: float) -> Optional[float]:
        """
        Compute PEG Ratio with safety checks
        
        Args:
            pe_ratio: Price to Earnings ratio
            eps_growth: EPS growth rate (as percentage)
            
        Returns:
            PEG ratio or None if computation is unsafe
            
        Safety Checks:
            - eps_growth must not be zero
            - pe_ratio must be positive
            - eps_growth should be meaningful (> 0.01%)
        """
        try:
            # Validate inputs
            if pe_ratio is None or eps_growth is None:
                logger.warning("PEG Ratio: Missing input values")
                return None
                
            if pe_ratio <= 0:
                logger.warning(f"PEG Ratio: Invalid PE ratio {pe_ratio}")
                return None
                
            if abs(eps_growth) < 0.01:
                logger.warning(f"PEG Ratio: EPS growth too small {eps_growth}")
                return None
                
            if eps_growth == 0:
                logger.warning("PEG Ratio: Divide by zero - EPS growth is 0")
                return None
            
            peg = Decimal(str(pe_ratio)) / Decimal(str(eps_growth))
            result = float(peg)
            
            # Sanity check result
            if result < 0 or result > 1000:
                logger.warning(f"PEG Ratio: Result {result} outside reasonable range")
                return None
                
            return result
            
        except (DivisionByZero, InvalidOperation, ValueError) as e:
            logger.error(f"PEG Ratio computation error: {e}")
            return None
    
    def compute_debt_to_fcf(self, total_debt: float, free_cash_flow: float) -> Optional[float]:
        """
        Compute Debt to Free Cash Flow ratio with safety checks
        
        Args:
            total_debt: Total debt amount
            free_cash_flow: Free cash flow
            
        Returns:
            Debt to FCF ratio or None if computation is unsafe
            
        Safety Checks:
            - free_cash_flow must be positive
            - ratio should be meaningful
        """
        try:
            if total_debt is None or free_cash_flow is None:
                logger.warning("Debt to FCF: Missing input values")
                return None
                
            if free_cash_flow <= 0:
                logger.warning(f"Debt to FCF: Invalid FCF {free_cash_flow}")
                return None
                
            if total_debt < 0:
                logger.warning(f"Debt to FCF: Negative debt {total_debt}")
                return None
            
            ratio = Decimal(str(total_debt)) / Decimal(str(free_cash_flow))
            result = float(ratio)
            
            # Sanity check
            if result > 1000:
                logger.warning(f"Debt to FCF: Result {result} outside reasonable range")
                return None
                
            return result
            
        except (DivisionByZero, InvalidOperation, ValueError) as e:
            logger.error(f"Debt to FCF computation error: {e}")
            return None
    
    def compute_cagr(self, beginning_value: float, ending_value: float, periods: int) -> Optional[float]:
        """
        Compute Compound Annual Growth Rate
        
        Args:
            beginning_value: Starting value
            ending_value: Ending value
            periods: Number of years
            
        Returns:
            CAGR as percentage or None if computation is unsafe
            
        Safety Checks:
            - beginning_value must be positive
            - periods must be > 0
            - handles negative growth
        """
        try:
            if beginning_value is None or ending_value is None or periods is None:
                logger.warning("CAGR: Missing input values")
                return None
                
            if beginning_value <= 0:
                logger.warning(f"CAGR: Invalid beginning value {beginning_value}")
                return None
                
            if periods <= 0:
                logger.warning(f"CAGR: Invalid periods {periods}")
                return None
                
            if ending_value < 0:
                logger.warning(f"CAGR: Negative ending value {ending_value}")
                return None
            
            # CAGR = (Ending Value / Beginning Value) ^ (1 / Number of Years) - 1
            cagr = (pow(ending_value / beginning_value, 1 / periods) - 1) * 100
            
            # Sanity check
            if cagr < -100 or cagr > 1000:
                logger.warning(f"CAGR: Result {cagr}% outside reasonable range")
                return None
                
            return round(cagr, 2)
            
        except (ZeroDivisionError, ValueError, OverflowError) as e:
            logger.error(f"CAGR computation error: {e}")
            return None
    
    def compute_fcf_margin(self, free_cash_flow: float, revenue: float) -> Optional[float]:
        """
        Compute Free Cash Flow Margin
        
        Args:
            free_cash_flow: Free cash flow amount
            revenue: Total revenue
            
        Returns:
            FCF margin as percentage or None if computation is unsafe
        """
        try:
            if free_cash_flow is None or revenue is None:
                logger.warning("FCF Margin: Missing input values")
                return None
                
            if revenue <= 0:
                logger.warning(f"FCF Margin: Invalid revenue {revenue}")
                return None
            
            margin = (Decimal(str(free_cash_flow)) / Decimal(str(revenue))) * 100
            result = float(margin)
            
            # FCF margin can be negative
            if result < -100 or result > 100:
                logger.warning(f"FCF Margin: Result {result}% outside reasonable range")
                return None
                
            return round(result, 2)
            
        except (DivisionByZero, InvalidOperation, ValueError) as e:
            logger.error(f"FCF Margin computation error: {e}")
            return None
    
    def compute_earnings_consistency_score(self, earnings_history: List[float]) -> Optional[float]:
        """
        Compute Earnings Consistency Score
        
        Args:
            earnings_history: List of historical earnings values
            
        Returns:
            Consistency score (0-1) or None if computation is unsafe
            
        Formula:
            1 - (coefficient of variation)
            where CV = std_dev / mean
        """
        try:
            if not earnings_history or len(earnings_history) < 4:
                logger.warning("Earnings Consistency: Insufficient data")
                return None
            
            # Filter out None values
            valid_earnings = [e for e in earnings_history if e is not None]
            
            if len(valid_earnings) < 4:
                logger.warning("Earnings Consistency: Too many null values")
                return None
            
            # Calculate mean
            mean_earnings = sum(valid_earnings) / len(valid_earnings)
            
            if mean_earnings == 0:
                logger.warning("Earnings Consistency: Mean is zero")
                return None
            
            # Calculate standard deviation
            variance = sum((x - mean_earnings) ** 2 for x in valid_earnings) / len(valid_earnings)
            std_dev = variance ** 0.5
            
            # Coefficient of variation
            cv = std_dev / abs(mean_earnings)
            
            # Consistency score (1 = very consistent, 0 = very inconsistent)
            score = max(0, min(1, 1 - cv))
            
            return round(score, 3)
            
        except (ZeroDivisionError, ValueError) as e:
            logger.error(f"Earnings Consistency computation error: {e}")
            return None
    
    def compute_metric(self, metric_name: str, data: Dict[str, Any]) -> Optional[float]:
        """
        Compute a derived metric given input data
        
        Args:
            metric_name: Name of the metric to compute
            data: Dictionary containing required input fields
            
        Returns:
            Computed metric value or None if computation fails
        """
        if not self.validate_metric(metric_name):
            raise DerivedMetricError(f"Unknown metric: {metric_name}")
        
        # Route to specific computation method
        if metric_name == "peg_ratio":
            return self.compute_peg_ratio(
                data.get("pe_ratio"),
                data.get("eps_growth")
            )
        elif metric_name == "debt_to_fcf":
            return self.compute_debt_to_fcf(
                data.get("total_debt"),
                data.get("free_cash_flow")
            )
        elif metric_name == "eps_cagr":
            return self.compute_cagr(
                data.get("beginning_eps"),
                data.get("ending_eps"),
                data.get("periods")
            )
        elif metric_name == "revenue_cagr":
            return self.compute_cagr(
                data.get("beginning_revenue"),
                data.get("ending_revenue"),
                data.get("periods")
            )
        elif metric_name == "fcf_margin":
            return self.compute_fcf_margin(
                data.get("free_cash_flow"),
                data.get("revenue")
            )
        elif metric_name == "earnings_consistency_score":
            return self.compute_earnings_consistency_score(
                data.get("earnings_history", [])
            )
        
        return None
    
    def get_sql_expression(self, metric_name: str) -> Optional[str]:
        """
        Get SQL expression for computing metric in database
        
        Args:
            metric_name: Name of the derived metric
            
        Returns:
            SQL expression string or None if should be computed in Python
        """
        # Simple metrics can be computed in SQL
        sql_expressions = {
            "peg_ratio": "CASE WHEN eps_growth > 0.01 THEN pe_ratio / eps_growth ELSE NULL END",
            "debt_to_fcf": "CASE WHEN free_cash_flow > 0 THEN total_debt / free_cash_flow ELSE NULL END",
            "fcf_margin": "CASE WHEN revenue > 0 THEN (free_cash_flow / revenue * 100) ELSE NULL END"
        }
        
        return sql_expressions.get(metric_name)
    
    def validate_computation_safety(self, metric_name: str, data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        """
        Validate if metric computation is safe with given data
        
        Args:
            metric_name: Metric to validate
            data: Input data
            
        Returns:
            (is_safe, error_message) tuple
        """
        if not self.validate_metric(metric_name):
            return False, f"Unknown metric: {metric_name}"
        
        requirements = self.get_metric_requirements(metric_name)
        
        # Check all required fields are present
        missing_fields = [field for field in requirements if field not in data or data[field] is None]
        if missing_fields:
            return False, f"Missing required fields: {', '.join(missing_fields)}"
        
        # Metric-specific safety checks
        if metric_name == "peg_ratio":
            if data.get("eps_growth") == 0:
                return False, "EPS growth is zero - cannot compute PEG ratio"
            if abs(data.get("eps_growth", 0)) < 0.01:
                return False, "EPS growth too small - PEG ratio would be unreliable"
                
        elif metric_name == "debt_to_fcf":
            if data.get("free_cash_flow", 0) <= 0:
                return False, "Free cash flow is zero or negative - cannot compute ratio"
                
        elif metric_name in ["eps_cagr", "revenue_cagr"]:
            if "beginning" in requirements[0]:
                beginning_key = requirements[0]
                if data.get(beginning_key, 0) <= 0:
                    return False, "Beginning value must be positive for CAGR"
        
        return True, None


# Singleton instance
_derived_metrics_engine = None

def get_derived_metrics_engine() -> DerivedMetricsEngine:
    """Get singleton instance of derived metrics engine"""
    global _derived_metrics_engine
    if _derived_metrics_engine is None:
        _derived_metrics_engine = DerivedMetricsEngine()
    return _derived_metrics_engine
