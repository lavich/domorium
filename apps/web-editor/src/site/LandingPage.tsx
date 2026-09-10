import { BookMarkedIcon, CodeIcon, GlobeIcon, MonitorIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { EditorPreview } from "./EditorPreview";
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

export function LandingPage() {
  return (
    <PageShell current={PATHS.home}>
      <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-14">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            GEDCOM 5.5.1 and 7.0
          </span>
          <h1 className="mt-6 font-heading text-4xl leading-[1.05] font-semibold tracking-tight text-pretty sm:text-5xl">
            The GEDCOM import didn&apos;t fail. One line did.
          </h1>
          <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-muted-foreground">
            Domorium parses your <span className="font-mono">.ged</span> file,
            validates it against the specification, and puts every diagnostic on
            the line that caused it — in the browser and in the editor you
            already use.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href={PATHS.editor}
              className={buttonVariants({ variant: "default", size: "lg" })}
            >
              Open the editor
            </a>
            <a
              href={PATHS.vscode}
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              Get the extension
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-7 gap-y-2 text-sm text-muted-foreground">
            <span>Nothing is uploaded</span>
            <span>No account</span>
            <span>MIT licensed</span>
          </div>
        </div>

        <EditorPreview />
      </div>

      <section className="mt-24">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          One language service, four places to meet it
        </h2>
        <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-muted-foreground">
          The language intelligence exists once and each editor is a thin
          adapter over it, so a diagnostic reads the same wherever you meet it.
        </p>
        <ul className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {places.map((place) => {
            const Icon = icons[place.path];
            return (
              <li
                key={place.path}
                className="flex flex-col gap-3 rounded-xl bg-card p-5 ring-1 ring-border"
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

      <section className="mt-20 rounded-xl bg-card p-7 ring-1 ring-border sm:p-9">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          What it checks
        </h2>
        <ul className="mt-6 grid gap-x-10 gap-y-3 sm:grid-cols-2">
          {checks.map((check) => (
            <li
              key={check}
              className="text-sm leading-relaxed text-muted-foreground"
            >
              {check}
            </li>
          ))}
        </ul>
        <p className="mt-7 max-w-[68ch] border-t pt-6 text-sm leading-relaxed text-muted-foreground">
          The GEDCOM 7 schema is generated from the FamilySearch release rather
          than transcribed by hand. GEDCOM 5.5.1 is published only as prose, so
          that one schema is maintained by hand.
        </p>
      </section>

      <section className="mt-20 flex flex-wrap items-center justify-between gap-6 rounded-xl border p-7 sm:p-9">
        <div>
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Open the file you already have
          </h2>
          <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
            The editor opens with an example, and your own file never leaves the
            page.
          </p>
        </div>
        <a
          href={PATHS.editor}
          className={buttonVariants({ variant: "default", size: "lg" })}
        >
          Open the editor
        </a>
      </section>
    </PageShell>
  );
}
