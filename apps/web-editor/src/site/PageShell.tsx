import { CodeIcon, ExternalLinkIcon } from "lucide-react";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { LINKS } from "@/constants/links";

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
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4">
          <a
            href={PATHS.home}
            className="flex items-center gap-2 font-heading text-base font-semibold"
            aria-current={current === PATHS.home ? "page" : undefined}
          >
            <img src="/favicon.svg" alt="" className="size-6" />
            Domorium
          </a>
          <nav
            aria-label="Domorium tools"
            className="ml-auto flex flex-wrap items-center gap-1"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                aria-current={current === link.href ? "page" : undefined}
                className={buttonVariants({
                  variant: current === link.href ? "secondary" : "ghost",
                  size: "sm",
                })}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
        {children}
      </main>
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-8">
          <nav
            aria-label="Domorium"
            className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
          >
            <a href={PATHS.home} className="hover:text-primary">
              Home
            </a>
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="hover:text-primary"
              >
                {link.label}
              </a>
            ))}
            <a
              href={LINKS.github}
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-primary"
            >
              <CodeIcon className="size-3.5" />
              Source
              <ExternalLinkIcon className="size-3" />
            </a>
          </nav>
          <p className="max-w-[68ch] text-xs leading-relaxed text-muted-foreground">
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
