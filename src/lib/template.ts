import type { CompactContext } from "../schemas/watchlist";

export function renderPrompt(template: string, context: CompactContext): string {
  const values: Record<string, string> = {
    "industry.name": context.industry.name,
    "industry.description": context.industry.description ?? "",
    company_names: context.companies.map((company) => company.name).join(", "),
    discovery_queries: context.discovery.queries.join("; "),
    context_json: JSON.stringify(context, null, 2),
  };

  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => {
    return values[key] ?? "";
  });
}
