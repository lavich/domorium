import {
  BrowserMessageReader,
  BrowserMessageWriter,
  createMessageConnection,
} from "vscode-jsonrpc/browser";
import type { MessageConnection } from "vscode-jsonrpc";
import {
  InitializeRequest,
  InitializedNotification,
  type InitializeResult,
  type PublishDiagnosticsParams,
} from "vscode-languageserver-protocol";

export async function createLspClient(
  onDiagnostics: (params: PublishDiagnosticsParams) => void,
): Promise<{ connection: MessageConnection; initializeResult: InitializeResult }> {
  const worker = new Worker(
    new URL("./lspWorker.ts", import.meta.url),
    { type: "module", name: "GEDCOM LSP" },
  );
  const channel = new MessageChannel();
  worker.postMessage({ port: channel.port2 }, [channel.port2]);

  const connection = createMessageConnection(
    new BrowserMessageReader(channel.port1),
    new BrowserMessageWriter(channel.port1),
  );
  connection.onNotification("textDocument/publishDiagnostics", onDiagnostics);
  connection.listen();

  const initializeResult = await connection.sendRequest(InitializeRequest.type, {
    processId: null,
    rootUri: "file:///workspace",
    capabilities: {},
  });
  await connection.sendNotification(InitializedNotification.type, {});

  return { connection, initializeResult };
}
