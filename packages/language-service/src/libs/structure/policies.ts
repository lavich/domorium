import { resolveValue, type ASTNode } from "@domorium/validator";

import type {
  StructureChildInput,
  StructureInput,
  TextEdit,
} from "../../types";

interface Policy {
  onAdd?: (input: StructureInput) => StructureInput;
  onSet?: (parent: ASTNode, node: ASTNode, value: string) => TextEdit[];
}

const valuesOf = (children: StructureChildInput[] | undefined, tag: string) =>
  (children ?? [])
    .filter((child) => child.tag === tag && child.value)
    .map((child) => child.value as string)
    .join(" ")
    .replaceAll(",", " ")
    .replace(/\s+/g, " ")
    .trim();

function composedName(input: StructureInput): string | undefined {
  const given = valuesOf(input.children, "GIVN");
  const surname = valuesOf(input.children, "SURN");
  if (!given && !surname) {
    return undefined;
  }
  return [given, surname && `/${surname}/`].filter(Boolean).join(" ");
}

function wordIndex(text: string, word: string): number {
  if (!word) {
    return -1;
  }
  for (
    let from = text.indexOf(word);
    from >= 0;
    from = text.indexOf(word, from + 1)
  ) {
    const after = text[from + word.length];
    if (
      !/[\p{L}\p{N}]/u.test(text[from - 1] ?? "") &&
      !/[\p{L}\p{N}]/u.test(after ?? "")
    ) {
      return from;
    }
  }
  return -1;
}

const SLASHED = /^([^/]*)\/([^/]*)\/(.*)$/s;

function renamedPayload(
  payload: string,
  part: string,
  oldValue: string,
  newValue: string,
): string | undefined {
  const slashed = SLASHED.exec(payload);
  if (part === "SURN") {
    return slashed && slashed[2] === oldValue
      ? `${slashed[1]}/${newValue}/${slashed[3]}`
      : undefined;
  }
  const before = slashed ? slashed[1] : payload;
  const index = wordIndex(before, oldValue);
  if (index < 0) {
    return undefined;
  }
  const given =
    before.slice(0, index) + newValue + before.slice(index + oldValue.length);
  return slashed ? `${given}/${slashed[2]}/${slashed[3]}` : given;
}

const name: Policy = {
  onAdd: (input) =>
    input.value || input.pointer
      ? input
      : { ...input, value: composedName(input) ?? input.value },
  onSet: (parent, node, value) => {
    const part = node.tokens.TAG?.value;
    const token = parent.tokens.VALUE;
    const hasContinuation = parent.children.some((child) =>
      ["CONT", "CONC"].includes(child.tokens.TAG?.value ?? ""),
    );
    if ((part !== "GIVN" && part !== "SURN") || !token || hasContinuation) {
      return [];
    }
    if (value.includes("/")) {
      return [];
    }
    const next = renamedPayload(
      resolveValue(parent),
      part,
      resolveValue(node),
      value,
    );
    return next === undefined ? [] : [{ range: token.range, newText: next }];
  },
};

const registry = new Map<string, Policy>([["INDI.NAME", name]]);

export const policyFor = (path: readonly string[]): Policy | undefined =>
  registry.get(path.join("."));
