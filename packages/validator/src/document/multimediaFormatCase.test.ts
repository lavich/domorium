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

  test("still rejects a format the specification does not have", () => {
    expect(
      val005(`${header}0 @O1@ OBJE\n1 FILE p.png\n2 FORM png\n0 TRLR\n`),
    ).toHaveLength(1);
    expect(
      val005(`${header}0 @O1@ OBJE\n1 FILE p.PNG\n2 FORM PNG\n0 TRLR\n`),
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
