import { ExternalLinkIcon, MoonIcon, SunIcon, SunMoonIcon } from "lucide-react";

import { LINKS } from "@/constants/links";
import { cn } from "@/lib/utils";

import { INTEGRATIONS } from "./integrations";
import { PlaceMark } from "./Marks";
import { PATHS, type SitePath } from "./paths";

export const NAV_LINKS = [
  { href: PATHS.editor as SitePath, label: "Editor" },
  ...INTEGRATIONS.map((integration) => ({
    href: integration.path,
    label: integration.name,
  })),
];

export const chromeAction =
  "flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground";

export function Wordmark({ current }: { current?: SitePath }) {
  return (
    <a
      href={PATHS.home}
      className="flex shrink-0 items-center gap-2.5"
      aria-current={current === PATHS.home ? "page" : undefined}
    >
      <span className="flex size-7 items-center justify-center rounded-md border border-foreground/80">
        <img src="/favicon.svg" alt="" className="size-4" />
      </span>
      <span className="text-lg font-semibold tracking-tight">Domorium</span>
    </a>
  );
}

export function SiteNav({
  current,
  className,
}: {
  current?: SitePath;
  className?: string;
}) {
  return (
    <nav
      aria-label="Domorium tools"
      className={cn(
        "-mx-4 flex items-center gap-1 overflow-x-auto px-4 text-xs font-medium scrollbar-none sm:mx-0 sm:gap-6 sm:overflow-visible sm:px-0",
        className,
      )}
    >
      {NAV_LINKS.map((link) => (
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
  );
}

export function ProjectLink() {
  return (
    <a
      href={LINKS.github}
      rel="noreferrer"
      aria-label="The project on GitHub"
      className={chromeAction}
    >
      <ExternalLinkIcon className="size-4" />
    </a>
  );
}

/** The pill the whole design hangs its actions on. */
export const pill =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors";

/** The header every page of the domain wears, the editor's page among them. */
export function SiteHeader({ current }: { current: SitePath }) {
  return (
    <header className="sticky top-0 z-50 shrink-0 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-8 sm:px-8 sm:py-3">
        <Wordmark current={current} />
        <SiteNav current={current} />
        <div className="hidden items-center gap-3 sm:ml-auto sm:flex">
          <ProjectLink />
          {/* Armed and revealed by the theme script; the head runs it before
              the first paint, and a page without it never shows a button
              that could do nothing. */}
          <button
            type="button"
            data-theme-toggle
            aria-label="Change the colour theme"
            className={chromeAction}
          >
            <SunMoonIcon className="size-4" data-theme-icon="system" />
            <SunIcon className="size-4" data-theme-icon="light" />
            <MoonIcon className="size-4" data-theme-icon="dark" />
          </button>
        </div>
      </div>
    </header>
  );
}
