import type { Context } from "cordis";

import { ImagePreview } from "@/components/FilePreview";
import { kilobytes } from "@/lib/utils";
import { nameOf } from "@/workspace/workspace";

export const imageSurface = {
  name: "surface-image",

  apply(ctx: Context) {
    ctx.surfaces.register({
      id: "image",
      order: 30,
      claims: (path) =>
        /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/.test(nameOf(path).toLowerCase()),
      reads: "nothing",
      render: (file) => (
        <ImagePreview
          name={file.name}
          path={file.path}
          // ctx.get, not ctx.files: a plugin fiber refuses a provided service it
          // did not inject, and the gateway comes and goes with the workspace.
          load={(path) => {
            const files = ctx.get("files", false);
            return files
              ? files.readBytes(path)
              : Promise.reject(new Error("No workspace is open"));
          }}
          onReport={(report) =>
            ctx.workspace.dispatch({
              type: "reported",
              path: file.path,
              report,
            })
          }
        />
      ),
      facts: (report) => [
        report.format,
        // Not "0 × 0": the browser has not decoded it yet, which is not a size.
        ...(report.width !== null && report.height !== null
          ? [`${report.width} × ${report.height}`]
          : []),
        kilobytes(report.bytes),
      ],
    });
  },
};
