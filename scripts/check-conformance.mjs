#!/usr/bin/env node
// Runs the validator over two corpora and compares the diagnostics against a
// recorded expectation. See issues #97 and #232.
//
//   - `conformance-corpus.json`: the 23 official FamilySearch GEDCOM 7.0 test
//     files, which say what the specification asks of us.
//   - `vendor-corpus.json`: unmodified exports from real genealogy programs,
//     which say what the world actually writes. Every genealogy program in use
//     still exports 5.5.1, and a fixture written to look like a vendor export
//     teaches nothing.
//
// Neither corpus is copied into this repository, however permissive its licence.
// What is committed is the record beside this script: where each file comes from,
// under which licence, a SHA-256, and the diagnostics it is expected to produce.
// The hash is what turns an upstream edit into a visible failure instead of a
// silent one, and each vendor location is pinned to a full upstream revision so a
// later commit there cannot change what we read. See
// docs/adr/0011-fetch-corpora-rather-than-vendoring-them.md and
// docs/adr/0013-cache-the-fetched-corpora-in-ci.md.
//
// An expectation takes one of two shapes, and which one an entry uses is recorded
// in the entry rather than decided by a threshold here:
//
//   - `expected` — one string per diagnostic, for files whose whole output a
//     person can read in a diff.
//   - `summary` — the count per code plus a digest, for files that produce
//     thousands. A file with 12 762 diagnostics would otherwise put 12 762
//     strings into a JSON file and make `--update` a rubber stamp.
//
// No expectation holds a diagnostic's message. The wording is meant to get
// clearer, and pinning it would make every improvement read as a regression.
//
// Two consequences follow from reading the corpus from upstream:
//
//   - This needs network, so it is not part of `npm run check`, which has to
//     work on a plane. CI runs it as its own job.
//   - A file that cannot be obtained is a failure, not a skip. A conformance
//     suite that quietly checks nothing is worse than none at all.

import console from "node:console";
import process from "node:process";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as cache from "./conformance-cache.mjs";
import {
  compare,
  contentOf,
  isPinned,
  normalise,
  recordOf,
  shapeOf,
} from "./conformance-record.mjs";

// The lint configuration declares no environment globals, which is why every
// built-in above is imported by name. `fetch` has no `node:` module to be
// imported from, so it is taken off globalThis instead.
const { fetch } = globalThis;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// One shape for both corpora, so there is one code path rather than two scripts
// that drift. They differ only in how an entry addresses its file: the official
// suite shares one base URL, while every vendor entry carries its own pinned
// location.
const CORPORA = [
  {
    key: "official",
    file: resolve(root, "scripts/conformance-corpus.json"),
    label: "official GEDCOM 7.0 files",
    locate: (corpus, name) => `${corpus.source}${name}`,
    pinned: false,
  },
  {
    key: "vendor",
    file: resolve(root, "scripts/vendor-corpus.json"),
    label: "vendor exports",
    locate: (corpus, name) => corpus.files[name].location,
    pinned: true,
  },
];

const update = process.argv.includes("--update");
const cacheDirectory = process.env.CONFORMANCE_CACHE;
const refresh =
  update || cache.refreshRequested(process.env.CONFORMANCE_REFRESH);

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

async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function load(corpus, name, url, expected) {
  const path = cacheDirectory
    ? cache.pathOf(cacheDirectory, corpus.key, name)
    : undefined;

  if (path && !refresh) {
    const held = cache.read(path);
    if (held) {
      return contentOf(held);
    }
  }

  const bytes = await fetchBytes(url);
  const content = contentOf(bytes);
  if (path && cache.matchesRecord(content.sha256, expected)) {
    cache.write(path, bytes);
  }
  return content;
}

function diagnose(text) {
  return normalise(new GedcomDocument().createDocument(text).getErrors());
}

const failures = [];
const reports = [];

for (const corpus of CORPORA) {
  const recorded = JSON.parse(readFileSync(corpus.file, "utf8"));
  const names = Object.keys(recorded.files).sort();

  const loaded = await Promise.all(
    names.map(async (name) => {
      const url = corpus.locate(recorded, name);
      // Refused before it is fetched: an unpinned location cannot be added
      // later by writing it into the record and letting the hash cover it.
      if (corpus.pinned && !isPinned(url)) {
        return {
          name,
          error: `${url} is not pinned to a full upstream revision`,
        };
      }
      try {
        const expected = update ? undefined : recorded.files[name].sha256;
        return { name, ...(await load(corpus, name, url, expected)) };
      } catch (error) {
        return { name, error: error.message };
      }
    }),
  );

  let checked = 0;
  let clean = 0;
  let diagnostics = 0;

  for (const file of loaded) {
    const entry = recorded.files[file.name];

    if (file.error) {
      failures.push(`${file.name}: could not be read — ${file.error}`);
      continue;
    }

    if (update) {
      entry.sha256 = file.sha256;
      Object.assign(entry, recordOf(shapeOf(entry), diagnose(file.text)));
      continue;
    }

    if (entry.sha256 !== file.sha256) {
      failures.push(
        `${file.name}: changed upstream (sha256 ${entry.sha256.slice(0, 12)}` +
          `… → ${file.sha256.slice(0, 12)}…). Read the new file, then ` +
          "re-record with `npm run check:conformance -- --update`.",
      );
      continue;
    }

    checked += 1;
    const actual = diagnose(file.text);
    diagnostics += actual.length;
    if (actual.length === 0) {
      clean += 1;
    }
    for (const failure of compare(entry, actual)) {
      failures.push(`${file.name}: ${failure}`);
    }
  }

  if (update) {
    writeFileSync(corpus.file, `${JSON.stringify(recorded, null, 2)}\n`);
    reports.push(`re-recorded ${names.length} ${corpus.label}`);
  } else {
    reports.push(
      `${checked} ${corpus.label}, ${clean} of them diagnostic-free, ` +
        `${diagnostics} diagnostics as recorded`,
    );
  }
}

if (update) {
  for (const report of reports) {
    console.log(`Conformance check ${report}.`);
  }
  process.exit(failures.length ? 1 : 0);
}

if (failures.length) {
  console.error("Conformance check failed:\n");
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  process.exit(1);
}

console.log("Conformance check passed:");
for (const report of reports) {
  console.log(`  ${report}`);
}
