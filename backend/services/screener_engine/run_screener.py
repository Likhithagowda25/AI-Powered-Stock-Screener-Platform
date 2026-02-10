from runner.runner import run_screen

dsl = {
    "filter": {
    "and": [
      {"field": "pe_ratio", "operator": "<", "value": 20},
      {
        "or": [
          {"field": "roe", "operator": ">", "value": 15},
          {"field": "net_profit", "operator": ">", "value": 5000}
        ]
      }
    ]
  }

    # "filter": {"and": [{"field": "pe_ratio", "operator": "<", "value": 0}]}

   # "filter": {"and": [{"field": "promoter_holding", "operator": ">", "value": 0}]}

   #   "filter": {"and": [{"field": "unknown_field", "operator": ">", "value": 10}]}

   # "filter": {"and": [{"field": "pe_ratio", "operator": "LIKE", "value": "10"}]}
}


print(run_screen(dsl))