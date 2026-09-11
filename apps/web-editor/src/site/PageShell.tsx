import { ExternalLinkIcon, MoonIcon, SunIcon, SunMoonIcon } from "lucide-react";
import type { ReactNode } from "react";

import { LINKS } from "@/constants/links";

import { NAV_LINKS, SiteHeader } from "./Chrome";
import { PATHS, type SitePath } from "./paths";

export interface PageShellProps {
  current: SitePath;
  children: ReactNode;
}

export function PageShell({ current, children }: PageShellProps) {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <SiteHeader current={current} />

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
              {NAV_LINKS.map((link) => (
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
