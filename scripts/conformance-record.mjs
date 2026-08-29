// The parts of the conformance check worth testing on their own: reading a
// file's bytes into the hash and text a record is about, turning validator
// diagnostics into a normalised record, the two shapes an expectation can take,
// and comparing a recorded expectation with what the validator says today.
// `check-conformance.mjs` does the fetching and the reporting around these;
// nothing here touches the network or the filesystem.

import { createHash } from "node:crypto";
import { URL } from "node:url";
import { TextDecoder } from "node:util";

/**
 * One reading of a file's bytes, whichever way they arrived, so a copy and a
 * fetch are hashed and decoded by the same rule.
 *
 * `Response.text()` runs the WHATWG UTF-8 decode algorithm, which strips a
 * leading BOM — the same thing a browser does with a dropped file, and the
 * reason #95 went unseen there. Decoding the bytes here keeps it, so the corpus
 * runs as a Node consumer reading from disk sees it.
 */
export function contentOf(bytes) {
  return {
    sha256: createHash("sha256").update(bytes).digest("hex"),
    text: new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes),
  };
}

/**
 * Line, column, level and code — never the message. The wording of a diagnostic
 * is meant to get clearer, and pinning it would make every improvement read as a
 * regression.
 *
 * Positions come out one-based, as an editor shows them.
 */
export function normalise(errors) {
  return errors
    .map((error) => ({
      line: error.range.start.line + 1,
      column: error.range.start.character + 1,
      level: error.level,
      code: error.code,
    }))
    .sort(
      (a, b) =>
        a.line - b.line ||
        a.column - b.column ||
        a.level.localeCompare(b.level) ||
        a.code.localeCompare(b.code),
    );
}

/**
 * The per-diagnostic shape, used for files whose whole output a person can read
 * in a diff. Column is deliberately absent: these records predate it, and a
 * moved column inside one line is not what this shape is for. Ordering is line
 * then level-and-code, which is the order the official records already hold, so
 * re-recording them does not churn the file.
 */
export function expectationOf(diagnostics) {
  return diagnostics
    .map((d) => ({ line: d.line, text: `${d.level} ${d.code}` }))
    .sort((a, b) => a.line - b.line || a.text.localeCompare(b.text))
    .map((d) => `${d.line} ${d.text}`);
}

/**
 * A digest over level, code, line and column of every diagnostic. It catches a
 * rearrangement that leaves the counts per code equal, while leaving the message
 * free to change.
 */
export function digestOf(diagnostics) {
  const hash = createHash("sha256");
  for (const d of diagnostics) {
    hash.update(`${d.level} ${d.code} ${d.line} ${d.column}\n`);
  }
  return hash.digest("hex");
}

/** The summary shape, for files that produce thousands of diagnostics. */
export function summaryOf(diagnostics) {
  const byCode = {};
  for (const d of diagnostics) {
    byCode[d.code] = (byCode[d.code] ?? 0) + 1;
  }
  const sorted = {};
  for (const code of Object.keys(byCode).sort()) {
    sorted[code] = byCode[code];
  }
  return {
    total: diagnostics.length,
    byCode: sorted,
    digest: digestOf(diagnostics),
  };
}

/**
 * Which shape a record uses is a property of the record, not of a threshold on
 * the count: `--update` has to renew a record in place, and must not quietly
 * move a file onto the weaker of the two shapes.
 */
export function shapeOf(record) {
  return record.summary === undefined ? "expected" : "summary";
}

export function recordOf(shape, diagnostics) {
  return shape === "summary"
    ? { summary: summaryOf(diagnostics) }
    : { expected: expectationOf(diagnostics) };
}

function compareExpected(recorded, diagnostics) {
  const remaining = [...(recorded.expected ?? [])];
  const failures = [];
  for (const entry of expectationOf(diagnostics)) {
    const at = remaining.indexOf(entry);
    if (at === -1) {
      failures.push(`new diagnostic at ${entry}`);
    } else {
      remaining.splice(at, 1);
    }
  }
  // A diagnostic that stopped appearing is usually a fix, and the point of
  // recording them is that the fix has to be acknowledged here.
  for (const entry of remaining) {
    failures.push(
      `expected diagnostic no longer reported at ${entry} — if this is the ` +
        "fix you meant, re-record with `--update`",
    );
  }
  return failures;
}

function compareSummary(recorded, diagnostics) {
  const actual = summaryOf(diagnostics);
  const expected = recorded.summary;
  const failures = [];

  const codes = new Set([
    ...Object.keys(expected.byCode ?? {}),
    ...Object.keys(actual.byCode),
  ]);
  for (const code of [...codes].sort()) {
    const was = expected.byCode?.[code] ?? 0;
    const now = actual.byCode[code] ?? 0;
    if (was !== now) {
      failures.push(`${code} ${was} → ${now}`);
    }
  }

  if (expected.total !== actual.total) {
    failures.push(`total ${expected.total} → ${actual.total}`);
  }

  // Equal counts over diagnostics that fell elsewhere in the file: the counts
  // say nothing, and only the digest catches it.
  if (!failures.length && expected.digest !== actual.digest) {
    failures.push(
      `the same counts fall elsewhere in the file (digest ` +
        `${String(expected.digest).slice(0, 12)}… → ` +
        `${actual.digest.slice(0, 12)}…)`,
    );
  }

  return failures;
}

export function compare(recorded, diagnostics) {
  return shapeOf(recorded) === "summary"
    ? compareSummary(recorded, diagnostics)
    : compareExpected(recorded, diagnostics);
}

/**
 * A location has to address bytes that cannot change under it. A branch URL
 * would let an upstream edit read as our regression, so a location that carries
 * no full revision is refused rather than fetched.
 */
export function isPinned(location) {
  let path;
  try {
    path = new URL(location).pathname;
  } catch {
    return false;
  }
  return path.split("/").some((segment) => /^[0-9a-f]{40}$/.test(segment));
}
