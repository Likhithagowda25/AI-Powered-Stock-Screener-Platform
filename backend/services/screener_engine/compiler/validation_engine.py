"""
Backend Validation Engine
Pre-execution validation layer for DSL queries

Module: Extended DSL Compiler
Project: AI-Powered Mobile Stock Screener & Advisory Platform
Version: 1.0.0

Ensures only valid, safe, and meaningful screener rules are executed.
"""

from typing import Dict, Any, List, Optional, Tuple
from enum import Enum
import logging
from dataclasses import dataclass
from datetime import datetime

from compiler.derived_metrics import get_derived_metrics_engine

logger = logging.getLogger(__name__)


class ValidationErrorType(Enum):
    """Types of validation errors"""
    RULE_VALIDITY = "rule_validity"
    AMBIGUITY = "ambiguity"
    DATA_AVAILABILITY = "data_availability"
    METRIC_SAFETY = "metric_safety"
    SYSTEM_ERROR = "system_error"
    LOGICAL_CONFLICT = "logical_conflict"


class ValidationSeverity(Enum):
    """Severity levels for validation issues"""
    ERROR = "error"          # Must fix - blocks execution
    WARNING = "warning"      # Should fix - may produce unexpected results
    INFO = "info"           # Informational - optimization suggestion


@dataclass
class ValidationIssue:
    """Represents a validation issue"""
    severity: ValidationSeverity
    error_type: ValidationErrorType
    message: str
    field: Optional[str] = None
    condition: Optional[Dict] = None
    suggestion: Optional[str] = None
    path: Optional[str] = None  # JSON path to problematic node


@dataclass
class ValidationResult:
    """Result of DSL validation"""
    is_valid: bool
    issues: List[ValidationIssue]
    warnings: List[ValidationIssue]
    metadata: Dict[str, Any]
    
    def has_errors(self) -> bool:
        """Check if result has any errors"""
        return any(issue.severity == ValidationSeverity.ERROR for issue in self.issues)
    
    def has_warnings(self) -> bool:
        """Check if result has any warnings"""
        return any(issue.severity == ValidationSeverity.WARNING for issue in self.issues)
    
    def get_errors(self) -> List[ValidationIssue]:
        """Get all error-level issues"""
        return [i for i in self.issues if i.severity == ValidationSeverity.ERROR]
    
    def get_warnings(self) -> List[ValidationIssue]:
        """Get all warning-level issues"""
        return [i for i in self.issues if i.severity == ValidationSeverity.WARNING]


