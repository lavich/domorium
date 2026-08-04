import { ShieldCheckIcon, UploadIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { ExtensionLinks } from "./ExtensionLinks";

export function IntroPanel({ onOpenFile }: { onOpenFile(): void }) {
  return (
    <section className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">
          Local-first GEDCOM tools
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Open, validate and edit GEDCOM locally
        </h1>
        <p className="text-pretty text-muted-foreground">
          Work with family-history data directly in your browser, or bring the
          same editing assistance into your favorite editor.
        </p>
      </div>
      <Button size="lg" onClick={onOpenFile}>
        <UploadIcon data-icon="inline-start" />
        Open GEDCOM file
      </Button>
      <Alert>
        <ShieldCheckIcon />
        <AlertTitle>Private by design</AlertTitle>
        <AlertDescription>
          Processed locally — your file never leaves this browser.
        </AlertDescription>
      </Alert>
      <ExtensionLinks />
    </section>
  );
}
