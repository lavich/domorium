import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchUpstream } from "./fetch-upstream.js";
import { parseGedstruct } from "./parse-gedstruct.js";
import { assembleSchema } from "./assemble-schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMES_DIR = resolve(__dirname, "../src/schemes");
const OUTPUT = resolve(SCHEMES_DIR, "g7validation.json");

async function main() {
  console.log("Fetching upstream files...");
  const upstream = await fetchUpstream();

  console.log("Parsing grammar...");
  const grammar = parseGedstruct(upstream.grammar);
  console.log(`  Found ${grammar.tagMap.size} tag mappings`);

  console.log("Loading existing schema (for preserved sections)...");
  const existing = JSON.parse(readFileSync(OUTPUT, "utf-8"));

  console.log("Assembling schema...");
  const schema = assembleSchema(grammar, upstream, {
    calendar: existing.calendar,
    label: existing.label,
    payload: existing.payload,
    set: existing.set,
    substructure: existing.substructure,
    tag: existing.tag,
    tagInContext: existing.tagInContext,
  });

  console.log(`  Payloads: ${Object.keys(schema.payload).length}`);
  console.log(`  Substructures: ${Object.keys(schema.substructure).length}`);
  console.log(`  Tags: ${Object.keys(schema.tag).length}`);

  console.log("Writing output...");
  writeFileSync(OUTPUT, JSON.stringify(schema, null, 2) + "\n");
  console.log(`Done → ${OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
