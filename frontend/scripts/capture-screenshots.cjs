/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Playwright capture script. */
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require(process.argv[2] || "playwright");
const output = path.resolve(__dirname, "../../docs/screenshots");
const catalogueTotal = require("../data/national-mountains.json").length;
const origin = process.env.SCREENSHOT_ORIGIN || "http://localhost:4173";

async function ready(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    window.scrollTo(0, 0);
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.race([
      Promise.all([...document.images].map((image) => image.decode().catch(() => {}))),
      new Promise((resolve) => setTimeout(resolve, 8000)),
    ]);
  });
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.waitForTimeout(400);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "Page overflows horizontally");
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-webgl", "--ignore-certificate-errors"] });
  try {
    await fs.mkdir(output, { recursive: true });
    for (const mobile of [false, true]) {
      const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, ignoreHTTPSErrors: true });
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      page.setDefaultNavigationTimeout(30000);
      console.log(mobile ? "Mobile capture" : "Desktop capture");
      const capture = async (filename) => { await ready(page); await page.screenshot({ path: path.join(output, filename), fullPage: !filename.includes("climb-destination") && !filename.includes("climb-multi-day") }); console.log(filename); };
      await page.goto(`${origin}/`, { waitUntil: "networkidle" });
      await capture(mobile ? "mobile-home-390w.png" : "desktop-home-flex.png");
      console.log("Opening mountains");
      await page.goto(`${origin}/mountains/`, { waitUntil: "domcontentloaded" });
      console.log("Waiting for map");
      await page.locator(".mountain-area-map [role=region][aria-busy]").waitFor({ state: "visible", timeout: 35000 });
      await page.waitForFunction(() => document.querySelector(".mountain-area-map [role=region]")?.getAttribute("aria-busy") === "false", null, { timeout: 35000 });
      console.log("Map loaded; checking layers");
      const areaTotal = await page.locator(".mountain-area-marker").evaluateAll((buttons) => buttons.reduce((total, button) => total + Number(button.textContent), 0));
      assert.equal(areaTotal, 800, "Default circles must count only primary mountains");
      await page.getByRole("switch", { name: "Reveal All Mountains" }).click();
      console.log("All mountains revealed");
      await page.waitForTimeout(300);
      assert.equal(await page.locator(".mountain-area-marker").evaluateAll((buttons) => buttons.reduce((total, button) => total + Number(button.textContent), 0)), catalogueTotal);
      await page.getByRole("switch", { name: "Reveal All Mountains" }).click();
      console.log("Selecting Ulap");
      if (mobile) {
        const handle = page.getByRole("button", { name: "Adjust mountain panel height" });
        await handle.click();
        await page.waitForTimeout(500);
        await page.locator(".mountain-area-marker[aria-label^=Cordillera]").tap();
        await page.waitForTimeout(1200);
        await page.getByRole("button", { name: "Show Mt. Ulap on map", exact: true }).click();
      } else {
        await page.getByRole("button", { name: "Show Mt. Ulap on map", exact: true }).click();
      }
      await page.waitForTimeout(1400);
      assert(new URL(page.url()).searchParams.has("zoom"), "Map camera must synchronize with URL");
      await capture(mobile ? "mobile-mountains-390w.png" : "desktop-mountains.png");
      const shared = page.url();
      const camera = new URL(shared).searchParams;
      await page.goto(shared, { waitUntil: "networkidle" });
      await page.locator(".mountain-area-map [role=status]").waitFor({ state: "hidden", timeout: 35000 });
      assert(Math.abs(Number(new URL(page.url()).searchParams.get("lat")) - Number(camera.get("lat"))) < 0.00001, "Shared camera latitude must restore");
      await page.goto(`${origin}/mountains/mount-pulag/`, { waitUntil: "networkidle" });
      await capture(mobile ? "mobile-pulag-guide-390w.png" : "desktop-pulag-guide.png");
      await page.goto(`${origin}/my-climbs/`, { waitUntil: "networkidle" });
      await capture(mobile ? "mobile-my-climbs-390w.png" : "desktop-my-climbs-complete.png");
      await page.getByRole("button", { name: "Add a climb", exact: true }).click();
      await page.locator("#climb-mountain").fill("Paminahawa");
      await page.getByRole("button", { name: /Paminahawa Ridge/ }).click();
      await capture(mobile ? "mobile-climb-destination.png" : "desktop-climb-destination.png");
      await page.locator("dialog").getByRole("button", { name: "Next", exact: true }).click();
      await page.getByRole("checkbox", { name: "Multi-day hike" }).check();
      await page.locator("#climb-date").fill("2026-09-01");
      await page.locator("#climb-finished-date").fill("2026-09-02");
      await capture(mobile ? "mobile-climb-multi-day.png" : "desktop-climb-multi-day.png");
      await page.getByRole("button", { name: "Close climb form" }).click();
      await context.close();
    }
    for (const [source, target] of [["mobile-home-390w.png", "mobile-home-flex-contained.png"], ["mobile-mountains-390w.png", "mobile-mountains.png"], ["mobile-pulag-guide-390w.png", "mobile-pulag-guide.png"], ["mobile-my-climbs-390w.png", "mobile-my-climbs-complete.png"]]) {
      await fs.copyFile(path.join(output, source), path.join(output, target));
    }
    console.log("Screenshots and browser checks completed.");
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
