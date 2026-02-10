import psycopg2
from compiler.compiler import compile_filter

def run_screen(dsl):
    params = {}
    where_clause = compile_filter(dsl["filter"], params)

    query = f"""
        SELECT DISTINCT fundamentals_quarterly.ticker
        FROM fundamentals_quarterly
        LEFT JOIN companies ON fundamentals_quarterly.ticker = companies.ticker
        WHERE {where_clause}
    """

    conn = psycopg2.connect(
        dbname="stock_screener",
        user="postgres",
        password="25101974",
        host="localhost",
        port=5433
    )

    cur = conn.cursor()
    cur.execute(query, params)
    rows = cur.fetchall()

    cur.close()
    conn.close()

    return [row[0] for row in rows]