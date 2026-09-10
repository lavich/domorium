import { CheckIcon, ExternalLinkIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { INTEGRATIONS, type Integration } from "./integrations";
import { PageShell } from "./PageShell";
import { PATHS } from "./paths";

/** A thumb gets the full width; a pointer gets a button the size of its label. */
const action = "h-11 w-full justify-center sm:h-9 sm:w-auto";

export function IntegrationPage({ integration }: { integration: Integration }) {
  const siblings = INTEGRATIONS.filter(
    (other) => other.path !== integration.path,
  );

  return (
    <PageShell current={integration.path}>
      <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs text-primary">
        <span className="size-1.5 rounded-full bg-primary" />
        {integration.name}
      </span>
      <h1 className="mt-5 max-w-[34ch] font-heading text-3xl leading-[1.1] font-semibold tracking-tight text-pretty sm:mt-6 sm:text-4xl sm:leading-[1.05] lg:text-5xl">
        {integration.heading}
      </h1>
      <p className="mt-5 max-w-[52ch] text-[0.95rem] leading-relaxed text-muted-foreground sm:text-base">
        GEDCOM language support by Domorium. {integration.lede}
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <a
          href={integration.marketplace.href}
          rel="noreferrer"
          className={cn(
            buttonVariants({ variant: "default", size: "lg" }),
            action,
          )}
        >
          {integration.marketplace.label}
          <ExternalLinkIcon data-icon="inline-end" />
        </a>
        <a
          href={PATHS.editor}
          className={cn(
            buttonVariants({ variant: "secondary", size: "lg" }),
            action,
          )}
        >
          Try it in the browser first
        </a>
      </div>

      <div className="mt-14 grid items-start gap-10 sm:mt-16 sm:gap-12 lg:grid-cols-[1.3fr_1fr] lg:gap-14">
        <section>
          <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
            What you get in {integration.name}
          </h2>
          <ul className="mt-6 grid gap-3">
            {integration.features.map((feature) => (
              <li key={feature} className="flex gap-3">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-sm leading-relaxed text-muted-foreground">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl bg-card p-5 ring-1 ring-border sm:p-6">
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Install it
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {integration.install.lead}
          </p>
          {integration.install.command ? (
            <pre className="mt-4 overflow-x-auto rounded-lg border px-4 py-3 font-mono text-[0.78rem]">
              <code>{integration.install.command}</code>
            </pre>
          ) : null}
          {integration.install.steps ? (
            <ol className="mt-4 grid list-decimal gap-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              {integration.install.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          ) : null}
          {integration.requirement ? (
            <p className="mt-5 border-t pt-4 text-sm leading-relaxed text-muted-foreground">
              {integration.requirement}
            </p>
          ) : null}
        </section>
      </div>

      <section className="mt-14 sm:mt-20">
        <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
          The same GEDCOM support elsewhere
        </h2>
        <ul className="mt-6 grid gap-3 sm:mt-7 sm:grid-cols-3 sm:gap-4">
          {siblings.map((sibling) => (
            <li
              key={sibling.path}
              className="flex flex-col gap-2.5 rounded-xl bg-card p-4 ring-1 ring-border sm:gap-3 sm:p-5"
            >
              <h3 className="font-heading text-base leading-snug font-semibold">
                <a href={sibling.path} className="hover:text-primary">
                  {sibling.heading}
                </a>
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {sibling.note}
              </p>
            </li>
          ))}
          <li className="flex flex-col gap-2.5 rounded-xl border p-4 sm:gap-3 sm:p-5">
            <h3 className="font-heading text-base leading-snug font-semibold">
              <a href={PATHS.editor} className="hover:text-primary">
                GEDCOM editor in the browser
              </a>
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Nothing to install, and nothing leaves your machine.
            </p>
          </li>
        </ul>
      </section>
    </PageShell>
  );
}
