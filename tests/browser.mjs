
const assert = (await import("node:assert/strict")).default;
const { mkdir, writeFile } = await import("node:fs/promises");
const { createRequire } = await import("node:module");
const { games, site } = await import("../site/content.mjs");
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const local = "http://127.0.0.1:4173/kordius-games-site/";
const base = new URL(process.env.QA_SITE_URL || local);
const label = base.protocol === "https:" ? "public" : "local";
await mkdir("evidence", { recursive: true });
const browser = await chromium.launch({ channel: "msedge" });
const paths = ["", "games/", ...games.map((game) => `games/${game.id}/`), "about/", "contact/", "privacy/sticky-orbs/"];
const report = { origin: base.href, checks: [], requests: [], issues: [] };
const visited = new Set();
const pathFor = (language, route) => (language === "ru" ? "ru/" : "") + route;

async function run(name, action) {
  try {
    await action();
    report.checks.push({ name, ok: true });
  } catch (error) {
    report.checks.push({ name, ok: false, error: error.message });
    console.error(name, error.message);
  }
}

try {
  for (const width of [360, 768, 1440, 1920]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const issues = [];
    page.on("pageerror", (error) => issues.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") issues.push(message.text()); });
    page.on("response", (response) => { if (response.status() >= 400) issues.push(`${response.status()} ${response.url()}`); });
    page.on("requestfailed", (request) => issues.push(`${request.failure()?.errorText || "failed"} ${request.url()}`));
    page.on("request", (request) => visited.add(request.url()));

    for (const language of ["en", "ru"]) {
      for (const route of paths) {
        const relative = pathFor(language, route);
        await run(`${width}px ${relative || "/"}`, async () => {
          issues.length = 0;
          const target = new URL(relative, base);
          const response = await page.goto(target.href, { waitUntil: "load" });
          assert.equal(response.status(), 200);
          assert.equal(new URL(page.url()).href, target.href);
          assert.equal(await page.locator("html").getAttribute("lang"), language);
          assert.equal(await page.locator("h1").count(), 1);
          assert.match(await page.title(), /Kordius Games/);
          const info = await page.evaluate(async () => {
            const imgs = [...document.querySelectorAll("img[src]")];
            await Promise.all(imgs.map(async (img) => { img.loading = "eager"; await img.decode(); }));
            await document.fonts.ready;
            return {
              w: document.documentElement.scrollWidth,
              links: [...document.querySelectorAll("a[href]")].map((a) => [a.getAttribute("href"), a.href]),
              canonical: document.querySelector('link[rel="canonical"]')?.href,
              text: document.body.innerText,
            };
          });
          assert.ok(info.w <= width, `horizontal overflow (${info.w}px at ${width}px)`);
          assert.equal(info.canonical, new URL(relative, site.url).href);
          assert.doesNotMatch(info.text, /mimic|мимик|lorem ipsum|\[operator\]|\[privacy contact\]/i);
          if (route === "privacy/sticky-orbs/") {
            assert.match(info.text, /Yandex Mobile Ads/);
            assert.match(info.text, /AppMetrica/);
            assert.ok(info.links.some(([, href]) => href === `mailto:${site.email}`));
          }
          if (route === "contact/") assert.ok(info.links.some(([, href]) => href === `mailto:${site.email}`));
          for (const [raw, href] of info.links) {
            if (raw.startsWith("#")) {
              assert.equal(await page.locator(raw).count(), 1, `missing fragment ${raw}`);
            } else if (new URL(href).origin === base.origin) {
              assert.ok(new URL(href).pathname.startsWith(base.pathname), `outside site prefix: ${raw}`);
              visited.add(href);
            }
          }
          assert.deepEqual(issues, []);
          if (width === 1440 && relative === "") await page.screenshot({ path: `evidence/${label}-home-1440.png`, fullPage: true });
          if (width === 360 && relative === "ru/privacy/sticky-orbs/") await page.screenshot({ path: `evidence/${label}-privacy-ru-360.png`, fullPage: true });
        });
      }
    }

    if (width === 360) {
      await run("mobile menu opens, navigates and closes with Escape", async () => {
        await page.goto(base.href);
        const menu = page.getByRole("button", { name: "Menu" });
        const nav = page.getByRole("navigation", { name: "Menu" });
        assert.equal(await nav.isVisible(), false);
        await menu.click();
        assert.equal(await menu.getAttribute("aria-expanded"), "true");
        await page.keyboard.press("Escape");
        assert.equal(await nav.isVisible(), false);
        await menu.click();
        await nav.getByRole("link", { name: "Games" }).click();
        assert.equal(page.url(), new URL("games/", base).href);
        assert.equal(await nav.isVisible(), false);
      });
      await run("language switch preserves policy route", async () => {
        await page.goto(new URL("privacy/sticky-orbs/", base).href);
        await page.getByRole("link", { name: "Русский" }).click();
        assert.equal(page.url(), new URL("ru/privacy/sticky-orbs/", base).href);
        await page.getByRole("link", { name: "English" }).click();
        assert.equal(page.url(), new URL("privacy/sticky-orbs/", base).href);
      });
      await run("gallery opens and returns focus", async () => {
        await page.goto(new URL("games/sticky-orbs/", base).href);
        const trigger = page.locator("[data-gallery]").nth(1);
        await trigger.click();
        const dialog = page.getByRole("dialog");
        assert.equal(await dialog.isVisible(), true);
        assert.equal(await dialog.locator("figcaption").textContent(), "Crystal boss encounter");
        await page.keyboard.press("Escape");
        assert.equal(await dialog.isVisible(), false);
        assert.equal(await trigger.evaluate((el) => document.activeElement === el), true);
      });
    }
    await context.close();
  }

  await run("direct legal pages are readable with JavaScript disabled", async () => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    try {
      for (const language of ["en", "ru"]) {
        const page = await context.newPage();
        const response = await page.goto(new URL(pathFor(language, "privacy/sticky-orbs/"), base).href);
        assert.equal(response.status(), 200);
        assert.equal(await page.locator(".legal-body section").count(), 5);
        assert.equal(await page.locator(".legal-body a.address").isVisible(), true);
      }
    } finally { await context.close(); }
  });

  await run("all visited pages and resources are first-party and available", async () => {
    await Promise.all([...visited].map(async (href) => {
      const url = new URL(href);
      assert.equal(url.origin, base.origin);
      assert.ok(url.pathname.startsWith(base.pathname), href);
      const response = await fetch(url);
      assert.equal(response.status, 200, href);
      await response.body?.cancel();
    }));
  });
  await run("sitemap, robots and custom 404", async () => {
    const sitemap = await fetch(new URL("sitemap.xml", base));
    assert.equal(sitemap.status, 200);
    assert.equal((await sitemap.text()).match(/<loc>/g).length, paths.length * 2);
    assert.equal((await fetch(new URL("robots.txt", base))).status, 200);
    const missing = await fetch(new URL("not-a-page/", base));
    assert.equal(missing.status, 404);
    assert.match(await missing.text(), /Page not found/);
  });
} finally {
  await browser.close();
  report.requests = [...visited].sort();
  await writeFile(`evidence/${label}-browser.json`, JSON.stringify(report, null, 2) + "\n");
}
const passed = report.checks.filter((item) => item.ok).length;
console.log(`${label}: ${passed}/${report.checks.length} checks passed; ${visited.size} URLs inspected`);
if (passed !== report.checks.length) process.exitCode = 1;
