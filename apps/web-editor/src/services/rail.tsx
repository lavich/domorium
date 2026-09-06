import { Service, type Context } from "cordis";
import type { ComponentType, ReactNode } from "react";

/**
 * Where an item's panel goes: beside the workspace, or beside the document. An
 * item with no panel is an action and names neither.
 */
export type RailSlot = "side" | "aux";

export interface RailItem {
  /** Also the identity of its open/closed state. */
  id: string;
  /** Ascending; ties keep registration order. */
  order?: number;
  icon: ComponentType<{ className?: string }>;
  /**
   * Told what the badge says, because "3 problems" is the label a reader needs.
   * Null where the item has nothing to count for the file in front.
   */
  label(badge: number | null): string;
  badge?(): number | null;
  /** Whether the item can be reached at all for the file in front. */
  enabled?(): boolean;
  slot?: RailSlot;
  render?(): ReactNode;
  /** For an item with no panel: what pressing it does. */
  activate?(): void;
  /** Panels open on first sight unless they say otherwise. */
  defaultOpen?: boolean;
}

export interface RailState {
  items: readonly RailItem[];
  open: ReadonlySet<string>;
}

/**
 * What the activity rail offers. Every entry is contributed by whoever implements
 * it, so the rail itself never learns the list.
 */
export class RailService extends Service {
  private readonly registered = new Map<string, RailItem>();
  private readonly opened = new Set<string>();
  private readonly listeners = new Set<() => void>();
  private state: RailState = { items: [], open: new Set() };

  constructor(ctx: Context) {
    super(ctx, "rail");
  }

  item(item: RailItem) {
    return this.ctx.effect(
      () => {
        if (this.registered.has(item.id)) {
          throw new Error(`rail item "${item.id}" is already registered`);
        }
        this.registered.set(item.id, item);
        if (item.render && (item.defaultOpen ?? true)) {
          this.opened.add(item.id);
        }
        this.publish();
        return () => {
          this.registered.delete(item.id);
          this.opened.delete(item.id);
          this.publish();
        };
      },
      `rail.item(${JSON.stringify(item.id)})`,
    );
  }

  get snapshot(): RailState {
    return this.state;
  }

  /** The panel showing in a slot, if any: one at a time, as a rail implies. */
  openIn(slot: RailSlot): RailItem | undefined {
    return openIn(this.state, slot);
  }

  toggle(id: string): void {
    const item = this.registered.get(id);
    if (!item) {
      throw new Error(`no rail item "${id}" is registered`);
    }
    if (!item.render) {
      item.activate?.();
      return;
    }
    if (!this.opened.delete(id)) {
      // One panel per slot: opening this one closes whatever it replaces.
      for (const other of this.state.items) {
        if (other.slot === item.slot) {
          this.opened.delete(other.id);
        }
      }
      this.opened.add(id);
    }
    this.publish();
  }

  private publish(): void {
    const items = [...this.registered.values()].sort(
      (one, other) => (one.order ?? 0) - (other.order ?? 0),
    );
    this.state = { items, open: new Set(this.opened) };
    for (const listener of [...this.listeners]) {
      listener();
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

/** For a component that already holds the snapshot and must not read past it. */
export function openIn(state: RailState, slot: RailSlot): RailItem | undefined {
  return state.items.find(
    (item) => item.slot === slot && state.open.has(item.id),
  );
}

declare module "cordis" {
  interface Context {
    rail: RailService;
  }
}
