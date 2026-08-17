import { folderAccessAvailable } from "./folderGateway";

/** What the editor can offer, decided once rather than asked of `window` later. */
export interface WorkspaceSupport {
  folders: boolean;
  /** Named here so the explanation has one wording and one place. */
  reason: string | null;
}

export function detectWorkspaceSupport(
  browser?: Parameters<typeof folderAccessAvailable>[0],
): WorkspaceSupport {
  const folders = folderAccessAvailable(browser);
  return {
    folders,
    reason: folders
      ? null
      : "This browser cannot grant a folder to a page. Chrome, Edge and other Chromium browsers can; here you can open one file and download a copy.",
  };
}
