## 1. The library

- [ ] 1.1 Add `resolveFileTarget` and `relativeFilePath` in `packages/language-service/src/libs/links/fileTargetPath.ts`, reusing `decodeFileTarget` and the separator rule of `retargetFileLinks.ts`, and export both from `src/index.ts`. Verify with tests written first in `fileTargetPath.test.ts`, one per scenario of `language-service/file-target-path`, plus the plugin's cases from `domorium-obsidian/src/editor/service.test.ts`
- [ ] 1.2 Add `drawnCrop` in `packages/language-service/src/libs/media/drawnCrop.ts` and export it. Verify with tests written first in `drawnCrop.test.ts`, one per scenario of `language-service/media-crop`, plus the plugin's cases from `domorium-obsidian/src/editor/media.test.ts`
- [ ] 1.3 Rebuild with `npm run build -w packages/language-service`. Verify that `dist/index.d.ts` declares the three functions

## 2. The web editor

- [ ] 2.1 Give `followLink` the document's dialect and resolve a `file-relative` link with `resolveFileTarget`; pass the dialect from `App.tsx`. Verify with tests in `apps/web-editor/src/workspace/followLink.test.ts`, one per scenario of `web-editor/follow-file-link`, keeping the existing ones

## 3. Documentation

- [ ] 3.1 `packages/language-service/README.md`: a short section on resolving a payload, spelling a path and clamping a crop, with an example whose names exist. Verify with `npm run check:docs` and by running the example against `dist`
- [ ] 3.2 `packages/language-service/CHANGELOG.md`: an `## Unreleased` entry naming the three functions and #380. Verify with `npm run check:docs`

## 4. Gate

- [ ] 4.1 Run `npm run check`; record whether `check:jetbrains` ran or was skipped for lack of a JDK
