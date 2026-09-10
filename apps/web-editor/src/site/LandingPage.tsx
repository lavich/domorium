import { BookMarkedIcon, CodeIcon, GlobeIcon, MonitorIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { EditorWidget } from "./EditorWidget";
import { INTEGRATIONS } from "./integrations";
import { PageShell } from "./PageShell";
import { PATHS, type SitePath } from "./paths";

const icons: Record<SitePath, typeof CodeIcon> = {
  [PATHS.home]: GlobeIcon,
  [PATHS.editor]: GlobeIcon,
  [PATHS.vscode]: CodeIcon,
  [PATHS.obsidian]: BookMarkedIcon,
  [PATHS.jetbrains]: MonitorIcon,
};

const places = [
  {
    path: PATHS.editor,
    heading: "GEDCOM editor in the browser",
    note: "Nothing to install. In Chromium browsers, grant a folder and save straight back to it.",
  },
  ...INTEGRATIONS.map((integration) => ({
    path: integration.path,
    heading: integration.heading,
    note: integration.note,
  })),
];

const checks = [
  "Structure, cardinality and payload types, against the GEDCOM 5.5.1 and 7.0 specifications",
  "Cross-references that name no record, with a quick fix that points them at one that exists",
  "Levels that cannot follow the line above them",
  "Dates naming a day their calendar does not have, such as 31 FEB",
  "Extension tags used without a HEAD.SCHMA declaration",
  "Files the browser could not decode, refused rather than written back mangled",
];

/** A thumb gets the full width; a pointer gets a button the size of its label. */
const action = "h-11 w-full justify-center sm:h-9 sm:w-auto";

export function LandingPage() {
  return (
    <PageShell current={PATHS.home}>
      <div className="grid items-start gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-14">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            GEDCOM 5.5.1 and 7.0
          </span>
          <h1 className="mt-5 font-heading text-3xl leading-[1.1] font-semibold tracking-tight text-pretty sm:mt-6 sm:text-4xl sm:leading-[1.05] lg:text-5xl">
            The GEDCOM import didn&apos;t fail. One line did.
          </h1>
          <p className="mt-5 max-w-[46ch] text-[0.95rem] leading-relaxed text-muted-foreground sm:mt-6 sm:text-base">
            Domorium parses your <span className="font-mono">.ged</span> file,
            validates it against the specification, and puts every diagnostic on
            the line that caused it — in the browser and in the editor you
            already use.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <a
              href={PATHS.editor}
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                action,
              )}
            >
              Open the editor
            </a>
            {/* Three integrations, none of them the default: this leads to all
                of them rather than to whichever was named first. */}
            <a
              href="#editors"
              className={cn(
                buttonVariants({ variant: "secondary", size: "lg" }),
                action,
              )}
            >
              Get it for your editor
            </a>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground sm:mt-8 sm:text-sm">
            <span>Nothing is uploaded</span>
            <span>No account</span>
            <span>MIT licensed</span>
          </div>
        </div>

        <EditorWidget />
      </div>

      <section id="editors" className="mt-16 scroll-mt-8 sm:mt-24">
        <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
          One language service, four places to meet it
        </h2>
        <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-muted-foreground">
          The language intelligence exists once and each editor is a thin
          adapter over it, so a diagnostic reads the same wherever you meet it.
        </p>
        <ul className="mt-6 grid gap-3 sm:mt-7 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {places.map((place) => {
            const Icon = icons[place.path];
            return (
              <li
                key={place.path}
                className="flex flex-col gap-2.5 rounded-xl bg-card p-4 ring-1 ring-border sm:gap-3 sm:p-5"
              >
                <Icon className="size-5 text-primary" />
                <h3 className="font-heading text-base leading-snug font-semibold">
                  <a href={place.path} className="hover:text-primary">
                    {place.heading}
                  </a>
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {place.note}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-14 rounded-xl bg-card p-5 ring-1 ring-border sm:mt-20 sm:p-9">
        <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
          What it checks
        </h2>
        <ul className="mt-5 grid gap-x-10 gap-y-3 sm:mt-6 sm:grid-cols-2">
          {checks.map((check) => (
            <li
              key={check}
              className="text-sm leading-relaxed text-muted-foreground"
            >
              {check}
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-[68ch] border-t pt-5 text-sm leading-relaxed text-muted-foreground sm:mt-7 sm:pt-6">
          The GEDCOM 7 schema is generated from the FamilySearch release rather
          than transcribed by hand. GEDCOM 5.5.1 is published only as prose, so
          that one schema is maintained by hand.
        </p>
      </section>

      <section className="mt-14 flex flex-col gap-5 rounded-xl border p-5 sm:mt-20 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-6 sm:p-9">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight sm:text-xl">
            Open the file you already have
          </h2>
          <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
            The editor opens with an example, and your own file never leaves the
            page.
          </p>
        </div>
        <a
          href={PATHS.editor}
          className={cn(
            buttonVariants({ variant: "default", size: "lg" }),
            action,
          )}
        >
          Open the editor
        </a>
      </section>
    </PageShell>
  );
}
