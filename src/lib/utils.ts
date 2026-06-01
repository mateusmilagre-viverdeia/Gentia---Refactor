import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely coerce any scrape/Apollo/Evaboot field into a renderable string.
 * Handles cases where the scraper returns `{ parsed, countryCode, linkedinText }`
 * (or similar nested shapes) instead of a plain string, which would otherwise
 * crash React with error #31 (Objects are not valid as a React child).
 */
export function safeScrapeString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map(safeScrapeString).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const candidate =
      obj.parsed ??
      obj.text ??
      obj.linkedinText ??
      obj.name ??
      obj.full_name ??
      obj.title ??
      obj.label ??
      obj.value;
    if (typeof candidate === "string") return candidate;
    if (candidate != null) return safeScrapeString(candidate);
    try {
      return "";
    } catch {
      return "";
    }
  }
  return "";
}
