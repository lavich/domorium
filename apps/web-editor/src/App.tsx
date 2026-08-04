import { TooltipProvider } from "@/components/ui/tooltip";

export function App() {
  return (
    <TooltipProvider>
      <main className="min-h-svh bg-background text-foreground" />
    </TooltipProvider>
  );
}
