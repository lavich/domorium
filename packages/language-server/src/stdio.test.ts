import { beforeAll, describe, expect, it, vi } from "vitest";
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
  const outDir = mkdtempSync(join(tmpdir(), "gedcom-language-server-stdio-"));
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

function sendLspMessage(stdin: NodeJS.WritableStream, message: unknown): void {
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
  readonly notifications: { method: string; params: unknown }[] = [];

  constructor(private readonly child: ReturnType<typeof spawn>) {
    child.stdout!.on("data", (data: Buffer) => {
      for (const message of this.messageBuffer.push(data)) {
        if (
          typeof message === "object" &&
          message !== null &&
          "method" in message &&
          !("id" in message)
        ) {
          this.notifications.push(
            message as { method: string; params: unknown },
          );
          continue;
        }
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

    const response = await client
      .request(1, "initialize", {
        processId: null,
        rootUri: null,
        capabilities: {},
      })
      .finally(() => {
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

  async function completeXref(
    capabilities: object | undefined,
    line: string,
    character: number,
  ): Promise<unknown> {
    const bundlePath = await bundleStdio();
    const child = spawn("node", [bundlePath]);
    const client = new LspTestClient(child);
    const uri = "file:///xref-completion.ged";
    try {
      await client.request(1, "initialize", {
        processId: null,
        rootUri: null,
        ...(capabilities === undefined ? {} : { capabilities }),
      });
      client.notify("initialized", {});
      client.notify("textDocument/didOpen", {
        textDocument: {
          uri,
          languageId: "gedcom",
          version: 1,
          text: [
            "0 HEAD",
            "1 GEDC",
            "2 VERS 7.0",
            "0 @I1@ INDI",
            "0 @I2@ INDI",
            "0 @F1@ FAM",
            line,
            "0 TRLR",
          ].join("\n"),
        },
      });
      const response = (await client.request(2, "textDocument/completion", {
        textDocument: { uri },
        position: { line: 6, character },
      })) as { result: { label: string; textEdit: unknown }[] };
      return response.result.find((item) => item.label === "@I2@")?.textEdit;
    } finally {
      child.kill();
    }
  }

  it("sends an InsertReplaceEdit to a client that supports one", async () => {
    const edit = await completeXref(
      {
        textDocument: {
          completion: { completionItem: { insertReplaceSupport: true } },
        },
      },
      "1 HUSB @I",
      9,
    );

    expect(edit).toEqual({
      newText: "@I2@",
      insert: {
        start: { line: 6, character: 7 },
        end: { line: 6, character: 9 },
      },
      replace: {
        start: { line: 6, character: 7 },
        end: { line: 6, character: 9 },
      },
    });
  }, 15000);

  it("sends a TextEdit over the whole xref to a client that declared no capabilities", async () => {
    const edit = await completeXref(undefined, "1 HUSB @I1@", 9);

    expect(edit).toEqual({
      newText: "@I2@",
      range: {
        start: { line: 6, character: 7 },
        end: { line: 6, character: 11 },
      },
    });
  }, 15000);

  it("shows the record a pointer names on hover", async () => {
    const bundlePath = await bundleStdio();
    const child = spawn("node", [bundlePath]);
    const client = new LspTestClient(child);
    const uri = "file:///hover.ged";

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
          version: 1,
          text: [
            "0 HEAD",
            "1 GEDC",
            "2 VERS 7.0",
            "0 @I1@ INDI",
            "1 NAME Homer /Simpson/",
            "1 NOTE see ```code``` here",
            "1 FAMS @F1@",
            "1 FAMC @F9@",
            "0 @F1@ FAM",
            "1 HUSB @I1@",
            "0 TRLR",
          ].join("\n"),
        },
      });

      await expect(
        client.request(2, "textDocument/hover", {
          textDocument: { uri },
          position: { line: 6, character: 9 },
        }),
      ).resolves.toMatchObject({
        result: {
          contents: {
            kind: "markdown",
            value: "```gedcom\n0 @F1@ FAM\n1 HUSB @I1@\n```",
          },
          range: {
            start: { line: 6, character: 7 },
            end: { line: 6, character: 11 },
          },
        },
      });

      // The INDI record carries a fence of its own, so ours has to outrun it.
      await expect(
        client.request(3, "textDocument/hover", {
          textDocument: { uri },
          position: { line: 9, character: 9 },
        }),
      ).resolves.toMatchObject({
        result: {
          contents: {
            kind: "markdown",
            value: expect.stringMatching(/^````gedcom\n0 @I1@ INDI\n/u),
          },
        },
      });

      const onTag = (await client.request(4, "textDocument/hover", {
        textDocument: { uri },
        position: { line: 4, character: 3 },
      })) as { result: { contents: { kind: string } } };
      expect(onTag.result.contents.kind).toBe("plaintext");

      await expect(
        client.request(5, "textDocument/hover", {
          textDocument: { uri },
          position: { line: 7, character: 9 },
        }),
      ).resolves.toMatchObject({ result: null });
    } finally {
      child.kill();
    }
  }, 15000);

  it("shows the image a file payload and a multimedia link refer to", async () => {
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
          version: 1,
          text: [
            "0 HEAD", //                     0
            "1 GEDC", //                     1
            "2 VERS 7.0", //                 2
            "0 @I1@ INDI", //                3
            "1 OBJE @O1@", //                4
            "2 CROP", //                     5
            "3 TOP 10", //                   6
            "3 LEFT 20", //                  7
            "3 HEIGHT 100", //               8
            "3 WIDTH 200", //                9
            "2 TITL Homer at the plant", //  10
            "0 @O1@ OBJE", //               11
            "1 FILE media/family.jpg", //   12
            "2 FORM image/jpeg", //         13
            "2 TITL The Simpson family", // 14
            "0 TRLR", //                    15
          ].join("\n"),
        },
      });

      // The path is resolved against the document: a hover cannot follow a
      // path relative to a file it does not know it is beside.
      await expect(
        client.request(2, "textDocument/hover", {
          textDocument: { uri },
          position: { line: 12, character: 12 },
        }),
      ).resolves.toMatchObject({
        result: {
          contents: {
            kind: "markdown",
            value: "![The Simpson family](file:///tree/media/family.jpg)",
          },
          range: {
            start: { line: 12, character: 7 },
            end: { line: 12, character: "1 FILE media/family.jpg".length },
          },
        },
      });

      // On a link the record still fences, and the image comes beside it with
      // the caption the link gave it.
      const onLink = (await client.request(3, "textDocument/hover", {
        textDocument: { uri },
        position: { line: 4, character: 9 },
      })) as { result: { contents: { value: string } } };

      expect(onLink.result.contents.value).toContain("```gedcom\n0 @O1@ OBJE");
      expect(onLink.result.contents.value).toContain(
        "![Homer at the plant](file:///tree/media/family.jpg)",
      );
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
                message: "No INDI record carries @I9@",
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
        result: [
          expect.objectContaining({
            title: "Create INDI record @I9@",
            kind: "quickfix",
          }),
          expect.objectContaining({
            title: "Replace with @I1@",
            kind: "quickfix",
          }),
          expect.objectContaining({
            title: "Point at nothing (@VOID@)",
            kind: "quickfix",
          }),
        ],
      });
    } finally {
      child.kill();
    }
  }, 15000);

  it("rewrites the open documents that name a renamed file, and says which cannot follow", async () => {
    const bundlePath = await bundleStdio();
    const child = spawn("node", [bundlePath]);
    const client = new LspTestClient(child);
    const gedcom = (vers: string, payload: string) =>
      `0 HEAD\n1 GEDC\n2 VERS ${vers}\n0 @O1@ OBJE\n1 FILE ${payload}\n0 TRLR`;
    const open = (uri: string, text: string, version = 1) =>
      client.notify("textDocument/didOpen", {
        textDocument: { uri, languageId: "gedcom", version, text },
      });
    const rename = (id: number, files: [string, string][]) =>
      client.request(id, "workspace/willRenameFiles", {
        files: files.map(([oldUri, newUri]) => ({ oldUri, newUri })),
      });
    const warnings = () =>
      client.notifications.filter(
        ({ method, params }) =>
          method === "window/showMessage" &&
          (params as { type: number }).type === 2,
      );

    try {
      await expect(
        client.request(1, "initialize", {
          processId: null,
          rootUri: null,
          capabilities: {},
          workspaceFolders: [{ uri: "file:///w", name: "w" }],
        }),
      ).resolves.toMatchObject({
        result: {
          capabilities: {
            workspace: {
              fileOperations: {
                willRename: {
                  filters: [{ pattern: { glob: "**/*", matches: "file" } }],
                },
              },
            },
          },
        },
      });
      client.notify("initialized", {});

      open("file:///w/one/tree.ged", gedcom("7.0", "media/marie.jpg"), 4);
      await expect(
        rename(2, [
          [
            "file:///w/one/media/marie.jpg",
            "file:///w/one/media/marie%20curie.jpg",
          ],
        ]),
      ).resolves.toMatchObject({
        result: {
          documentChanges: [
            {
              textDocument: { uri: "file:///w/one/tree.ged", version: 4 },
              edits: [{ newText: "media/marie%20curie.jpg" }],
            },
          ],
        },
      });

      open("file:///w/two/family/tree.ged", gedcom("7.0", "media/a.jpg"));
      open("file:///w/two/other.ged", gedcom("7.0", "family/media/a.jpg"));
      const both = (await rename(3, [
        [
          "file:///w/two/family/media/a.jpg",
          "file:///w/two/family/media/b.jpg",
        ],
      ])) as {
        result: {
          documentChanges: {
            textDocument: { uri: string };
            edits: { newText: string }[];
          }[];
        };
      };
      expect(
        Object.fromEntries(
          both.result.documentChanges.map(({ textDocument, edits }) => [
            textDocument.uri,
            edits.map(({ newText }) => newText),
          ]),
        ),
      ).toEqual({
        "file:///w/two/family/tree.ged": ["media/b.jpg"],
        "file:///w/two/other.ged": ["family/media/b.jpg"],
      });

      open("file:///w/three/tree.ged", gedcom("7.0", "marie.jpg"));
      await expect(
        rename(4, [
          ["file:///w/three/tree.ged", "file:///w/three/archive/tree.ged"],
          ["file:///w/three/marie.jpg", "file:///w/three/archive/marie.jpg"],
        ]),
      ).resolves.toMatchObject({ result: null });

      await expect(
        rename(5, [["file:///w/absent.jpg", "file:///w/present.jpg"]]),
      ).resolves.toMatchObject({ result: null });

      open("file:///w/four/tree.ged", gedcom("7.0", "gone.jpg"));
      client.notify("textDocument/didChange", {
        textDocument: { uri: "file:///w/four/tree.ged", version: 2 },
        contentChanges: [{ text: gedcom("7.0", "gone.jpg") }],
      });
      client.notify("textDocument/didClose", {
        textDocument: { uri: "file:///w/four/tree.ged" },
      });
      await expect(
        rename(6, [["file:///w/four/gone.jpg", "file:///w/four/here.jpg"]]),
      ).resolves.toMatchObject({ result: null });
      expect(warnings()).toEqual([]);

      open("file:///w/five/family/tree.ged", gedcom("7.0", "media/marie.jpg"));
      open("file:///w/five/family/old.ged", gedcom("5.5.1", "media/marie.jpg"));
      await expect(
        rename(7, [
          [
            "file:///w/five/family/media/marie.jpg",
            "file:///w/five/photos/marie.jpg",
          ],
        ]),
      ).resolves.toMatchObject({
        result: {
          documentChanges: [
            {
              textDocument: { uri: "file:///w/five/family/old.ged" },
              edits: [{ newText: "../photos/marie.jpg" }],
            },
          ],
        },
      });
      expect(warnings()).toHaveLength(1);
      const [warning] = warnings();
      const message = (warning?.params as { message: string }).message;
      expect(message).toContain("five/family/tree.ged");
      expect(message).not.toContain("old.ged");

      open(
        "file:///w/six/tree.ged",
        `${gedcom("7.0", "media/a.jpg").replace("0 TRLR", "1 FILE media/b.jpg\n0 TRLR")}`,
      );
      await expect(
        rename(8, [
          ["file:///w/six/media/a.jpg", "file:///w/photos/a.jpg"],
          ["file:///w/six/media/b.jpg", "file:///w/six/media/c.jpg"],
        ]),
      ).resolves.toMatchObject({ result: null });
      expect(warnings()).toHaveLength(2);

      open("file:///c%3A/seven/tree.ged", gedcom("5.5.1", "media/a.jpg"));
      await expect(
        rename(9, [["file:///c%3A/seven/media/a.jpg", "file:///d%3A/a.jpg"]]),
      ).resolves.toMatchObject({ result: null });
      expect(warnings()).toHaveLength(3);
    } finally {
      child.kill();
    }
  });
});

