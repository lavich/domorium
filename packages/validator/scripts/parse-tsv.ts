export interface TsvRow {
  [key: string]: string;
}

export function parseTsv(text: string): TsvRow[] {
  const lines = text.split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split("\t");
  return lines.slice(1).map((line) => {
    const values = line.split("\t");
    const row: TsvRow = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}
