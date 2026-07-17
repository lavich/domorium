import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import "monaco-editor/min/vs/editor/editor.main.css";
import {
  DidChangeTextDocumentNotification,
  DidOpenTextDocumentNotification,
} from "vscode-languageserver-protocol";
import { applyDiagnostics } from "./diagnostics";
import { registerGedcomLanguage } from "./gedcomLanguage";
import { createLspClient } from "./lspClient";
import { registerLspProviders } from "./lspProviders";

const FILE_URI = "file:///workspace/simpsons55.ged";
const LANGUAGE_ID = "gedcom";

async function init() {
  configureMonaco();
  registerGedcomLanguage(monaco);

  const model = await createInitialModel();
  createEditor(model);

  const { connection, initializeResult } = await createLspClient((params) =>
    applyDiagnostics(monaco, model, params),
  );
  registerLspProviders(
    monaco,
    connection,
    initializeResult.capabilities.semanticTokensProvider?.legend,
  );
  synchronizeDocument(connection, model);
}

function configureMonaco() {
  self.MonacoEnvironment = {
    getWorker() {
      return new editorWorker();
    },
  };
}

async function createInitialModel() {
  const response = await fetch(`${import.meta.env.BASE_URL}simpsons55.ged`);
  if (!response.ok) throw new Error(`Failed to load simpsons55.ged: ${response.status}`);
  return monaco.editor.createModel(
    await response.text(),
    LANGUAGE_ID,
    monaco.Uri.parse(FILE_URI),
  );
}

function createEditor(model: monaco.editor.ITextModel) {
  return monaco.editor.create(document.getElementById("monaco-editor-root")!, {
    model,
    theme: "vs-dark",
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 14,
    tabSize: 2,
    wordWrap: "on",
    "semanticHighlighting.enabled": true,
  });
}

function synchronizeDocument(
  connection: import("vscode-jsonrpc").MessageConnection,
  model: monaco.editor.ITextModel,
) {
  const uri = model.uri.toString();
  connection.sendNotification(DidOpenTextDocumentNotification.type, {
    textDocument: { uri, languageId: LANGUAGE_ID, version: model.getVersionId(), text: model.getValue() },
  });
  model.onDidChangeContent(() => {
    connection.sendNotification(DidChangeTextDocumentNotification.type, {
      textDocument: { uri, version: model.getVersionId() },
      contentChanges: [{ text: model.getValue() }],
    });
  });
}

init().catch(console.error);
