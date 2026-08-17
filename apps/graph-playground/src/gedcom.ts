import { GedcomDocument, type ASTNode } from "@domorium/validator";
import { buildGraph, type Graph, type Person, type PersonId } from "./graph";

// GEDCOM keeps the two halves of a family apart: an INDI record says who somebody is,
// a FAM record says who married whom and which children came of it. So parents and
// partners are read off the families, never off the people.
export function readGedcom(text: string): Graph {
  const records = new GedcomDocument().createDocument(text).getNodes();
  const people = new Map<PersonId, Person>();
  const parents = new Map<PersonId, PersonId[]>();
  const partners = new Map<PersonId, PersonId[]>();

  for (const record of records.filter(tagged("INDI"))) {
    const id = record.tokens.POINTER?.value;
    if (id !== undefined) {
      people.set(id, { id, ...nameOf(record), parents: [], partners: [] });
    }
  }

  for (const family of records.filter(tagged("FAM"))) {
    const spouses = [
      ...pointers(family, "HUSB"),
      ...pointers(family, "WIFE"),
    ].filter((id) => people.has(id));

    for (const spouse of spouses) {
      for (const other of spouses) {
        if (other !== spouse) {
          partners.set(spouse, [...(partners.get(spouse) ?? []), other]);
        }
      }
    }
    for (const child of pointers(family, "CHIL").filter((id) =>
      people.has(id),
    )) {
      parents.set(child, [...(parents.get(child) ?? []), ...spouses]);
    }
  }

  return buildGraph(
    [...people.values()].map((person) => ({
      ...person,
      parents: parents.get(person.id) ?? [],
      partners: partners.get(person.id) ?? [],
    })),
  );
}

const tagged =
  (tag: string) =>
  (node: ASTNode): boolean =>
    node.tokens.TAG?.value === tag && node.tokens.POINTER !== undefined;

const pointers = (record: ASTNode, tag: string): PersonId[] =>
  record.children
    .filter((child) => child.tokens.TAG?.value === tag)
    .map((child) => child.tokens.XREF?.value)
    .filter((xref): xref is string => xref !== undefined);

// `Abraham /Simpson/` — the slashes mark the surname wherever it falls, which is the
// only part of the name shape worth honouring here. A record with no NAME is still a
// person, so the xref stands in for one.
function nameOf(record: ASTNode): { name: string; lineage: string } {
  const written = record.children.find(
    (child) => child.tokens.TAG?.value === "NAME",
  )?.tokens.VALUE?.value;
  if (written === undefined) {
    const id = record.tokens.POINTER?.value ?? "?";
    return { name: id, lineage: id };
  }
  const surname = /\/([^/]*)\//.exec(written)?.[1] ?? "";
  return {
    name: written
      .replace(/\/([^/]*)\//, "$1")
      .replace(/\s+/g, " ")
      .trim(),
    lineage: surname === "" ? "—" : surname,
  };
}
