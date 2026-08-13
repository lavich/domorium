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

  // 10 puts the worker where the node client has always taken its server
  // options, so the browser client is now called the same way as that one.
  return new LanguageClient(
    "gedcomLanguageServer",
    "GEDCOM Language Server",
    worker,
    clientOptions,
  );
}
