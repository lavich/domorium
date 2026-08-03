import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";

const repositoryRoot = resolve(import.meta.dirname, "..");
const temporaryDirectory = mkdtempSync(
  join(tmpdir(), "gedcom-codemirror-consumer-"),
);

function run(command, args, cwd = temporaryDirectory) {
  execFileSync(command, args, {
    cwd,
    env: process.env,
    stdio: "inherit",
  });
}

try {
  run(
    "npm",
    [
      "pack",
      "--workspace",
      "packages/codemirror",
      "--pack-destination",
      temporaryDirectory,
    ],
    repositoryRoot,
  );

  const packageMetadata = JSON.parse(
    readFileSync(
      resolve(repositoryRoot, "packages/codemirror/package.json"),
      "utf8",
    ),
  );
  const tarballName =
    `${packageMetadata.name.replace("@", "").replace("/", "-")}` +
    `-${packageMetadata.version}.tgz`;
  const tarballPath = join(temporaryDirectory, tarballName);

  writeFileSync(
    join(temporaryDirectory, "package.json"),
    JSON.stringify({
      name: "gedcom-codemirror-package-consumer",
      private: true,
      type: "module",
    }),
  );
  run("npm", [
    "install",
    "--ignore-scripts",
    "--no-package-lock",
    tarballPath,
    "typescript@5.9.2",
  ]);

  writeFileSync(
    join(temporaryDirectory, "verify-esm.mjs"),
    [
      'import { createGedcomExtensions } from "@domorium/codemirror";',
      'if (typeof createGedcomExtensions !== "function") {',
      '  throw new Error("ESM export is unavailable");',
      "}",
      "",
    ].join("\n"),
  );
  run(process.execPath, ["verify-esm.mjs"]);

  writeFileSync(
    join(temporaryDirectory, "verify-cjs.cjs"),
    [
      'const { createGedcomExtensions } = require("@domorium/codemirror");',
      'if (typeof createGedcomExtensions !== "function") {',
      '  throw new Error("CommonJS export is unavailable");',
      "}",
      "",
    ].join("\n"),
  );
  run(process.execPath, ["verify-cjs.cjs"]);

  writeFileSync(
    join(temporaryDirectory, "verify-types.ts"),
    [
      "import {",
      "  createGedcomExtensions,",
      "  EditorLanguageService,",
      "  type GedcomEditorOptions,",
      '} from "@domorium/codemirror";',
      "",
      "const language = new EditorLanguageService();",
      "const options: GedcomEditorOptions = {",
      "  language,",
      "  actions: { applyWorkspaceEdit: () => true },",
      "};",
      "createGedcomExtensions(options);",
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(temporaryDirectory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        module: "NodeNext",
        moduleResolution: "NodeNext",
        noEmit: true,
        strict: true,
        target: "ES2022",
      },
      include: ["verify-types.ts"],
    }),
  );
  run(join(temporaryDirectory, "node_modules/.bin/tsc"));
} finally {
  rmSync(temporaryDirectory, { force: true, recursive: true });
}
