import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { copy, games, site } from "./site/content.mjs";
import { sections, yandexPrivacy, yandexAdsData, appMetricaData, githubPrivacy } from "./site/privacy.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, "docs");
const langs = ["en", "ru"];
const policy = "privacy/sticky-orbs/";
const paths = ["", "games/", ...games.map((game) => `games/${game.id}/`), "about/", "contact/", policy];
const prefix = (lang, route) => (lang === "ru" ? "ru/" : "") + route;
const safe = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);
const absolute = (route) => new URL(route, site.url).href;
const assetPath = (file) => "assets/" + file;
const email = `<a class="address" href="mailto:${safe(site.email)}">${safe(site.email)}</a>`;

function render(lang, route, error = false) {
  const c = copy[lang];
  const other = lang === "en" ? "ru" : "en";
  const location = prefix(lang, route);
  const up = location ? "../".repeat(location.split("/").length - 1) : "./";
  const link = (target, language = lang) =>
    error ? absolute(prefix(language, target)) : up + prefix(language, target);
  const asset = (file) => error ? absolute(assetPath(file)) : up + assetPath(file);
  const cta = (label, target, secondary = false) =>
    `<a class="cta${secondary ? " secondary" : ""}" href="${safe(target)}">${safe(label)}</a>`;
  const intro = (tag, title, summary = "") => `<header class="page-intro">
    ${tag ? `<p class="kicker">${safe(tag)}</p>` : ""}<h1>${safe(title)}</h1>
    ${summary ? `<p>${safe(summary)}</p>` : ""}</header>`;
  const photo = (game, file = game.image, alt = game[lang].alt, eager = false) =>
    `<img src="${asset(file)}" alt="${safe(alt)}" width="${game.width}" height="${game.height}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  const artClass = (game) => game.id === "hordefuse" ? " horde-art" : "";
  const card = (game, heading = "h3") => {
    const g = game[lang];
    const href = link(`games/${game.id}/`);
    return `<article class="card">
      <div class="card-image${artClass(game)}">${photo(game, game.id === "sticky-orbs" ? "sticky-boss-crystal.webp" : game.image, game.id === "sticky-orbs" ? game[lang].gallery[1] : game[lang].alt)}<span class="image-note">${safe(game.id === "sticky-orbs" ? c.capture : c.art)}</span></div>
      <div class="card-body">
        <div class="card-meta"><span>${safe(g.genre)}</span><span class="status">${safe(c.inDevelopment)}</span></div>
        <${heading}><a href="${href}">${safe(g.name)}</a></${heading}>
        <p>${safe(g.pitch)}</p>
        <a href="${href}" class="text-link" aria-label="${safe(c.details + " · " + g.name)}">${safe(c.details)}</a>
      </div></article>`;
  };
  const studio = `<section class="section studio-band"><div class="wrap">
      <h2>${safe(c.studioTitle)}</h2>
      <div><p>${safe(c.studioBody)}</p><a class="text-link" href="${link("contact/")}">${safe(c.contact)}</a></div>
    </div></section>`;
  const sticky = games[0];
  let title, description, body, og = sticky.image;
  if (error) {
    title = c.missing;
    description = c.missing;
    body = `<section class="wrap page-section">${intro("", title)}${cta(c.returnHome, link(""))}</section>`;
  } else if (!route) {
    title = c.heroA + " " + c.heroB;
    description = c.intro;
    body = `<section class="hero">
      <div class="wrap hero-grid"><div class="hero-copy">
        <p class="kicker">${safe(c.descriptor)}</p>
        <h1>${safe(c.heroA)}<span>${safe(c.heroB)}</span></h1>
        <p>${safe(c.intro)}</p>
        <div class="actions">${cta(c.seeGames, "#games")}${cta(c.contact, link("contact/"), true)}</div>
      </div>
      <figure class="hero-image">${photo(sticky, sticky.image, sticky[lang].alt, true)}
        <figcaption>${safe(sticky[lang].name)} · ${safe(c.capture)}</figcaption></figure></div>
      </section>
      <section class="wrap section" id="games"><header class="section-head"><h2>${safe(c.projects)}</h2></header>
        <div class="grid">${games.map((game) => card(game)).join("")}</div></section>${studio}`;
  } else if (route === "games/") {
    title = c.projects;
    description = c.libraryIntro;
    body = `<section class="wrap page-section">${intro("", title, description)}
      <div class="grid">${games.map((game) => card(game, "h2")).join("")}</div></section>`;
  } else if (route === "about/") {
    title = c.studio;
    description = c.studioBody;
    body = `<section class="wrap page-section">${intro(c.descriptor, c.studioTitle, description)}
      <p class="page-paragraph">${safe(c.studioContact)}</p><div class="actions">${cta(c.contact, link("contact/"))}</div>
      </section>`;
  } else if (route === "contact/") {
    title = c.contact;
    description = c.contactIntro;
    body = `<section class="wrap page-section">${intro("", c.contactTitle, description)}
      <p>${email}</p>
      <div class="actions">${cta(c.write, "mailto:" + site.email)}</div>
      <div class="contact-grid" style="margin-top:2rem">
        <section class="contact-card"><h2>${safe(c.support)}</h2><p>${safe(c.supportBody)}</p></section>
        <section class="contact-card"><h2>${safe(c.contactPrivacy)}</h2><p>${safe(c.contactPrivacyBody)}</p>
        <p><a href="${link(policy)}">${safe(c.policyTitle)}</a></p></section>
      </div></section>`;
  } else if (route === policy) {
    title = c.policyTitle;
    description = c.policyIntro;
    body = `<div class="wrap"><article class="legal">
      ${intro(c.policyScope, title)}
      <p class="policy-date">${safe(c.updated)} <time datetime="${site.policyDate}">${safe(c.updatedText)}</time></p>
      <p class="page-paragraph" style="margin-bottom:1.5rem">${safe(description)}</p>
      <div class="legal-body">${sections[lang].map(([heading, paragraphs], index) => `<section>
        <h2>${safe(heading)}</h2>${paragraphs.map((line) => `<p>${safe(line)}</p>`).join("")}
        ${index === 1 ? `<ul>
          <li><a href="${yandexPrivacy}">${lang === "en" ? "Yandex Privacy Policy" : "Политика конфиденциальности Яндекса"}</a></li>
          <li><a href="${yandexAdsData}">Yandex Mobile Ads · Data Safety</a></li>
          <li><a href="${appMetricaData}">AppMetrica · Data security</a></li></ul>` : ""}
        ${index === 4 ? `<p><a href="${githubPrivacy}">${lang === "en" ? "GitHub Privacy Statement" : "Политика конфиденциальности GitHub"}</a></p><p>${email}</p>` : ""}
      </section>`).join("")}</div></article></div>`;
  } else {
    const game = games.find((item) => route === `games/${item.id}/`);
    if (!game) throw new Error(`Unknown page: ${route}`);
    const g = game[lang];
    const isSticky = game.id === sticky.id;
    const caption = isSticky ? c.capture : c.art;
    title = g.name;
    description = g.pitch;
    og = game.image;
    body = `<section class="wrap page-section">${intro(g.genre + " · " + c.inDevelopment, title, description)}
      <div class="feature"><div><h2>${safe(c.details)}</h2>
      <p class="page-paragraph">${safe(g.detail)}</p>
      <div class="actions">${cta(c.allGames, link("games/"), true)}${isSticky ? cta(c.privacy, link(policy), true) : ""}</div>
      </div><figure class="${artClass(game).trim()}">${photo(game, game.image, g.alt, true)}
      <figcaption>${safe(caption)}</figcaption></figure></div></section>`;
    if (isSticky) {
      const captures = [sticky.image, "sticky-boss-crystal.webp", "sticky-boss-storm.webp"];
      body += `<section class="wrap page-section">
        <header class="section-head"><h2>${safe(c.gallery)}</h2></header>
        <div class="gallery">${captures.map((image, idx) => `<figure>
          <a href="${asset(image)}" data-gallery="${safe(g.gallery[idx])}">${photo(sticky, image, g.gallery[idx])}</a>
          <figcaption>${safe(g.gallery[idx])}</figcaption></figure>`).join("")}</div></section>
        <dialog id="gallery-dialog" aria-label="${safe(c.gallery)}"><form method="dialog">
          <button aria-label="${safe(c.close)}">${safe(c.close)}</button></form>
          <figure><img alt=""><figcaption></figcaption></figure></dialog>`;
    }
  }
  const fullTitle = `${title} — ${site.title}`;
  const navItems = [["games/", c.games], ["about/", c.studio], ["contact/", c.contact]];
  const nav = navItems.map(([target, label]) => `<a href="${link(target)}"${!error && route.startsWith(target) ? ' aria-current="page"' : ""}>${safe(label)}</a>`).join("");
  const brand = `<a class="brand" href="${link("")}"><img src="${asset("studio-logo.svg")}" width="34" height="34" alt=""><span>${site.title}</span></a>`;
  const language = langs.map((id) => id === lang
    ? `<span aria-current="true" lang="${id}">${id.toUpperCase()}</span>`
    : `<a href="${link(error ? "" : route, other)}" hreflang="${id}" lang="${id}" aria-label="${id === "ru" ? "Русский" : "English"}">${id.toUpperCase()}</a>`).join("");
  const canonical = absolute(location);
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0c0c14">
<title>${safe(fullTitle)}</title>
<meta name="description" content="${safe(description)}">
${error ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${canonical}">
${langs.map((id) => `<link rel="alternate" hreflang="${id}" href="${absolute(prefix(id, route))}">`).join("\n")}
<link rel="alternate" hreflang="x-default" href="${absolute(route)}">
<meta property="og:type" content="${route === policy ? "article" : "website"}">
<meta property="og:site_name" content="${site.title}">
<meta property="og:locale" content="${lang === "ru" ? "ru_RU" : "en_US"}">
<meta property="og:title" content="${safe(fullTitle)}">
<meta property="og:description" content="${safe(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${absolute(assetPath(og))}">
<meta name="twitter:card" content="summary_large_image">`}
<link rel="icon" href="${asset("studio-logo.svg")}" type="image/svg+xml">
<link rel="stylesheet" href="${asset("site.css")}">
<script defer src="${asset("site.js")}"></script>
</head>
<body>
<a class="skip" href="#main">${safe(c.skip)}</a>
<header class="head"><div class="wrap head-row">${brand}
<nav class="nav" id="site-nav" aria-label="${safe(c.menu)}">${nav}</nav>
<div class="lang">${language}</div>
<button type="button" class="menu" data-menu aria-controls="site-nav" aria-expanded="false">${safe(c.menu)}</button>
</div></header>
<main id="main" tabindex="-1">${body}</main>
<footer class="footer"><div class="wrap footer-row">
<small>© ${site.policyDate.slice(0, 4)} ${site.title}</small>
<div class="links"><a href="${link("contact/")}">${safe(c.contact)}</a><a href="${link(policy)}">${safe(c.privacy)} · Sticky Orbs</a></div>
</div></footer></body></html>
`;
}

// This directory is dedicated to generated Pages output. Each run removes only
// files listed in the previous build manifest, preserving unrelated files.
const statePath = path.join(out, ".site-output.json");
await mkdir(out, { recursive: true });
let previous = [];
try { previous = JSON.parse(await readFile(statePath, "utf8")); }
catch (error) { if (error.code !== "ENOENT") throw error; }
if (!Array.isArray(previous) || previous.some((file) => typeof file !== "string"
  || !/^[a-zA-Z0-9._/-]+$/.test(file) || file.split("/").some((part) => !part || part === "." || part === ".."))) {
  throw new Error("Invalid build file list");
}
const written = new Set();
async function emit(file, content) {
  const destination = path.join(out, file);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, content.replace(/[\t ]+$/gm, ""), "utf8");
  written.add(file);
}
for (const lang of langs) {
  for (const route of paths) await emit(prefix(lang, route) + "index.html", render(lang, route));
}
await emit("404.html", render("en", "", true));
await emit(".nojekyll", "");
await emit("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${absolute("sitemap.xml")}\n`);
await emit("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${langs.flatMap((lang) => paths.map((route) => `  <url><loc>${absolute(prefix(lang, route))}</loc></url>`)).join("\n")}\n</urlset>\n`);
await mkdir(path.join(out, "assets"), { recursive: true });
for (const entry of await readdir(path.join(root, "site", "assets"), { withFileTypes: true })) {
  if (!entry.isFile() || !/^[a-zA-Z0-9._-]+$/.test(entry.name)) throw new Error(`Unexpected asset: ${entry.name}`);
  const file = assetPath(entry.name);
  await cp(path.join(root, "site", file), path.join(out, file));
  written.add(file);
}
for (const file of previous) if (!written.has(file)) await rm(path.join(out, file), { force: true });
await writeFile(statePath, JSON.stringify([...written].sort(), null, 2) + "\n", "utf8");
console.log(`Built ${paths.length * langs.length} bilingual HTML pages and ${written.size} files in docs/.`);
