'use strict';

const fs   = require('fs');
const path = require('path');

/* Escape for HTML attribute values */
function escAttr(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Escape for HTML text content (title tag) */
function escText(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = async (req, res) => {
  const filmId = req.query.id;

  const root = process.cwd();

  /* ── Read catalog ─────────────────────────────────────────── */
  let film = null;
  try {
    const raw  = fs.readFileSync(path.join(root, 'data', 'catalog.json'), 'utf8');
    const data = JSON.parse(raw);
    if (filmId) film = (data.catalog || []).find((f) => f.id === filmId) || null;
  } catch { /* film stays null; serve generic HTML */ }

  /* ── Read base HTML ───────────────────────────────────────── */
  let html;
  try {
    html = fs.readFileSync(path.join(root, 'film', 'index.html'), 'utf8');
  } catch {
    res.status(500).send('Internal Server Error');
    return;
  }

  /* ── Inject per-film meta if found ───────────────────────── */
  if (film) {
    const BASE    = 'https://frame-navy-eta.vercel.app';
    const filmUrl = `${BASE}/film/${film.id}`;
    const title   = `${film.title} — Frame`;
    const desc    = film.description;
    const image   = film.thumbnail;

    html = html
      /* <title> */
      .replace(
        '<title>Frame — Film</title>',
        `<title>${escText(title)}</title>`
      )
      /* meta description */
      .replace(
        'content="Film details — Frame"',
        `content="${escAttr(desc)}"`
      )
      /* og:url */
      .replace(
        'id="og-url" property="og:url" content=""',
        `id="og-url" property="og:url" content="${escAttr(filmUrl)}"`
      )
      /* og:title */
      .replace(
        'id="og-title" property="og:title" content="Frame — Curated Cinema"',
        `id="og-title" property="og:title" content="${escAttr(title)}"`
      )
      /* og:description */
      .replace(
        'id="og-description" property="og:description" content=""',
        `id="og-description" property="og:description" content="${escAttr(desc)}"`
      )
      /* og:image */
      .replace(
        'id="og-image" property="og:image" content=""',
        `id="og-image" property="og:image" content="${escAttr(image)}"`
      )
      /* og:image:alt */
      .replace(
        'id="og-image-alt" property="og:image:alt" content=""',
        `id="og-image-alt" property="og:image:alt" content="${escAttr(title)}"`
      )
      /* twitter:title */
      .replace(
        'id="tw-title" name="twitter:title" content="Frame — Curated Cinema"',
        `id="tw-title" name="twitter:title" content="${escAttr(title)}"`
      )
      /* twitter:description */
      .replace(
        'id="tw-description" name="twitter:description" content=""',
        `id="tw-description" name="twitter:description" content="${escAttr(desc)}"`
      )
      /* twitter:image */
      .replace(
        'id="tw-image" name="twitter:image" content=""',
        `id="tw-image" name="twitter:image" content="${escAttr(image)}"`
      )
      /* twitter:image:alt */
      .replace(
        'id="tw-image-alt" name="twitter:image:alt" content=""',
        `id="tw-image-alt" name="twitter:image:alt" content="${escAttr(title)}"`
      )
      /* VideoObject JSON-LD placeholder */
      .replace(
        '<script type="application/ld+json" id="ld-film">{}</script>',
        `<script type="application/ld+json" id="ld-film">${JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'VideoObject',
          '@id': filmUrl,
          'name': film.title,
          'description': film.description,
          'thumbnailUrl': film.thumbnail,
          'image': film.thumbnail,
          'uploadDate': `${film.year}-01-01`,
          'duration': film.duration,
          'embedUrl': film.source === 'youtube'
            ? `https://www.youtube-nocookie.com/embed/${film.videoId}`
            : `https://player.vimeo.com/video/${film.videoId}`,
          'url': film.source === 'youtube'
            ? `https://www.youtube.com/watch?v=${film.videoId}`
            : `https://vimeo.com/${film.videoId}`,
          'genre': film.category,
          'productionCompany': { '@type': 'Organization', 'name': film.channel },
        })}</script>`
      )
      /* canonical link — inject before </head> */
      .replace('</head>', `  <link rel="canonical" href="${escAttr(filmUrl)}" />\n</head>`);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  /* Cache at CDN edge for 1h; serve stale for up to 24h while revalidating */
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.end(html);
};
