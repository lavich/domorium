import { ExternalLinkIcon, MoonIcon, SunIcon, SunMoonIcon } from "lucide-react";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { LINKS } from "@/constants/links";
import { cn } from "@/lib/utils";

import { INTEGRATIONS } from "./integrations";
import { PATHS, type SitePath } from "./paths";

const navLinks = [
  { href: PATHS.editor, label: "Editor" },
  ...INTEGRATIONS.map((integration) => ({
    href: integration.path,
    label: integration.name,
  })),
];

export interface PageShellProps {
  current: SitePath;
  children: ReactNode;
}

export function PageShell({ current, children }: PageShellProps) {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-6 sm:px-10 sm:py-4">
          <a
            href={PATHS.home}
            className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight"
            aria-current={current === PATHS.home ? "page" : undefined}
          >
            <img src="/favicon.svg" alt="" className="size-6" />
            Domorium
          </a>
          {/* One row that scrolls rather than a second row of small targets:
              a thumb needs the height, and the labels are the navigation. */}
          <nav
            aria-label="Domorium tools"
            className="-mx-4 flex items-center gap-1 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:ml-auto sm:overflow-visible sm:px-0"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                aria-current={current === link.href ? "page" : undefined}
                className={cn(
                  buttonVariants({
                    variant: current === link.href ? "secondary" : "ghost",
                    size: "sm",
                  }),
                  "h-11 shrink-0 px-3 sm:h-7 sm:px-2.5",
                )}
              >
                {link.label}
              </a>
            ))}
            {/* Armed and revealed by the theme script; the head runs it before
                the first paint, and a page without it never shows a button
                that could do nothing. */}
            <button
              type="button"
              data-theme-toggle
              aria-label="Change the colour theme"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
                "size-11 shrink-0 sm:size-7",
              )}
            >
              <SunMoonIcon data-theme-icon="system" />
              <SunIcon data-theme-icon="light" />
              <MoonIcon data-theme-icon="dark" />
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-10 sm:py-20">
        {children}
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-10 sm:py-10">
          <nav
            aria-label="Domorium"
            className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm"
          >
            <a
              href={PATHS.home}
              className="py-1.5 text-muted-foreground hover:text-foreground"
            >
              Home
            </a>
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="py-1.5 text-muted-foreground hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <a
              href={LINKS.github}
              rel="noreferrer"
              className="flex items-center gap-1.5 py-1.5 text-muted-foreground hover:text-foreground"
            >
              Source
              <ExternalLinkIcon className="size-3.5" />
            </a>
          </nav>
          <p className="max-w-[76ch] text-xs leading-relaxed text-muted-foreground">
            MIT licensed. Domorium is an independent project and is not
            affiliated with or endorsed by FamilySearch or Intellectual Reserve,
            Inc. FAMILYSEARCH GEDCOM™ and FAMILYSEARCH® are trademarks of
            Intellectual Reserve, Inc.
          </p>
        </div>
      </footer>
    </div>
  );
}
