export type WatchPriority = "high" | "medium" | "low";
export type WatchStatus = "active" | "candidate" | "paused" | "archived";

export interface WatchCompany {
  id: string;
  name: string;
  status: WatchStatus;
  category: string;
  priority: WatchPriority;
  urls?: string[];
  watch_for?: string[];
  notes?: string;
}

export interface Watchlist {
  schema_version: 1;
  industry: {
    name: string;
    description?: string;
  };
  companies: WatchCompany[];
  discovery?: {
    enabled?: boolean;
    queries?: string[];
    candidate_threshold?: string;
  };
}

export interface CompactContext {
  industry: Watchlist["industry"];
  companies: Array<Pick<WatchCompany, "id" | "name" | "category" | "priority"> & {
    watch_for: string[];
  }>;
  discovery: {
    enabled: boolean;
    queries: string[];
  };
}

export function validateWatchlist(value: unknown): Watchlist {
  if (!isRecord(value)) {
    throw new Error("watchlist must be a JSON object");
  }
  if (value.schema_version !== 1) {
    throw new Error("schema_version must be 1");
  }
  if (!isRecord(value.industry) || !isNonEmptyString(value.industry.name)) {
    throw new Error("industry.name is required");
  }
  if (!Array.isArray(value.companies) || value.companies.length === 0) {
    throw new Error("companies must contain at least one company");
  }

  const ids = new Set<string>();
  for (const [index, company] of value.companies.entries()) {
    validateCompany(company, index);
    if (ids.has(company.id)) {
      throw new Error(`duplicate company id: ${company.id}`);
    }
    ids.add(company.id);
  }

  if (value.discovery !== undefined) {
    if (!isRecord(value.discovery)) {
      throw new Error("discovery must be an object");
    }
    if (value.discovery.queries !== undefined && !isStringArray(value.discovery.queries)) {
      throw new Error("discovery.queries must be an array of strings");
    }
  }

  return value as unknown as Watchlist;
}

export function toCompactContext(watchlist: Watchlist): CompactContext {
  return {
    industry: watchlist.industry,
    companies: watchlist.companies
      .filter((company) => company.status === "active" || company.status === "candidate")
      .map((company) => ({
        id: company.id,
        name: company.name,
        category: company.category,
        priority: company.priority,
        watch_for: company.watch_for ?? [],
      })),
    discovery: {
      enabled: watchlist.discovery?.enabled ?? true,
      queries: watchlist.discovery?.queries ?? [],
    },
  };
}

function validateCompany(value: unknown, index: number): asserts value is WatchCompany {
  if (!isRecord(value)) {
    throw new Error(`companies[${index}] must be an object`);
  }
  for (const field of ["id", "name", "status", "category", "priority"] as const) {
    if (!isNonEmptyString(value[field])) {
      throw new Error(`companies[${index}].${field} is required`);
    }
  }
  const status = value.status as string;
  if (!["active", "candidate", "paused", "archived"].includes(status)) {
    throw new Error(`companies[${index}].status is invalid`);
  }
  const priority = value.priority as string;
  if (!["high", "medium", "low"].includes(priority)) {
    throw new Error(`companies[${index}].priority is invalid`);
  }
  if (value.urls !== undefined && !isStringArray(value.urls)) {
    throw new Error(`companies[${index}].urls must be an array of strings`);
  }
  if (value.watch_for !== undefined && !isStringArray(value.watch_for)) {
    throw new Error(`companies[${index}].watch_for must be an array of strings`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
