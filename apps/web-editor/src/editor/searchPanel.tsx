import {
  closeSearchPanel,
  findNext,
  findPrevious,
  getSearchQuery,
  replaceAll,
  replaceNext,
  selectMatches,
  SearchQuery,
  setSearchQuery,
} from "@codemirror/search";
import type { EditorView, Panel } from "@codemirror/view";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ReplaceAllIcon,
  ReplaceIcon,
  TextSelectIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const field =
  "h-7 w-44 rounded-md border bg-background px-2 font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** CodeMirror's own panel is built from bare controls; this one is the shell's. */
export function searchPanel(view: EditorView): Panel {
  const dom = document.createElement("div");
  dom.className = "cm-search";
  const root = createRoot(dom);
  root.render(<SearchPanel view={view} />);

  return {
    dom,
    top: true,
    destroy() {
      // React refuses a root unmounted while it renders, and CodeMirror takes
      // the panel down inside a dispatch.
      queueMicrotask(() => root.unmount());
    },
  };
}

function SearchPanel({ view }: { view: EditorView }) {
  const opening = getSearchQuery(view.state);
  const [search, setSearch] = useState(opening.search);
  const [replace, setReplace] = useState(opening.replace);
  const searchField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchField.current?.select();
    searchField.current?.focus();
  }, []);

  /** The flags the panel no longer shows are still the query's, untouched. */
  const ask = (next: { search?: string; replace?: string }) => {
    const current = getSearchQuery(view.state);
    view.dispatch({
      effects: setSearchQuery.of(
        new SearchQuery({
          search: next.search ?? search,
          replace: next.replace ?? replace,
          caseSensitive: current.caseSensitive,
          literal: current.literal,
          regexp: current.regexp,
          wholeWord: current.wholeWord,
        }),
      ),
    });
  };

  const close = () => {
    closeSearchPanel(view);
    view.focus();
  };

  return (
    <TooltipProvider>
      <div
        className="flex flex-wrap items-center gap-1.5 px-3 py-2 pr-10"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            close();
          }
        }}
      >
        <input
          ref={searchField}
          main-field="true"
          value={search}
          placeholder="Find"
          aria-label="Find"
          className={field}
          onChange={(event) => {
            setSearch(event.target.value);
            ask({ search: event.target.value });
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return;
            }
            event.preventDefault();
            (event.shiftKey ? findPrevious : findNext)(view);
          }}
        />
        <Action label="Previous match" onClick={() => findPrevious(view)}>
          <ChevronUpIcon />
        </Action>
        <Action label="Next match" onClick={() => findNext(view)}>
          <ChevronDownIcon />
        </Action>
        <Action label="Select every match" onClick={() => selectMatches(view)}>
          <TextSelectIcon />
        </Action>

        <span className="basis-full" />

        <input
          value={replace}
          placeholder="Replace"
          aria-label="Replace"
          className={field}
          onChange={(event) => {
            setReplace(event.target.value);
            ask({ replace: event.target.value });
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return;
            }
            event.preventDefault();
            replaceNext(view);
          }}
        />
        <Action label="Replace this match" onClick={() => replaceNext(view)}>
          <ReplaceIcon />
        </Action>
        <Action label="Replace every match" onClick={() => replaceAll(view)}>
          <ReplaceAllIcon />
        </Action>

        <div className="absolute top-2 right-2">
          <Action label="Close the search" onClick={close}>
            <XIcon />
          </Action>
        </div>
      </div>
    </TooltipProvider>
  );
}

function Action({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick(): void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            onClick={onClick}
            className="size-7 rounded-md text-muted-foreground"
          />
        }
      >
        {children}
      </TooltipTrigger>
      {/* Downwards, into the document: upwards it would cover the tabs. */}
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
