import { downloadName, isGedcomFileName } from "./documentSession";

export interface DownloadBrowser {
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
  click(url: string, fileName: string): void;
}

export async function readGedcomFile(
  file: File,
): Promise<{ fileName: string; text: string }> {
  if (!isGedcomFileName(file.name)) {
    throw new Error("Choose a .ged or .gedcom file");
  }
  return { fileName: file.name, text: await file.text() };
}

export function downloadGedcom(
  text: string,
  fileName: string,
  browser: DownloadBrowser = defaultDownloadBrowser,
): void {
  const url = browser.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  try {
    browser.click(url, downloadName(fileName));
  } finally {
    browser.revokeObjectURL(url);
  }
}

const defaultDownloadBrowser: DownloadBrowser = {
  createObjectURL: (blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
  click: (url, fileName) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
  },
};