class ValidationEngine:
    """
    Backend validation engine for DSL queries
    
    Validates:
    - Rule consistency and satisfiability
    - Metric availability and safety
    - Data availability
    - Logical soundness
    - Ambiguity detection
    """
    
    # Field metadata for validation
    FIELD_METADATA = {
        "pe_ratio": {"type": "ratio", "can_be_negative": False, "requires_positive_earnings": True},
        "peg_ratio": {"type": "derived", "requires": ["pe_ratio", "eps_growth"], "can_be_zero": False},
        "debt_to_fcf": {"type": "derived", "requires": ["total_debt", "free_cash_flow"], "can_be_zero": False},
        "eps_growth": {"type": "growth", "can_be_negative": True, "range": [-100, 1000]},
        "revenue_growth_yoy": {"type": "growth", "can_be_negative": True, "range": [-100, 500]},
        "roe": {"type": "ratio", "can_be_negative": True, "range": [-100, 100]},
        "net_profit": {"type": "absolute", "can_be_negative": True, "time_series": True},
        "revenue": {"type": "absolute", "can_be_negative": False, "time_series": True},
        "total_debt": {"type": "absolute", "can_be_negative": False},
        "free_cash_flow": {"type": "absolute", "can_be_negative": True, "time_series": True},
        "market_cap": {"type": "absolute", "can_be_negative": False},
    }
    
    # Time-series capable fields
    TIME_SERIES_FIELDS = {
        "net_profit", "revenue", "eps", "free_cash_flow", "ebitda",
        "operating_profit", "gross_profit"
    }
    
    # Derived metrics that need special handling
    DERIVED_METRICS = {
        "peg_ratio", "debt_to_fcf", "eps_cagr", "revenue_cagr",
        "fcf_margin", "earnings_consistency_score"
    }
    
    def __init__(self):
        """Initialize validation engine"""
        self.metrics_engine = get_derived_metrics_engine()
        self.validation_cache = {}
    
    def validate(self, dsl_query: Dict[str, Any]) -> ValidationResult:
        """
        Main validation entry point
        
        Args:
            dsl_query: DSL query to validate
            
        Returns:
            ValidationResult with all issues found
        """
        issues = []
        metadata = {
            "validation_timestamp": datetime.now().isoformat(),
            "query_complexity": 0,
            "requires_time_series": False,
            "uses_derived_metrics": False
        }
        
        try:
            # 1. Structural validation
            issues.extend(self._validate_structure(dsl_query))
            
            # 2. Filter logic validation
            if "filter" in dsl_query:
                filter_issues, filter_meta = self._validate_filter(dsl_query["filter"], path="filter")
                issues.extend(filter_issues)
                metadata.update(filter_meta)
            
            # 3. Unsatisfiable rules detection
            issues.extend(self._detect_unsatisfiable_rules(dsl_query))
            
            # 4. Ambiguity detection
            issues.extend(self._detect_ambiguity(dsl_query))
            
            # 5. Derived metrics safety
            issues.extend(self._validate_derived_metrics(dsl_query))
            
            # 6. Data availability checks
            issues.extend(self._validate_data_availability(dsl_query))
            
        except Exception as e:
            logger.error(f"Validation engine error: {e}", exc_info=True)
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                error_type=ValidationErrorType.SYSTEM_ERROR,
                message=f"Internal validation error: {str(e)}"
            ))
        
        # Determine if valid
        is_valid = not any(issue.severity == ValidationSeverity.ERROR for issue in issues)
        warnings = [i for i in issues if i.severity == ValidationSeverity.WARNING]
        
        return ValidationResult(
            is_valid=is_valid,
            issues=issues,
            warnings=warnings,
            metadata=metadata
        )
    
    def _validate_structure(self, dsl_query: Dict[str, Any]) -> List[ValidationIssue]:
        """Validate basic DSL structure"""
        issues = []
        
        if not isinstance(dsl_query, dict):
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                error_type=ValidationErrorType.RULE_VALIDITY,
                message="DSL query must be a JSON object"
            ))
            return issues
        
        if "filter" not in dsl_query:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                error_type=ValidationErrorType.RULE_VALIDITY,
                message="DSL query must contain 'filter' field"
            ))
        
        # Check for unknown top-level fields
        allowed_fields = {"filter", "meta", "limit", "sort"}
        unknown_fields = set(dsl_query.keys()) - allowed_fields
        if unknown_fields:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                error_type=ValidationErrorType.RULE_VALIDITY,
                message=f"Unknown top-level fields: {', '.join(unknown_fields)}",
                suggestion="Remove unknown fields or check spelling"
            ))
        
        return issues
    
    def _validate_filter(self, filter_node: Dict[str, Any], path: str = "") -> Tuple[List[ValidationIssue], Dict]:
        """Validate filter logic recursively"""
        issues = []
        metadata = {"query_complexity": 0, "condition_count": 0}
        
        # Check logical operators
        if "and" in filter_node:
            metadata["query_complexity"] += 1
            for i, condition in enumerate(filter_node["and"]):
                sub_issues, sub_meta = self._validate_filter(condition, f"{path}.and[{i}]")
                issues.extend(sub_issues)
                metadata["query_complexity"] += sub_meta.get("query_complexity", 0)
                metadata["condition_count"] += sub_meta.get("condition_count", 0)
                
        elif "or" in filter_node:
            metadata["query_complexity"] += 1
            for i, condition in enumerate(filter_node["or"]):
                sub_issues, sub_meta = self._validate_filter(condition, f"{path}.or[{i}]")
                issues.extend(sub_issues)
                metadata["query_complexity"] += sub_meta.get("query_complexity", 0)
                metadata["condition_count"] += sub_meta.get("condition_count", 0)
                
        elif "not" in filter_node:
            metadata["query_complexity"] += 2  # NOT is more complex
            sub_issues, sub_meta = self._validate_filter(filter_node["not"], f"{path}.not")
            issues.extend(sub_issues)
            metadata["query_complexity"] += sub_meta.get("query_complexity", 0)
            metadata["condition_count"] += sub_meta.get("condition_count", 0)
            
        else:
            # It's a condition node
            issues.extend(self._validate_condition(filter_node, path))
            metadata["condition_count"] = 1
        
        return issues, metadata
    
    def _validate_condition(self, condition: Dict[str, Any], path: str) -> List[ValidationIssue]:
        """Validate a single condition"""
        issues = []
        
        # Required fields
        if "field" not in condition:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                error_type=ValidationErrorType.RULE_VALIDITY,
                message="Condition missing 'field' property",
                path=path
            ))
            return issues
        
        if "operator" not in condition:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                error_type=ValidationErrorType.RULE_VALIDITY,
                message="Condition missing 'operator' property",
                path=path,
                field=condition.get("field")
            ))
            return issues
        
        field = condition["field"]
        operator = condition["operator"]
        value = condition.get("value")
        
        # Validate field existence
        # In production, check against field catalog
        if field in self.DERIVED_METRICS:
            issues.extend(self._validate_derived_metric_usage(condition, path))
        
        # Validate operator compatibility
        issues.extend(self._validate_operator(condition, path))
        
        # Validate value type and range
        issues.extend(self._validate_value(condition, path))
        
        # Validate period specification if present
        if "period" in condition:
            issues.extend(self._validate_period(condition, path))
        
        return issues
    
    def _validate_operator(self, condition: Dict[str, Any], path: str) -> List[ValidationIssue]:
        """Validate operator usage"""
        issues = []
        operator = condition["operator"]
        field = condition["field"]
        value = condition.get("value")
        
        # Check value is required for operator
        operators_requiring_value = {"<", ">", "<=", ">=", "=", "!=", "between", "in", "not_in"}
        if operator in operators_requiring_value and value is None:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                error_type=ValidationErrorType.RULE_VALIDITY,
                message=f"Operator '{operator}' requires a value",
                path=path,
                field=field
            ))
        
        # Validate 'between' operator
        if operator == "between":
            if not isinstance(value, list) or len(value) != 2:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    error_type=ValidationErrorType.RULE_VALIDITY,
                    message="'between' operator requires array of 2 values [min, max]",
                    path=path,
                    field=field
                ))
            elif value[0] >= value[1]:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    error_type=ValidationErrorType.LOGICAL_CONFLICT,
                    message=f"'between' range invalid: min ({value[0]}) >= max ({value[1]})",
                    path=path,
                    field=field,
                    suggestion="Ensure min < max in range"
                ))
        
        # Validate 'in' operator
        if operator in ["in", "not_in"]:
            if not isinstance(value, list) or len(value) == 0:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    error_type=ValidationErrorType.RULE_VALIDITY,
                    message=f"'{operator}' operator requires non-empty array",
                    path=path,
                    field=field
                ))
        
        # Trend operators
        if operator in ["increasing", "decreasing", "stable"]:
            if "trend_config" not in condition:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    error_type=ValidationErrorType.AMBIGUITY,
                    message=f"Trend operator '{operator}' without trend_config - using defaults",
                    path=path,
                    field=field,
                    suggestion="Add trend_config for explicit control"
                ))
        
        return issues
    
    def _validate_value(self, condition: Dict[str, Any], path: str) -> List[ValidationIssue]:
        """Validate condition value"""
        issues = []
        field = condition["field"]
        value = condition.get("value")
        
        if value is None and condition["operator"] not in ["exists", "increasing", "decreasing", "stable"]:
            return issues
        
        # Get field metadata
        field_meta = self.FIELD_METADATA.get(field, {})
        
        # Check for impossible values
        if field_meta.get("can_be_negative") is False:
            if isinstance(value, (int, float)) and value < 0:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    error_type=ValidationErrorType.LOGICAL_CONFLICT,
                    message=f"Field '{field}' cannot be negative, but value is {value}",
                    path=path,
                    field=field
                ))
        
        # Check value range
        if "range" in field_meta and isinstance(value, (int, float)):
            min_val, max_val = field_meta["range"]
            if value < min_val or value > max_val:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    error_type=ValidationErrorType.RULE_VALIDITY,
                    message=f"Value {value} outside typical range [{min_val}, {max_val}] for '{field}'",
                    path=path,
                    field=field,
                    suggestion="Verify this is intentional"
                ))
        
        return issues
    
    def _validate_period(self, condition: Dict[str, Any], path: str) -> List[ValidationIssue]:
        """Validate period specification"""
        issues = []
        field = condition["field"]
        period = condition["period"]
        
        # Check if field supports time-series
        if field not in self.TIME_SERIES_FIELDS and field not in self.DERIVED_METRICS:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                error_type=ValidationErrorType.DATA_AVAILABILITY,
                message=f"Field '{field}' does not support time-series queries",
                path=path,
                field=field,
                suggestion="Remove period specification or use a time-series field"
            ))
        
        # Validate period structure
        if not isinstance(period, dict):
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                error_type=ValidationErrorType.RULE_VALIDITY,
                message="Period specification must be an object",
                path=f"{path}.period",
                field=field
            ))
            return issues
        
        # Check required fields
        required = ["type", "n", "aggregation"]
        missing = [f for f in required if f not in period]
        if missing:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                error_type=ValidationErrorType.RULE_VALIDITY,
                message=f"Period missing required fields: {', '.join(missing)}",
                path=f"{path}.period",
                field=field
            ))
        
        # Validate period values
        if "n" in period:
            if period["n"] < 1 or period["n"] > 20:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    error_type=ValidationErrorType.RULE_VALIDITY,
                    message=f"Period 'n' must be between 1 and 20, got {period['n']}",
                    path=f"{path}.period.n",
                    field=field
                ))
        
        # Warn about ambiguous aggregation
        if period.get("aggregation") in ["all", "any"] and condition.get("operator") not in ["<", ">", "<=", ">=", "=", "!="]:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                error_type=ValidationErrorType.AMBIGUITY,
                message=f"Aggregation '{period['aggregation']}' with operator '{condition['operator']}' may be ambiguous",
                path=f"{path}.period.aggregation",
                field=field
            ))
        
        return issues
    
    def _detect_unsatisfiable_rules(self, dsl_query: Dict[str, Any]) -> List[ValidationIssue]:
        """Detect logically unsatisfiable conditions"""
        issues = []
        
        # Extract all conditions for same field
        field_conditions = self._group_conditions_by_field(dsl_query.get("filter", {}))
        
        for field, conditions in field_conditions.items():
            # Check for conflicting range conditions
            conflicts = self._find_range_conflicts(field, conditions)
            issues.extend(conflicts)
        
        return issues
    
    def _group_conditions_by_field(self, filter_node: Dict[str, Any], conditions_map: Dict = None) -> Dict[str, List]:
        """Recursively group conditions by field"""
        if conditions_map is None:
            conditions_map = {}
        
        if "and" in filter_node:
            for condition in filter_node["and"]:
                self._group_conditions_by_field(condition, conditions_map)
        elif "or" in filter_node:
            # OR conditions don't create conflicts
            for condition in filter_node["or"]:
                self._group_conditions_by_field(condition, conditions_map)
        elif "field" in filter_node:
            field = filter_node["field"]
            if field not in conditions_map:
                conditions_map[field] = []
            conditions_map[field].append(filter_node)
        
        return conditions_map
    
    def _find_range_conflicts(self, field: str, conditions: List[Dict]) -> List[ValidationIssue]:
        """Find conflicting range conditions for a field"""
        issues = []
        
        # Extract bounds
        min_bound = None
        max_bound = None
        
        for condition in conditions:
            operator = condition["operator"]
            value = condition.get("value")
            
            if operator == ">":
                if min_bound is None or value > min_bound:
                    min_bound = value
            elif operator == ">=":
                if min_bound is None or value >= min_bound:
                    min_bound = value
            elif operator == "<":
                if max_bound is None or value < max_bound:
                    max_bound = value
            elif operator == "<=":
                if max_bound is None or value <= max_bound:
                    max_bound = value
            elif operator == "between":
                if isinstance(value, list) and len(value) == 2:
                    if min_bound is None or value[0] > min_bound:
                        min_bound = value[0]
                    if max_bound is None or value[1] < max_bound:
                        max_bound = value[1]
        
        # Check for conflicts
        if min_bound is not None and max_bound is not None:
            if min_bound >= max_bound:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    error_type=ValidationErrorType.LOGICAL_CONFLICT,
                    message=f"Unsatisfiable conditions for '{field}': requires > {min_bound} AND < {max_bound}",
                    field=field,
                    suggestion="Check your range conditions - they cannot both be true"
                ))
        
        return issues
    
    def _detect_ambiguity(self, dsl_query: Dict[str, Any]) -> List[ValidationIssue]:
        """Detect ambiguous query patterns"""
        issues = []
        
        # Check for conditions without explicit time windows
        issues.extend(self._check_missing_time_windows(dsl_query.get("filter", {})))
        
        return issues
    
    def _check_missing_time_windows(self, filter_node: Dict[str, Any], parent_op: str = "and") -> List[ValidationIssue]:
        """Check for time-series fields without period specification"""
        issues = []
        
        if "and" in filter_node:
            for condition in filter_node["and"]:
                issues.extend(self._check_missing_time_windows(condition, "and"))
        elif "or" in filter_node:
            for condition in filter_node["or"]:
                issues.extend(self._check_missing_time_windows(condition, "or"))
        elif "field" in filter_node:
            field = filter_node["field"]
            if field in self.TIME_SERIES_FIELDS and "period" not in filter_node:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    error_type=ValidationErrorType.AMBIGUITY,
                    message=f"Time-series field '{field}' used without period specification - will use latest value",
                    field=field,
                    suggestion="Add period specification for historical analysis"
                ))
        
        return issues
    
    def _validate_derived_metrics(self, dsl_query: Dict[str, Any]) -> List[ValidationIssue]:
        """Validate derived metric usage and safety"""
        issues = []
        
        derived_conditions = self._find_derived_metric_conditions(dsl_query.get("filter", {}))
        
        for condition in derived_conditions:
            field = condition["field"]
            
            # Check if metric is known
            if not self.metrics_engine.validate_metric(field):
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    error_type=ValidationErrorType.METRIC_SAFETY,
                    message=f"Unknown derived metric: '{field}'",
                    field=field
                ))
                continue
            
            # Check for divide-by-zero risks
            if field == "peg_ratio":
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.INFO,
                    error_type=ValidationErrorType.METRIC_SAFETY,
                    message="PEG ratio computation will exclude stocks with EPS growth near zero",
                    field=field
                ))
            elif field == "debt_to_fcf":
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.INFO,
                    error_type=ValidationErrorType.METRIC_SAFETY,
                    message="Debt-to-FCF computation will exclude stocks with non-positive free cash flow",
                    field=field
                ))
        
        return issues
    
    def _find_derived_metric_conditions(self, filter_node: Dict[str, Any]) -> List[Dict]:
        """Find all conditions using derived metrics"""
        conditions = []
        
        if "and" in filter_node:
            for condition in filter_node["and"]:
                conditions.extend(self._find_derived_metric_conditions(condition))
        elif "or" in filter_node:
            for condition in filter_node["or"]:
                conditions.extend(self._find_derived_metric_conditions(condition))
        elif "field" in filter_node:
            if filter_node["field"] in self.DERIVED_METRICS:
                conditions.append(filter_node)
        
        return conditions
    
    def _validate_derived_metric_usage(self, condition: Dict[str, Any], path: str) -> List[ValidationIssue]:
        """Validate specific derived metric usage"""
        issues = []
        field = condition["field"]
        
        # Check if time-series is required but not provided
        if self.metrics_engine.is_time_series_metric(field) and "period" not in condition:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                error_type=ValidationErrorType.DATA_AVAILABILITY,
                message=f"Derived metric '{field}' requires period specification",
                path=path,
                field=field,
                suggestion=f"Add period configuration for {field} computation"
            ))
        
        return issues
    
    def _validate_data_availability(self, dsl_query: Dict[str, Any]) -> List[ValidationIssue]:
        """Validate data availability requirements"""
        issues = []
        
        # Check period requirements
        period_conditions = self._find_period_conditions(dsl_query.get("filter", {}))
        
        for condition in period_conditions:
            period = condition["period"]
            if period.get("n", 0) > 12:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    error_type=ValidationErrorType.DATA_AVAILABILITY,
                    message=f"Requesting {period['n']} periods - may significantly reduce result set",
                    field=condition["field"],
                    suggestion="Consider if all companies have this much historical data"
                ))
        
        return issues
    
    def _find_period_conditions(self, filter_node: Dict[str, Any]) -> List[Dict]:
        """Find all conditions with period specifications"""
        conditions = []
        
        if "and" in filter_node:
            for condition in filter_node["and"]:
                conditions.extend(self._find_period_conditions(condition))
        elif "or" in filter_node:
            for condition in filter_node["or"]:
                conditions.extend(self._find_period_conditions(condition))
        elif "period" in filter_node:
            conditions.append(filter_node)
        
        return conditions


# Singleton instance
_validation_engine = None

def get_validation_engine() -> ValidationEngine:
    """Get singleton instance of validation engine"""
    global _validation_engine
    if _validation_engine is None:
        _validation_engine = ValidationEngine()
    return _validation_engine


def validate_dsl_query(dsl_query: Dict[str, Any]) -> ValidationResult:
    """
    Convenience function to validate a DSL query
    
    Args:
        dsl_query: DSL query to validate
        
    Returns:
        ValidationResult
    """
    engine = get_validation_engine()
    return engine.validate(dsl_query)
