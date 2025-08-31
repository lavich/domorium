import { ExtensionContext, Uri, workspace } from "vscode";
import { LanguageClientOptions } from "vscode-languageclient";

import { LanguageClient } from "vscode-languageclient/browser";

let client: LanguageClient | undefined;

export async function activate(context: ExtensionContext) {
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "gedcom" }],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher("**/*.ged"),
    },
    initializationOptions: {},
  };

  client = createWorkerLanguageClient(context, clientOptions);

  await client.start();
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
    clientOptions,
    worker,
  );
}
