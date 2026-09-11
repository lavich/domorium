import { ArrowRightIcon, CheckIcon, ExternalLinkIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { abilitiesOf } from "./abilities";
import { INTEGRATIONS, type Integration } from "./integrations";
import { PlaceMark } from "./Marks";
import { pill } from "./Chrome";
import { PageShell } from "./PageShell";
import { Photographs } from "./Photographs";
import { PATHS } from "./paths";

export function IntegrationPage({ integration }: { integration: Integration }) {
  const siblings = INTEGRATIONS.filter(
    (other) => other.path !== integration.path,
  );

  return (
    <PageShell current={integration.path}>
      <section className="border-b">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 font-mono text-[0.7rem] text-accent-foreground">
              <PlaceMark place={integration.path} className="size-3.5" />
              {integration.name}
            </span>
            <h1 className="mt-6 max-w-[24ch] text-[2.1rem] leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl">
              {integration.heading}
            </h1>
            <p className="mt-6 max-w-[54ch] leading-relaxed text-muted-foreground">
              GEDCOM language support by Domorium. {integration.lede}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href={integration.marketplace.href}
                rel="noreferrer"
                className={cn(
                  pill,
                  "h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto",
                )}
              >
                {integration.marketplace.label}
                <ExternalLinkIcon className="size-3.5" />
              </a>
              <a
                href={PATHS.editor}
                className={cn(
                  pill,
                  "h-11 w-full border bg-card hover:bg-muted sm:w-auto",
                )}
              >
                Try it in the browser
              </a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-1.5">
              {abilitiesOf(integration.path).map((ability) => (
                <li
                  key={ability.label}
                  className="rounded-full border px-2.5 py-0.5 text-[0.7rem] text-muted-foreground"
                >
                  {ability.chip ?? ability.label}
                </li>
              ))}
            </ul>
          </div>
          <Photographs path={integration.path} name={integration.name} />
        </div>
      </section>

      <section className="border-b">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.3fr_1fr] lg:items-start lg:gap-14">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              What you get in {integration.name}
            </h2>
            <ul className="mt-7 grid gap-3">
              {integration.features.map((feature) => (
                <li key={feature} className="flex gap-3">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border bg-card p-5 sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight">Install it</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {integration.install.lead}
            </p>
            {integration.install.command ? (
              <pre className="mt-4 overflow-x-auto rounded-xl border bg-background px-4 py-3 font-mono text-[0.78rem]">
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
            <a
              href={integration.repository}
              rel="noreferrer"
              className="mt-5 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              Source and issue tracker
              <ExternalLinkIcon className="size-3.5" />
            </a>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            The same GEDCOM support elsewhere
          </h2>
          <ul className="mt-8 grid gap-5 sm:grid-cols-3">
            {siblings.map((sibling) => (
              <li
                key={sibling.path}
                className="flex flex-col gap-3 rounded-2xl border bg-card p-5"
              >
                <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                  <PlaceMark place={sibling.path} />
                  {sibling.heading}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {sibling.note}
                </p>
                <a
                  href={sibling.path}
                  className="mt-auto flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  {sibling.name}
                  <ArrowRightIcon className="size-3.5" />
                </a>
              </li>
            ))}
            <li className="flex flex-col gap-3 rounded-2xl border border-dashed p-5">
              <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                <PlaceMark place={PATHS.editor} />
                GEDCOM editor in the browser
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Nothing to install, and nothing leaves your machine.
              </p>
              <a
                href={PATHS.editor}
                className="mt-auto flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Editor
                <ArrowRightIcon className="size-3.5" />
              </a>
            </li>
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
