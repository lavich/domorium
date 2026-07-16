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

// Accumulates raw stdout chunks and resolves as soon as one complete
// Content-Length-framed LSP message has arrived (chunk boundaries don't
// necessarily line up with message boundaries).
class LspMessageBuffer {
  private buffer = Buffer.alloc(0);

  push(chunk: Buffer): unknown | undefined {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const text = this.buffer.toString("utf-8");
    const headerEnd = text.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
      return undefined;
    }
    const contentLength = Number(
      /Content-Length: (\d+)/.exec(text.slice(0, headerEnd))?.[1],
    );
    const bodyStart = headerEnd + 4;
    if (this.buffer.length < bodyStart + contentLength) {
      return undefined;
    }
    const body = this.buffer.subarray(bodyStart, bodyStart + contentLength);
    return JSON.parse(body.toString("utf-8"));
  }
}

describe("stdio entry point", () => {
  it("responds to an LSP initialize request over stdin/stdout as a standalone process", async () => {
    const bundlePath = await bundleStdio();
    const child = spawn("node", [bundlePath]);

    const response = await new Promise<unknown>((resolve, reject) => {
      const messageBuffer = new LspMessageBuffer();
      const timeout = setTimeout(
        () => reject(new Error("Timed out waiting for initialize response")),
        5000,
      );
      child.stdout.on("data", (data: Buffer) => {
        const message = messageBuffer.push(data);
        if (message !== undefined) {
          clearTimeout(timeout);
          resolve(message);
        }
      });
      child.stderr.on("data", (data: Buffer) => {
        clearTimeout(timeout);
        reject(new Error(`stdio process wrote to stderr: ${data.toString()}`));
      });
      sendLspMessage(child.stdin, {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { processId: null, rootUri: null, capabilities: {} },
      });
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
});
