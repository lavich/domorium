import { describe, expect, it } from "vitest";
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
  const outDir = mkdtempSync(join(tmpdir(), "domorium-lsp-stdio-"));
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
          this.pending.delete(message.id);
          this.pendingRejects.delete(message.id);
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
    this.pending.clear();
    this.pendingRejects.clear();
  }
}

describe("stdio entry point", () => {
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
});
