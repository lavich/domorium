# Taking the photographs the site shows

`public/shots` holds three frames per place, declared in
[`src/site/shots.ts`](../../src/site/shots.ts) and shown by
[`src/site/Photographs.tsx`](../../src/site/Photographs.tsx). They are captured
from the applications themselves rather than drawn, so they go stale when a
plugin's interface changes. This is the runbook for taking them again so the new
ones sit beside the old without a seam.

Nothing in the build depends on any of it. The files in `public/shots` are the
artefact, and they are committed.

## Before the first frame

The capture scripts are macOS, and need `pyobjc`, `ffmpeg` and `cwebp`:

```sh
python3 -m venv ~/.shots-venv
~/.shots-venv/bin/pip install pyobjc-framework-Quartz
brew install ffmpeg webp
```

`editor-poster.mjs` needs Playwright, which the repository does not declare —
it reaches it through `@vscode/test-web` today, so run it with
`npx playwright@1` if that ever stops being true.

`screencapture` needs Screen Recording permission for whatever runs it, and
moving a window needs Accessibility. Both are refused quietly: a still comes out
holding the desktop, or `osascript` answers `-25211`.

## The tools

| Tool                                     | What it is for                                                 |
| ---------------------------------------- | -------------------------------------------------------------- |
| [`capture.py`](capture.py)               | Photograph one window by its id, or `--list` the candidates.   |
| [`pointer.py`](pointer.py)               | Rest the pointer on something, hold a modifier, follow a link. |
| [`encode.sh`](encode.sh)                 | `still`, `card` and `clip`, into what `public/shots` serves.   |
| [`editor-poster.mjs`](editor-poster.mjs) | Photograph this project's own editor, in both themes.          |

## What every frame has in common

- **The window is 1000×640 points**, at 60,80, captured by its window id. The
  crop is then a number rather than a hand, and a neighbouring window cannot
  wander into frame.
- **The application's own dark theme**, because a window on these pages stands
  for someone else's application whatever the reader chose. Check it rather than
  trust it — a theme forced through `laf.xml` loses to JetBrains Settings Sync at
  startup, and a thumbnail is a poor witness:

  ```sh
  ffmpeg -i frame.png -vf "crop=400:200:400:400,scale=1:1" \
    -f rawvideo -pix_fmt rgb24 - | xxd -p     # should print something dark
  ```

- **An editor font around 20pt.** The page draws a 1000pt window at a little over
  half its size, so anything smaller stops being readable there. Change it before
  shooting and change it back after.
- **The example the site already serves**, `public/simpsons70.ged`, except in
  Obsidian, which is photographed in the plugin's own demo vault — its notes, its
  media and its cropped photograph are the thing being shown.

## Taking one

Put the window where the crop expects it, then photograph it:

```sh
osascript -e 'tell application "Visual Studio Code" to activate' \
  -e 'tell application "System Events" to tell process "Code"
        set position of window 1 to {60, 80}
        set size of window 1 to {1000, 640}
      end tell'

~/.shots-venv/bin/python capture.py --owner Code --app "Visual Studio Code" --out frame.png
```

A clip is a screen rectangle rather than a window, so nothing may cover the
window while it runs — and `screencapture` will not overwrite an existing video,
so delete it first:

```sh
rm -f clip.mov
screencapture -x -v -V 13 -R 60,80,1000,640 clip.mov
```

Drive the application with `osascript` keystrokes between the two. Where a
preview opens on hover, use `pointer.py`: a hover counts the pointer standing
still, so a loop that keeps nudging it never opens one.

## Encoding

```sh
./encode.sh still frame.png ../../public/shots/vscode-2
./encode.sh card  frame.png ../../public/shots/vscode-card 600 448
./encode.sh clip  clip.mov  ../../public/shots/vscode-1 1.2 11.6 4.0
```

Every frame ends up 1280×820 and every card 900×576. A still lands around 50 KB
and a clip around 250 KB per format, which is what keeps a platform page under a
megabyte. A clip's poster is also what a reader who has asked for reduced motion
is shown, so pick a moment that says what the clip is about.

The editor's own poster comes from the running site instead, in both themes,
since it is this project's window and follows the reader's choice. Shoot it in
the proportion of the frame it fills, or `object-cover` eats the panels at its
edges:

```sh
npm run dev -w apps/web-editor
node editor-poster.mjs http://localhost:5173 /tmp/shots
./encode.sh still /tmp/shots/editor.png      ../../public/shots/editor
./encode.sh still /tmp/shots/editor-dark.png ../../public/shots/editor-dark
```

## Afterwards

Declare the frame in [`src/site/shots.ts`](../../src/site/shots.ts) with its
caption and alt text, and run `npm run check`. The tests hold that every place
has its three frames, that every file a frame names exists, that nothing in
`public/shots` goes unused, and that alt text is not a copy of the caption.

A frame may only show an ability
[`src/site/abilities.ts`](../../src/site/abilities.ts) marks for that place — a
picture cannot claim what the comparison denies.

The places were photographed in Visual Studio Code, in Obsidian with the
published plugin and its demo vault, and in WebStorm — the JetBrains page is
about IntelliJ-platform IDEs as a family, and WebStorm is one of them.
