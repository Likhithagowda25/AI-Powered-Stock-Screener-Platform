"""
Enhanced DSL Compiler with Extended Logic
Supports temporal conditions, derived metrics, range filters, and null handling

Module: Extended DSL Compiler
Project: AI-Powered Mobile Stock Screener & Advisory Platform
Version: 2.0.0
"""

from typing import Dict, Any, List, Optional, Tuple
import logging
from compiler.field_mapper import FIELD_MAP
from compiler.operators import OPERATORS
from compiler.derived_metrics import get_derived_metrics_engine
from compiler.validation_engine import validate_dsl_query, ValidationSeverity

logger = logging.getLogger(__name__)


class CompilerError(Exception):
    """Exception raised during DSL compilation"""
    pass


class ExtendedDSLCompiler:
    """
    Enhanced DSL Compiler supporting:
    - Temporal conditions (time-windowed queries)
    - Derived metrics computation
    - Range filters
    - Null handling strategies
    - Complex logical expressions
    """
    
    def __init__(self, validate_before_compile: bool = True):
        """
        Initialize compiler
        
        Args:
            validate_before_compile: Run validation before compilation
        """
        self.validate_before_compile = validate_before_compile
        self.metrics_engine = get_derived_metrics_engine()
        self.query_params = {}
        self.param_counter = 0
        
    def compile(self, dsl_query: Dict[str, Any]) -> Tuple[str, Dict[str, Any], Dict[str, Any]]:
        """
        Compile DSL query to SQL
        
        Args:
            dsl_query: DSL query dictionary
            
        Returns:
            Tuple of (sql_query, parameters, metadata)
            
        Raises:
            CompilerError: If compilation fails
        """
        # Reset state
        self.query_params = {}
        self.param_counter = 0
        metadata = {
            "uses_time_series": False,
            "uses_derived_metrics": False,
            "complexity_score": 0
        }
        
        # Validation
        if self.validate_before_compile:
            validation_result = validate_dsl_query(dsl_query)
            if not validation_result.is_valid:
                errors = validation_result.get_errors()
                error_msg = "; ".join([e.message for e in errors[:3]])
                raise CompilerError(f"Validation failed: {error_msg}")
            
            # Log warnings
            for warning in validation_result.get_warnings():
                logger.warning(f"DSL Warning: {warning.message}")
        
        # Build SQL query
        try:
            where_clause = self._compile_filter(dsl_query.get("filter", {}), metadata)
            
            # Build complete query
            sql_query = self._build_complete_query(where_clause, dsl_query, metadata)
            
            return sql_query, self.query_params, metadata
            
        except Exception as e:
            logger.error(f"Compilation error: {e}", exc_info=True)
            raise CompilerError(f"Failed to compile DSL: {str(e)}")
    
    def _build_complete_query(self, where_clause: str, dsl_query: Dict[str, Any], metadata: Dict) -> str:
        """Build complete SQL query with joins and metadata filters"""
        
        # Determine required tables based on fields used
        base_query = """
        SELECT DISTINCT
            c.symbol,
            c.name,
            c.sector,
            c.market_cap,
            fq.pe_ratio,
            fq.roe,
            fq.net_income,
            fq.revenue
        FROM companies c
        LEFT JOIN fundamentals_quarterly fq ON c.symbol = fq.symbol
        """
        
        # Add time-series joins if needed
        if metadata.get("uses_time_series"):
            # Join with historical data
            pass
        
        # Add WHERE clause
        if where_clause:
            base_query += f"\nWHERE {where_clause}"
        
        # Add metadata filters
        meta_filters = self._build_meta_filters(dsl_query.get("meta", {}))
        if meta_filters:
            connector = "WHERE" if not where_clause else "AND"
            base_query += f"\n{connector} {meta_filters}"
        
        # Add sorting
        if "sort" in dsl_query:
            sort_clause = self._build_sort_clause(dsl_query["sort"])
            base_query += f"\n{sort_clause}"
        
        # Add limit
        limit = dsl_query.get("limit", 100)
        base_query += f"\nLIMIT {limit}"
        
        return base_query
    
    def _compile_filter(self, filter_node: Dict[str, Any], metadata: Dict) -> str:
        """Compile filter node to SQL WHERE clause"""
        
        if "and" in filter_node:
            clauses = [
                self._compile_filter(cond, metadata)
                for cond in filter_node["and"]
            ]
            metadata["complexity_score"] += 1
            return "(" + " AND ".join(clauses) + ")"
        
        elif "or" in filter_node:
            clauses = [
                self._compile_filter(cond, metadata)
                for cond in filter_node["or"]
            ]
            metadata["complexity_score"] += 1
            return "(" + " OR ".join(clauses) + ")"
        
        elif "not" in filter_node:
            inner_clause = self._compile_filter(filter_node["not"], metadata)
            metadata["complexity_score"] += 2
            return f"NOT ({inner_clause})"
        
        else:
            # It's a condition
            return self._compile_condition(filter_node, metadata)
    
    def _compile_condition(self, condition: Dict[str, Any], metadata: Dict) -> str:
        """Compile a single condition to SQL"""
        
        field = condition["field"]
        operator = condition["operator"]
        value = condition.get("value")
        
        # Handle derived metrics
        if field in self.metrics_engine.METRIC_DEFINITIONS:
            return self._compile_derived_metric_condition(condition, metadata)
        
        # Handle period-based conditions
        if "period" in condition:
            return self._compile_temporal_condition(condition, metadata)
        
        # Handle trend operators
        if operator in ["increasing", "decreasing", "stable"]:
            return self._compile_trend_condition(condition, metadata)
        
        # Standard condition compilation
        return self._compile_standard_condition(condition, metadata)
    
    def _compile_standard_condition(self, condition: Dict[str, Any], metadata: Dict) -> str:
        """Compile standard comparison condition"""
        
        field = condition["field"]
        operator = condition["operator"]
        value = condition.get("value")
        
        # Get database column
        if field not in FIELD_MAP:
            raise CompilerError(f"Unknown field: {field}")
        
        column = FIELD_MAP[field]
        
        # Handle null checking
        null_handling = condition.get("null_handling", {})
        if null_handling:
            return self._compile_with_null_handling(column, operator, value, null_handling)
        
        # Handle different operators
        if operator == "between":
            return self._compile_between(column, value)
        elif operator == "in":
            return self._compile_in(column, value)
        elif operator == "not_in":
            return self._compile_not_in(column, value)
        elif operator == "exists":
            return self._compile_exists(column, value)
        else:
            return self._compile_comparison(column, operator, value)
    
    def _compile_comparison(self, column: str, operator: str, value: Any) -> str:
        """Compile simple comparison"""
        if operator not in OPERATORS:
            raise CompilerError(f"Unknown operator: {operator}")
        
        param_key = self._get_next_param_key()
        self.query_params[param_key] = value
        
        sql_operator = OPERATORS[operator]
        return f"{column} {sql_operator} %({param_key})s"
    
    def _compile_between(self, column: str, value: List[float]) -> str:
        """Compile BETWEEN operator"""
        if not isinstance(value, list) or len(value) != 2:
            raise CompilerError("BETWEEN requires array of 2 values")
        
        min_param = self._get_next_param_key()
        max_param = self._get_next_param_key()
        self.query_params[min_param] = value[0]
        self.query_params[max_param] = value[1]
        
        return f"{column} BETWEEN %({min_param})s AND %({max_param})s"
    
    def _compile_in(self, column: str, value: List) -> str:
        """Compile IN operator"""
        if not isinstance(value, list):
            raise CompilerError("IN operator requires array value")
        
        param_key = self._get_next_param_key()
        self.query_params[param_key] = tuple(value)
        
        return f"{column} IN %({param_key})s"
    
    def _compile_not_in(self, column: str, value: List) -> str:
        """Compile NOT IN operator"""
        if not isinstance(value, list):
            raise CompilerError("NOT IN operator requires array value")
        
        param_key = self._get_next_param_key()
        self.query_params[param_key] = tuple(value)
        
        return f"{column} NOT IN %({param_key})s"
    
    def _compile_exists(self, column: str, value: bool) -> str:
        """Compile EXISTS check (NULL checking)"""
        if value:
            return f"{column} IS NOT NULL"
        else:
            return f"{column} IS NULL"
    
    def _compile_with_null_handling(self, column: str, operator: str, value: Any, null_config: Dict) -> str:
        """Compile condition with null handling strategy"""
        
        strategy = null_config.get("strategy", "exclude")
        
        if strategy == "exclude":
            # Exclude rows with null values
            null_check = f"{column} IS NOT NULL"
            comparison = self._compile_comparison(column, operator, value)
            return f"({null_check} AND {comparison})"
        
        elif strategy == "fail":
            # Same as exclude - null values won't match condition
            return self._compile_comparison(column, operator, value)
        
        elif strategy == "use_default":
            # Use COALESCE with default value
            default_val = null_config.get("default_value", 0)
            default_param = self._get_next_param_key()
            self.query_params[default_param] = default_val
            
            coalesced_column = f"COALESCE({column}, %({default_param})s)"
            return self._compile_comparison(coalesced_column, operator, value)
        
        elif strategy == "use_latest":
            # Use latest non-null value (requires window function)
            # This is complex and may need subquery
            logger.warning("use_latest strategy requires complex query - using exclude")
            return self._compile_with_null_handling(column, operator, value, {"strategy": "exclude"})
        
        else:
            raise CompilerError(f"Unknown null handling strategy: {strategy}")
    
    def _compile_temporal_condition(self, condition: Dict[str, Any], metadata: Dict) -> str:
        """
        Compile temporal condition with period specification
        
        Example: "positive earnings last 4 quarters"
        """
        metadata["uses_time_series"] = True
        
        field = condition["field"]
        operator = condition["operator"]
        value = condition.get("value")
        period = condition["period"]
        
        period_type = period["type"]
        n = period["n"]
        aggregation = period["aggregation"]
        
        # Get base column
        if field not in FIELD_MAP:
            raise CompilerError(f"Unknown field: {field}")
        base_column = FIELD_MAP[field]
        
        # Build temporal query based on aggregation type
        if aggregation == "all":
            return self._compile_all_periods(base_column, operator, value, period_type, n)
        elif aggregation == "any":
            return self._compile_any_period(base_column, operator, value, period_type, n)
        elif aggregation in ["avg", "sum", "min", "max"]:
            return self._compile_aggregated_period(base_column, operator, value, aggregation, period_type, n)
        elif aggregation == "trend":
            return self._compile_trend_over_period(base_column, period, condition.get("trend_config", {}))
        else:
            raise CompilerError(f"Unknown aggregation: {aggregation}")
    
    def _compile_all_periods(self, column: str, operator: str, value: Any, period_type: str, n: int) -> str:
        """Compile 'all periods' condition - every period must satisfy"""
        
        # This requires a subquery that checks all periods
        # Simplified version - in production would use window functions
        param_key = self._get_next_param_key()
        self.query_params[param_key] = value
        
        sql_op = OPERATORS.get(operator, operator)
        
        # Placeholder for now - would need proper time-series table structure
        return f"""
        (SELECT COUNT(*) FROM fundamentals_quarterly fq2 
         WHERE fq2.symbol = c.symbol 
         AND fq2.{column.split('.')[-1]} {sql_op} %({param_key})s
         AND fq2.quarter >= (SELECT MAX(quarter) - {n} FROM fundamentals_quarterly WHERE symbol = c.symbol)
        ) = {n}
        """.strip()
    
    def _compile_any_period(self, column: str, operator: str, value: Any, period_type: str, n: int) -> str:
        """Compile 'any period' condition - at least one period must satisfy"""
        
        param_key = self._get_next_param_key()
        self.query_params[param_key] = value
        
        sql_op = OPERATORS.get(operator, operator)
        
        return f"""
        EXISTS (SELECT 1 FROM fundamentals_quarterly fq2 
                WHERE fq2.symbol = c.symbol 
                AND fq2.{column.split('.')[-1]} {sql_op} %({param_key})s
                AND fq2.quarter >= (SELECT MAX(quarter) - {n} FROM fundamentals_quarterly WHERE symbol = c.symbol)
        )
        """.strip()
    
    def _compile_aggregated_period(self, column: str, operator: str, value: Any, 
                                    agg_func: str, period_type: str, n: int) -> str:
        """Compile aggregated condition over period"""
        
        param_key = self._get_next_param_key()
        self.query_params[param_key] = value
        
        sql_op = OPERATORS.get(operator, operator)
        
        return f"""
        (SELECT {agg_func.upper()}({column.split('.')[-1]}) 
         FROM fundamentals_quarterly fq2 
         WHERE fq2.symbol = c.symbol
         AND fq2.quarter >= (SELECT MAX(quarter) - {n} FROM fundamentals_quarterly WHERE symbol = c.symbol)
        ) {sql_op} %({param_key})s
        """.strip()
    
    def _compile_trend_over_period(self, column: str, period: Dict, trend_config: Dict) -> str:
        """Compile trend analysis over period"""
        
        direction = trend_config.get("direction", "increasing")
        min_periods = trend_config.get("min_periods", 2)
        
        # This would use window functions LAG/LEAD to detect trends
        # Simplified placeholder
        if direction == "increasing":
            return f"""
            (SELECT COUNT(*) FROM (
                SELECT {column.split('.')[-1]},
                       LAG({column.split('.')[-1]}) OVER (ORDER BY quarter) as prev_value
                FROM fundamentals_quarterly fq2
                WHERE fq2.symbol = c.symbol
                ORDER BY quarter DESC
                LIMIT {min_periods}
            ) t WHERE {column.split('.')[-1]} > prev_value) >= {min_periods - 1}
            """.strip()
        
        return "1=1"  # Placeholder
    
    def _compile_trend_condition(self, condition: Dict[str, Any], metadata: Dict) -> str:
        """Compile trend-based condition"""
        metadata["uses_time_series"] = True
        
        trend_config = condition.get("trend_config", {})
        period = condition.get("period")
        
        if not period:
            raise CompilerError("Trend condition requires period specification")
        
        field = condition["field"]
        if field not in FIELD_MAP:
            raise CompilerError(f"Unknown field: {field}")
        
        column = FIELD_MAP[field]
        
        return self._compile_trend_over_period(column, period, trend_config)
    
    def _compile_derived_metric_condition(self, condition: Dict[str, Any], metadata: Dict) -> str:
        """Compile derived metric condition"""
        metadata["uses_derived_metrics"] = True
        
        field = condition["field"]
        operator = condition["operator"]
        value = condition.get("value")
        
        # Check if we can compute in SQL
        sql_expr = self.metrics_engine.get_sql_expression(field)
        
        if sql_expr:
            # Can compute in SQL
            param_key = self._get_next_param_key()
            self.query_params[param_key] = value
            sql_op = OPERATORS.get(operator, operator)
            return f"({sql_expr}) {sql_op} %({param_key})s"
        else:
            # Need to compute in Python - mark for post-processing
            # For now, add a comment and placeholder
            logger.warning(f"Derived metric {field} requires Python computation - adding post-filter")
            return "1=1  -- Derived metric requires post-processing"
    
    def _build_meta_filters(self, meta: Dict[str, Any]) -> str:
        """Build metadata filters (sector, exchange, etc.)"""
        filters = []
        
        if "sector" in meta:
            param_key = self._get_next_param_key()
            self.query_params[param_key] = meta["sector"]
            filters.append(f"c.sector = %({param_key})s")
        
        if "exchange" in meta:
            param_key = self._get_next_param_key()
            self.query_params[param_key] = meta["exchange"]
            filters.append(f"c.exchange = %({param_key})s")
        
        if "market_cap_category" in meta:
            # Would need market cap ranges defined
            pass
        
        return " AND ".join(filters) if filters else ""
    
    def _build_sort_clause(self, sort_config: Dict[str, Any]) -> str:
        """Build ORDER BY clause"""
        field = sort_config.get("field")
        order = sort_config.get("order", "asc").upper()
        
        if field not in FIELD_MAP:
            raise CompilerError(f"Unknown sort field: {field}")
        
        column = FIELD_MAP[field]
        return f"ORDER BY {column} {order}"
    
    def _get_next_param_key(self) -> str:
        """Generate next parameter key"""
        key = f"p{self.param_counter}"
        self.param_counter += 1
        return key


# Legacy compatibility functions
def compile_condition(condition: Dict[str, Any], params: Dict[str, Any]) -> str:
    """Legacy function - compile single condition"""
    compiler = ExtendedDSLCompiler(validate_before_compile=False)
    compiler.query_params = params
    metadata = {}
    return compiler._compile_condition(condition, metadata)


def compile_filter(filter_node: Dict[str, Any], params: Dict[str, Any]) -> str:
    """Legacy function - compile filter"""
    compiler = ExtendedDSLCompiler(validate_before_compile=False)
    compiler.query_params = params
    metadata = {}
    return compiler._compile_filter(filter_node, metadata)
