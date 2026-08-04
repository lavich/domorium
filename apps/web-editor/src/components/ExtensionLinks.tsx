import { ExternalLinkIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LINKS } from "@/constants/links";

const extensions = [
  { label: "VS Code", href: LINKS.vscode },
  { label: "Obsidian", href: LINKS.obsidian },
  { label: "JetBrains", href: LINKS.jetbrains },
] as const;

export function ExtensionLinks() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Use Domorium in your editor</CardTitle>
        <CardDescription>
          Add GEDCOM validation, navigation, and autocomplete where you already
          work.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
        {extensions.map((extension) => (
          <a
            key={extension.label}
            className={buttonVariants({ variant: "outline" })}
            href={extension.href}
            target="_blank"
            rel="noreferrer"
          >
            {extension.label}
            <ExternalLinkIcon data-icon="inline-end" />
          </a>
        ))}
      </CardContent>
    </Card>
  );
}
