# The photographs on the platform pages

`public/shots` holds three frames per place, declared in
[`src/site/shots.ts`](../../src/site/shots.ts) and shown by
[`src/site/Photographs.tsx`](../../src/site/Photographs.tsx). They are captured
from the applications themselves rather than drawn, so they go stale when a
plugin's interface changes. This is the recipe that made them; following it
again produces frames that sit beside the old ones without a seam.

Nothing in the build depends on any of it. The files in `public/shots` are the
artefact, and they are committed.

## What every frame has in common

- **The window is 1000×640 points**, positioned at 60,80 and captured by its
  window id, so the crop is a number rather than a hand and a neighbouring
  window can never wander into frame.
- **The application's own dark theme**, because a window on these pages stands
  for someone else's application whatever the reader chose. Check it rather than
  trust it: the first JetBrains series was shot light because Settings Sync put
  the account's theme back over the `laf.xml` this recipe had set, and three
  frames went by before anyone read the pixels. One command settles it —
  `ffmpeg -i frame.png -vf "crop=400:200:400:400,scale=1:1" -f rawvideo -pix_fmt rgb24 - | xxd -p`
  should print something dark.
- **An editor font around 20pt.** The page draws a 1000pt window at a little
  over half its size, so anything smaller stops being readable there. This is
  the one setting worth changing before shooting and changing back after.
- **The example the site already serves**, `public/simpsons70.ged`, except in
  Obsidian, which is photographed in the plugin's own demo vault — its notes,
  its media and its cropped photograph are the thing being shown.

## Taking a frame

Put the window where the crop expects it:

```applescript
tell application "Visual Studio Code" to activate
tell application "System Events" to tell process "Code"
  set position of window 1 to {60, 80}
  set size of window 1 to {1000, 640}
end tell
```

Then capture the window rather than the screen rectangle. `screencapture -l`
takes a window id — read one from `CGWindowListCopyWindowInfo` — and `-o` drops
the drop shadow:

```sh
screencapture -x -o -l "$WINDOW_ID" frame.png     # 2000×1280, the display is 2×
screencapture -x -v -V 13 -R 60,80,1000,640 clip.mov
```

Two things that cost an afternoon the first time: `screencapture` will not
overwrite an existing video, so delete the file first; and it records a screen
rectangle rather than a window, so nothing may cover the window while it runs.

## Encoding what was captured

A still becomes one WebP at 1280 wide — twice the width the page draws it at:

```sh
cwebp -q 82 -resize 1280 0 frame.png -o public/shots/<place>-<n>.webp
```

A clip becomes an `mp4`, a `webm` and a WebP poster under the same name. The
poster is also what a reader who has asked for reduced motion is shown, so pick
a moment that says what the clip is about:

```sh
ffmpeg -ss "$START" -t "$SECONDS" -i clip.mov -vf "scale=1280:-2,fps=30" -an \
  -c:v libx264 -crf 24 -preset slow -pix_fmt yuv420p -movflags +faststart \
  public/shots/<place>-1.mp4
ffmpeg -ss "$START" -t "$SECONDS" -i clip.mov -vf "scale=1280:-2,fps=30" -an \
  -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 public/shots/<place>-1.webm
ffmpeg -ss "$POSTER" -i clip.mov -frames:v 1 -vf "scale=1280:-2" poster.png
cwebp -q 82 poster.png -o public/shots/<place>-1.webp
```

Every frame ends up 1280×820. A still lands around 50 KB and a clip around
250 KB per format, which is what keeps a platform page under a megabyte.

Two other pictures come off the same captures. A **card crop** is 1300×832 cut
out of a frame and encoded at 900 wide, for the landing page's cards, where a
whole window would be a picture of nothing:

```sh
ffmpeg -i frame.png -vf "crop=1300:832:$X:$Y" card.png
cwebp -q 82 -resize 900 0 card.png -o public/shots/<place>-card.webp
```

And the **editor's own poster** is taken from the running site rather than from
an application, through the URL the widget's frame loads, with a reference
broken in the browser so the picture carries the diagnostic it earns:

```js
await page.goto("http://localhost:5174/editor/?embed=1");
await page.getByText("@F0002@").first().click();
await page.keyboard.press("Meta+ArrowRight");
await page.keyboard.press("Shift+Meta+ArrowLeft");
await page.keyboard.type("1 FAMS @F0009@");
```

Move the pointer off the text before the shutter, or a hover card will be in the
picture. Take it twice, once per theme — the editor is this project's own window
and follows the reader's choice, so `editor.webp` and `editor-dark.webp` are
swapped by the `dark` variant rather than fixed dark like the others. Shoot it
in the proportion of the frame it fills, or `object-cover` will eat the panels
at its edges.

## What each frame shows

A frame may only show an ability [`src/site/abilities.ts`](../../src/site/abilities.ts)
marks for that place — the pictures cannot claim what the comparison denies.
The captions and alt text in `shots.ts` say what was chosen and why it was
chosen there.

The places were photographed in Visual Studio Code, in Obsidian with the
published plugin and its demo vault, and in WebStorm — the JetBrains page is
about IntelliJ-platform IDEs as a family, and WebStorm is one of them.
