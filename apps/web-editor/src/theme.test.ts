import { describe, expect, it } from "vitest";

import { nextTheme, THEME_ORDER } from "./theme";

describe("nextTheme", () => {
  it("cycles through every choice and comes back to the first", () => {
    expect(nextTheme("system")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("system");
  });

  it("reads anything it does not recognise as the system choice", () => {
    expect(nextTheme(null)).toBe("light");
    expect(nextTheme("sepia")).toBe("light");
  });

  it("offers the same three choices the editor's menu does", () => {
    expect([...THEME_ORDER].sort()).toEqual(["dark", "light", "system"]);
  });
});
