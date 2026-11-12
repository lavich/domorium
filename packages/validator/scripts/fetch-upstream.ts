const BASE_URL =
  "https://raw.githubusercontent.com/familysearch/GEDCOM/main/extracted-files";
const TAGS_LISTING_URL =
  "https://api.github.com/repos/familysearch/GEDCOM/contents/extracted-files/tags?ref=main";

export interface UpstreamFiles {
  grammar: string;
  cardinalities: string;
  substructures: string;
  payloads: string;
  enumerations: string;
  tags: string[];
}

async function fetchFile(path: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/${path}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.status}`);
  }
  return res.text();
}

async function fetchTags(): Promise<string[]> {
  const res = await fetch(TAGS_LISTING_URL);
  if (!res.ok) {
    throw new Error(`Failed to list tags: ${res.status}`);
  }
  const entries = (await res.json()) as { name: string }[];
  return Promise.all(entries.map((entry) => fetchFile(`tags/${entry.name}`)));
}

export async function fetchUpstream(): Promise<UpstreamFiles> {
  const [grammar, cardinalities, substructures, payloads, enumerations, tags] =
    await Promise.all([
      fetchFile("grammar.gedstruct"),
      fetchFile("cardinalities.tsv"),
      fetchFile("substructures.tsv"),
      fetchFile("payloads.tsv"),
      fetchFile("enumerations.tsv"),
      fetchTags(),
    ]);
  return {
    grammar,
    cardinalities,
    substructures,
    payloads,
    enumerations,
    tags,
  };
}
