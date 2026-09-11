// Photograph the browser editor for the landing page's widget, in both themes.
//
//   npm run dev -w apps/web-editor
//   node apps/web-editor/scripts/shots/editor-poster.mjs http://localhost:5173 /tmp/out
//
// It breaks a cross-reference in the browser so the picture carries a
// diagnostic the file has actually earned, and shoots the proportion of the
// frame it will fill — `object-cover` eats the panels at the edges otherwise.

// The lint configuration declares no environment globals, so every built-in is
// imported by name.
import console from "node:console";
import process from "node:process";

import { chromium } from "playwright";

const [base = "http://localhost:5173", out = "."] = process.argv.slice(2);
const browser = await chromium.launch();

for (const theme of ["light", "dark"]) {
  const page = await browser.newPage({
    viewport: { width: 900, height: 760 },
    deviceScaleFactor: 2,
    colorScheme: theme,
  });
  await page.addInitScript(
    (t) => globalThis.localStorage.setItem("domorium-theme", t),
    theme,
  );
  await page.goto(`${base}/editor/?embed=1`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);

  await page.getByText("@F0002@").first().click();
  await page.keyboard.press("Meta+ArrowRight");
  await page.keyboard.press("Shift+Meta+ArrowLeft");
  await page.keyboard.type("1 FAMS @F0009@");
  await page.waitForTimeout(2500);

  await page.mouse.move(430, 380);
  await page.mouse.wheel(0, 150);
  await page.waitForTimeout(1000);
  // A hover card follows the pointer into the picture if it is left on the text.
  await page.mouse.move(60, 720);
  await page.waitForTimeout(1800);

  const file = `${out}/editor${theme === "dark" ? "-dark" : ""}.png`;
  await page.screenshot({ path: file });
  console.log(file);
  await page.close();
}

await browser.close();
