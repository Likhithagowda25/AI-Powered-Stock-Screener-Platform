import unittest
import sys
import os

# Add parent directories to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from compiler.validation_engine import (
    validate_dsl_query, 
    ValidationSeverity, 
    ValidationErrorType
)
from compiler.derived_metrics import get_derived_metrics_engine, DerivedMetricError
from compiler.enhanced_compiler import ExtendedDSLCompiler, CompilerError


class TestValidationEngine(unittest.TestCase):
    """Test cases for backend validation engine"""
    
    def test_valid_simple_query(self):
        """Test validation of simple valid query"""
        query = {
            "filter": {
                "and": [
                    {"field": "pe_ratio", "operator": "<", "value": 15}
                ]
            }
        }
        
        result = validate_dsl_query(query)
        self.assertTrue(result.is_valid)
        self.assertEqual(len(result.get_errors()), 0)
    
    def test_missing_filter(self):
        """Test detection of missing filter field"""
        query = {
            "meta": {"sector": "IT"}
        }
        
        result = validate_dsl_query(query)
        self.assertFalse(result.is_valid)
        errors = result.get_errors()
        self.assertTrue(any("filter" in e.message.lower() for e in errors))
    
    def test_unsatisfiable_range(self):
        """Test detection of unsatisfiable range conditions"""
        query = {
            "filter": {
                "and": [
                    {"field": "pe_ratio", "operator": ">", "value": 50},
                    {"field": "pe_ratio", "operator": "<", "value": 5}
                ]
            }
        }
        
        result = validate_dsl_query(query)
        self.assertFalse(result.is_valid)
        errors = result.get_errors()
        self.assertTrue(any(e.error_type == ValidationErrorType.LOGICAL_CONFLICT for e in errors))
    
    def test_between_invalid_range(self):
        """Test detection of invalid BETWEEN range"""
        query = {
            "filter": {
                "and": [
                    {"field": "pe_ratio", "operator": "between", "value": [20, 10]}
                ]
            }
        }
        
        result = validate_dsl_query(query)
        self.assertFalse(result.is_valid)
        errors = result.get_errors()
        self.assertTrue(any("between" in e.message.lower() for e in errors))
    
    def test_period_without_time_series_field(self):
        """Test detection of period on non-time-series field"""
        query = {
            "filter": {
                "and": [
                    {
                        "field": "market_cap",
                        "operator": ">",
                        "value": 1000,
                        "period": {
                            "type": "last_n_quarters",
                            "n": 4,
                            "aggregation": "all"
                        }
                    }
                ]
            }
        }
        
        result = validate_dsl_query(query)
        # Should have error about non-time-series field
        errors = result.get_errors()
        self.assertTrue(any(e.error_type == ValidationErrorType.DATA_AVAILABILITY for e in errors))
    
    def test_derived_metric_without_period(self):
        """Test derived metric requiring period"""
        query = {
            "filter": {
                "and": [
                    {"field": "eps_cagr", "operator": ">", "value": 10}
                ]
            }
        }
        
        result = validate_dsl_query(query)
        # Should require period specification for CAGR
        errors = result.get_errors()
        self.assertTrue(len(errors) > 0)
    
    def test_ambiguous_time_window(self):
        """Test warning for missing time window"""
        query = {
            "filter": {
                "and": [
                    {"field": "net_profit", "operator": ">", "value": 0}
                ]
            }
        }
        
        result = validate_dsl_query(query)
        # Should be valid but have warning
        self.assertTrue(result.is_valid)
        warnings = result.get_warnings()
        self.assertTrue(any(e.error_type == ValidationErrorType.AMBIGUITY for e in warnings))


