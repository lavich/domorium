#!/usr/bin/env node
// Deterministic documentation checks. See docs/adr/0002-documentation-in-repository.md.
//
// Every check here is a file-existence or string-presence test. Anything that would
// need to parse a language belongs in a tool built for it — that boundary is the
// decision, not an accident.

import console from "node:console";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { check as isFormatted, resolveConfig } from "prettier";
import { main as markdownlint } from "markdownlint-cli2";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const fail = (file, message) => failures.push(`${file}: ${message}`);

// `--others` so an uncommitted document is checked too; the existsSync filter drops
// files deleted from the working tree but still in the index, which git also lists.
function markdownFiles() {
  const out = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "*.md"],
    { cwd: root, encoding: "utf8" },
  );
  return [...new Set(out.split("\n").filter(Boolean))]
    .filter((file) => existsSync(join(root, file)))
    .sort();
}

async function checkFormatting(files) {
  for (const file of files) {
    const path = join(root, file);
    const options = await resolveConfig(path);
    const formatted = await isFormatted(readFileSync(path, "utf8"), {
      ...options,
      filepath: path,
    });
    if (!formatted) {
      fail(file, "not Prettier-formatted — run `npx prettier --write` on it");
    }
  }
}

// Rules live in `.markdownlint-cli2.jsonc`; the file list is passed from here, which
// is why that config carries no globs of its own.
async function checkMarkdownLint(files) {
  await markdownlint({
    argv: files,
    directory: root,
    noGlobs: true,
    logMessage: () => {},
    logError: (message) => failures.push(message),
  });
}

const subdirectories = (parent) =>
  readdirSync(join(root, parent), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(parent, entry.name));

function checkReadmes(dirs) {
  for (const dir of dirs) {
    if (!existsSync(join(root, dir, "README.md"))) {
      fail(dir, "has no README.md");
    }
  }
}

// Covers the npm packages and the VS Code extension. `private` is what excludes the
// web editor, which carries a version field but is never released.
function checkChangelogs(dirs) {
  let checked = 0;
  for (const dir of dirs) {
    const manifest = JSON.parse(
      readFileSync(join(root, dir, "package.json"), "utf8"),
    );
    if (!manifest.version || manifest.private) {
      continue;
    }
    checked += 1;
    const changelog = join(root, dir, "CHANGELOG.md");
    if (!existsSync(changelog)) {
      fail(
        dir,
        `version ${manifest.version} is published but there is no CHANGELOG.md`,
      );
      continue;
    }
    const headings = readFileSync(changelog, "utf8").matchAll(
      /^##\s+\[?v?([0-9][^\s\]]*)/gm,
    );
    if (![...headings].some(([, v]) => v === manifest.version)) {
      fail(
        relative(root, changelog),
        `no heading for version ${manifest.version} from package.json`,
      );
    }
  }
  return checked;
}

// Same rule as checkChangelogs, but the JetBrains plugin keeps its version in Gradle
// and its changelog in plugin.xml, where the Marketplace reads it. Restated here
// rather than duplicated into a CHANGELOG.md that nothing would render.
function checkJetBrainsChangeNotes() {
  const build = join(root, "apps/jetbrains/build.gradle.kts");
  const manifest = join(
    root,
    "apps/jetbrains/src/main/resources/META-INF/plugin.xml",
  );
  if (!existsSync(build) || !existsSync(manifest)) {
    fail("apps/jetbrains", "build.gradle.kts or plugin.xml is missing");
    return;
  }

  const version = readFileSync(build, "utf8").match(
    /^version\s*=\s*"([^"]+)"/m,
  )?.[1];
  if (!version) {
    fail(relative(root, build), 'no `version = "…"` assignment found');
    return;
  }

  const headings = readFileSync(manifest, "utf8").matchAll(
    /<h2>\s*v?([0-9][^\s<]*)\s*<\/h2>/g,
  );
  if (![...headings].some(([, v]) => v === version)) {
    fail(
      relative(root, manifest),
      `change-notes has no <h2> for version ${version} from build.gradle.kts`,
    );
  }
}

function checkAdrIndex() {
  const directory = join(root, "docs/adr");
  const records = readdirSync(directory)
    .filter((name) => /^\d{4}-.+\.md$/.test(name))
    .sort();
  if (!existsSync(join(directory, "README.md"))) {
    fail("docs/adr", "the ADR index README.md is missing");
    return;
  }
  const index = readFileSync(join(directory, "README.md"), "utf8");

  const numbers = new Map();
  for (const record of records) {
    const number = record.slice(0, 4);
    numbers.set(number, [...(numbers.get(number) ?? []), record]);
    if (!index.includes(`(${record})`)) {
      fail("docs/adr/README.md", `does not list ${record}`);
    }
  }
  for (const [number, duplicates] of numbers) {
    if (duplicates.length > 1) {
      fail(
        "docs/adr",
        `number ${number} is used twice: ${duplicates.join(", ")}`,
      );
    }
  }
}

const files = markdownFiles();
const units = [...subdirectories("packages"), ...subdirectories("apps")];
const versioned = units.filter((dir) =>
  existsSync(join(root, dir, "package.json")),
);

await checkFormatting(files);
await checkMarkdownLint(files);
checkReadmes(units);
// The JetBrains plugin is the one release unit without a package.json, hence the +1.
const released = checkChangelogs(versioned) + 1;
checkJetBrainsChangeNotes();
checkAdrIndex();

if (failures.length > 0) {
  console.error(`Documentation checks failed (${failures.length}):\n`);
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  console.error("");
  process.exit(1);
}

console.log(
  `Documentation checks passed: ${files.length} Markdown files, ` +
    `${units.length} packages and apps, ${released} release units.`,
);
