import { buttonVariants } from "@/components/ui/button";

import { PageShell } from "./PageShell";
import { PATHS } from "./paths";

export function NotFoundPage() {
  return (
    <PageShell current={PATHS.home}>
      <h1 className="font-heading text-3xl leading-tight font-semibold">
        There is no page at this address
      </h1>
      <p className="mt-5 max-w-[68ch] text-base leading-relaxed text-muted-foreground">
        The link may be old, or the address mistyped. The editor and every
        integration are one step away.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <a
          href={PATHS.editor}
          className={buttonVariants({ variant: "default", size: "lg" })}
        >
          Open the editor
        </a>
        <a
          href={PATHS.home}
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Go to the home page
        </a>
      </div>
    </PageShell>
  );
}
