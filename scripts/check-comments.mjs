#!/usr/bin/env node
// Reports comments on added lines that look like the two patterns issue #142
// found removed by hand six times. It exits 0 whatever it finds: until the
// false-positive rate says otherwise, this reports and does not enforce.

import console from "node:console";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULTS, addedLines, findings } from "./comment-rules.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseArguments(argv) {
  const options = {
    base: "origin/main",
    head: null,
    json: false,
    maxLines: DEFAULTS.maxLines,
    restatementRatio: DEFAULTS.restatementRatio,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i + 1];
    switch (argv[i]) {
      case "--base":
        options.base = value;
        i += 1;
        break;
      case "--head":
        options.head = value;
        i += 1;
        break;
      case "--max-lines":
        options.maxLines = Number(value);
        i += 1;
        break;
      case "--restatement":
        options.restatementRatio = Number(value);
        i += 1;
        break;
      case "--json":
        options.json = true;
        break;
      default:
        throw new Error(`unknown argument: ${argv[i]}`);
    }
  }
  return options;
}

const git = (args) =>
  execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

// `--merge-base` so a branch is judged against where it left the base rather
// than against everything the base gained since.
function diff({ base, head }) {
  const range = head ? [base, head] : ["--merge-base", base];
  return git(["diff", "--unified=0", "--no-color", "--no-ext-diff", ...range]);
}

function contentsOf(path, head) {
  if (head) {
    try {
      return git(["show", `${head}:${path}`]);
    } catch {
      return null;
    }
  }
  const absolute = join(root, path);
  return existsSync(absolute) ? readFileSync(absolute, "utf8") : null;
}

const options = parseArguments(process.argv.slice(2));
const files = addedLines(diff(options));
const reported = [];

for (const [path, added] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
  const source = contentsOf(path, options.head);
  if (source === null) {
    continue;
  }
  for (const finding of findings(source, options)) {
    let touched = false;
    for (let line = finding.line; line <= finding.end && !touched; line += 1) {
      touched = added.has(line);
    }
    if (touched) {
      reported.push({ path, ...finding });
    }
  }
}

if (options.json) {
  console.log(JSON.stringify(reported, null, 2));
} else if (reported.length === 0) {
  console.log(
    `No comments to look at again in ${files.size} changed source file(s).`,
  );
} else {
  console.log(`Comments worth a second look (${reported.length}):\n`);
  for (const finding of reported) {
    console.log(
      `  ${finding.path}:${finding.line}  ${finding.rule}  ${finding.message}`,
    );
  }
  console.log("\nNothing here fails the build. See issue #142.");
}
