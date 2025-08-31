import { Range } from "./position";

export interface GedcomError {
  code: string;
  message: string;
  hint?: string;
  range: Range;
  level: "error" | "warning" | "info";
}
