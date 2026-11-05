import { describe, expect, it } from "vitest";
import { endOfText, lines } from "./lineTerminators";

describe("endOfText", () => {
  it.each([
    "",
    "0 HEAD",
    "0 HEAD\n",
    "0 HEAD\r\n1 GEDC",
    "0 HEAD\r\n1 GEDC\r\n",
    "a\n\rb\n\r",
    "a\rb\r",
    "a\n\nb\r\r\nc\n\r\rd",
    "\n",
    "\r\n\r\n",
  ])("agrees with splitting into lines for %j", (text) => {
    const all = lines(text);
    expect(endOfText(text)).toEqual({
      line: all.length - 1,
      character: all[all.length - 1].length,
    });
  });
});
