import { useEffect, useState } from "react";

import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

/**
 * A note is shown as the text it is. Rendering it would mean deciding what to do
 * with the HTML and the scripts a note carries — material that came out of
 * someone else's export — so the preview shows the source and executes nothing.
 */
export function MarkdownPreview({
  name,
  text,
}: {
  name: string;
  text: string;
}) {
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
 * The image is shown through an object URL taken from the file itself, and the
 * URL is released when the preview is replaced or closed: a folder of
 * photographs would otherwise be held in memory for the rest of the session.
 */
export function ImagePreview({
  name,
  path,
  load,
}: {
  name: string;
  path: string;
  load(path: string): Promise<Blob>;
}) {
  const [state, setState] = useState<
    { url: string; size: number } | { error: string } | null
  >(null);

  useEffect(() => {
    let url: string | null = null;
    let active = true;

    load(path)
      .then((blob) => {
        if (!active) {
          return;
        }
        url = URL.createObjectURL(blob);
        setState({ url, size: blob.size });
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
  }, [load, path]);

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
        detail={
          state
            ? `${Math.max(1, Math.round(state.size / 1024))} KB`
            : "reading…"
        }
      />
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
        {state ? (
          <img
            src={state.url}
            alt={name}
            className="max-h-full max-w-full object-contain"
          />
        ) : null}
      </div>
    </section>
  );
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
