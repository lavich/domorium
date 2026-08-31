import { describe, expect, it } from "vitest";

import { GedcomLanguageService } from "../../languageService";

const GEDCOM_7 = [
  "0 HEAD", //                    0
  "1 GEDC", //                    1
  "2 VERS 7.0", //                2
  "0 @I1@ INDI", //               3
  "1 NAME Homer /Simpson/", //    4
  "1 OBJE @O1@", //               5
  "2 CROP", //                    6
  "3 TOP 10", //                  7
  "3 LEFT 20", //                 8
  "3 HEIGHT 100", //              9
  "3 WIDTH 200", //              10
  "2 TITL Homer at the plant", // 11
  "1 FAMS @F1@", //              12
  "0 @O1@ OBJE", //              13
  "1 FILE media/family.jpg", //  14
  "2 FORM image/jpeg", //        15
  "2 TITL The Simpson family", //16
  "0 @F1@ FAM", //               17
  "1 HUSB @I1@", //              18
  "0 @I2@ INDI", //              19
  "1 OBJE @O1@", //              20
  "2 CROP", //                   21
  "3 TOP 40", //                 22
  "3 LEFT 50", //                23
  "3 HEIGHT 60", //              24
  "3 WIDTH 70", //               25
  "1 OBJE @O9@", //              26
  "1 OBJE @F1@", //              27
  "1 OBJE @O2@", //              28
  "0 @O2@ OBJE", //              29
  "0 TRLR", //                   30
].join("\n");

const GEDCOM_551 = [
  "0 HEAD", //                     0
  "1 GEDC", //                     1
  "2 VERS 5.5.1", //               2
  "1 CHAR UTF-8", //               3
  "1 FILE tree.ged", //            4
  "0 @I1@ INDI", //                5
  "1 OBJE", //                     6
  "2 FILE photos/marie.jpg", //    7
  "3 FORM jpg", //                 8
  "2 TITL Marie in 1912", //       9
  "0 @M1@ OBJE", //               10
  "1 FILE photos/wedding.tif", // 11
  "2 FORM tif", //                12
  "2 TITL The wedding", //        13
  "0 @I2@ INDI", //               14
  "1 OBJE @M1@", //               15
  "2 CROP", //                    16
  "3 TOP 5", //                   17
  "3 LEFT 5", //                  18
  "3 HEIGHT 50", //               19
  "3 WIDTH 50", //                20
  "0 TRLR", //                    21
].join("\n");

const GEDCOM_7_CROPS = [
  "0 HEAD", //                    0
  "1 GEDC", //                    1
  "2 VERS 7.0", //                2
  "0 @I1@ INDI", //               3
  "1 OBJE @O1@", //               4
  "2 CROP", //                    5
  "3 TOP 10", //                  6
  "3 LEFT 20", //                 7
  "3 HEIGHT 0", //                8
  "3 WIDTH 200", //               9
  "1 OBJE @O1@", //              10
  "2 CROP", //                   11
  "3 TOP 10", //                 12
  "3 HEIGHT 100", //             13
  "1 OBJE @O1@", //              14
  "2 CROP", //                   15
  "3 TOP abc", //                16
  "3 HEIGHT 100", //             17
  "3 WIDTH 200", //              18
  "1 OBJE @O2@", //              19
  "2 CROP", //                   20
  "3 TOP 10", //                 21
  "3 LEFT 20", //                22
  "3 HEIGHT 100", //             23
  "3 WIDTH 200", //              24
  "0 @O1@ OBJE", //              25
  "1 FILE media/one.jpg", //     26
  "2 FORM image/jpeg", //        27
  "0 @O2@ OBJE", //              28
  "1 FILE media/first.jpg", //   29
  "2 FORM image/jpeg", //        30
  "1 FILE media/second.jpg", //  31
  "2 FORM image/jpeg", //        32
  "0 TRLR", //                   33
].join("\n");

const service7 = new GedcomLanguageService(GEDCOM_7);
const service551 = new GedcomLanguageService(GEDCOM_551);

/** The payload begins one space past the tag, on every line of a GEDCOM file. */
const payloadStart = (line: string): number =>
  line.indexOf(" ", line.indexOf(" ") + 1) + 1;

const ON_FILE_7 = { line: 14, character: 10 };
const FILE_RANGE_7 = {
  start: { line: 14, character: payloadStart("1 FILE media/family.jpg") },
  end: { line: 14, character: "1 FILE media/family.jpg".length },
};

describe("the media a file payload names", () => {
  it("answers with the file, how to read it, what it is, and its caption", () => {
    expect(service7.getMediaAt(ON_FILE_7)).toEqual({
      targetText: "media/family.jpg",
      kind: "file-relative",
      range: FILE_RANGE_7,
      mediaKind: "image",
      title: "The Simpson family",
    });
  });

  it("names no rectangle, which belongs to a link and not to a file", () => {
    expect(service7.getMediaAt(ON_FILE_7)?.crop).toBeUndefined();
  });

  it("answers for the inline form GEDCOM 5.5.1 permits", () => {
    expect(service551.getMediaAt({ line: 7, character: 12 })).toEqual({
      targetText: "photos/marie.jpg",
      kind: "file-relative",
      range: {
        start: { line: 7, character: payloadStart("2 FILE photos/marie.jpg") },
        end: { line: 7, character: "2 FILE photos/marie.jpg".length },
      },
      mediaKind: "image",
      title: "Marie in 1912",
    });
  });

  it("answers for a file in a 5.5.1 multimedia record", () => {
    expect(service551.getMediaAt({ line: 11, character: 12 })).toMatchObject({
      targetText: "photos/wedding.tif",
      mediaKind: "image",
      title: "The wedding",
    });
  });
});

