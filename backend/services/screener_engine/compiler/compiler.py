from compiler.field_mapper import FIELD_MAP
from compiler.operators import OPERATORS

def compile_condition(condition, params):
    field = condition["field"]
    operator = condition["operator"]
    value = condition["value"]

    if field not in FIELD_MAP:
        raise ValueError(f"Unsupported field: {field}")

    if operator not in OPERATORS:
        raise ValueError(f"Unsupported operator: {operator}")

    column = FIELD_MAP[field]
    param_key = f"p{len(params)}"
    
    # Convert list to tuple for IN operator to get proper SQL syntax
    if operator == "in" and isinstance(value, list):
        params[param_key] = tuple(value)
    else:
        params[param_key] = value

    return f"{column} {OPERATORS[operator]} %({param_key})s"


def compile_filter(filter_node, params):
    if "and" in filter_node:
        clauses = [
            compile_filter(cond, params)
            for cond in filter_node["and"]
        ]
        return "(" + " AND ".join(clauses) + ")"

    if "or" in filter_node:
        clauses = [
            compile_filter(cond, params)
            for cond in filter_node["or"]
        ]
        return "(" + " OR ".join(clauses) + ")"

    return compile_condition(filter_node, params)