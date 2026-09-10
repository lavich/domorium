import { TriangleAlertIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { INTEGRATIONS } from "./integrations";
import { PageShell } from "./PageShell";
import { PATHS } from "./paths";

/**
 * A record from the example the editor opens, with one pointer that names
 * nothing — and the message the validator actually emits for it.
 */
const specimen = [
  { level: "0", xref: "@I1@", tag: "INDI" },
  { level: "1", tag: "NAME", value: "Abraham /Simpson/" },
  { level: "1", tag: "SEX", value: "M" },
  { level: "1", tag: "BIRT" },
  { level: "2", tag: "DATE", value: "24 MAY 1899" },
  { level: "1", tag: "FAMS", value: "@F9@", broken: true },
];

const checks = [
  "Structure, cardinality and payload types, against the GEDCOM 5.5.1 and 7.0 specifications",
  "Cross-references that name no record, with a quick fix that points them at one that exists",
  "Levels that cannot follow the line above them",
  "Dates naming a day their calendar does not have, such as 31 FEB",
  "Extension tags used without a HEAD.SCHMA declaration",
];

export function LandingPage() {
  return (
    <PageShell current={PATHS.home}>
      <h1 className="max-w-[34ch] font-heading text-3xl leading-tight font-semibold sm:text-4xl">
        Open, validate and edit GEDCOM files locally
      </h1>
      <p className="mt-5 max-w-[68ch] text-base leading-relaxed">
        A GEDCOM file is a strict, line-oriented tree, and a genealogy
        application will tell you the import failed without telling you which
        line broke it. Domorium treats <code className="font-mono">.ged</code>{" "}
        as what it is — a language — and puts the diagnostic on the line that
        caused it. Nothing is uploaded: the parser, the validator and every
        integration run on your own machine.
      </p>

      <figure className="mt-8">
        <pre className="overflow-x-auto rounded-xl bg-card p-5 font-mono text-[0.82rem] leading-7 ring-1 ring-foreground/10">
          <code>
            {specimen.map((line) => (
              <span key={line.tag + line.level} className="block">
                <span className="text-muted-foreground">{line.level}</span>{" "}
                {line.xref ? (
                  <>
                    <span className="text-primary">{line.xref}</span>{" "}
                  </>
                ) : null}
                <span className="font-semibold text-primary">{line.tag}</span>
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
              </span>
            ))}
          </code>
        </pre>
        <figcaption className="mt-3 flex items-start gap-2 text-sm text-destructive">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <span>
            No FAM record carries <span className="font-mono">@F9@</span> — said
            where it happened, as you type
          </span>
        </figcaption>
      </figure>

      <div className="mt-9 flex flex-wrap items-center gap-3">
        <a
          href={PATHS.editor}
          className={buttonVariants({ variant: "default", size: "lg" })}
        >
          Open the editor
        </a>
        <span className="text-sm text-muted-foreground">
          No install, no upload. In Chromium browsers you can grant a folder and
          save straight back to it.
        </span>
      </div>

      <section className="mt-16">
        <h2 className="font-heading text-xl font-semibold">What it checks</h2>
        <ul className="mt-4 max-w-[68ch] space-y-2 text-sm leading-relaxed">
          {checks.map((check) => (
            <li key={check} className="border-l-2 border-border pl-4">
              {check}
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-[68ch] text-sm leading-relaxed text-muted-foreground">
          The GEDCOM 7 schema is generated from the FamilySearch release rather
          than transcribed by hand. GEDCOM 5.5.1 is published only as prose, so
          that one schema is maintained by hand.
        </p>
      </section>

      <section className="mt-16">
        <h2 className="font-heading text-xl font-semibold">Where it runs</h2>
        <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-muted-foreground">
          The language intelligence exists once, and each editor is a thin
          adapter over it — so a diagnostic reads the same wherever you meet it.
        </p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {INTEGRATIONS.map((integration) => (
            <li
              key={integration.path}
              className="flex flex-col gap-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
            >
              <h3 className="font-heading text-base font-semibold">
                <a href={integration.path} className="hover:text-primary">
                  {integration.heading}
                </a>
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {integration.note}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
