def load_schema():
    schema_path = Path(__file__).parent / 'schema.json'
    with open(schema_path) as f:
        return json.load(f)
def validate_query(dsl_query):
    """Validate a DSL query and return result"""
    schema = load_schema()
    try:
        validate(instance=dsl_query, schema=schema)
        return True, "✅ Valid DSL query"
    except ValidationError as e:
        return False, f"❌ Validation Error: {e.message}"


print("DSL Query:")
print(json.dumps(query1, indent=2))
is_valid, msg = validate_query(query1)
print(f"\n{msg}\n")


# Example 2: Quality stocks with time-series
print("=" * 70)
print("Example 2: Quality Stocks with Consistent Profitability")
print("=" * 70)
print("Natural Language: PE < 20 AND positive profit in last 4 quarters\n")

query2 = {
    "filter": {
        "and": [
            {
                "field": "pe_ratio",
                "operator": "<",
                "value": 20
            },
            {
                "field": "net_profit",
                "operator": ">",
                "value": 0,
                "period": {
                    "type": "last_n_quarters",
                    "n": 4,
                    "aggregation": "all"
                }
            }
        ]
    }
}

print("DSL Query:")
print(json.dumps(query2, indent=2))
is_valid, msg = validate_query(query2)
print(f"\n{msg}\n")


# Example 3: Sector-specific with complex logic
print("=" * 70)
print("Example 3: IT Stocks with Nested OR Logic")
print("=" * 70)
print("Natural Language: IT stocks with (PE < 15 OR ROE > 20) AND low debt\n")

query3 = {
    "filter": {
        "and": [
            {
                "or": [
                    {
                        "field": "pe_ratio",
                        "operator": "<",
                        "value": 15
                    },
                    {
                        "field": "roe",
                        "operator": ">",
                        "value": 20
                    }
                ]
            },
            {
                "field": "debt_to_equity",
                "operator": "<",
                "value": 0.5
            }
        ]
    },
    "meta": {
        "sector": "IT"
    }
}

print("DSL Query:")
print(json.dumps(query3, indent=2))
is_valid, msg = validate_query(query3)
print(f"\n{msg}\n")


# Example 4: Invalid query (to show validation)
print("=" * 70)
print("Example 4: Invalid Query (Unknown Field)")
print("=" * 70)
print("Natural Language: Stocks with invalid_metric < 10\n")

query4 = {
    "filter": {
        "and": [
            {
                "field": "invalid_metric",  # This field doesn't exist
                "operator": "<",
                "value": 10
            }
        ]
    }
}

print("DSL Query:")
print(json.dumps(query4, indent=2))
is_valid, msg = validate_query(query4)
print(f"\n{msg}\n")


# Example 5: Complete query with all features
print("=" * 70)
print("Example 5: Complete Query with All Features")
print("=" * 70)
print("Natural Language: Large cap NSE IT stocks, PE 10-25, ROE > 15,")
print("                  sorted by dividend yield, limit 20\n")

query5 = {
    "filter": {
        "and": [
            {
                "field": "pe_ratio",
                "operator": "between",
                "value": [10, 25]
            },
            {
                "field": "roe",
                "operator": ">",
                "value": 15
            }
        ]
    },
    "meta": {
        "sector": "IT",
        "exchange": "NSE",
        "market_cap_category": "Large Cap"
    },
    "sort": {
        "field": "dividend_yield",
        "order": "desc"
    },
    "limit": 20
}

print("DSL Query:")
print(json.dumps(query5, indent=2))
is_valid, msg = validate_query(query5)
print(f"\n{msg}\n")


print("=" * 70)
print("SUMMARY")
print("=" * 70)
print("""
The DSL successfully:
✅ Validates simple queries (Example 1)
✅ Handles time-series logic (Example 2)
✅ Supports nested AND/OR (Example 3)
✅ Catches invalid fields (Example 4)
✅ Supports complete queries with metadata, sorting, and limits (Example 5)

Next Steps:
1. Integrate with LLM parser to convert natural language to DSL
2. Build SQL compiler to convert DSL to PostgreSQL queries
3. Create frontend query builder using this DSL structure
4. Implement caching for frequently used queries
""")
