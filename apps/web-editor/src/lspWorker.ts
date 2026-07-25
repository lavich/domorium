import {
  createConnection,
  BrowserMessageReader,
  BrowserMessageWriter,
} from "vscode-languageserver/browser";
import { createServer } from "gedcom-lsp";

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (event: MessageEvent) => {
  const port = (event.data as { port: MessagePort }).port;
  const reader = new BrowserMessageReader(port);
  const writer = new BrowserMessageWriter(port);
  const connection = createConnection(reader, writer);
  createServer(connection);
};
