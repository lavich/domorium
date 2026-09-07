import type { Context } from "cordis";

import { MarkdownPreview } from "@/components/FilePreview";
import { nameOf } from "@/workspace/workspace";

export const markdownSurface = {
  name: "surface-markdown",

  apply(ctx: Context) {
    ctx.surfaces.register({
      id: "markdown",
      order: 20,
      claims: (path) => /\.(md|markdown)$/.test(nameOf(path).toLowerCase()),
      reads: "text",
      render: (file) => (
        <MarkdownPreview
          name={file.name}
          text={file.initialText ?? ""}
          onReport={(report) =>
            ctx.workspace.dispatch({
              type: "reported",
              path: file.path,
              report,
            })
          }
        />
      ),
      facts: () => ["Markdown", "read-only"],
    });
  },
};
