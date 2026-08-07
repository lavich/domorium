#!/usr/bin/env node
// Generates a GEDCOM 7 document of a requested size for benchmarking, with a
// small, known set of deliberate errors.
//
//   node scripts/generate-gedcom.mjs [output] [megabytes]
//   node scripts/generate-gedcom.mjs tmp/big.ged 51.5
//
// The default output lands in `tmp/`, which .gitignore already excludes — a file
// this size must never become committable by accident.
//
// Records reference each other through HUSB/WIFE/CHIL/FAMS/FAMC, and that is the
// point. A document whose records stand alone never exercises pointer
// resolution, which is where the worst quadratic behaviour lived; the benchmark
// that missed it is described in the pull request that fixed it (#62).
//
// The planted errors are reported with the line they landed on, so a validator's
// diagnostics can be checked against what the document actually contains rather
// than against a count.
//
// This is a tool to run by hand. Tests must not import it: `scripts/` is outside
// the tsconfig `include`, so a package test reaching in here would take its own
// type-check down with it. Performance guards build their own documents inline,
// as the ones in packages/validator already do.

import console from "node:console";
import process from "node:process";
import { Buffer } from "node:buffer";
import { createWriteStream, mkdirSync } from "node:fs";
import { once } from "node:events";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [outArg = "tmp/gedcom.ged", sizeArg = "51.5"] = process.argv.slice(2);
const outPath = resolve(root, outArg);
const targetBytes = Number(sizeArg) * 1024 * 1024;

if (!Number.isFinite(targetBytes) || targetBytes <= 0) {
  console.error(`Not a size in megabytes: ${sizeArg}`);
  process.exit(1);
}

mkdirSync(dirname(outPath), { recursive: true });
const out = createWriteStream(outPath);

let bytes = 0;
let line = 0;
const planted = [];

async function write(text) {
  bytes += Buffer.byteLength(text, "utf8");
  line += text.split("\n").length - 1;
  if (!out.write(text)) {
    await once(out, "drain");
  }
}

const plant = (what) => planted.push({ line: line + 1, what });

const SURNAMES = ["Bakker", "de Vries", "van Dijk", "Jansen", "Visser", "Smit"];
const PLACES = [
  "Amsterdam, Noord-Holland, Nederland",
  "Utrecht, Utrecht, Nederland",
  "Leiden, Zuid-Holland, Nederland",
  "Groningen, Groningen, Nederland",
];

await write(`0 HEAD
1 GEDC
2 VERS 7.0
1 SOUR domorium-benchmark
2 VERS 1
1 SUBM @U1@
0 @U1@ SUBM
1 NAME Benchmark
0 @S1@ SOUR
1 TITL Municipal registry, generated
1 ABBR Registry
`);

let person = 0;
let family = 0;

while (bytes < targetBytes) {
  family += 1;
  const husband = ++person;
  const wife = ++person;
  const children = [];
  for (let c = 0; c < 1 + (family % 4); c += 1) {
    children.push(++person);
  }

  for (const [index, id] of [husband, wife, ...children].entries()) {
    const isSpouse = index < 2;
    const surname = SURNAMES[id % SURNAMES.length];
    const place = PLACES[id % PLACES.length];
    const birthYear = 1780 + (family % 120) + (isSpouse ? 0 : 28);

    await write(`0 @I${id}@ INDI\n`);
    await write(`1 NAME Person${id} /${surname}/\n`);
    await write(`2 GIVN Person${id}\n`);
    await write(`2 SURN ${surname}\n`);
    await write(`1 SEX ${index % 2 === 0 ? "M" : "F"}\n`);

    // A second SEX exceeds the cardinality the schema allows.
    if (id === 3) {
      plant("VAL007 too many occurrences: a second SEX");
      await write("1 SEX F\n");
    }

    await write("1 BIRT\n");

    // A day the calendar does not have. Currently reported by nothing — the date
    // grammar accepts it, see the issue about DATE and calendar validity.
    if (id === 5) {
      plant(`impossible DATE: 32 FEB ${birthYear}`);
      await write(`2 DATE 32 FEB ${birthYear}\n`);
    } else {
      await write(`2 DATE ${1 + (id % 28)} JAN ${birthYear}\n`);
    }

    await write(`2 PLAC ${place}\n`);
    await write("2 SOUR @S1@\n");
    await write(`3 PAGE Register ${birthYear}, entry ${id}\n`);

    if (id % 3 === 0) {
      await write("1 DEAT\n");
      await write(`2 DATE ${1 + (id % 28)} DEC ${birthYear + 60}\n`);
      await write(`2 PLAC ${place}\n`);
    }

    // A level that skips one.
    if (id === 7) {
      await write(`1 NOTE Note about person ${id}.\n`);
      plant("invalid-level: 3 where 2 is expected");
      await write("3 CONT continued at the wrong level\n");
    } else if (id % 5 === 0) {
      await write(
        `1 NOTE Note about person ${id}, of no particular interest.\n`,
      );
    }

    // An unknown tag that is not an underscore-prefixed extension.
    if (id === 9) {
      plant("VAL001 unknown tag NICKNAME in INDI");
      await write(`1 NICKNAME Nick${id}\n`);
    }

    // An extension tag used without declaring it in HEAD.SCHMA.
    if (id === 11) {
      plant("VAL008 extension tag _MYTAG without a SCHMA declaration");
      await write("1 _MYTAG something application-defined\n");
    }

    await write(`1 ${isSpouse ? "FAMS" : "FAMC"} @F${family}@\n`);

    // A pointer to a family that does not exist.
    if (id === 13) {
      plant("unresolved-xref: FAMS @F999999999@");
      await write("1 FAMS @F999999999@\n");
    }
  }

  await write(`0 @F${family}@ FAM\n`);
  await write(`1 HUSB @I${husband}@\n`);
  await write(`1 WIFE @I${wife}@\n`);
  for (const child of children) {
    await write(`1 CHIL @I${child}@\n`);
  }
  await write("1 MARR\n");
  await write(`2 DATE ${1 + (family % 28)} JUN ${1800 + (family % 120)}\n`);
  await write(`2 PLAC ${PLACES[family % PLACES.length]}\n`);
}

await write("0 TRLR\n");
out.end();
await once(out, "finish");

console.log(outArg);
console.log(
  `  ${(bytes / 1024 / 1024).toFixed(1)} MB, ${line} lines, ` +
    `${person} individuals, ${family} families`,
);
console.log(`  ${planted.length} deliberate errors:`);
for (const { line: at, what } of planted) {
  console.log(`    line ${at}: ${what}`);
}