describe("the media a multimedia link names", () => {
  it("answers with the file of the record the pointer names", () => {
    expect(service7.getMediaAt({ line: 5, character: 9 })).toMatchObject({
      targetText: "media/family.jpg",
      kind: "file-relative",
      range: FILE_RANGE_7,
      mediaKind: "image",
    });
  });

  it("reads the rectangle and the caption from the link, not from the record", () => {
    expect(service7.getMediaAt({ line: 5, character: 9 })).toEqual({
      targetText: "media/family.jpg",
      kind: "file-relative",
      range: FILE_RANGE_7,
      mediaKind: "image",
      title: "Homer at the plant",
      crop: { top: 10, left: 20, height: 100, width: 200 },
    });
  });

  // The case #189 exists for: one photograph, two people, two rectangles.
  it("answers with its own rectangle and the same file for each of two links", () => {
    const first = service7.getMediaAt({ line: 5, character: 9 });
    const second = service7.getMediaAt({ line: 20, character: 9 });

    expect(first?.crop).toEqual({ top: 10, left: 20, height: 100, width: 200 });
    expect(second?.crop).toEqual({ top: 40, left: 50, height: 60, width: 70 });
    expect(second?.targetText).toBe(first?.targetText);
  });

  it("falls back to the caption of the file where the link carries none", () => {
    expect(service7.getMediaAt({ line: 20, character: 9 })?.title).toBe(
      "The Simpson family",
    );
  });

  it("has no answer where the pointer resolves to no record", () => {
    expect(service7.getMediaAt({ line: 26, character: 9 })).toBeNull();
  });

  it("has no answer where the pointer resolves to a record that is not media", () => {
    expect(service7.getMediaAt({ line: 27, character: 9 })).toBeNull();
  });

  it("has no answer where the record carries no file", () => {
    expect(service7.getMediaAt({ line: 28, character: 9 })).toBeNull();
  });
});

describe("a rectangle that cannot be applied", () => {
  const service = new GedcomLanguageService(GEDCOM_7_CROPS);
  const ON_ZERO_EXTENT = { line: 4, character: 9 };
  const ON_ABSENT_WIDTH = { line: 10, character: 9 };
  const ON_TWO_FILES = { line: 19, character: 9 };

  it("is not named where its height is zero, and the file still is", () => {
    expect(service.getMediaAt(ON_ZERO_EXTENT)).toEqual({
      targetText: "media/one.jpg",
      kind: "file-relative",
      range: {
        start: { line: 26, character: payloadStart("1 FILE media/one.jpg") },
        end: { line: 26, character: "1 FILE media/one.jpg".length },
      },
      mediaKind: "image",
    });
  });

  it("is not named where its width is absent, and the file still is", () => {
    expect(service.getMediaAt(ON_ABSENT_WIDTH)?.crop).toBeUndefined();
    expect(service.getMediaAt(ON_ABSENT_WIDTH)?.targetText).toBe(
      "media/one.jpg",
    );
  });

  it("is not named where the record carries several files", () => {
    const answer = service.getMediaAt(ON_TWO_FILES);

    expect(answer?.targetText).toBe("media/first.jpg");
    expect(answer?.crop).toBeUndefined();
    expect(answer).not.toHaveProperty("crop");
  });

  it("is not named in GEDCOM 5.5.1, whose specification describes none", () => {
    const answer = service551.getMediaAt({ line: 15, character: 9 });

    expect(answer?.targetText).toBe("photos/wedding.tif");
    expect(answer).not.toHaveProperty("crop");
  });

  it("answers rather than raising where a number is not one", () => {
    expect(service.getMediaAt({ line: 14, character: 9 })).toMatchObject({
      targetText: "media/one.jpg",
      crop: { top: 0, left: 0, height: 100, width: 200 },
    });
  });
});

describe("a position that refers to no media", () => {
  it("has no answer on a header line", () => {
    expect(service7.getMediaAt({ line: 0, character: 3 })).toBeNull();
    expect(service7.getMediaAt({ line: 2, character: 8 })).toBeNull();
  });

  it("has no answer for HEAD.FILE, which names the transmission and not media", () => {
    expect(service551.getMediaAt({ line: 4, character: 10 })).toBeNull();
  });

  it("has no answer on a name line", () => {
    expect(service7.getMediaAt({ line: 4, character: 12 })).toBeNull();
  });

  it("has no answer on a pointer to a person", () => {
    expect(service7.getMediaAt({ line: 18, character: 9 })).toBeNull();
  });

  // The set of files this answers for is the set getDocumentLinks answers for.
  it("has no answer for a payload GEDCOM 7 cannot carry", () => {
    const service = new GedcomLanguageService(
      [
        "0 HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "0 @O1@ OBJE",
        "1 FILE ../photos/marie.jpg",
        "2 FORM image/jpeg",
        "0 TRLR",
      ].join("\n"),
    );

    expect(service.getMediaAt({ line: 4, character: 12 })).toBeNull();
    expect(service.getDocumentLinks()).toEqual([]);
  });
});
