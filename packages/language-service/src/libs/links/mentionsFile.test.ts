import { describe, expect, it } from "vitest";

import { mentionsFile } from "./mentionsFile";

describe("whether a GEDCOM text mentions a file by name", () => {
  it("finds the name as written at the end of a line", () => {
    expect(
      mentionsFile("0 @O1@ OBJE\n1 FILE photos/marie.jpg\n", "media/marie.jpg"),
    ).toBe(true);
  });

  it("finds the name as GEDCOM 7 escapes it, in either case of hex", () => {
    expect(
      mentionsFile("1 FILE media/my%20photo.jpg", "media/my photo.jpg"),
    ).toBe(true);
    expect(mentionsFile("1 FILE media/%c3%a9t%C3%A9.jpg", "été.jpg")).toBe(
      true,
    );
  });

  it("finds a 5.5.1 path written with backslashes", () => {
    expect(mentionsFile("1 FILE C:\\photos\\marie.jpg\r\n", "marie.jpg")).toBe(
      true,
    );
  });

  it("finds the name with spaces after it", () => {
    expect(mentionsFile("1 FILE marie.jpg  \n", "marie.jpg")).toBe(true);
  });

  it("does not take a longer name ending the same way", () => {
    expect(mentionsFile("1 FILE anne-marie.jpg", "marie.jpg")).toBe(false);
  });

  it("does not take the name in the middle of a line", () => {
    expect(mentionsFile("1 NOTE marie.jpg was scanned", "marie.jpg")).toBe(
      false,
    );
  });

  it("reads an escape that does not decode as its own characters", () => {
    expect(mentionsFile("1 FILE 100%.jpg", "100%.jpg")).toBe(true);
  });

  it("finds a 5.5.1 name that holds an escape literally", () => {
    expect(mentionsFile("1 FILE my%20photo.jpg", "my%20photo.jpg")).toBe(true);
  });

  it("decodes the escapes that decode beside one that does not", () => {
    expect(mentionsFile("1 FILE %C3%A9%E9.jpg", "é%E9.jpg")).toBe(true);
  });
});
