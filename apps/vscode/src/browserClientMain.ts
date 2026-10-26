import {
  ExtensionContext,
  FileType,
  Uri,
  window,
  workspace,
  type FileRenameEvent,
} from "vscode";
import { LanguageClientOptions } from "vscode-languageclient";

import { LanguageClient } from "vscode-languageclient/browser";

import { countMentioning, scanAfterRenames } from "./closedDocuments";
import { GEDCOM_DOCUMENTS } from "./documentSelector";

let client: LanguageClient | undefined;

export async function activate(context: ExtensionContext) {
  const clientOptions: LanguageClientOptions = {
    documentSelector: GEDCOM_DOCUMENTS,
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher("**/*.ged"),
    },
    initializationOptions: {},
  };

  client = createWorkerLanguageClient(context, clientOptions);
  context.subscriptions.push(
    workspace.onDidRenameFiles(warnAboutClosedDocuments),
  );

  await client.start();
}

const SHOWN_BY_NAME = 3;

const scanClosedDocuments = scanAfterRenames(
  async (paths, cancelled) => {
    const open = new Set(
      workspace.textDocuments
        .filter((document) => document.languageId === "gedcom")
        .map((document) => document.uri.toString()),
    );
    const closed = (
      await workspace.findFiles(
        "**/*.{ged,GED,gedcom,GEDCOM}",
        "**/node_modules/**",
      )
    ).filter((uri) => !open.has(uri.toString()));
    return countMentioning(readEach(closed), paths, cancelled);
  },
  (paths, found) => {
    const names = paths.map((path) => path.split("/").at(-1)).join(", ");
    const shown = found.slice(0, SHOWN_BY_NAME).join(", ");
    const more =
      found.length > SHOWN_BY_NAME
        ? ` and ${found.length - SHOWN_BY_NAME} more`
        : "";
    void window.showWarningMessage(
      `GEDCOM files not open as GEDCOM may still name ${names}: ${shown}${more}. Only open GEDCOM documents are updated.`,
    );
  },
);

function* readEach(uris: Uri[]) {
  for (const uri of uris) {
    yield [workspace.asRelativePath(uri), workspace.fs.readFile(uri)] as const;
  }
}

async function warnAboutClosedDocuments(event: FileRenameEvent) {
  const paths: string[] = [];
  for (const { oldUri, newUri } of event.files) {
    try {
      if ((await workspace.fs.stat(newUri)).type & FileType.File) {
        paths.push(oldUri.path);
      }
    } catch {
      continue;
    }
  }
  if (paths.length > 0) {
    await scanClosedDocuments(paths);
  }
}

export async function deactivate(): Promise<void> {
  if (client !== undefined) {
    await client.stop();
  }
}

function createWorkerLanguageClient(
  context: ExtensionContext,
  clientOptions: LanguageClientOptions,
) {
  const serverMain = Uri.joinPath(
    context.extensionUri,
    "dist/server/browserServerMain.js",
  );
  const worker = new Worker(serverMain.toString(true));

  return new LanguageClient(
    "gedcomLanguageServer",
    "GEDCOM Language Server",
    worker,
    clientOptions,
  );
}
