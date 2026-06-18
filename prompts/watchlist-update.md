Review the weekly journal and propose watchlist updates.

Return suggested changes as JSON with this shape:

```json
{
  "suggested_watchlist_updates": [
    {
      "action": "add_company | update_company | pause_company | add_query | remove_query",
      "reason": "Evidence-backed reason",
      "confidence": "high | medium | low",
      "data": {}
    }
  ]
}
```

Do not apply changes directly unless the user explicitly asks.
