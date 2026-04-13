/**
 * Frame — Film Detail Page
 * film.js
 */

'use strict';

/* ============================================
   UTILITIES
   ============================================ */
function escHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setMeta(id, attr, value) {
  const el = document.getElementById(id);
  if (el) el.setAttribute(attr, value);
}

/* ============================================
   INIT
   ============================================ */
async function init() {
  document.getElementById('year').textContent = new Date().getFullYear();

  // Read film ID from ?id= param (navigation) or clean path (Vercel/server rewrite)
  const filmId = new URLSearchParams(window.location.search).get('id')
              || window.location.pathname.replace(/\/$/, '').split('/').pop();
  if (!filmId || filmId === 'index.html') { window.location.replace('../'); return; }

  let catalog;
  try {
    const res = await fetch('../data/catalog.json');
    if (!res.ok) throw new Error('fetch failed');
    catalog = (await res.json()).catalog || [];
  } catch {
    showError('Could not load catalog. Please try again.');
    return;
  }

  const film = catalog.find((f) => f.id === filmId);
  if (!film) { window.location.replace('../'); return; }

  render(film, catalog);
  bindTransitions();
}

/* ============================================
   RENDER
   ============================================ */
function render(film, catalog) {
  // Canonical URL — computed first, used for og:url, @id, replaceState
  const cleanPath = `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, '')}/${film.id}`;

  // Page title & meta tags
  document.title = `${film.title} — Frame`;
  setMeta('meta-description', 'content', film.description);
  setMeta('og-title',         'content', `${film.title} — Frame`);
  setMeta('og-description',   'content', film.description);
  setMeta('og-image',         'content', film.thumbnail);
  setMeta('og-image-alt',     'content', `${film.title} — Frame`);
  setMeta('og-url',           'content', cleanPath);
  setMeta('tw-title',         'content', `${film.title} — Frame`);
  setMeta('tw-description',   'content', film.description);
  setMeta('tw-image',         'content', film.thumbnail);
  setMeta('tw-image-alt',     'content', `${film.title} — Frame`);
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = cleanPath;
  // Update URL bar to clean slug without reloading (no server rewrite needed locally)
  if (window.location.search.includes('id=')) {
    history.replaceState(null, '', cleanPath);
  }

  // VideoObject JSON-LD
  const embedUrl = film.source === 'youtube'
    ? `https://www.youtube-nocookie.com/embed/${film.videoId}`
    : `https://player.vimeo.com/video/${film.videoId}`;
  const watchUrl = film.source === 'youtube'
    ? `https://www.youtube.com/watch?v=${film.videoId}`
    : `https://vimeo.com/${film.videoId}`;

  const ldScript = document.getElementById('ld-film');
  if (ldScript) {
    ldScript.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      '@id': cleanPath,
      'name': film.title,
      'description': film.description,
      'thumbnailUrl': film.thumbnail,
      'image': film.thumbnail,
      'uploadDate': `${film.year}-01-01`,
      'duration': film.duration,
      'embedUrl': embedUrl,
      'url': watchUrl,
      'genre': film.category,
      'productionCompany': { '@type': 'Organization', 'name': film.channel },
    });
  }

  // BreadcrumbList JSON-LD
  let breadcrumbScript = document.getElementById('ld-breadcrumb');
  if (!breadcrumbScript) {
    breadcrumbScript = document.createElement('script');
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.id = 'ld-breadcrumb';
    document.head.appendChild(breadcrumbScript);
  }
  breadcrumbScript.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Frame', 'item': 'https://frame-navy-eta.vercel.app/' },
      { '@type': 'ListItem', 'position': 2, 'name': film.title, 'item': cleanPath },
    ],
  });

  // Blurred hero background
  const bg = document.getElementById('fd-bg');
  const bgImg = new Image();
  bgImg.onload  = () => { bg.style.backgroundImage = `url('${film.thumbnail}')`; };
  bgImg.onerror = () => { bg.style.backgroundImage = `url('${film.thumbnail.replace('maxresdefault', 'hqdefault')}')`; };
  bgImg.src = film.thumbnail;

  // Poster (shown while player loads)
  const poster = document.getElementById('fd-poster');
  poster.style.backgroundImage = `url('${film.thumbnail}')`;

  // Metadata
  document.getElementById('fd-category').textContent = (film.category[0] || '').toUpperCase();
  document.getElementById('fd-year').textContent     = film.year;
  document.getElementById('fd-duration').textContent = film.durationLabel;
  document.getElementById('fd-title').textContent    = film.title;
  document.getElementById('fd-description').textContent = film.description;
  document.getElementById('fd-channel').textContent  = film.channel;

  const aiBadge = document.getElementById('fd-ai-badge');
  if (aiBadge) aiBadge.hidden = !film.aiGenerated;

  // OSD elements (same data, overlaid on player)
  document.getElementById('fd-osd-category').textContent = (film.category[0] || '').toUpperCase();
  document.getElementById('fd-osd-year').textContent     = film.year;
  document.getElementById('fd-osd-duration').textContent = film.durationLabel;
  document.getElementById('fd-osd-title').textContent    = film.title;
  document.getElementById('fd-osd-description').textContent = film.description;
  document.getElementById('fd-osd-channel').textContent  = film.channel;
  const osdAiBadge = document.getElementById('fd-osd-ai-badge');
  if (osdAiBadge) osdAiBadge.hidden = !film.aiGenerated;

  document.getElementById('fd-tags').innerHTML = film.tags
    .map((t) => `<span class="tag-chip">${escHtml(t)}</span>`)
    .join('');

  // Share button — copy canonical URL to clipboard
  const shareBtn = document.getElementById('fd-share-btn');
  const shareBtnOrig = shareBtn.innerHTML;
  shareBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(cleanPath).then(() => {
      shareBtn.textContent = '✓ Copied!';
      shareBtn.classList.add('is-copied');
      setTimeout(() => {
        shareBtn.innerHTML = shareBtnOrig;
        shareBtn.classList.remove('is-copied');
      }, 1800);
    }).catch(() => {
      prompt('Copy this link:', cleanPath);
    });
  });

  renderPlayer(film, poster);
  renderRelated(film, catalog);
}