class TestDerivedMetrics(unittest.TestCase):
    """Test cases for derived metrics engine"""
    
    def setUp(self):
        self.engine = get_derived_metrics_engine()
    
    def test_peg_ratio_valid(self):
        """Test valid PEG ratio computation"""
        result = self.engine.compute_peg_ratio(20.0, 15.0)
        self.assertIsNotNone(result)
        self.assertAlmostEqual(result, 1.333, places=2)
    
    def test_peg_ratio_zero_growth(self):
        """Test PEG ratio with zero growth - should return None"""
        result = self.engine.compute_peg_ratio(20.0, 0.0)
        self.assertIsNone(result)
    
    def test_peg_ratio_negative_pe(self):
        """Test PEG ratio with negative PE - should return None"""
        result = self.engine.compute_peg_ratio(-5.0, 10.0)
        self.assertIsNone(result)
    
    def test_peg_ratio_tiny_growth(self):
        """Test PEG ratio with very small growth - should return None"""
        result = self.engine.compute_peg_ratio(20.0, 0.001)
        self.assertIsNone(result)
    
    def test_debt_to_fcf_valid(self):
        """Test valid debt-to-FCF computation"""
        result = self.engine.compute_debt_to_fcf(1000.0, 200.0)
        self.assertIsNotNone(result)
        self.assertAlmostEqual(result, 5.0, places=2)
    
    def test_debt_to_fcf_zero_fcf(self):
        """Test debt-to-FCF with zero FCF - should return None"""
        result = self.engine.compute_debt_to_fcf(1000.0, 0.0)
        self.assertIsNone(result)
    
    def test_debt_to_fcf_negative_fcf(self):
        """Test debt-to-FCF with negative FCF - should return None"""
        result = self.engine.compute_debt_to_fcf(1000.0, -100.0)
        self.assertIsNone(result)
    
    def test_cagr_positive_growth(self):
        """Test CAGR with positive growth"""
        result = self.engine.compute_cagr(100.0, 150.0, 3)
        self.assertIsNotNone(result)
        self.assertTrue(result > 0)
        self.assertTrue(result < 100)  # Should be reasonable
    
    def test_cagr_negative_growth(self):
        """Test CAGR with negative growth"""
        result = self.engine.compute_cagr(100.0, 50.0, 3)
        self.assertIsNotNone(result)
        self.assertTrue(result < 0)
    
    def test_cagr_zero_beginning(self):
        """Test CAGR with zero beginning value - should return None"""
        result = self.engine.compute_cagr(0.0, 100.0, 3)
        self.assertIsNone(result)
    
    def test_fcf_margin_valid(self):
        """Test valid FCF margin computation"""
        result = self.engine.compute_fcf_margin(200.0, 1000.0)
        self.assertIsNotNone(result)
        self.assertAlmostEqual(result, 20.0, places=2)
    
    def test_fcf_margin_negative_fcf(self):
        """Test FCF margin with negative FCF - should still compute"""
        result = self.engine.compute_fcf_margin(-50.0, 1000.0)
        self.assertIsNotNone(result)
        self.assertAlmostEqual(result, -5.0, places=2)
    
    def test_fcf_margin_zero_revenue(self):
        """Test FCF margin with zero revenue - should return None"""
        result = self.engine.compute_fcf_margin(100.0, 0.0)
        self.assertIsNone(result)
    
    def test_earnings_consistency_valid(self):
        """Test earnings consistency score"""
        earnings = [100, 110, 105, 115, 120]
        result = self.engine.compute_earnings_consistency_score(earnings)
        self.assertIsNotNone(result)
        self.assertTrue(0 <= result <= 1)
    
    def test_earnings_consistency_volatile(self):
        """Test earnings consistency with volatile earnings"""
        earnings = [100, 50, 150, 25, 200]
        result = self.engine.compute_earnings_consistency_score(earnings)
        self.assertIsNotNone(result)
        # Should be lower due to volatility
        self.assertTrue(result < 0.5)
    
    def test_earnings_consistency_insufficient_data(self):
        """Test earnings consistency with insufficient data"""
        earnings = [100, 110]
        result = self.engine.compute_earnings_consistency_score(earnings)
        self.assertIsNone(result)
    
    def test_validate_computation_safety(self):
        """Test computation safety validation"""
        is_safe, error = self.engine.validate_computation_safety(
            "peg_ratio",
            {"pe_ratio": 20.0, "eps_growth": 0.0}
        )
        self.assertFalse(is_safe)
        self.assertIn("zero", error.lower())


