import { buttonVariants } from "@/components/ui/button";

import { PageShell } from "./PageShell";
import { PATHS } from "./paths";

export function NotFoundPage() {
  return (
    <PageShell current={PATHS.home}>
      <span className="font-mono text-xs text-muted-foreground">404</span>
      <h1 className="mt-4 max-w-[34ch] font-heading text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl">
        There is no page at this address
      </h1>
      <p className="mt-6 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
        The link may be old, or the address mistyped. The editor and every
        integration are one step away.
      </p>
      <div className="mt-9 flex flex-wrap items-center gap-3">
        <a
          href={PATHS.editor}
          className={buttonVariants({ variant: "default", size: "lg" })}
        >
          Open the editor
        </a>
        <a
          href={PATHS.home}
          className={buttonVariants({ variant: "secondary", size: "lg" })}
        >
          Go to the home page
        </a>
      </div>
    </PageShell>
  );
}