/* ============================================
   PLAYER
   ============================================ */
function renderPlayer(film, poster) {
  const container = document.getElementById('fd-player');
  let playerEl;

  if (film.source === 'youtube') {
    playerEl = document.createElement('div');
    playerEl.dataset.plyrProvider = 'youtube';
    playerEl.dataset.plyrEmbedId  = film.videoId;
  } else if (film.source === 'vimeo') {
    playerEl = document.createElement('div');
    playerEl.dataset.plyrProvider = 'vimeo';
    playerEl.dataset.plyrEmbedId  = film.videoId;
  } else {
    playerEl = document.createElement('video');
    playerEl.src = film.videoId;
    playerEl.setAttribute('playsinline', '');
  }

  container.appendChild(playerEl);

  const player = new Plyr(playerEl, {
    controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
    youtube: { noCookie: true, rel: 0, iv_load_policy: 3 },
    ratio: '16:9',
  });

  const removePoster = () => {
    poster.style.opacity = '0';
    setTimeout(() => poster.remove(), 320);
  };
  player.once('ready',   () => setTimeout(removePoster, 150));
  player.once('playing', removePoster);

  // ── OSD behaviour ──────────────────────────────────────────
  // Inject ⓘ into Plyr's control bar after it's built (works in fullscreen).
  const infoPanel = document.getElementById('fd-osd-panel');
  infoPanel.hidden = true;
  let infoBtn = null;

  const OSD_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8h.01M12 12v4"/></svg>`;

  player.once('ready', () => {
    const plyrContainer = player.elements && player.elements.container;
    const controls = player.elements && player.elements.controls;
    if (!controls || !plyrContainer) return;

    // Move osd-panel inside .plyr so it's part of the fullscreen element
    plyrContainer.appendChild(infoPanel);
    infoPanel.hidden = true;

    infoBtn = document.createElement('button');
    infoBtn.type = 'button';
    infoBtn.className = 'plyr__control osd-info-btn';
    infoBtn.setAttribute('aria-label', 'Film info');
    infoBtn.innerHTML = OSD_SVG;
    infoBtn.hidden = true;
    const fsBtn = controls.querySelector('[data-plyr="fullscreen"]');
    if (fsBtn) controls.insertBefore(infoBtn, fsBtn);
    else controls.appendChild(infoBtn);
    infoBtn.addEventListener('click', () => {
      const opening = infoPanel.hidden;
      infoPanel.hidden = !opening;
      infoBtn.classList.toggle('is-active', opening);
    });
  });

  const showOsdBtn = () => { if (infoBtn) infoBtn.hidden = false; };
  const hideOsdAll = () => {
    if (infoBtn) { infoBtn.hidden = true; infoBtn.classList.remove('is-active'); }
    infoPanel.hidden = true;
  };

  player.on('play',    showOsdBtn);
  player.on('playing', showOsdBtn);
  player.on('pause',   hideOsdAll);
  player.on('ended',   hideOsdAll);
  // ──────────────────────────────────────────────────────────
}

