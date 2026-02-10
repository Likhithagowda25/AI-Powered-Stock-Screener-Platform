import pytest
from compiler.compiler import compile_filter

def test_single_condition_compilation():
    dsl = {
        "filter": {
            "field": "pe_ratio",
            "operator": "<",
            "value": 20
        }
    }

    params = {}
    sql = compile_filter(dsl["filter"], params)

    assert "pe_ratio" in sql
    assert "<" in sql
    assert params["p0"] == 20


def test_and_condition_compilation():
    dsl = {
        "filter": {
            "and": [
                {"field": "pe_ratio", "operator": "<", "value": 20},
                {"field": "roe", "operator": ">", "value": 15}
            ]
        }
    }

    params = {}
    sql = compile_filter(dsl["filter"], params)

    assert "AND" in sql
    assert params["p0"] == 20
    assert params["p1"] == 15


def test_invalid_field_rejected():
    dsl = {
        "filter": {
            "field": "invalid_field",
            "operator": "<",
            "value": 10
        }
    }

    with pytest.raises(ValueError):
        compile_filter(dsl["filter"], {})