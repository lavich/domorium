import {
  CheckIcon,
  CodeIcon,
  DownloadIcon,
  ExternalLinkIcon,
  MoonIcon,
  RotateCcwIcon,
  SunIcon,
  SunMoonIcon,
  UploadIcon,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LINKS } from "@/constants/links";

import { type ThemeChoice, useTheme } from "./ThemeProvider";

const themeItems: {
  value: ThemeChoice;
  label: string;
  icon: typeof SunIcon;
}[] = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: SunMoonIcon },
];

const productLinks = [
  { label: "VS Code", href: LINKS.vscode },
  { label: "Obsidian", href: LINKS.obsidian },
  { label: "JetBrains", href: LINKS.jetbrains },
] as const;

export interface SiteHeaderProps {
  fileName: string;
  modified: boolean;
  onOpenFile(): void;
  onDownload(): void;
  onReset(): void;
}

export function SiteHeader({
  fileName,
  modified,
  onOpenFile,
  onDownload,
  onReset,
}: SiteHeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="grid shrink-0 items-center gap-2 border-b px-4 py-3 md:grid-cols-[1fr_auto_1fr] lg:px-6">
      <a
        href="/"
        className="flex items-center gap-2 justify-self-start font-heading font-semibold"
      >
        <img src="/favicon.svg" alt="" className="size-7" />
        <span>Domorium</span>
      </a>
      <div className="flex items-center justify-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
            File
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={onOpenFile}>
              <UploadIcon />
              Open…
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDownload}>
              <DownloadIcon />
              Download copy
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onReset}>
              <RotateCcwIcon />
              Reset to the example
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <h1 className="flex items-center gap-2 font-mono text-[13px] font-normal">
          {fileName}
          {modified ? (
            <span
              aria-label="Unsaved changes"
              className="size-1.5 rounded-full bg-primary"
            />
          ) : null}
        </h1>
      </div>
      <nav
        aria-label="Domorium products and project links"
        className="flex flex-wrap items-center justify-center gap-1 md:justify-self-end"
      >
        {productLinks.map((product) => (
          <a
            key={product.label}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
            href={product.href}
            target="_blank"
            rel="noreferrer"
          >
            {product.label}
            <ExternalLinkIcon data-icon="inline-end" />
          </a>
        ))}
        <a
          className={buttonVariants({ variant: "ghost", size: "sm" })}
          href={LINKS.github}
          target="_blank"
          rel="noreferrer"
        >
          <CodeIcon data-icon="inline-start" />
          GitHub
          <ExternalLinkIcon data-icon="inline-end" />
        </a>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Choose color theme"
              />
            }
          >
            <SunMoonIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              {themeItems.map((item) => (
                <DropdownMenuItem
                  key={item.value}
                  onClick={() => setTheme(item.value)}
                >
                  <item.icon />
                  {item.label}
                  {theme === item.value ? (
                    <CheckIcon className="ml-auto" />
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </header>
  );
}
