import { ArrowRightIcon, ExternalLinkIcon, PackageIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { EditorWidget } from "./EditorWidget";
import { INTEGRATIONS } from "./integrations";
import { JetBrainsMock, mockFor, ObsidianMock, VsCodeMock } from "./mocks";
import { PageShell, pill } from "./PageShell";
import { PATHS } from "./paths";

const facts = ["Open source", "Cross-platform", "Nothing is uploaded"];

const checks = [
  "Structure, cardinality and payload types, against the GEDCOM 5.5.1 and 7.0 specifications",
  "Cross-references that name no record, with a quick fix that points them at one that exists",
  "Levels that cannot follow the line above them",
  "Dates naming a day their calendar does not have, such as 31 FEB",
];

function Eyebrow({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 font-mono text-[0.7rem] text-accent-foreground">
      <span className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function LandingPage() {
  return (
    <PageShell current={PATHS.home}>
      <section className="border-b">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div>
            <Eyebrow>GEDCOM ecosystem</Eyebrow>
            <h1 className="mt-6 max-w-[22ch] text-[2.1rem] leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl">
              GEDCOM tools, wherever you work.
            </h1>
            <p className="mt-6 max-w-[54ch] leading-relaxed text-muted-foreground">
              Plugins and extensions that bring GEDCOM editing, validation and
              navigation to the applications you already use — and a browser
              editor that runs the same parser on your own machine.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="#extensions"
                className={cn(
                  pill,
                  "h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto",
                )}
              >
                Explore extensions
              </a>
              <a
                href={PATHS.editor}
                className={cn(
                  pill,
                  "h-11 w-full border bg-card hover:bg-muted sm:w-auto",
                )}
              >
                Open the editor
              </a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
              {facts.map((fact) => (
                <li key={fact} className="flex items-center gap-2">
                  <span className="size-1 rounded-full bg-muted-foreground" />
                  {fact}
                </li>
              ))}
              <li className="font-mono">GEDCOM 5.5.1 / 7.0</li>
            </ul>
          </div>

          {/* A collage rather than a stack: three windows of one height would
              tower over the sentence they illustrate. */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <VsCodeMock />
            </div>
            <ObsidianMock />
            <JetBrainsMock />
          </div>
        </div>
      </section>

      <section id="extensions" className="scroll-mt-20 border-b">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Extensions</Eyebrow>
              <h2 className="mt-5 max-w-[26ch] text-2xl font-semibold tracking-tight sm:text-3xl">
                Bring GEDCOM to the tools you already use.
              </h2>
            </div>
            <p className="max-w-[38ch] text-sm leading-relaxed text-muted-foreground">
              One language service backs all of them, so a diagnostic reads the
              same wherever you meet it.
            </p>
          </div>

          <ul className="mt-10 grid gap-5 lg:grid-cols-3">
            {INTEGRATIONS.map((integration) => {
              const Mock = mockFor(integration.path);
              return (
                <li
                  key={integration.path}
                  className="flex flex-col gap-5 rounded-2xl border bg-card p-5 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold tracking-tight">
                      <a href={integration.path} className="hover:text-primary">
                        {integration.name}
                      </a>
                    </h3>
                    <span className="rounded-full bg-accent px-2.5 py-0.5 font-mono text-[0.65rem] text-accent-foreground">
                      released
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {integration.note}
                  </p>
                  {Mock ? <Mock /> : null}
                  <ul className="flex flex-wrap gap-1.5">
                    {integration.chips.map((chip) => (
                      <li
                        key={chip}
                        className="rounded-full border px-2.5 py-0.5 text-[0.7rem] text-muted-foreground"
                      >
                        {chip}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-sm">
                    <a
                      href={integration.path}
                      className="flex items-center gap-1.5 font-medium text-primary hover:underline"
                    >
                      {integration.heading}
                      <ArrowRightIcon className="size-3.5" />
                    </a>
                    <a
                      href={integration.repository}
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                    >
                      Source
                      <ExternalLinkIcon className="size-3.5" />
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-dashed p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex gap-4">
              <PackageIcon className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <h3 className="text-base font-semibold tracking-tight">
                  Embed it in your own editor
                </h3>
                <p className="mt-1.5 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
                  The same parser, schema and diagnostics are published as
                  <span className="font-mono"> @domorium/codemirror</span> for
                  any CodeMirror 6 host, and as
                  <span className="font-mono"> @domorium/validator</span> for
                  anything without an editor at all.
                </p>
              </div>
            </div>
            <a
              href="https://www.npmjs.com/package/@domorium/codemirror"
              rel="noreferrer"
              className={cn(
                pill,
                "h-10 shrink-0 border bg-card hover:bg-muted",
              )}
            >
              On npm
              <ExternalLinkIcon className="size-3.5" />
            </a>
          </div>
        </div>
      </section>

      <section id="editor" className="scroll-mt-20 border-b">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-8 sm:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-14">
          <div>
            <Eyebrow>The editor</Eyebrow>
            <h2 className="mt-5 max-w-[20ch] text-2xl font-semibold tracking-tight sm:text-3xl">
              A reference implementation.
            </h2>
            <p className="mt-5 max-w-[52ch] leading-relaxed text-muted-foreground">
              The browser editor runs the same parser, the same generated schema
              and the same diagnostics as every extension — with nothing to
              install and nothing uploaded. Open the example beside this text,
              or grant a folder and work on your own files in place.
            </p>
            <ul className="mt-7 grid gap-2.5">
              {checks.map((check) => (
                <li
                  key={check}
                  className="border-l-2 border-border pl-4 text-sm leading-relaxed text-muted-foreground"
                >
                  {check}
                </li>
              ))}
            </ul>
            <a
              href={PATHS.editor}
              className={cn(
                pill,
                "mt-8 h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto",
              )}
            >
              Open the editor
            </a>
          </div>
          <EditorWidget />
        </div>
      </section>

      <section className="px-4 py-14 sm:px-8 sm:py-20">
        <div
          className="mx-auto w-full max-w-6xl overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-12 sm:py-16"
          style={{ background: "#1a1c1a", color: "#f7f6f2" }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 font-mono text-[0.7rem] text-white/70">
            Open source
          </span>
          <h2 className="mx-auto mt-6 max-w-[26ch] text-2xl font-semibold tracking-tight sm:text-4xl">
            Choose your editor. Keep your file.
          </h2>
          <p className="mx-auto mt-5 max-w-[56ch] leading-relaxed text-white/70">
            Install the extension for the application you already work in, or
            open your <span className="font-mono">.ged</span> file in the
            browser. Nothing is converted to another format, and nothing leaves
            your machine.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#extensions"
              className={cn(pill, "h-11 w-full sm:w-auto")}
              style={{ background: "#f7f6f2", color: "#1a1c1a" }}
            >
              Explore extensions
            </a>
            <a
              href={PATHS.editor}
              className={cn(
                pill,
                "h-11 w-full border border-white/20 text-white hover:bg-white/10 sm:w-auto",
              )}
            >
              Open the editor
            </a>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
