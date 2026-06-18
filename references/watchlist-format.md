# Watchlist Format

`watchlist.json` is the strategic source of truth. Keep it readable and stable.

Required top-level fields:

- `schema_version`: currently `1`
- `industry.name`
- `companies[]`

Company fields:

- `id`: stable lowercase identifier
- `name`: display name
- `status`: `active`, `candidate`, `paused`, or `archived`
- `category`: market/category label
- `priority`: `high`, `medium`, or `low`
- `urls`: canonical URLs
- `watch_for`: specific signals
- `notes`: optional human context

Use repo journals for findings. Use local SQLite for noisy search logs and rejected candidates.

Validate adjacent artifacts with:

```bash
research-monitor validate-journal --journal watch/journals/YYYY-MM-DD.md
research-monitor validate-suggested-update --file watch/suggested-updates/example.json
```
