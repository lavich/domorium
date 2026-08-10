import { expect, test } from "vitest";
import * as byName from "@domorium/validator";
import * as bySource from "./packages/validator/src/index";

// Names #146: dropping the alias does not fail anything, it makes every suite
// check the last build of a workspace package and pass while doing it.
test("a workspace package resolves to its source", () => {
  expect(byName.GedcomDocument).toBe(bySource.GedcomDocument);
});
