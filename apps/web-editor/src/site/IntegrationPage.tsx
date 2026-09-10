import { CheckIcon, ExternalLinkIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { INTEGRATIONS, type Integration } from "./integrations";
import { PageShell } from "./PageShell";
import { PATHS } from "./paths";

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
      <h1 className="mt-6 max-w-[34ch] font-heading text-4xl leading-[1.05] font-semibold tracking-tight text-pretty sm:text-5xl">
        {integration.heading}
      </h1>
      <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
        GEDCOM language support by Domorium. {integration.lede}
      </p>

      <div className="mt-9 flex flex-wrap items-center gap-3">
        <a
          href={integration.marketplace.href}
          rel="noreferrer"
          className={buttonVariants({ variant: "default", size: "lg" })}
        >
          {integration.marketplace.label}
          <ExternalLinkIcon data-icon="inline-end" />
        </a>
        <a
          href={PATHS.editor}
          className={buttonVariants({ variant: "secondary", size: "lg" })}
        >
          Try it in the browser first
        </a>
      </div>

      <div className="mt-16 grid items-start gap-12 lg:grid-cols-[1.3fr_1fr] lg:gap-14">
        <section>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
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

        <section className="rounded-xl bg-card p-6 ring-1 ring-border">
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

      <section className="mt-20">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          The same GEDCOM support elsewhere
        </h2>
        <ul className="mt-7 grid gap-4 sm:grid-cols-3">
          {siblings.map((sibling) => (
            <li
              key={sibling.path}
              className="flex flex-col gap-3 rounded-xl bg-card p-5 ring-1 ring-border"
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
          <li className="flex flex-col gap-3 rounded-xl border p-5">
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
