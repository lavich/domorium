import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { PageShell } from "./PageShell";
import { PATHS } from "./paths";

export function NotFoundPage() {
  return (
    <PageShell current={PATHS.home}>
      <span className="font-mono text-xs text-muted-foreground">404</span>
      <h1 className="mt-4 max-w-[34ch] font-heading text-3xl leading-[1.1] font-semibold tracking-tight sm:text-4xl sm:leading-[1.05] lg:text-5xl">
        There is no page at this address
      </h1>
      <p className="mt-6 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
        The link may be old, or the address mistyped. The editor and every
        integration are one step away.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <a
          href={PATHS.editor}
          className={cn(
            buttonVariants({ variant: "default", size: "lg" }),
            "h-11 w-full justify-center sm:h-9 sm:w-auto",
          )}
        >
          Open the editor
        </a>
        <a
          href={PATHS.home}
          className={cn(
            buttonVariants({ variant: "secondary", size: "lg" }),
            "h-11 w-full justify-center sm:h-9 sm:w-auto",
          )}
        >
          Go to the home page
        </a>
      </div>
    </PageShell>
  );
}
