import { ExternalLinkIcon, MoonIcon, SunIcon, SunMoonIcon } from "lucide-react";
import type { ReactNode } from "react";

import { LINKS } from "@/constants/links";
import { cn } from "@/lib/utils";

import { INTEGRATIONS } from "./integrations";
import { PlaceMark } from "./Marks";
import { PATHS, type SitePath } from "./paths";

const navLinks = [
  { href: PATHS.editor, label: "Editor" },
  ...INTEGRATIONS.map((integration) => ({
    href: integration.path,
    label: integration.name,
  })),
];

/** The pill the whole design hangs its actions on. */
export const pill =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors";

export interface PageShellProps {
  current: SitePath;
  children: ReactNode;
}

export function PageShell({ current, children }: PageShellProps) {
  return (
    <div className="site flex min-h-svh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-8 sm:px-8 sm:py-3">
          <a
            href={PATHS.home}
            className="flex shrink-0 items-center gap-2.5"
            aria-current={current === PATHS.home ? "page" : undefined}
          >
            <span className="flex size-7 items-center justify-center rounded-md border border-foreground/80">
              <img src="/favicon.svg" alt="" className="size-4" />
            </span>
            <span className="text-lg font-semibold tracking-tight">
              Domorium
            </span>
          </a>
          <nav
            aria-label="Domorium tools"
            className="-mx-4 flex items-center gap-1 overflow-x-auto px-4 text-xs font-medium scrollbar-none sm:mx-0 sm:gap-6 sm:overflow-visible sm:px-0"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                aria-current={current === link.href ? "page" : undefined}
                className={cn(
                  "flex h-11 shrink-0 items-center px-2 transition-colors sm:h-auto sm:px-0",
                  current === link.href
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {link.href === PATHS.editor ? null : (
                  <PlaceMark place={link.href} className="mr-1.5 size-3.5" />
                )}
                {link.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-3 sm:ml-auto sm:flex">
            <a
              href={LINKS.github}
              rel="noreferrer"
              aria-label="The project on GitHub"
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <ExternalLinkIcon className="size-4" />
            </a>
            {/* Armed and revealed by the theme script; the head runs it before
                the first paint, and a page without it never shows a button
                that could do nothing. */}
            <button
              type="button"
              data-theme-toggle
              aria-label="Change the colour theme"
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <SunMoonIcon className="size-4" data-theme-icon="system" />
              <SunIcon className="size-4" data-theme-icon="light" />
              <MoonIcon className="size-4" data-theme-icon="dark" />
            </button>
            <a
              href={PATHS.editor}
              className={cn(pill, "h-8 bg-primary text-primary-foreground")}
            >
              Open the editor
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-8">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <span className="text-sm font-semibold tracking-tight">
              Domorium
            </span>
            <nav
              aria-label="Domorium"
              className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm"
            >
              <a
                href={PATHS.home}
                className="py-1 text-muted-foreground hover:text-foreground"
              >
                Home
              </a>
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="py-1 text-muted-foreground hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
              <a
                href={LINKS.github}
                rel="noreferrer"
                className="flex items-center gap-1.5 py-1 text-muted-foreground hover:text-foreground"
              >
                GitHub
                <ExternalLinkIcon className="size-3.5" />
              </a>
            </nav>
            {/* The theme is reachable from the footer too: on a phone the
                header keeps only the wordmark and the navigation. */}
            <button
              type="button"
              data-theme-toggle
              data-theme-compact
              aria-label="Change the colour theme"
              className="ml-auto h-9 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            >
              <SunMoonIcon className="size-4" data-theme-icon="system" />
              <SunIcon className="size-4" data-theme-icon="light" />
              <MoonIcon className="size-4" data-theme-icon="dark" />
              Theme
            </button>
          </div>
          <p className="max-w-[76ch] text-xs leading-relaxed text-muted-foreground">
            MIT licensed, and open source. Domorium is an independent project
            and is not affiliated with or endorsed by FamilySearch or
            Intellectual Reserve, Inc. FAMILYSEARCH GEDCOM™ and FAMILYSEARCH®
            are trademarks of Intellectual Reserve, Inc. Visual Studio Code,
            Obsidian and the JetBrains marks belong to their owners and name
            here only the applications these plugins run in.
          </p>
        </div>
      </footer>
    </div>
  );
}
