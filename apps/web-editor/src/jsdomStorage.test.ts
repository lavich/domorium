// @vitest-environment jsdom

import { expect, test } from "vitest";

// Written for #54. Nothing else in the suite names the execArgv flag that puts
// this storage here, so this is what fails if it stops reaching the workers.
test("jsdom's localStorage reaches the global", () => {
  localStorage.setItem("gedcom", "7.0");
  expect(localStorage.getItem("gedcom")).toBe("7.0");

  localStorage.clear();
  expect(localStorage.length).toBe(0);
});
