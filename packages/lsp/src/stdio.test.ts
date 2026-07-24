import { describe, expect, it, vi } from "vitest";
import { build } from "esbuild";
import { spawn } from "child_process";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// stdio.ts wires createServer() to real process.stdin/stdout and calls
// connection.listen() at import time, so it can't be safely imported
// in-process (it would hijack the test runner's own stdio). Instead,
// bundle it standalone (the same way the JetBrains plugin will consume
// it — a single self-contained Node script) and drive it as a real
// child process over the LSP wire protocol.
async function bundleStdio(): Promise<string> {
  const outDir = mkdtempSync(join(tmpdir(), "gedcom-lsp-stdio-"));
  const outfile = join(outDir, "stdio.cjs.js");
  await build({
    entryPoints: [join(__dirname, "stdio.ts")],
    bundle: true,
    platform: "node",
    target: "node18",
    format: "cjs",
    outfile,
  });
  return outfile;
}

function sendLspMessage(
  stdin: NodeJS.WritableStream,
  message: unknown,
): void {
  const body = Buffer.from(JSON.stringify(message), "utf-8");
  const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "utf-8");
  stdin.write(Buffer.concat([header, body]));
}

// Accumulates raw stdout chunks and returns every complete
// Content-Length-framed LSP message received (chunk boundaries don't
// necessarily line up with message boundaries).
class LspMessageBuffer {
  private buffer = Buffer.alloc(0);

  push(chunk: Buffer): unknown[] {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const messages: unknown[] = [];

    while (true) {
      const text = this.buffer.toString("utf-8");
      const headerEnd = text.indexOf("\r\n\r\n");
      if (headerEnd === -1) {
        break;
      }
      const contentLength = Number(
        /Content-Length: (\d+)/.exec(text.slice(0, headerEnd))?.[1],
      );
      const bodyStart = headerEnd + 4;
      const messageEnd = bodyStart + contentLength;
      if (this.buffer.length < messageEnd) {
        break;
      }
      const body = this.buffer.subarray(bodyStart, messageEnd);
      messages.push(JSON.parse(body.toString("utf-8")));
      this.buffer = this.buffer.subarray(messageEnd);
    }

    return messages;
  }
}

class LspTestClient {
  private readonly pending = new Map<number, (message: unknown) => void>();
  private readonly pendingRejects = new Map<number, (error: Error) => void>();
  private readonly pendingTimeouts = new Map<
    number,
    ReturnType<typeof setTimeout>
  >();
  private readonly messageBuffer = new LspMessageBuffer();

  constructor(private readonly child: ReturnType<typeof spawn>) {
    child.stdout!.on("data", (data: Buffer) => {
      for (const message of this.messageBuffer.push(data)) {
        if (
          typeof message !== "object" ||
          message === null ||
          !("id" in message) ||
          typeof message.id !== "number"
        ) {
          continue;
        }

        const resolve = this.pending.get(message.id);
        if (resolve !== undefined) {
          this.clearPending(message.id);
          resolve(message);
        }
      }
    });

    child.stderr!.on("data", (data: Buffer) => {
      this.rejectPending(
        new Error(`stdio process wrote to stderr: ${data.toString()}`),
      );
    });
    child.on("exit", (code, signal) => {
      if (this.pending.size > 0) {
        this.rejectPending(
          new Error(
            `stdio process exited unexpectedly (code: ${code}, signal: ${signal})`,
          ),
        );
      }
    });
  }

  request(id: number, method: string, params: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.pending.set(id, resolve);
      this.pendingRejects.set(id, reject);
      this.pendingTimeouts.set(
        id,
        setTimeout(() => {
          const pendingReject = this.pendingRejects.get(id);
          if (pendingReject !== undefined) {
            this.clearPending(id);
            pendingReject(
              new Error(
                `Timed out waiting for response to ${method} request ${id}`,
              ),
            );
          }
        }, 5000),
      );
      sendLspMessage(this.child.stdin!, {
        jsonrpc: "2.0",
        id,
        method,
        params,
      });
    });
  }

  notify(method: string, params: unknown): void {
    sendLspMessage(this.child.stdin!, { jsonrpc: "2.0", method, params });
  }

  private rejectPending(error: Error): void {
    for (const reject of this.pendingRejects.values()) {
      reject(error);
    }
    for (const timeout of this.pendingTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.pending.clear();
    this.pendingRejects.clear();
    this.pendingTimeouts.clear();
  }

  private clearPending(id: number): void {
    const timeout = this.pendingTimeouts.get(id);
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
    this.pending.delete(id);
    this.pendingRejects.delete(id);
    this.pendingTimeouts.delete(id);
  }
}

