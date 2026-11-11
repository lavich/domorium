import type { GedcomError } from "./errors";

export type PayloadKind =
  | {
      kind:
        | "text"
        | "integer"
        | "boolean"
        | "date"
        | "date-period"
        | "date-exact"
        | "time"
        | "age"
        | "language-tag"
        | "media-type"
        | "latitude"
        | "longitude"
        | "personal-name"
        | "tag-definition"
        | "none";
    }
  | { kind: "enum"; values: string[]; multiple: boolean }
  | { kind: "pointer" | "text-or-pointer"; to: string };

export interface StructureField {
  tag: string;
  schemaId: string;
  min: number;
  max: number | null;
  payload: PayloadKind;
  payloadRequired: boolean;
  lineBreaks: boolean;
  prose: boolean;
}

export interface StructureShape {
  schemaId: string;
  payload: PayloadKind;
  payloadRequired: boolean;
  lineBreaks: boolean;
  prose: boolean;
  fields: StructureField[];
}

export interface PayloadProblem {
  code: string;
  message: string;
  data?: GedcomError["data"];
  level: "error" | "warning" | "info";
}
