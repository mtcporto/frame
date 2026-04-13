# ▣ Frame — Curated Cinema

A curated cinema platform for independent, open-source, and AI-generated short films.

**Live:** https://frame-navy-eta.vercel.app

---

## What it is

Frame aggregates hand-picked short films from four sources and presents them in a lean, distraction-free player. No ads, no autoplay queues, no tracking. Progress saves locally so you can pick up where you left off.

The catalog spans:

- **Runway AI Film Festival** — award-winning AI-generated cinema
- **DUST** — science-fiction short films
- **Omeleto** — character-driven drama and short film
- **Blender Studio** — open-source 3D animation

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML / CSS / JS (`'use strict'`) |
| Player | [Plyr 3.7.8](https://plyr.io) over YouTube nocookie + Vimeo |
| Data | Single `data/catalog.json` file (~86 films) |
| Routing | Vercel rewrites (`vercel.json`) |
| SSR (OG tags) | Vercel Serverless Function (`api/film/[id].js`) |
| Hosting | [Vercel](https://vercel.com) edge CDN |

No build step. No framework. No database.

---

## Project structure

```
frame/
├── index.html          # Main catalog page
├── css/
│   └── style.css       # All styles (~1 400 lines)
├── js/
│   └── app.js          # Catalog, modal, player, OSD, search
├── film/
│   ├── index.html      # Film detail page shell
│   └── film.js         # Detail page logic, player, related films
├── api/
│   └── film/
│       └── [id].js     # Serverless function — injects per-film OG tags
├── data/
│   └── catalog.json    # Film catalog + top10 seed
├── about/
│   └── index.html
├── sources/
│   └── index.html
├── credits/
│   └── index.html
└── vercel.json         # Rewrite: /film/:slug → /api/film/:slug
```

---

## Key features

- **Catalog grid** — 5-column, skeleton loading, card hover preview (YouTube iframe, 800ms delay)
- **Top 10** — editorial seed, personalises over time via `localStorage` view counts
- **Hero section** — muted autoplay background video of featured film
- **Modal player** — Plyr + OSD (ⓘ button injected into Plyr controls bar, visible in fullscreen)
- **Film detail page** — clean URL (`/film/sprite-fright`), full metadata, related picks, OSD, Share button
- **Continue Watching** — progress persisted to `localStorage`, resume from saved position
- **Share button** — copies canonical URL to clipboard, `navigator.clipboard` with `prompt()` fallback
- **Page transitions** — CSS opacity fade on navigation
- **Accessibility** — semantic HTML, ARIA labels, `role="list"`, `sr-only` labels, `prefers-reduced-motion` respected

---

## SEO / Structured data

| Page | Schema type |
|---|---|
| `/` | `WebSite` + `CollectionPage` + `ItemList` of `VideoObject` |
| `/film/:id` | `VideoObject` + `BreadcrumbList` (injected server-side) |
| `/about/`, `/sources/`, `/credits/` | `WebPage` |

OG tags and Twitter Card tags are present on all pages. Film detail pages have OG tags injected by the serverless function so social crawlers see per-film metadata without executing JavaScript.

---

## Local development

No build step required — open directly with any static server:

```bash
# Python
python3 -m http.server 8000

# Node (if you have serve)
npx serve .
```

The serverless function (`api/film/[id].js`) only runs on Vercel. Locally, the film detail page falls back gracefully — `film.js` sets all meta tags client-side.

---

## Rights & attribution

Frame does not host video files. All films stream from YouTube (via `youtube-nocookie.com`) and Vimeo. Rights remain with their respective creators and channels. Frame is a non-commercial curatorial project.
