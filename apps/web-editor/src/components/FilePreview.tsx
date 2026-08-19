import { useEffect, useRef, useState } from "react";

import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { DocumentReport } from "@/editor/types";
import { kilobytes } from "@/lib/utils";

/**
 * A note is shown as the text it is: rendering it would mean running the HTML and
 * the scripts that came out of someone else's export.
 */
export function MarkdownPreview({
  name,
  text,
  onReport,
}: {
  name: string;
  text: string;
  onReport(report: DocumentReport): void;
}) {
  const report = useLatest(onReport);
  useEffect(() => {
    report.current({ kind: "markdown" });
  }, [report]);

  return (
    <section aria-label={`Preview of ${name}`} className="flex h-full flex-col">
      <PreviewHeader name={name} detail={`${text.split("\n").length} lines`} />
      <ScrollArea className="min-h-0 flex-1">
        <pre className="p-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap">
          {text}
        </pre>
      </ScrollArea>
    </section>
  );
}

/**
 * The object URL is released when the preview is replaced or closed: a folder of
 * photographs would otherwise be held for the rest of the session.
 */
export function ImagePreview({
  name,
  path,
  load,
  onReport,
}: {
  name: string;
  path: string;
  load(path: string): Promise<Blob>;
  onReport(report: DocumentReport): void;
}) {
  const [state, setState] = useState<
    { url: string; size: number; format: string } | { error: string } | null
  >(null);
  const report = useLatest(onReport);
  const read = useLatest(load);

  useEffect(() => {
    let url: string | null = null;
    let active = true;

    read
      .current(path)
      .then((blob) => {
        if (!active) {
          return;
        }
        url = URL.createObjectURL(blob);
        const format = formatOf(blob, path);
        setState({ url, size: blob.size, format });
        report.current({
          kind: "image",
          format,
          bytes: blob.size,
          width: null,
          height: null,
        });
      })
      .catch((cause: unknown) => {
        if (active) {
          setState({
            error:
              cause instanceof Error
                ? cause.message
                : "The image could not be read",
          });
        }
      });

    return () => {
      active = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [path, read, report]);

  if (state && "error" in state) {
    return (
      <Empty className="h-full">
        <EmptyTitle>{name} could not be shown</EmptyTitle>
        <EmptyDescription>{state.error}</EmptyDescription>
      </Empty>
    );
  }

  return (
    <section aria-label={`Preview of ${name}`} className="flex h-full flex-col">
      <PreviewHeader
        name={name}
        detail={state ? kilobytes(state.size) : "reading…"}
      />
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
        {state ? (
          <img
            src={state.url}
            alt={name}
            className="max-h-full max-w-full object-contain"
            onLoad={(event) =>
              report.current({
                kind: "image",
                format: state.format,
                bytes: state.size,
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })
            }
          />
        ) : null}
      </div>
    </section>
  );
}

/**
 * The blob's type is what the browser decoded, and a folder can hold a file whose
 * name says one thing and whose bytes say another; the extension answers only
 * where the type is missing.
 */
function formatOf(blob: Blob, path: string): string {
  const type = blob.type.replace(/^image\//, "").replace(/\+.*$/, "");
  const extension = path.slice(path.lastIndexOf(".") + 1);
  return (type || extension).toUpperCase();
}

/**
 * An effect reads the file and reports what it is, and reporting renders the
 * parent again. Holding what it calls means a fresh closure does not restart it,
 * revoke the URL under the image and report once more.
 */
function useLatest<T>(value: T) {
  const held = useRef(value);
  held.current = value;
  return held;
}

function PreviewHeader({ name, detail }: { name: string; detail: string }) {
  return (
    <header className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
      <span className="font-mono text-[13px]">{name}</span>
      <Badge variant="secondary" className="font-mono text-[11px]">
        {detail}
      </Badge>
      <Badge variant="outline" className="ml-auto text-[11px]">
        read-only
      </Badge>
    </header>
  );
}
