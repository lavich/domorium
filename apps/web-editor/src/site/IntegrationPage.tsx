import { ExternalLinkIcon } from "lucide-react";

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
      <h1 className="max-w-[34ch] font-heading text-3xl leading-tight font-semibold sm:text-4xl">
        {integration.heading}
      </h1>
      <p className="mt-4 text-base text-muted-foreground">
        GEDCOM language support by Domorium.
      </p>
      <p className="mt-5 max-w-[68ch] text-base leading-relaxed">
        {integration.lede}
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
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
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Try it in the browser first
        </a>
      </div>

      <section className="mt-16">
        <h2 className="font-heading text-xl font-semibold">
          What you get in {integration.name}
        </h2>
        <ul className="mt-4 max-w-[68ch] space-y-2 text-sm leading-relaxed">
          {integration.features.map((feature) => (
            <li key={feature} className="border-l-2 border-border pl-4">
              {feature}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16">
        <h2 className="font-heading text-xl font-semibold">Install it</h2>
        <p className="mt-3 max-w-[68ch] text-sm leading-relaxed">
          {integration.install.lead}
        </p>
        {integration.install.command ? (
          <pre className="mt-4 max-w-[68ch] overflow-x-auto rounded-xl bg-card p-4 font-mono text-[0.82rem] ring-1 ring-foreground/10">
            <code>{integration.install.command}</code>
          </pre>
        ) : null}
        {integration.install.steps ? (
          <ol className="mt-4 max-w-[68ch] list-decimal space-y-2 pl-5 text-sm leading-relaxed">
            {integration.install.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        ) : null}
        {integration.requirement ? (
          <p className="mt-4 max-w-[68ch] text-sm leading-relaxed text-muted-foreground">
            {integration.requirement}
          </p>
        ) : null}
      </section>

      <section className="mt-16">
        <h2 className="font-heading text-xl font-semibold">
          The same GEDCOM support elsewhere
        </h2>
        <ul className="mt-4 space-y-2 text-sm">
          {siblings.map((sibling) => (
            <li key={sibling.path}>
              <a href={sibling.path} className="text-primary hover:underline">
                {sibling.heading}
              </a>{" "}
              <span className="text-muted-foreground">— {sibling.note}</span>
            </li>
          ))}
          <li>
            <a href={PATHS.editor} className="text-primary hover:underline">
              GEDCOM editor in the browser
            </a>{" "}
            <span className="text-muted-foreground">
              — nothing to install, and nothing leaves your machine.
            </span>
          </li>
        </ul>
      </section>
    </PageShell>
  );
}
