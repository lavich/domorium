// The two comment checks from issue #142 and the diff arithmetic that says which
// lines are new, kept apart from the git plumbing in `check-comments.mjs` so they
// can be tested against strings.

import { extname } from "node:path";

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".kt",
  ".kts",
]);

const STOP_WORDS = new Set(
  "a about above after all also an and any are as at back be because been before being below beyond both but by can cannot could did do does doing done down each either else even ever every for from further had has have having here how however if in instead into is it its itself just may might more most much must neither never no none nor not of off on once one only onto or other others our out over own per rather same shall should since so some still such than that the their them then there these they this those though through to too under until up upon very was we well were what when where whether which while who whose why will with within without would yet".split(
    " ",
  ),
);

const DECLARATION = new RegExp(
  "^(?:export\\s+)?(?:default\\s+)?(?:declare\\s+)?" +
    "(?:(?:public|private|protected|static|readonly|abstract|override|async|get|set)\\s+)*" +
    "(?:(?:function|class|interface|type|enum|const|let|var)\\s+)?" +
    "([A-Za-z_$][A-Za-z0-9_$]*)",
);

const DECLARES =
  /\b(?:function|class|interface|type|enum|const|let|var|public|private|protected|static|readonly|abstract|override)\b/;

const COMMENT_LINE = /^\s*(\/\/|\/\*|\*)/;
const OPENS_BLOCK = /^\s*\/\*/;
const CLOSES_BLOCK = /\*\//;

/** Own-line comments only: a `//` inside a string literal is not one of these. */
export function commentBlocks(source) {
  const lines = source.split("\n");
  const blocks = [];
  let open = null;
  let inBlockComment = false;

  lines.forEach((text, index) => {
    const line = index + 1;
    const isComment = inBlockComment || COMMENT_LINE.test(text);
    if (inBlockComment && CLOSES_BLOCK.test(text)) {
      inBlockComment = false;
    } else if (
      !inBlockComment &&
      OPENS_BLOCK.test(text) &&
      !CLOSES_BLOCK.test(text)
    ) {
      inBlockComment = true;
    }

    if (!isComment) {
      open = null;
      return;
    }
    if (open && open.end === line - 1) {
      open.end = line;
      open.lines.push(text);
      return;
    }
    open = { start: line, end: line, lines: [text] };
    blocks.push(open);
  });

  return blocks.map((block) => ({ ...block, text: block.lines.join("\n") }));
}

export function identifierTokens(identifier) {
  return identifier
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^A-Za-z]+/)
    .map((token) => token.toLowerCase())
    .filter(Boolean);
}

export function declaredName(line) {
  const text = line.trim();
  if (!DECLARES.test(text)) {
    return null;
  }
  const name = DECLARATION.exec(text)?.[1] ?? null;
  return name && DECLARES.test(name) ? null : name;
}

export function contentWords(text) {
  const prose = text
    .replace(/^\s*(\/\*+|\*+\/|\*|\/\/)/gm, " ")
    .replace(/\*\/\s*$/gm, " ");
  return prose
    .split(/[^A-Za-z]+/)
    .map((word) => word.toLowerCase())
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

function mentions(word, tokens) {
  return tokens.some(
    (token) =>
      token === word ||
      (word.length >= 4 &&
        token.length >= 4 &&
        (token.startsWith(word) || word.startsWith(token))),
  );
}

export function restatement(block, lines) {
  const below = lines[block.end] ?? "";
  const name = declaredName(below);
  if (!name) {
    return null;
  }
  const words = contentWords(block.text);
  if (words.length < 3) {
    return null;
  }
  const tokens = identifierTokens(name);
  const said = words.filter((word) => mentions(word, tokens));
  return { name, ratio: said.length / words.length, words: words.length };
}

// Not 1: no docblock the cleanups of issue #142 removed said the whole of its
// name, and 0.3 reaches comments that are still in the tree.
export const DEFAULTS = { maxLines: 4, restatementRatio: 0.4 };

export function findings(source, options = {}) {
  const { maxLines, restatementRatio } = { ...DEFAULTS, ...options };
  const lines = source.split("\n");
  const found = [];

  for (const block of commentBlocks(source)) {
    const restated = restatement(block, lines);
    if (restated && restated.ratio >= restatementRatio) {
      found.push({
        line: block.start,
        end: block.end,
        rule: "restates-name",
        message:
          `${Math.round(restated.ratio * 100)}% of this comment is already in ` +
          `\`${restated.name}\``,
      });
    }
    const length = block.end - block.start + 1;
    if (length > maxLines) {
      found.push({
        line: block.start,
        end: block.end,
        rule: "long-comment",
        message: `${length} lines: as short as the rule it states?`,
      });
    }
  }

  return found.sort((a, b) => a.line - b.line || a.rule.localeCompare(b.rule));
}

export function addedLines(unifiedDiff) {
  const byFile = new Map();
  let current = null;
  for (const line of unifiedDiff.split("\n")) {
    if (line.startsWith("+++ ")) {
      const path = line.slice(4);
      current = path === "/dev/null" ? null : path.replace(/^b\//, "");
      if (current && !SOURCE_EXTENSIONS.has(extname(current))) {
        current = null;
      }
      continue;
    }
    if (!current || !line.startsWith("@@")) {
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (!hunk) {
      continue;
    }
    const start = Number(hunk[1]);
    const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
    const lines = byFile.get(current) ?? new Set();
    for (let n = start; n < start + count; n += 1) {
      lines.add(n);
    }
    byFile.set(current, lines);
  }
  return byFile;
}
