import en from "./en.json";
import hi from "./hi.json";

export type Language = "en" | "hi";

const dictionaries: Record<Language, Record<string, unknown>> = {
  en,
  hi,
};

/**
 * Pure translation lookup function.
 * Supports dot notation (e.g. "catalogue.view_cart") and variable interpolation (e.g. "{count} items").
 */
export function t(
  key: string,
  params: Record<string, string | number> = {},
  lang: Language = "en"
): string {
  const dict = dictionaries[lang] || dictionaries.en;
  const parts = key.split(".");
  let current: unknown = dict;

  for (const part of parts) {
    if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      // Fallback to English if missing in Hindi
      let fallbackCurrent: unknown = dictionaries.en;
      for (const fallbackPart of parts) {
        if (fallbackCurrent && typeof fallbackCurrent === "object" && fallbackPart in (fallbackCurrent as Record<string, unknown>)) {
          fallbackCurrent = (fallbackCurrent as Record<string, unknown>)[fallbackPart];
        } else {
          return key; // return key if not found in dictionary
        }
      }
      current = fallbackCurrent;
      break;
    }
  }

  if (typeof current !== "string") {
    return key;
  }

  let text = current;
  for (const [paramKey, paramValue] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
  }

  return text;
}

