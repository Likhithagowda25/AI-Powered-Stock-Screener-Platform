from test_dataset import FAKE_STOCKS

def fake_run_screen(dsl, data):
    """
    Lightweight runner simulation for unit testing.
    This validates logic correctness without DB dependency.
    """
    results = []

    for row in data:
        match = True
        for condition in dsl["filter"]["and"]:
            field = condition["field"]
            operator = condition["operator"]
            value = condition["value"]

            if row[field] is None:
                match = False
                break

            if operator == "<" and not row[field] < value:
                match = False
            if operator == ">" and not row[field] > value:
                match = False

        if match:
            results.append(row["ticker"])

    return results


def test_runner_and_logic():
    dsl = {
        "filter": {
            "and": [
                {"field": "pe_ratio", "operator": "<", "value": 20},
                {"field": "roe", "operator": ">", "value": 15}
            ]
        }
    }

    output = fake_run_screen(dsl, FAKE_STOCKS)
    print(f"\n✓ Test: AND logic with PE < 20 and ROE > 15")
    print(f"  Results: {output}")
    print(f"  Count: {len(output)} stocks matched")

    assert "TCS" in output
    assert "INFY" not in output
    assert "HDFCBANK" not in output
    assert "FAILCO" not in output


def test_runner_no_match():
    dsl = {
        "filter": {
            "and": [
                {"field": "pe_ratio", "operator": "<", "value": 5}
            ]
        }
    }

    output = fake_run_screen(dsl, FAKE_STOCKS)
    print(f"\n✓ Test: No match with PE < 5")
    print(f"  Results: {output}")
    print(f"  Count: {len(output)} stocks matched")
    
    assert output == []


if __name__ == "__main__":
    print("=" * 60)
    print("Running Screener Engine Unit Tests")
    print("=" * 60)
    
    test_runner_and_logic()
    test_runner_no_match()
    
    print("\n" + "=" * 60)
    print("All tests passed! ✓")
    print("=" * 60)