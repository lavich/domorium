import type { GedcomDialect } from "@domorium/validator";
import type { MediaKind } from "../../types";

/**
 * The formats GEDCOM 5.5.1 permits, and nothing else: its `FORM` is a closed
 * list (enumset-MULTIMEDIA_FORMAT), not a media type. `ole` is an embedded
 * object, which names no medium a host can show.
 */
export const GEDCOM_551_FORMAT_KINDS: Record<string, MediaKind> = {
  bmp: "image",
  gif: "image",
  jpg: "image",
  ole: "unknown",
  pcx: "image",
  tif: "image",
  wav: "audio",
};

const EXTENSION_KINDS: Record<string, MediaKind> = {
  avi: "video",
  avif: "image",
  bmp: "image",
  doc: "document",
  docx: "document",
  flac: "audio",
  gif: "image",
  heic: "image",
  htm: "document",
  html: "document",
  jpeg: "image",
  jpg: "image",
  m4a: "audio",
  m4v: "video",
  md: "document",
  mkv: "video",
  mov: "video",
  mp3: "audio",
  mp4: "video",
  mpeg: "video",
  mpg: "video",
  odt: "document",
  oga: "audio",
  ogg: "audio",
  pcx: "image",
  pdf: "document",
  png: "image",
  rtf: "document",
  svg: "image",
  tif: "image",
  tiff: "image",
  txt: "document",
  wav: "audio",
  webm: "video",
  webp: "image",
  wma: "audio",
  wmv: "video",
};

const DOCUMENT_MEDIA_SUBTYPES = new Set(["epub+zip", "msword", "pdf", "rtf"]);

const DOCUMENT_MEDIA_SUBTYPE_FAMILIES = [
  "vnd.oasis.opendocument",
  "vnd.openxmlformats-officedocument",
];

/**
 * What the document says the file is. A declared format the dialect describes
 * settles it; the extension is the last resort, so `ole` stays unknown even on
 * a path ending `.jpg`.
 */
export const mediaKind = (
  declaredFormat: string | undefined,
  path: string,
  dialect: GedcomDialect | undefined,
): MediaKind => {
  const declared = declaredFormat?.trim().toLowerCase();
  if (declared) {
    const kind =
      dialect === "7.0"
        ? mediaTypeKind(declared)
        : GEDCOM_551_FORMAT_KINDS[declared];
    if (kind) {
      return kind;
    }
  }
  return extensionKind(path);
};

const mediaTypeKind = (mediaType: string): MediaKind | undefined => {
  const [type, subtype] = mediaType.split(";")[0].trim().split("/");
  switch (type) {
    case "image":
    case "audio":
    case "video":
      return type;
    case "text":
      return "document";
    case "application":
      return documentSubtype(subtype) ? "document" : undefined;
    default:
      return undefined;
  }
};

const documentSubtype = (subtype: string | undefined): boolean =>
  subtype !== undefined &&
  (DOCUMENT_MEDIA_SUBTYPES.has(subtype) ||
    DOCUMENT_MEDIA_SUBTYPE_FAMILIES.some((family) =>
      subtype.startsWith(family),
    ));

const extensionKind = (path: string): MediaKind => {
  const name = path.split(/[?#]/u)[0].split(/[/\\]/u).pop() ?? "";
  const dot = name.lastIndexOf(".");
  const extension = dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
  return EXTENSION_KINDS[extension] ?? "unknown";
};
