import type { Context, InjectKey } from "cordis";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import type { RailState } from "@/services/rail";
import type { Workspace } from "@/workspace/workspace";

const ReactCordisContext = createContext<Context | null>(null);

export function CordisProvider({
  ctx,
  children,
}: {
  ctx: Context;
  children: ReactNode;
}) {
  return <ReactCordisContext value={ctx}>{children}</ReactCordisContext>;
}

export function useCordis(): Context {
  const ctx = useContext(ReactCordisContext);
  if (!ctx) {
    throw new Error("useCordis was called outside a CordisProvider");
  }
  return ctx;
}

/**
 * The subscription counts changes rather than holding the service: cordis builds
 * a fresh proxy on every read, so a snapshot read through the context would be a
 * new object each render and React would never settle.
 */
export function useService<K extends InjectKey>(
  name: K,
): Context[K] | undefined {
  const ctx = useCordis();
  const store = useMemo(() => revisions(ctx, name), [ctx, name]);
  useSyncExternalStore(store.subscribe, store.read, store.read);
  return ctx.get(name, false);
}

function revisions(ctx: Context, name: string) {
  let revision = 0;
  // Nothing the event can carry, so the first notification always counts and the
  // second one cordis sends for a single provide does not.
  let last: unknown = Symbol("unset");
  return {
    subscribe(notify: () => void) {
      const off = ctx.on("internal/service", (changed: string, value) => {
        if (changed !== name || value === last) {
          return;
        }
        last = value;
        revision += 1;
        notify();
      });
      return () => {
        off();
      };
    },
    read: () => revision,
  };
}

export function useWorkspace(): Workspace {
  const ctx = useCordis();
  return useSyncExternalStore(
    useCallback((notify: () => void) => ctx.workspace.subscribe(notify), [ctx]),
    () => ctx.workspace.snapshot,
  );
}

export function useRail(): RailState {
  const ctx = useCordis();
  return useSyncExternalStore(
    useCallback((notify: () => void) => ctx.rail.subscribe(notify), [ctx]),
    () => ctx.rail.snapshot,
  );
}
