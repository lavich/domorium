#!/usr/bin/env node
// Runs the validator over the official FamilySearch GEDCOM 7.0 test files and
// compares the diagnostics against a recorded expectation. See issue #97.
//
// The files are fetched into memory and never written to disk. They live in
// FamilySearch/GEDCOM.io, which states no licence — unlike the specification
// repository, which is Apache-2.0 — so this repository does not carry a copy of
// them. What is committed is the corpus file beside this script: a SHA-256 per
// file, and the diagnostics that file is expected to produce. The hash is what
// turns an upstream edit into a visible failure instead of a silent one.
//
// Two consequences follow from fetching:
//
//   - This needs network, so it is not part of `npm run check`, which has to
//     work on a plane. CI runs it as its own job.
//   - A file that cannot be fetched is a failure, not a skip. A conformance
//     suite that quietly checks nothing is worse than none at all.

import console from "node:console";
import process from "node:process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TextDecoder } from "node:util";

// The lint configuration declares no environment globals, which is why every
// built-in above is imported by name. `fetch` has no `node:` module to be
// imported from, so it is taken off globalThis instead.
const { fetch } = globalThis;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS = resolve(root, "scripts/conformance-corpus.json");

const update = process.argv.includes("--update");

// Through the package name and the workspace link, so this exercises the entry
// point a consumer gets rather than a path into the source tree.
const require = createRequire(import.meta.url);
let GedcomDocument;
try {
  ({ GedcomDocument } = require("@domorium/validator"));
} catch (error) {
  console.error(
    `Could not load @domorium/validator: ${error.message}\n` +
      "Run `npm run build -w packages/validator` first.",
  );
  process.exit(1);
}

const corpus = JSON.parse(readFileSync(CORPUS, "utf8"));

/**
 * `Response.text()` runs the WHATWG UTF-8 decode algorithm, which strips a
 * leading BOM — the same thing a browser does with a dropped file, and the
 * reason #95 went unseen there. Decoding the bytes ourselves keeps the BOM, so
 * these run as a Node consumer reading from disk sees them.
 */
function decode(bytes) {
  return new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
}

async function load(name) {
  const url = `${corpus.source}${name}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  return {
    sha256: createHash("sha256").update(bytes).digest("hex"),
    text: decode(bytes),
  };
}

// Line and code, not message: the wording of a diagnostic is meant to change as
// it gets clearer, and pinning it here would make every improvement look like a
// regression.
function diagnose(text) {
  return new GedcomDocument()
    .createDocument(text)
    .getErrors()
    .map((e) => ({
      line: e.range.start.line + 1,
      text: `${e.level} ${e.code}`,
    }))
    .sort((a, b) => a.line - b.line || a.text.localeCompare(b.text))
    .map((e) => `${e.line} ${e.text}`);
}

function difference(expected, actual) {
  const remaining = [...expected];
  const added = [];
  for (const entry of actual) {
    const at = remaining.indexOf(entry);
    if (at === -1) {
      added.push(entry);
    } else {
      remaining.splice(at, 1);
    }
  }
  return { added, gone: remaining };
}

const names = Object.keys(corpus.files).sort();
const loaded = await Promise.all(
  names.map(async (name) => {
    try {
      return { name, ...(await load(name)) };
    } catch (error) {
      return { name, error: error.message };
    }
  }),
);

const failures = [];
let checked = 0;
let diagnostics = 0;

for (const file of loaded) {
  const recorded = corpus.files[file.name];

  if (file.error) {
    failures.push(`${file.name}: could not be fetched — ${file.error}`);
    continue;
  }

  if (update) {
    recorded.sha256 = file.sha256;
    recorded.expected = diagnose(file.text);
    continue;
  }

  if (recorded.sha256 !== file.sha256) {
    failures.push(
      `${file.name}: changed upstream (sha256 ${recorded.sha256.slice(0, 12)}` +
        `… → ${file.sha256.slice(0, 12)}…). Read the new file, then re-record ` +
        "with `npm run check:conformance -- --update`.",
    );
    continue;
  }

  checked += 1;
  const actual = diagnose(file.text);
  diagnostics += actual.length;
  const { added, gone } = difference(recorded.expected, actual);

  for (const entry of added) {
    failures.push(`${file.name}: new diagnostic at ${entry}`);
  }
  // A diagnostic that stopped appearing is usually a fix, and the point of
  // recording them is that the fix has to be acknowledged here.
  for (const entry of gone) {
    failures.push(
      `${file.name}: expected diagnostic no longer reported at ${entry} — ` +
        "if this is the fix you meant, re-record with `--update`",
    );
  }
}

if (update) {
  writeFileSync(CORPUS, `${JSON.stringify(corpus, null, 2)}\n`);
  console.log(`Re-recorded ${names.length} files in ${CORPUS}.`);
  process.exit(failures.length ? 1 : 0);
}

if (failures.length) {
  console.error("Conformance check failed:\n");
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  process.exit(1);
}

const clean = names.filter((n) => corpus.files[n].expected.length === 0).length;
console.log(
  `Conformance check passed: ${checked} official GEDCOM 7.0 files, ` +
    `${clean} of them diagnostic-free, ${diagnostics} diagnostics as recorded.`,
);
