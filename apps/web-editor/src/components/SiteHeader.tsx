import {
  CheckIcon,
  CodeIcon,
  MoonIcon,
  SunIcon,
  SunMoonIcon,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
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

export function SiteHeader() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex items-center justify-between gap-4 border-b px-4 py-3 lg:px-6">
      <a
        href="/"
        className="flex items-center gap-2 font-heading font-semibold"
      >
        <img src="/favicon.svg" alt="" className="size-7" />
        <span>Domorium</span>
      </a>
      <nav aria-label="Project" className="flex items-center gap-1">
        <a
          className={buttonVariants({ variant: "ghost" })}
          href={LINKS.github}
          target="_blank"
          rel="noreferrer"
        >
          <CodeIcon data-icon="inline-start" />
          GitHub
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
