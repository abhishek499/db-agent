from datetime import date, datetime
from decimal import Decimal

from app.models.api import QueryResult


def to_query_result(columns: list[str], rows: list[list]) -> QueryResult:
    """
    Convert raw adapter output into a JSON-safe QueryResult.
    Serializes: Decimal→float, datetime/date→ISO str, bytes→hex, rest→str.
    """

    def _serialize(val):
        if val is None or isinstance(val, (bool, int, float, str)):
            return val
        if isinstance(val, Decimal):
            return float(val)
        if isinstance(val, datetime):
            return val.isoformat()
        if isinstance(val, date):
            return val.isoformat()
        if isinstance(val, bytes):
            return val.hex()
        return str(val)

    serialized = [[_serialize(v) for v in row] for row in rows]
    return QueryResult(columns=columns, rows=serialized, row_count=len(serialized))


def summarize_results(
    message: str,
    query: str,
    result: QueryResult,
    global_prompt: str = "",
) -> str:
    """
    Ask Claude Haiku to write a 1-3 sentence answer from the query results.
    Falls back to a plain count sentence if the API key is missing or the call fails.
    """
    import anthropic

    from app.config import settings

    if not settings.anthropic_api_key:
        return _fallback(result)

    try:
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

        if result.row_count == 0:
            data_str = "The query returned no rows."
        else:
            preview = result.rows[:20]
            data_str = (
                f"Columns: {result.columns}\n"
                f"Rows ({result.row_count} total, showing up to 20):\n{preview}"
            )

        system = (
            "You are a concise data assistant. "
            "Answer the user's question in 1-3 sentences based on the data below. "
            "Be direct and specific. No code, no SQL."
        )
        if global_prompt:
            system = f"{global_prompt}\n\n{system}"

        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=256,
            system=system,
            messages=[{
                "role": "user",
                "content": f"Question: {message}\n\nData:\n{data_str}",
            }],
        )
        return resp.content[0].text.strip()

    except Exception:
        return _fallback(result)


def _fallback(result: QueryResult) -> str:
    if result.row_count == 0:
        return "No results found."
    if result.row_count == 1:
        return "Found 1 result."
    return f"Found {result.row_count} results."
