#!/usr/bin/env node
// Deterministic documentation checks. See docs/adr/0002-documentation-in-repository.md
// for why documentation is enforced by a script rather than by review attention.
//
// 1. Relative Markdown links resolve, so a rename breaks the build.
// 2. Every package has a README.
// 3. Every versioned package's version has a matching changelog heading.
// 4. Identifiers imported by README examples are really exported by the package.
//
// Deliberately not covered: call signatures in examples, which would need built
// declarations and therefore a build step before the check can run.

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const fail = (file, message) => failures.push(`${file}: ${message}`);

/**
 * Markdown files that are ours to keep correct. Includes files that are not committed
 * yet — a new document is the most likely one to carry a broken link — while excluding
 * anything gitignored, generated, or vendored.
 */
function markdownFiles() {
  const out = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "*.md"],
    { cwd: root, encoding: "utf8" },
  );
  return [...new Set(out.split("\n").filter(Boolean))].filter(
    (f) => !f.startsWith(".worktrees/"),
  );
}

function checkLinks(files) {
  for (const file of files) {
    const body = readFileSync(join(root, file), "utf8");
    const withoutCode = body
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`\n]*`/g, "");
    for (const [, target] of withoutCode.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^(https?:|mailto:|#)/.test(target)) {
        continue;
      }
      const [path] = target.split("#");
      if (!path) {
        continue;
      }
      if (!existsSync(resolve(dirname(join(root, file)), path))) {
        fail(file, `broken link -> ${target}`);
      }
    }
  }
}

function packageDirs() {
  return readdirSync(join(root, "packages"), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join("packages", e.name))
    .filter((dir) => existsSync(join(root, dir, "package.json")));
}

function checkPackageReadmes(dirs) {
  for (const dir of dirs) {
    if (!existsSync(join(root, dir, "README.md"))) {
      fail(dir, "package has no README.md");
    }
  }
}

/** A version that ships must be findable in its own changelog. */
function checkChangelogs(dirs) {
  for (const dir of dirs) {
    const manifest = JSON.parse(
      readFileSync(join(root, dir, "package.json"), "utf8"),
    );
    if (!manifest.version || manifest.private) {
      continue;
    }
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
}

/** Named exports of a package, following `export * from "@gedcom/…"` one level. */
function publicExports(dir, dirsByName, seen = new Set()) {
  const entry = join(root, dir, "src/index.ts");
  if (seen.has(entry) || !existsSync(entry)) {
    return new Set();
  }
  seen.add(entry);

  const source = readFileSync(entry, "utf8");
  const names = new Set();

  for (const [, clause] of source.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of clause.split(",")) {
      const name = part
        .trim()
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (name) {
        names.add(name);
      }
    }
  }
  for (const [, pkg] of source.matchAll(/export\s+\*\s+from\s+"([^"]+)"/g)) {
    const target = dirsByName.get(pkg);
    if (target) {
      for (const name of publicExports(target, dirsByName, seen)) {
        names.add(name);
      }
    }
  }
  return names;
}

/**
 * Verify that every identifier a README example imports from a workspace package is
 * actually exported by it. This catches the drift that matters — a renamed or removed
 * export documented as if it still exists — without needing a build or a complete
 * install. It does not check call signatures; that would require built declarations.
 */
function checkExampleImports(dirs) {
  const dirsByName = new Map(
    dirs.map((dir) => [
      JSON.parse(readFileSync(join(root, dir, "package.json"), "utf8")).name,
      dir,
    ]),
  );
  const exportsByName = new Map(
    [...dirsByName].map(([name, dir]) => [
      name,
      publicExports(dir, dirsByName),
    ]),
  );

  for (const dir of dirs) {
    const readme = join(root, dir, "README.md");
    if (!existsSync(readme)) {
      continue;
    }
    const body = readFileSync(readme, "utf8");

    for (const [, code] of body.matchAll(
      /```(?:typescript|ts)\n([\s\S]*?)```/g,
    )) {
      for (const [, clause, pkg] of code.matchAll(
        /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*"([^"]+)"/g,
      )) {
        const known = exportsByName.get(pkg);
        if (!known) {
          continue;
        }
        for (const part of clause.split(",")) {
          const name = part
            .trim()
            .replace(/^type\s+/, "")
            .split(/\s+as\s+/)[0]
            ?.trim();
          if (name && !known.has(name)) {
            fail(
              relative(root, readme),
              `example imports "${name}" from ${pkg}, which does not export it`,
            );
          }
        }
      }
    }
  }
}

const files = markdownFiles();
const dirs = packageDirs();

checkLinks(files);
checkPackageReadmes(dirs);
checkChangelogs(dirs);
checkExampleImports(dirs);

if (failures.length > 0) {
  console.error(`Documentation checks failed (${failures.length}):\n`);
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  console.error("");
  process.exit(1);
}

console.log(
  `Documentation checks passed: ${files.length} Markdown files, ${dirs.length} packages.`,
);