class TestEnhancedCompiler(unittest.TestCase):
    """Test cases for enhanced DSL compiler"""
    
    def setUp(self):
        self.compiler = ExtendedDSLCompiler(validate_before_compile=False)
    
    def test_simple_query_compilation(self):
        """Test compilation of simple query"""
        query = {
            "filter": {
                "and": [
                    {"field": "pe_ratio", "operator": "<", "value": 15}
                ]
            }
        }
        
        sql, params, metadata = self.compiler.compile(query)
        self.assertIsNotNone(sql)
        self.assertIn("pe_ratio", sql.lower())
        self.assertTrue(len(params) > 0)
    
    def test_between_operator(self):
        """Test BETWEEN operator compilation"""
        query = {
            "filter": {
                "and": [
                    {"field": "pe_ratio", "operator": "between", "value": [5, 15]}
                ]
            }
        }
        
        sql, params, metadata = self.compiler.compile(query)
        self.assertIn("BETWEEN", sql)
        self.assertEqual(len(params), 2)
    
    def test_in_operator(self):
        """Test IN operator compilation"""
        query = {
            "filter": {
                "and": [
                    {"field": "sector", "operator": "in", "value": ["IT", "Pharma", "Finance"]}
                ]
            }
        }
        
        sql, params, metadata = self.compiler.compile(query)
        self.assertIn("IN", sql)
        self.assertTrue(any(isinstance(v, tuple) for v in params.values()))
    
    def test_nested_logical_expressions(self):
        """Test nested AND/OR compilation"""
        query = {
            "filter": {
                "and": [
                    {"field": "pe_ratio", "operator": "<", "value": 20},
                    {
                        "or": [
                            {"field": "roe", "operator": ">", "value": 15},
                            {"field": "net_profit", "operator": ">", "value": 1000}
                        ]
                    }
                ]
            }
        }
        
        sql, params, metadata = self.compiler.compile(query)
        self.assertIn("AND", sql)
        self.assertIn("OR", sql)
        self.assertTrue(metadata["complexity_score"] >= 2)
    
    def test_not_operator(self):
        """Test NOT operator compilation"""
        query = {
            "filter": {
                "not": {
                    "field": "pe_ratio",
                    "operator": ">",
                    "value": 50
                }
            }
        }
        
        sql, params, metadata = self.compiler.compile(query)
        self.assertIn("NOT", sql)
    
    def test_null_handling_exclude(self):
        """Test null handling with exclude strategy"""
        query = {
            "filter": {
                "and": [
                    {
                        "field": "pe_ratio",
                        "operator": "<",
                        "value": 15,
                        "null_handling": {
                            "strategy": "exclude"
                        }
                    }
                ]
            }
        }
        
        sql, params, metadata = self.compiler.compile(query)
        self.assertIn("IS NOT NULL", sql)
    
    def test_null_handling_default(self):
        """Test null handling with default value"""
        query = {
            "filter": {
                "and": [
                    {
                        "field": "pe_ratio",
                        "operator": "<",
                        "value": 15,
                        "null_handling": {
                            "strategy": "use_default",
                            "default_value": 0
                        }
                    }
                ]
            }
        }
        
        sql, params, metadata = self.compiler.compile(query)
        self.assertIn("COALESCE", sql)
    
    def test_temporal_condition_all_periods(self):
        """Test temporal condition with 'all' aggregation"""
        query = {
            "filter": {
                "and": [
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
        
        sql, params, metadata = self.compiler.compile(query)
        self.assertTrue(metadata["uses_time_series"])
    
    def test_temporal_condition_any_period(self):
        """Test temporal condition with 'any' aggregation"""
        query = {
            "filter": {
                "and": [
                    {
                        "field": "net_profit",
                        "operator": ">",
                        "value": 5000,
                        "period": {
                            "type": "last_n_quarters",
                            "n": 4,
                            "aggregation": "any"
                        }
                    }
                ]
            }
        }
        
        sql, params, metadata = self.compiler.compile(query)
        self.assertTrue(metadata["uses_time_series"])
        self.assertIn("EXISTS", sql)
    
    def test_temporal_aggregation(self):
        """Test temporal condition with aggregation function"""
        query = {
            "filter": {
                "and": [
                    {
                        "field": "revenue",
                        "operator": ">",
                        "value": 10000,
                        "period": {
                            "type": "last_n_years",
                            "n": 3,
                            "aggregation": "avg"
                        }
                    }
                ]
            }
        }
        
        sql, params, metadata = self.compiler.compile(query)
        self.assertTrue(metadata["uses_time_series"])
        self.assertIn("AVG", sql)
    
    def test_derived_metric_compilation(self):
        """Test derived metric compilation"""
        query = {
            "filter": {
                "and": [
                    {"field": "peg_ratio", "operator": "<", "value": 1.5}
                ]
            }
        }
        
        sql, params, metadata = self.compiler.compile(query)
        self.assertTrue(metadata["uses_derived_metrics"])
    
    def test_meta_filters(self):
        """Test metadata filters"""
        query = {
            "filter": {
                "and": [
                    {"field": "pe_ratio", "operator": "<", "value": 15}
                ]
            },
            "meta": {
                "sector": "IT",
                "exchange": "NSE"
            }
        }
        
        sql, params, metadata = self.compiler.compile(query)
        self.assertIn("sector", sql.lower())
        self.assertIn("exchange", sql.lower())
    
    def test_sort_clause(self):
        """Test sorting"""
        query = {
            "filter": {
                "and": [
                    {"field": "pe_ratio", "operator": "<", "value": 15}
                ]
            },
            "sort": {
                "field": "pe_ratio",
                "order": "asc"
            }
        }
        
        sql, params, metadata = self.compiler.compile(query)
        self.assertIn("ORDER BY", sql)
    
    def test_limit_clause(self):
        """Test result limit"""
        query = {
            "filter": {
                "and": [
                    {"field": "pe_ratio", "operator": "<", "value": 15}
                ]
            },
            "limit": 50
        }
        
        sql, params, metadata = self.compiler.compile(query)
        self.assertIn("LIMIT", sql)
        self.assertIn("50", sql)


class TestIntegration(unittest.TestCase):
    """Integration tests combining validation and compilation"""
    
    def test_invalid_query_compilation_fails(self):
        """Test that invalid query fails compilation with validation"""
        query = {
            "filter": {
                "and": [
                    {"field": "pe_ratio", "operator": ">", "value": 50},
                    {"field": "pe_ratio", "operator": "<", "value": 5}
                ]
            }
        }
        
        compiler = ExtendedDSLCompiler(validate_before_compile=True)
        
        with self.assertRaises(CompilerError):
            compiler.compile(query)
    
    def test_complex_query_full_pipeline(self):
        """Test complex query through full pipeline"""
        query = {
            "filter": {
                "and": [
                    {"field": "pe_ratio", "operator": "between", "value": [5, 20]},
                    {
                        "or": [
                            {"field": "roe", "operator": ">", "value": 15},
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
                ]
            },
            "meta": {
                "sector": "IT"
            },
            "sort": {
                "field": "pe_ratio",
                "order": "asc"
            },
            "limit": 25
        }
        
        # Validate
        validation_result = validate_dsl_query(query)
        self.assertTrue(validation_result.is_valid)
        
        # Compile
        compiler = ExtendedDSLCompiler(validate_before_compile=False)
        sql, params, metadata = compiler.compile(query)
        
        self.assertIsNotNone(sql)
        self.assertTrue(len(params) > 0)
        self.assertIn("BETWEEN", sql)
        self.assertIn("sector", sql.lower())
        self.assertIn("ORDER BY", sql)
        self.assertIn("LIMIT 25", sql)


def run_tests():
    """Run all tests"""
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add all test classes
    suite.addTests(loader.loadTestsFromTestCase(TestValidationEngine))
    suite.addTests(loader.loadTestsFromTestCase(TestDerivedMetrics))
    suite.addTests(loader.loadTestsFromTestCase(TestEnhancedCompiler))
    suite.addTests(loader.loadTestsFromTestCase(TestIntegration))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    print(f"Tests run: {result.testsRun}")
    print(f"Successes: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print("=" * 70)
    
    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