/* ============================================
   RELATED FILMS
   ============================================ */
function renderRelated(film, catalog) {
  const related = catalog
    .filter((f) => f.id !== film.id)
    .map((f) => {
      let score = 0;
      if (f.channel === film.channel) score += 3;
      score += f.category.filter((c) => film.category.includes(c)).length;
      return { f, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ f }) => f);

  if (!related.length) return;

  const grid    = document.getElementById('grid-related');
  const section = document.getElementById('related-section');

  grid.innerHTML = related.map((f) => `
    <a
      class="film-card"
      href="?id=${encodeURIComponent(f.id)}"
      role="listitem"
      aria-label="${escHtml(f.title)}, ${escHtml(f.channel)}, ${f.year}"
    >
      <div class="film-thumb">
        <img
          src="${escHtml(f.thumbnail)}"
          alt="Thumbnail for ${escHtml(f.title)}"
          loading="lazy"
          decoding="async"
          width="480" height="270"
          onerror="this.onerror=null;this.src=this.src.replace('maxresdefault','hqdefault')"
        />
        <div class="thumb-play-overlay" aria-hidden="true">
          <div class="thumb-play-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
          </div>
        </div>
        <span class="thumb-duration">${escHtml(f.durationLabel)}</span>
        ${f.aiGenerated ? `<span class="thumb-ai-label ai-badge" aria-label="AI Generated">AI</span>` : ''}
      </div>
      <div class="film-body">
        <h3 class="film-title">${escHtml(f.title)}</h3>
        <div class="film-meta">
          <span class="film-channel">${escHtml(f.channel)}</span>
          <span aria-hidden="true">·</span>
          <time class="film-year" datetime="${f.year}">${f.year}</time>
        </div>
      </div>
    </a>
  `).join('');

  section.hidden = false;
}

/* ============================================
   PAGE TRANSITIONS
   ============================================ */
function bindTransitions() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    // only intercept same-origin internal links, not anchors
    if (!href || href.startsWith('#') || href.startsWith('http') || link.target === '_blank') return;

    e.preventDefault();
    document.body.classList.add('page-leaving');
    setTimeout(() => { window.location.href = href; }, 280);
  });
}

/* ============================================
   ERROR
   ============================================ */
function showError(msg) {
  const hero = document.getElementById('fd-hero');
  if (hero) hero.innerHTML = `<p style="color:var(--text-muted);padding:6rem 2rem;text-align:center;font-size:1rem">${escHtml(msg)}</p>`;
}

/* ============================================
   START
   ============================================ */
document.addEventListener('DOMContentLoaded', init);

// bfcache restore: remove page-leaving pointer-events lock
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    document.body.classList.remove('page-leaving');
  }
});
