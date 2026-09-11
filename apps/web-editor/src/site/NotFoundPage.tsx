import { cn } from "@/lib/utils";

import { PageShell, pill } from "./PageShell";
import { PATHS } from "./paths";

export function NotFoundPage() {
  return (
    <PageShell current={PATHS.home}>
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-8 sm:py-28">
        <span className="font-mono text-xs text-muted-foreground">404</span>
        <h1 className="mt-5 max-w-[24ch] text-[2.1rem] leading-[1.08] font-semibold tracking-tight sm:text-5xl">
          There is no page at this address
        </h1>
        <p className="mt-6 max-w-[52ch] leading-relaxed text-muted-foreground">
          The link may be old, or the address mistyped. The editor and every
          extension are one step away.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href={PATHS.editor}
            className={cn(
              pill,
              "h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto",
            )}
          >
            Open the editor
          </a>
          <a
            href={PATHS.home}
            className={cn(
              pill,
              "h-11 w-full border bg-card hover:bg-muted sm:w-auto",
            )}
          >
            Go to the home page
          </a>
        </div>
      </section>
    </PageShell>
  );
}
