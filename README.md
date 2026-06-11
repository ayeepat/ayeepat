# ayeepat — portfolio

Single-page portfolio. No build step — just `index.html`.

## Run locally

```sh
npm install   # once
npm run dev   # serves the site at http://localhost:3000
```

Or just open `index.html` directly in a browser.

## Deploy to Vercel

```sh
npm i -g vercel
vercel          # preview deploy
vercel --prod   # production deploy
```

Or drag the folder into [vercel.com/new](https://vercel.com/new), or import the repo from GitHub. No framework preset needed — Vercel serves it as a static site.

## Before shipping

- Add `picsimplexcap.png` (Simplex Capital screenshot) to this folder, next to `index.html` — the flagship project card and sitemap expect it. **There is no `public/` folder in this project: the project root *is* the public web root on Vercel.**
- The canonical domain is set to `https://ayeepat.vercel.app` in `index.html` (meta tags + JSON-LD), `robots.txt`, `sitemap.xml`, `llms.txt` and `llms-full.txt`. If you deploy under a different domain, search-and-replace `ayeepat.vercel.app` across those files.

## SEO / AI discovery files (all served from root)

| File | Purpose |
|---|---|
| `og.png` | Social share card (Open Graph / Twitter) |
| `robots.txt` | Crawler rules + sitemap pointer, AI crawlers allowed |
| `sitemap.xml` | Sitemap for search engines |
| `llms.txt` | Short AI-readable site summary ([llmstxt spec](https://llmstxt.org)) |
| `llms-full.txt` | Extended AI-readable profile |