describe("stdio entry point", () => {
  it("rejects a request when the server does not respond", async () => {
    vi.useFakeTimers();
    const child = spawn("node", ["-e", "setInterval(() => {}, 1000)"]);
    const client = new LspTestClient(child);
    let requestError: unknown;

    try {
      void client.request(1, "initialize", {}).catch((error: unknown) => {
        requestError = error;
      });
      await vi.advanceTimersByTimeAsync(5000);

      expect(requestError).toEqual(
        new Error("Timed out waiting for response to initialize request 1"),
      );
    } finally {
      child.kill();
      vi.useRealTimers();
    }
  });

  it("responds to an LSP initialize request over stdin/stdout as a standalone process", async () => {
    const bundlePath = await bundleStdio();
    const child = spawn("node", [bundlePath]);
    const client = new LspTestClient(child);

    const response = await client.request(1, "initialize", {
      processId: null,
      rootUri: null,
      capabilities: {},
    }).finally(() => {
      child.kill();
    });

    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        capabilities: {
          hoverProvider: true,
          definitionProvider: true,
          foldingRangeProvider: true,
          referencesProvider: true,
          documentHighlightProvider: true,
          renameProvider: { prepareProvider: true },
          documentLinkProvider: { resolveProvider: false },
          codeActionProvider: { codeActionKinds: ["quickfix"] },
        },
      },
    });
  }, 15000);

  it("returns schema completions over the LSP wire protocol", async () => {
    const bundlePath = await bundleStdio();
    const child = spawn("node", [bundlePath]);
    const client = new LspTestClient(child);

    try {
      const initializeResponse = await client.request(1, "initialize", {
        processId: null,
        rootUri: null,
        capabilities: {},
      });
      expect(initializeResponse).toMatchObject({
        result: {
          capabilities: {
            completionProvider: {
              triggerCharacters: [" "],
            },
          },
        },
      });

      client.notify("initialized", {});
      client.notify("textDocument/didOpen", {
        textDocument: {
          uri: "file:///completion.ged",
          languageId: "gedcom",
          version: 1,
          text: [
            "0 HEAD",
            "1 GEDC",
            "2 VERS 7.0",
            "0 @I1@ INDI",
            "1 SEX ",
            "0 TRLR",
          ].join("\n"),
        },
      });

      const completionResponse = await client.request(
        2,
        "textDocument/completion",
        {
          textDocument: { uri: "file:///completion.ged" },
          position: { line: 4, character: 6 },
        },
      );
      expect(completionResponse).toMatchObject({
        result: expect.arrayContaining([
          expect.objectContaining({ label: "M" }),
          expect.objectContaining({ label: "F" }),
        ]),
      });
    } finally {
      child.kill();
    }
  }, 15000);

  it("exposes reference editing operations over the LSP wire protocol", async () => {
    const bundlePath = await bundleStdio();
    const child = spawn("node", [bundlePath]);
    const client = new LspTestClient(child);
    const uri = "file:///tree/family.ged";

    try {
      await client.request(1, "initialize", {
        processId: null,
        rootUri: null,
        capabilities: {},
      });
      client.notify("initialized", {});
      client.notify("textDocument/didOpen", {
        textDocument: {
          uri,
          languageId: "gedcom",
          version: 7,
          text: [
            "0 HEAD",
            "1 GEDC",
            "2 VERS 7.0",
            "0 @I1@ INDI",
            "1 OBJE",
            "2 FILE portrait.jpg",
            "0 @F1@ FAM",
            "1 HUSB @I1@",
            "1 WIFE @I9@",
            "0 TRLR",
          ].join("\n"),
        },
      });

      await expect(
        client.request(2, "textDocument/references", {
          textDocument: { uri },
          position: { line: 7, character: 9 },
          context: { includeDeclaration: true },
        }),
      ).resolves.toMatchObject({
        result: [
          { uri, range: { start: { line: 3, character: 2 } } },
          { uri, range: { start: { line: 7, character: 7 } } },
        ],
      });
      await expect(
        client.request(3, "textDocument/documentHighlight", {
          textDocument: { uri },
          position: { line: 3, character: 4 },
        }),
      ).resolves.toMatchObject({
        result: [{ kind: 3 }, { kind: 2 }],
      });
      await expect(
        client.request(4, "textDocument/prepareRename", {
          textDocument: { uri },
          position: { line: 3, character: 4 },
        }),
      ).resolves.toMatchObject({
        result: { placeholder: "@I1@" },
      });
      await expect(
        client.request(5, "textDocument/rename", {
          textDocument: { uri },
          position: { line: 3, character: 4 },
          newName: "@I2@",
        }),
      ).resolves.toMatchObject({
        result: {
          documentChanges: [
            {
              textDocument: { uri, version: 7 },
              edits: [{ newText: "@I2@" }, { newText: "@I2@" }],
            },
          ],
        },
      });
      await expect(
        client.request(6, "textDocument/documentLink", {
          textDocument: { uri },
        }),
      ).resolves.toMatchObject({
        result: [
          {
            target: "file:///tree/portrait.jpg",
            tooltip: "Open file: portrait.jpg",
          },
        ],
      });
      await expect(
        client.request(7, "textDocument/codeAction", {
          textDocument: { uri },
          range: {
            start: { line: 8, character: 7 },
            end: { line: 8, character: 11 },
          },
          context: {
            diagnostics: [
              {
                code: "unresolved-xref",
                message: "Value for WIFE should be POINTER",
                range: {
                  start: { line: 8, character: 7 },
                  end: { line: 8, character: 11 },
                },
                data: { xref: "@I9@", requiredRecordTag: "INDI" },
              },
            ],
          },
        }),
      ).resolves.toMatchObject({
        result: expect.arrayContaining([
          expect.objectContaining({
            title: "Replace @I9@ with @I1@",
            kind: "quickfix",
          }),
          expect.objectContaining({
            title: "Create INDI record @I9@",
            kind: "quickfix",
          }),
        ]),
      });
    } finally {
      child.kill();
    }
  }, 15000);
});
