"""
DSL Validation Test Script
Tests the Stock Screener DSL schema against example queries
"""

import json
from pathlib import Path
from jsonschema import validate, ValidationError

def load_schema():
    """Load the DSL JSON schema"""
    schema_path = Path(__file__).parent / 'schema.json'
    with open(schema_path) as f:
        return json.load(f)

def load_field_catalog():
    """Load the field catalog"""
    catalog_path = Path(__file__).parent / 'field_catalog.json'
    with open(catalog_path) as f:
        return json.load(f)

def validate_dsl_query(dsl_query, schema):
    """Validate a DSL query against the schema"""
    try:
        validate(instance=dsl_query, schema=schema)
        return True, "Valid"
    except ValidationError as e:
        return False, str(e.message)

def test_examples():
    """Test all example DSL queries"""
    print("=" * 70)
    print("DSL VALIDATION TEST RESULTS")
    print("=" * 70)
    
    schema = load_schema()
    examples_dir = Path(__file__).parent / 'examples'
    
    if not examples_dir.exists():
        print("Examples directory not found")
        return
    
    examples = sorted(examples_dir.glob('*.json'))
    
    if not examples:
        print("No example files found")
        return
    
    passed = 0
    failed = 0
    
    for example_file in examples:
        try:
            with open(example_file) as f:
                example_data = json.load(f)
            
            # Get the DSL query
            dsl_query = example_data.get('dsl', {})
            
            # Validate
            is_valid, message = validate_dsl_query(dsl_query, schema)
            
            if is_valid:
                print(f"\n✅ {example_file.name}")
                print(f"   Description: {example_data.get('description', 'N/A')}")
                print(f"   Natural Language: {example_data.get('natural_language', 'N/A')}")
                passed += 1
            else:
                print(f"\n{example_file.name}")
                print(f"   Error: {message}")
                failed += 1
                
        except Exception as e:
            print(f"\n{example_file.name}")
            print(f"   Error loading file: {str(e)}")
            failed += 1
    
    print("\n" + "=" * 70)
    print(f"SUMMARY: {passed} passed, {failed} failed out of {passed + failed} tests")
    print("=" * 70)
    
    return passed, failed

def test_custom_query():
    """Test a custom DSL query"""
    print("\n" + "=" * 70)
    print("CUSTOM QUERY TEST")
    print("=" * 70)
    
    schema = load_schema()
    
    # Example: Value stocks with quality
    custom_query = {
        "filter": {
            "and": [
                {
                    "field": "pe_ratio",
                    "operator": "<",
                    "value": 15
                },
                {
                    "field": "roe",
                    "operator": ">",
                    "value": 15
                },
                {
                    "field": "debt_to_equity",
                    "operator": "<",
                    "value": 1
                }
            ]
        },
        "meta": {
            "sector": "IT",
            "exchange": "NSE"
        },
        "sort": {
            "field": "dividend_yield",
            "order": "desc"
        },
        "limit": 50
    }
    
    print("\nQuery: Value IT stocks with quality metrics")
    print(json.dumps(custom_query, indent=2))
    
    is_valid, message = validate_dsl_query(custom_query, schema)
    
    if is_valid:
        print("\nCustom query is VALID!")
    else:
        print(f"\nCustom query is INVALID: {message}")
    
    return is_valid

def show_field_summary():
    """Show summary of available fields"""
    print("\n" + "=" * 70)
    print("AVAILABLE FIELDS SUMMARY")
    print("=" * 70)
    
    catalog = load_field_catalog()
    
    for category_name, category_data in catalog.get('categories', {}).items():
        print(f"\n{category_data['name']}:")
        fields = category_data.get('fields', {})
        for field_name, field_info in list(fields.items())[:5]:  # Show first 5
            print(f"  • {field_name}: {field_info.get('description', 'N/A')}")
        if len(fields) > 5:
            print(f"  ... and {len(fields) - 5} more")
    
    print(f"\nTotal Categories: {len(catalog.get('categories', {}))}")
    total_fields = sum(len(cat['fields']) for cat in catalog.get('categories', {}).values())
    print(f"Total Fields: {total_fields}")

def main():
    """Main test function"""
    print("\nStock Screener DSL Validation Test\n")
    
    # Test all examples
    passed, failed = test_examples()
    
    # Test custom query
    test_custom_query()
    
    # Show field summary
    show_field_summary()
    
    print("\n" + "=" * 70)
    print("TEST COMPLETE")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    main()
