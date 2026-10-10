/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser regression check. */
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs/promises");
const sharp = require("sharp");
const { chromium } = require(process.argv[2] || "playwright");
const origin = process.env.SCREENSHOT_ORIGIN || "http://localhost:3000";
const key = "ambangeg:my-climbs:local-preview:v1";

async function check() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${origin}/my-climbs/`);
      await page.evaluate((key) => localStorage.setItem(key, "[]"), key);
      await page.reload();
      await page.getByRole("button", { name: "Add a climb", exact: true }).click();
      await page.locator("#climb-mountain").fill("Pulag");
      await page.getByRole("button", { name: /^Mount Pulag Benguet/ }).click();
      await page.locator("dialog").getByRole("button", { name: "Next", exact: true }).click();
      const preview = page.locator("dialog img");
      assert((await preview.getAttribute("src")).includes("climb-default-pulag.jpg"));
      await page.locator("#climb-date").fill("2026-09-01");
      await page.getByRole("button", { name: "Save climb", exact: true }).click();
      await page.reload();
      const article = page.locator("article.climb-card").first();
      assert((await article.locator("img").getAttribute("src")).includes("climb-default-pulag.jpg"));
      await article.getByRole("button", { name: /^Edit / }).click();
      await page.locator("#climb-photo").setInputFiles({ name: "bad.txt", mimeType: "text/plain", buffer: Buffer.from("invalid") });
      await page.getByRole("alert").filter({ hasText: "Choose a JPG" }).waitFor();
      await page.locator("#climb-photo").setInputFiles({ name: "broken.jpg", mimeType: "image/jpeg", buffer: Buffer.from("invalid") });
      await page.getByRole("alert").filter({ hasText: "could not be opened" }).waitFor();
      await page.locator("#climb-photo").setInputFiles({ name: "large.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(15 * 1024 * 1024 + 1) });
      await page.getByRole("alert").filter({ hasText: "smaller than 15 MB" }).waitFor();
      await page.locator("#climb-photo").setInputFiles(path.resolve(__dirname, "../public/images/mountains/climb-default-pulag.jpg"));
      await page.waitForFunction(() => document.querySelector("dialog img")?.getAttribute("src")?.startsWith("data:image/jpeg;base64,"));
      const uploaded = await preview.getAttribute("src");
      assert(uploaded.length <= 240000);
      assert.equal(await page.locator("dialog").getByRole("alert").count(), 0);
      assert(await page.getByRole("button", { name: "Save changes" }).isEnabled());
      await page.evaluate(() => document.fonts.ready);
      await fs.mkdir(path.resolve(__dirname, "../../.map-debug"), { recursive: true });
      await page.screenshot({ path: path.resolve(__dirname, `../../.map-debug/climb-photo-${width}.png`) });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert(await page.locator("dialog").evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth));
      await page.getByRole("button", { name: "Save changes" }).click();
      await page.reload();
      assert.equal(await article.locator("img").getAttribute("src"), uploaded);
      await page.getByRole("button", { name: "Button Pins", exact: true }).click();
      assert.equal(await article.locator("img").getAttribute("src"), uploaded);
      await article.getByRole("button", { name: /^Edit / }).click();
      assert.equal(await preview.getAttribute("src"), uploaded);
      await page.locator("#climb-notes").fill("Photo stays when editing notes");
      await page.getByRole("button", { name: "Save changes" }).click();
      assert.equal(await article.locator("img").getAttribute("src"), uploaded);
      await article.getByRole("button", { name: /^Edit / }).click();
      const replacement = await sharp({ create: { width: 1200, height: 1600, channels: 3, background: "#226633" } }).png().toBuffer();
      await page.locator("#climb-photo").setInputFiles({ name: "replacement.png", mimeType: "image/png", buffer: replacement });
      await page.waitForFunction((previous) => {
        const src = document.querySelector("dialog img")?.getAttribute("src");
        return src?.startsWith("data:image/jpeg;base64,") && src !== previous;
      }, uploaded);
      await page.getByRole("button", { name: "Save changes" }).click();
      await page.reload();
      assert.notEqual(await article.locator("img").getAttribute("src"), uploaded);
      await article.getByRole("button", { name: /^Edit / }).click();
      await page.getByRole("button", { name: "Remove photo", exact: true }).click();
      assert((await preview.getAttribute("src")).includes("climb-default-pulag.jpg"));
      await page.getByRole("button", { name: "Save changes" }).click();
      await page.reload();
      assert((await article.locator("img").getAttribute("src")).includes("climb-default-pulag.jpg"));
      assert.equal(await article.getByText("Photo credit", { exact: true }).count(), 1);
      assert.deepEqual(await page.evaluate((key) => JSON.parse(localStorage.getItem(key))[0].photos, key), []);
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: optional default, upload, validation, replacement, edit, both layouts, reload and removal`);
      await context.close();
    }
  } finally { await browser.close(); }
}
check().catch((error) => { console.error(error); process.exitCode = 1; });
