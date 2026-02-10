OPERATORS = {
    # Comparison operators
    "<": "<",
    ">": ">",
    "<=": "<=",
    ">=": ">=",
    "=": "=",
    "!=": "!=",
    
    # Collection operators
    "in": "IN",
    "not_in": "NOT IN",
    
    # Range operators
    "between": "BETWEEN",
    
    # Existence operators
    "exists": "EXISTS",
    
    # Trend operators (handled specially in compiler)
    "increasing": "INCREASING",
    "decreasing": "DECREASING", 
    "stable": "STABLE"
}

# Operators that require special handling
SPECIAL_OPERATORS = {
    "between", "in", "not_in", "exists", 
    "increasing", "decreasing", "stable"
}

# Operators that work with temporal conditions
TEMPORAL_OPERATORS = {
    "<", ">", "<=", ">=", "=", "!="
}

# Operators that require array values
ARRAY_OPERATORS = {
    "in", "not_in", "between"
}

