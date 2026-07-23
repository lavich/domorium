import { Range } from "./position";

export interface GedcomError {
  code: string;
  message: string;
  hint?: string;
  data?: {
    xref?: string;
    requiredRecordTag?: string;
    expectedLevel?: number;
  };
  range: Range;
  level: "error" | "warning" | "info";
}
