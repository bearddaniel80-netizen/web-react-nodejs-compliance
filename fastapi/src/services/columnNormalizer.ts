export interface Column {
  key: string;
  label: string;
  type: "boolean" | "number" | "string" | "unknown";
}

type Json = Record<string, any>;

function getDataType(value: unknown): Column["type"] {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "string") return "string";
  return "unknown";
}

// Python str.title(): upper-case the first letter after any non-letter, lower-case the rest
function title(s: string): string {
  let startOfWord = true;
  let out = "";
  for (const ch of s) {
    if (/\p{L}/u.test(ch)) {
      out += startOfWord ? ch.toUpperCase() : ch.toLowerCase();
      startOfWord = false;
    } else {
      out += ch;
      startOfWord = true;
    }
  }
  return out;
}

export class ColumnNormalizer {
  private getUniqueColumns(response: Json, keyField: string): Column[] {
    const field = response[keyField];
    let source: Json | undefined;

    if (Array.isArray(field)) {
      source = field.length > 0 ? field[0] : undefined;
    } else if (field && typeof field === "object") {
      source = field;
    }
    if (!source || typeof source !== "object") return [];

    return Object.entries(source).map(([key, value]) => ({
      key,
      label: title(key),
      type: getDataType(value),
    }));
  }

  collectColumnName(response: Json, keyField: string): void {
    response[`${keyField}_columns`] = this.getUniqueColumns(response, keyField);
  }
}
