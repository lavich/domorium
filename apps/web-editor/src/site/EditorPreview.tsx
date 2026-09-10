import { CircleAlertIcon } from "lucide-react";

/**
 * The editor as the reader will meet it, drawn rather than screenshotted: a
 * record from the example, one pointer that names nothing, and the message the
 * validator actually emits for it.
 */
const lines = [
  { level: "0", xref: "@I1@", tag: "INDI" },
  { level: "1", tag: "NAME", value: "Abraham /Simpson/" },
  { level: "1", tag: "SEX", value: "M" },
  { level: "1", tag: "BIRT" },
  { level: "2", tag: "DATE", value: "24 MAY 1899" },
  { level: "1", tag: "FAMS", value: "@F9@", broken: true },
];

const files = ["simpsons.ged", "notes.md", "abraham.jpg"];

export function EditorPreview() {
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
      <div className="flex items-center gap-2 border-b bg-muted/60 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="ml-2 font-mono text-xs text-muted-foreground">
          simpsons.ged
        </span>
        <span className="ml-auto font-mono text-[0.7rem] text-destructive">
          1 problem
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,7rem)_1fr]">
        <div className="flex flex-col gap-2 border-r px-3 py-3.5 text-xs">
          <span className="text-muted-foreground/70">Example</span>
          {files.map((file, index) => (
            <span
              key={file}
              className={
                index === 0 ? "text-foreground" : "text-muted-foreground"
              }
            >
              {file}
            </span>
          ))}
        </div>

        <div className="overflow-x-auto px-4 py-3.5 font-mono text-[0.78rem] leading-7">
          {lines.map((line) => (
            <div key={line.tag + line.level} className="whitespace-nowrap">
              <span className="text-muted-foreground/60">{line.level}</span>{" "}
              {line.xref ? (
                <>
                  <span className="text-primary">{line.xref}</span>{" "}
                </>
              ) : null}
              <span className="font-medium text-primary">{line.tag}</span>
              {line.value ? (
                <>
                  {" "}
                  <span
                    className={
                      line.broken
                        ? "underline decoration-destructive decoration-wavy decoration-2 underline-offset-4"
                        : undefined
                    }
                  >
                    {line.value}
                  </span>
                </>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2.5 border-t bg-muted/40 px-4 py-3">
        <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div>
          <div className="font-mono text-xs text-destructive">
            No FAM record carries @F9@
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            unresolved-xref, with a quick fix that repoints it
          </div>
        </div>
      </div>
    </div>
  );
}