describe("range requests", () => {
  const lines = [
    "0 HEAD",
    "1 GEDC",
    "2 VERS 7.0",
    "0 @I1@ INDI",
    "1 NAME John /Doe/",
    "1 BIRT",
    "2 DATE 1 JAN 1900",
    "0 @I2@ INDI",
    "1 NAME Jane /Doe/",
    "0 TRLR",
  ];
  const uri = "file:///range.ged";
  const span = (
    startLine: number,
    startCharacter: number,
    endLine: number,
    endCharacter: number,
  ) => ({
    start: { line: startLine, character: startCharacter },
    end: { line: endLine, character: endCharacter },
  });

  let bundlePath: string;
  beforeAll(async () => {
    bundlePath = await bundleStdio();
  }, 15000);

  async function withServer<T>(
    capabilities: object,
    text: string | null,
    use: (client: LspTestClient, initialized: unknown) => Promise<T>,
  ): Promise<T> {
    const child = spawn("node", [bundlePath]);
    const client = new LspTestClient(child);
    try {
      const initialized = await client.request(1, "initialize", {
        processId: null,
        rootUri: null,
        capabilities,
      });
      client.notify("initialized", {});
      if (text !== null) {
        client.notify("textDocument/didOpen", {
          textDocument: { uri, languageId: "gedcom", version: 1, text },
        });
      }
      return await use(client, initialized);
    } finally {
      child.kill();
    }
  }

  const hintLines = (
    range: ReturnType<typeof span>,
    text: string | null = lines.join("\n"),
  ) =>
    withServer({}, text, async (client) => {
      const response = (await client.request(2, "textDocument/inlayHint", {
        textDocument: { uri },
        range,
      })) as { result: { position: { line: number } }[] };
      return response.result
        .map(({ position }) => position.line)
        .sort((a, b) => a - b);
    });

  it("answers inlay hints for the one record a range covers", async () => {
    await expect(hintLines(span(7, 0, 8, 16))).resolves.toEqual([8]);
  }, 15000);

  it("answers inlay hints for the one record a range covers when lines end in CRLF", async () => {
    await expect(
      hintLines(span(7, 0, 8, 16), lines.join("\r\n")),
    ).resolves.toEqual([8]);
  }, 15000);

  it("answers the whole record a range falls inside", async () => {
    await expect(hintLines(span(5, 0, 5, 6))).resolves.toEqual([4, 5, 6]);
  }, 15000);

  it("answers every inlay hint for a range over the whole document", async () => {
    await expect(hintLines(span(0, 0, 9, 6))).resolves.toEqual([
      1, 2, 4, 5, 6, 8,
    ]);
  }, 15000);

  it("reads a range ending past the document as ending at its end", async () => {
    await expect(hintLines(span(0, 0, 999, 0))).resolves.toEqual([
      1, 2, 4, 5, 6, 8,
    ]);
  }, 15000);

  it("answers no inlay hints for a document not yet opened", async () => {
    await expect(hintLines(span(0, 0, 9, 6), null)).resolves.toEqual([]);
  }, 15000);
});
