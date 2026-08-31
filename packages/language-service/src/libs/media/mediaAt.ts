import {
  TokenNames,
  type ASTNode,
  type GedcomDialect,
} from "@domorium/validator";

import type { MediaCrop, MediaReference, Position } from "../../types";
import { fileLinkKind } from "../links/documentLinks";
import { isPositionInRange } from "../position/position";
import type { ReferenceIndex } from "../references/referenceIndex";
import { mediaKind } from "./mediaKind";

export interface MediaAtInput {
  nodes: ASTNode[];
  index: ReferenceIndex;
  dialect: GedcomDialect | undefined;
}

/**
 * The media one position refers to, or nothing.
 *
 * A file is media only beneath a multimedia record or link: `HEAD.FILE` names
 * the transmission itself.
 */
export const mediaAt = (
  input: MediaAtInput,
  position: Position,
): MediaReference | null => {
  const record = rootAtLine(input.nodes, position.line);
  if (!record) {
    return null;
  }
  const file = fileWithPayloadAt(record, position);
  if (file) {
    return fileReference(file, input.dialect);
  }
  return linkReference(input, record, position);
};

/**
 * A link answers with the file of the record it names, and with the rectangle
 * and caption written beneath the link itself — two links to one photograph
 * name two different rectangles.
 */
const linkReference = (
  { nodes, index, dialect }: MediaAtInput,
  record: ASTNode,
  position: Position,
): MediaReference | null => {
  const occurrence = index.at(position);
  if (occurrence?.fieldTag !== "OBJE") {
    return null;
  }
  const link = linkWithPointerAt(record, position);
  const [declaration] = index.get(occurrence.id)?.declarations ?? [];
  if (!link || !declaration) {
    return null;
  }
  const target = rootAtLine(nodes, declaration.range.start.line);
  if (!target || tagOf(target) !== "OBJE") {
    return null;
  }
  const files = target.children.filter((child) => tagOf(child) === "FILE");
  const reference = files[0] && fileReference(files[0], dialect);
  if (!reference) {
    return null;
  }
  const title = childText(link, "TITL") ?? reference.title;
  // Several files, and the format does not say which the rectangle is of.
  const crop = files.length === 1 ? cropOf(link, dialect) : undefined;
  return {
    ...reference,
    ...(title === undefined ? {} : { title }),
    ...(crop === undefined ? {} : { crop }),
  };
};

/**
 * A rectangle only where it can be applied: GEDCOM 5.5.1 describes none, and
 * one without an extent names nothing a host could crop to.
 */
const cropOf = (
  link: ASTNode,
  dialect: GedcomDialect | undefined,
): MediaCrop | undefined => {
  if (dialect !== "7.0") {
    return undefined;
  }
  const crop = childNode(link, "CROP");
  const height = crop && pixelsOf(crop, "HEIGHT");
  const width = crop && pixelsOf(crop, "WIDTH");
  if (!crop || !height || !width) {
    return undefined;
  }
  return {
    top: pixelsOf(crop, "TOP") ?? 0,
    left: pixelsOf(crop, "LEFT") ?? 0,
    height,
    width,
  };
};

/** A number that is not one is the validator's to report, not ours to throw on. */
const pixelsOf = (node: ASTNode, tag: string): number | undefined => {
  const text = childText(node, tag);
  if (text === undefined) {
    return undefined;
  }
  const pixels = Number(text);
  return Number.isInteger(pixels) && pixels >= 0 ? pixels : undefined;
};

/**
 * Records are level-0 structures in document order and cannot overlap, so the
 * one holding a line is a search rather than a walk of the whole document.
 */
const rootAtLine = (nodes: ASTNode[], line: number): ASTNode | undefined => {
  let low = 0;
  let high = nodes.length - 1;
  let candidate = -1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    if (nodes[middle].range.start.line <= line) {
      candidate = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  if (candidate < 0) {
    return undefined;
  }
  const root = nodes[candidate];
  return root.range.end.line >= line ? root : undefined;
};

const fileWithPayloadAt = (
  node: ASTNode,
  position: Position,
): ASTNode | undefined => {
  if (isMediaFile(node)) {
    const value = node.tokens[TokenNames.VALUE];
    if (value && isPositionInRange(position, value.range)) {
      return node;
    }
  }
  for (const child of node.children) {
    const match = fileWithPayloadAt(child, position);
    if (match) {
      return match;
    }
  }
  return undefined;
};

const isMediaFile = (node: ASTNode): boolean =>
  tagOf(node) === "FILE" && tagOf(node.parent) === "OBJE";

const linkWithPointerAt = (
  node: ASTNode,
  position: Position,
): ASTNode | undefined => {
  const xref = node.tokens[TokenNames.XREF];
  if (
    tagOf(node) === "OBJE" &&
    xref &&
    isPositionInRange(position, xref.range)
  ) {
    return node;
  }
  for (const child of node.children) {
    const match = linkWithPointerAt(child, position);
    if (match) {
      return match;
    }
  }
  return undefined;
};

const fileReference = (
  file: ASTNode,
  dialect: GedcomDialect | undefined,
): MediaReference | null => {
  const value = file.tokens[TokenNames.VALUE];
  const targetText = value?.value.trim();
  if (!value || !targetText) {
    return null;
  }
  const kind = fileLinkKind(targetText, dialect);
  if (!kind) {
    return null;
  }
  const title = captionOf(file);
  return {
    targetText,
    kind,
    range: value.range,
    mediaKind: mediaKind(childText(file, "FORM"), targetText, dialect),
    ...(title === undefined ? {} : { title }),
  };
};

/**
 * The caption beneath the file, or the one beside it: the inline form GEDCOM
 * 5.5.1 permits puts TITL under the link rather than under the FILE.
 */
const captionOf = (file: ASTNode): string | undefined => {
  const own = childText(file, "TITL");
  if (own !== undefined) {
    return own;
  }
  const link = file.parent;
  return link && link.level > 0 ? childText(link, "TITL") : undefined;
};

const childNode = (node: ASTNode, tag: string): ASTNode | undefined =>
  node.children.find((child) => tagOf(child) === tag);

const childText = (node: ASTNode, tag: string): string | undefined => {
  const value = childNode(node, tag)?.tokens[TokenNames.VALUE]?.value.trim();
  return value ? value : undefined;
};

const tagOf = (node: ASTNode | undefined): string | undefined =>
  node?.tokens[TokenNames.TAG]?.value;
