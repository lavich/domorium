const BASE_URL =
  "https://raw.githubusercontent.com/familysearch/GEDCOM/main/extracted-files";

export interface UpstreamFiles {
  grammar: string;
  cardinalities: string;
  substructures: string;
  payloads: string;
  enumerations: string;
}

async function fetchFile(path: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/${path}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.text();
}

export async function fetchUpstream(): Promise<UpstreamFiles> {
  const [grammar, cardinalities, substructures, payloads, enumerations] =
    await Promise.all([
      fetchFile("grammar.gedstruct"),
      fetchFile("cardinalities.tsv"),
      fetchFile("substructures.tsv"),
      fetchFile("payloads.tsv"),
      fetchFile("enumerations.tsv"),
    ]);
  return { grammar, cardinalities, substructures, payloads, enumerations };
}
