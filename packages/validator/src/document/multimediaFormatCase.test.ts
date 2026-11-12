import { describe, expect, test } from "vitest";
import { GedcomDocument } from "./gedcomDocument";

const header = `0 HEAD
1 SOUR X
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
`;
const val005 = (text: string) =>
  new GedcomDocument()
    .createDocument(text)
    .getErrors()
    .filter((error) => error.code === "VAL005")
    .map((error) => error.message);

describe("a 5.5.1 multimedia format is read without regard to case", () => {
  test("accepts the spelling an export writes", () => {
    expect(
      val005(`${header}0 @O1@ OBJE\n1 FILE p.JPG\n2 FORM JPG\n0 TRLR\n`),
    ).toEqual([]);
    expect(
      val005(`${header}0 @O1@ OBJE\n1 FILE p.tif\n2 FORM TIF\n0 TRLR\n`),
    ).toEqual([]);
  });

  test("still rejects a format that names no file format", () => {
    expect(
      val005(`${header}0 @O1@ OBJE\n1 FILE p.png\n2 FORM jgp\n0 TRLR\n`),
    ).toHaveLength(1);
    expect(
      val005(`${header}0 @O1@ OBJE\n1 FILE p.png\n2 FORM NONSENSE\n0 TRLR\n`),
    ).toHaveLength(1);
  });

  test("holds an LDS status to its own case", () => {
    expect(
      val005(`${header}0 @I1@ INDI\n1 BAPL\n2 STAT COMPLETED\n0 TRLR\n`),
    ).toEqual([]);
    expect(
      val005(`${header}0 @I1@ INDI\n1 BAPL\n2 STAT completed\n0 TRLR\n`),
    ).toHaveLength(1);
  });
});

const formProblems = (text: string) =>
  new GedcomDocument()
    .createDocument(text)
    .getErrors()
    .filter((error) => error.code === "VAL005" || error.code === "VAL021")
    .map(({ code, level, data }) => ({ code, level, data }));

describe("a 5.5.1 multimedia format outside the list", () => {
  const medium = (form: string) =>
    `${header}0 @O1@ OBJE\n1 FILE p\n2 FORM ${form}\n0 TRLR\n`;

  test("is a warning where it names a known file extension", () => {
    expect(formProblems(medium("png"))).toEqual([
      { code: "VAL021", level: "warning", data: { tag: "FORM" } },
    ]);
    expect(formProblems(medium("PDF"))).toEqual([
      { code: "VAL021", level: "warning", data: { tag: "FORM" } },
    ]);
  });

  test("is tolerated beneath the file of a multimedia link too", () => {
    expect(
      formProblems(
        `${header}0 @I1@ INDI\n1 OBJE\n2 FILE p\n3 FORM mp4\n0 TRLR\n`,
      ),
    ).toEqual([{ code: "VAL021", level: "warning", data: { tag: "FORM" } }]);
  });

  test("is no problem where the list has it, in any case", () => {
    expect(formProblems(medium("jpg"))).toEqual([]);
    expect(formProblems(medium("JPG"))).toEqual([]);
  });

  test("leaves a 7.0 media type alone", () => {
    const seven = `0 HEAD\n1 GEDC\n2 VERS 7.0\n0 @O1@ OBJE\n1 FILE p.png\n2 FORM png\n0 TRLR\n`;

    expect(
      new GedcomDocument()
        .createDocument(seven)
        .getErrors()
        .map(({ code }) => code),
    ).toEqual(["VAL004"]);
  });

  test("is answered alike for a value about to be written", () => {
    const document = new GedcomDocument().createDocument(`${header}0 TRLR\n`);

    expect(document.checkPayload(["OBJE", "FILE"], "FORM", "jpeg")).toEqual([
      expect.objectContaining({ code: "VAL021", level: "warning" }),
    ]);
  });

  test("leaves every other enumeration as it was", () => {
    expect(
      formProblems(`${header}0 @I1@ INDI\n1 BAPL\n2 STAT png\n0 TRLR\n`),
    ).toEqual([{ code: "VAL005", level: "error", data: undefined }]);
  });
});
