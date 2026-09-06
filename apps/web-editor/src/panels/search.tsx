import type { Context } from "cordis";
import { SearchIcon } from "lucide-react";

export const searchAction = {
  name: "action-search",

  apply(ctx: Context) {
    ctx.rail.item({
      id: "search",
      order: 20,
      icon: SearchIcon,
      label: () => "Find in file",
      enabled: () => ctx.editor.attached,
      activate: () => ctx.editor.openSearch(),
    });
  },
};
