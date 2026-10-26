## Why

The site's pages name each extension and link to its store, but never say which version a reader would get. A reader comparing the site with a store, or checking whether a fix has shipped, has to leave the page to find out. The user asked for versions on `domorium.com` and for them to stay current without anyone touching the site.

## The requirement, as the user decided it

2026-10-26, three answers.

- Fetching versions from the stores at build time was offered first: **"Из магазинов при сборке сайта мне не нравится - хочется чтобы было более автоматически"** (they want it more automatic).
- Offered the browser, the build with automatic rebuilds, or both: **"В браузере, вживую (Recommended)"** — the page asks when it is opened.
- Told that the Visual Studio Marketplace's terms forbid calling its API outside Visual Studio products, and offered shields.io for every source with the VS Code version read from the latest `vscode-v*` tag: **"Всё через shields.io, VS Code — по тегу (Recommended)"**.

## What Changes

- An inline script on the landing page and the three integration pages asks shields.io, once the page is parsed, for the version of each product the page shows a slot for: the VS Code extension from the repository's latest `vscode-v*` tag, the Obsidian plugin from its latest GitHub release, the JetBrains plugin from the JetBrains Marketplace, and `@domorium/codemirror` from npm.
- Each answer is written into a slot inside an element the page already draws: the badge of each extension's card on the landing page, the product's chip at the top of its own page, and the "On npm" link. A slot whose source does not answer, or answers something that is not a version, stays hidden, and the page reads as its HTML does.
- Answers are kept for the tab's session, so moving between pages does not ask again.
- ADR-0017 sets the rule for any page script that asks a third party: public data only, no credentials, a timeout, the page unchanged without an answer, and the third parties named.

## Capabilities

### New Capabilities

- `web-editor/extension-versions`: showing on the site the version each product currently has.

### Modified Capabilities

None.

## Impact

- Layers: `apps/web-editor` only — `src/site/` gains a script and slots in two components. No package changes; dependencies still point down.
- Hosts: none of the editor hosts change. The editor at `/editor/` is untouched.
- Readers: up to four requests to shields.io per tab, revealing the reader's address to it; shields.io in turn asks GitHub, npm and JetBrains.
- Releases: the site deploys from `main`; nothing to version.

## Also in this change

At the user's request (2026-10-26, "сделай нормальную ссылку на гитхаб, а то там сейчас нет иконки гитхаба"), the header's and footer's links to the repository show GitHub's mark instead of a generic external-link arrow. lucide no longer ships brand icons, so the mark is drawn in `Marks.tsx` beside the others, from Simple Icons under CC0-1.0, and the footer's trademark note names it.
