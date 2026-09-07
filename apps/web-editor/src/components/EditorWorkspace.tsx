import { useEffect, useState } from "react";

import { ActivityRail } from "./ActivityRail";
import { DocumentPane } from "./DocumentPane";
import { StatusBar } from "./StatusBar";
import { useRail } from "@/cordis/react";
import { openIn } from "@/services/rail";

export function EditorWorkspace() {
  const rail = useRail();
  const wideEnoughForPanels = useMediaQuery("(min-width: 768px)");
  const side = wideEnoughForPanels ? openIn(rail, "side") : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        <ActivityRail />
        {side?.render?.()}
        <DocumentPane wideEnoughForPanels={wideEnoughForPanels} />
      </div>
      <StatusBar />
    </div>
  );
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const update = () => setMatches(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, [query]);

  return matches;
}
