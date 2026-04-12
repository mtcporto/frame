/**
 * Frame — Curated Cinema
 * app.js
 */

'use strict';

/* ============================================
   STATE
   ============================================ */
const state = {
  catalog: [],
  categories: [],
  currentFilter: 'all',
  searchQuery: '',
  progressMap: {},          // { filmId: secondsWatched }
  currentPlayer: null,
  currentFilm: null,
};

/* ============================================
   STORAGE HELPERS
   ============================================ */
const Storage = {
  KEY_PROGRESS: 'frame_progress',
  KEY_SESSION:  'frame_session',

  loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY_PROGRESS) || '{}');
    } catch { return {}; }
  },

  saveProgress(map) {
    try { localStorage.setItem(this.KEY_PROGRESS, JSON.stringify(map)); } catch { /* quota */ }
  },

  loadSession() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY_SESSION) || '{}');
    } catch { return {}; }
  },

  saveSession(obj) {
    try { localStorage.setItem(this.KEY_SESSION, JSON.stringify(obj)); } catch { /* quota */ }
  },
};

/* ============================================
   DOM REFERENCES
   ============================================ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const Dom = {
  hero: $('.hero'),
  heroBg: $('#hero-bg'),
  heroTitle: $('#hero-title'),
  heroDescription: $('#hero-description'),
  heroCategory: $('#hero-category'),
  heroInfo: $('#hero-info'),
  btnPlayHero: $('#btn-play-hero'),
  btnMoreInfo: $('#btn-more-info'),

  gridStaffPicks: $('#grid-staff-picks'),
  gridRunway: $('#grid-runway'),
  gridDust: $('#grid-dust'),
  gridOmeleto: $('#grid-omeleto'),
  gridOpen: $('#grid-open'),
  gridAll: $('#grid-all'),
  emptyState: $('#empty-state'),

  continueSection: $('#continue-watching-section'),
  gridContinue: $('#grid-continue'),

  modal: $('#film-modal'),
  modalPlayer: $('#modal-player'),
  modalTitle: $('#modal-title'),
  modalDescription: $('#modal-description'),
  modalCategory: $('#modal-category'),
  modalYear: $('#modal-year'),
  modalDuration: $('#modal-duration'),
  modalChannel: $('#modal-channel'),
  modalTags: $('#modal-tags'),
  modalAiBadge: $('#modal-ai-badge'),
  modalViewDetails: $('#modal-view-details'),
  modalClose: $('.modal-close'),

  btnSearch: $('.btn-search'),
  searchBar: $('.search-bar'),
  searchInput: $('#search-input'),
  btnSearchClose: $('.btn-search-close'),

  navLinks: $$('.nav-link'),
  filterChips: $$('.filter-chip'),

  yearSpan: $('#year'),
};

/* ============================================
   BOOTSTRAP
   ============================================ */
async function init() {
  Dom.yearSpan.textContent = new Date().getFullYear();
  state.progressMap = Storage.loadProgress();

  // restore last session
  const session = Storage.loadSession();
  if (session.filter && session.filter !== 'all') {
    state.currentFilter = session.filter;
  }

  renderSkeletons();

  try {
    const res = await fetch('data/catalog.json');
    if (!res.ok) throw new Error('catalog fetch failed');
    const data = await res.json();
    state.catalog = data.catalog || [];
    state.categories = data.categories || [];
  } catch (err) {
    console.error('[Frame] Failed to load catalog:', err);
    Dom.gridAll.innerHTML = `<p class="empty-state">Could not load the catalog. Please try again later.</p>`;
    return;
  }

  renderHero();
  renderAllGrids();
  renderContinueWatching();
  injectStructuredData();
  bindEvents();

  // sync UI to restored session state
  if (state.currentFilter !== 'all') {
    Dom.navLinks.forEach((l) => l.classList.toggle('active', l.dataset.filter === state.currentFilter));
    Dom.filterChips.forEach((c) => c.classList.toggle('active', c.dataset.filter === state.currentFilter));
  }
}


/* ============================================
   STRUCTURED DATA (JSON-LD)
   ============================================ */
function injectStructuredData() {
  const ldScript = document.getElementById('ld-catalog');
  if (!ldScript) return;

  const items = state.catalog.map((film, i) => {
    const embedUrl = film.source === 'youtube'
      ? `https://www.youtube-nocookie.com/embed/${film.videoId}`
      : `https://player.vimeo.com/video/${film.videoId}`;
    const watchUrl = film.source === 'youtube'
      ? `https://www.youtube.com/watch?v=${film.videoId}`
      : `https://vimeo.com/${film.videoId}`;

    return {
      '@type': 'ListItem',
      'position': i + 1,
      'item': {
        '@type': 'VideoObject',
        '@id': watchUrl,
        'name': film.title,
        'description': film.description,
        'thumbnailUrl': film.thumbnail,
        'image': film.thumbnail,
        'uploadDate': `${film.year}-01-01`,
        'duration': film.duration,
        'embedUrl': embedUrl,
        'url': watchUrl,
        'genre': film.category,
        'productionCompany': {
          '@type': 'Organization',
          'name': film.channel,
        },
      },
    };
  });

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Frame Curated Catalog',
    'url': 'https://frame-navy-eta.vercel.app/',
    'numberOfItems': state.catalog.length,
    'itemListElement': items,
  };

  ldScript.textContent = JSON.stringify(schema);
}

/* ============================================
   SKELETON PLACEHOLDERS
   ============================================ */
function renderSkeletons() {
  const grids = [Dom.gridStaffPicks, Dom.gridRunway, Dom.gridDust, Dom.gridOmeleto, Dom.gridOpen, Dom.gridAll];
  grids.forEach((g) => {
    if (!g) return;
    g.innerHTML = Array.from({ length: 4 }, () => `
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton-thumb"></div>
        <div class="skeleton-body">
          <div class="skeleton skeleton-line medium"></div>
          <div class="skeleton skeleton-line short"></div>
        </div>
      </div>
    `).join('');
  });
}

/* ============================================
   HERO
   ============================================ */
function renderHero() {
  const staffPicks = state.catalog.filter((f) => f.staffPick);
  const pool = staffPicks.length > 0 ? staffPicks : state.catalog;
  const featured = pool[Math.floor(Math.random() * pool.length)];
  if (!featured) return;

  const heroBgUrl = featured.thumbnail;
  const heroBgImg = new Image();
  heroBgImg.onload = () => { Dom.heroBg.style.backgroundImage = `url("${heroBgUrl}")`; };
  heroBgImg.onerror = () => { Dom.heroBg.style.backgroundImage = `url("${heroBgUrl.replace('maxresdefault', 'hqdefault')}")`; };
  heroBgImg.src = heroBgUrl;
  Dom.heroTitle.textContent = featured.title;
  Dom.heroDescription.textContent = featured.description;
  Dom.heroCategory.textContent = (featured.category[0] || '').toUpperCase();
  Dom.heroInfo.innerHTML = `
    <span>${featured.channel}</span>
    <span>·</span>
    <span>${featured.year}</span>
    <span>·</span>
    <span>${featured.durationLabel}</span>
    ${featured.aiGenerated ? '<span class="ai-badge" aria-label="AI Generated">AI</span>' : ''}
  `;

  Dom.btnPlayHero.onclick = () => openModal(featured);
  Dom.btnMoreInfo.onclick = () => { window.location.href = `film/?id=${featured.id}`; };

  // inject muted autoplay video background after thumbnail
  if (featured.source === 'youtube' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    injectHeroVideo(featured.videoId);
  }
}

function injectHeroVideo(videoId) {
  const existing = Dom.hero.querySelector('.hero-video');
  if (existing) existing.remove();

  const wrap = document.createElement('div');
  wrap.className = 'hero-video';
  wrap.setAttribute('aria-hidden', 'true');

  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&disablekb=1&loop=1&playlist=${videoId}&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1`;
  iframe.allow = 'autoplay; encrypted-media';
  iframe.setAttribute('tabindex', '-1');

  iframe.addEventListener('load', () => {
    setTimeout(() => wrap.classList.add('is-playing'), 800);
  });

  wrap.appendChild(iframe);
  Dom.heroBg.insertAdjacentElement('afterend', wrap);
}

/* ============================================
   GRIDS
   ============================================ */
function renderAllGrids() {
  const staffPicks = state.catalog.filter((f) => f.staffPick);
  const runwayFilms = state.catalog.filter((f) => f.channel === 'Runway AI Film Festival');
  const dustFilms = state.catalog.filter((f) => f.channel === 'DUST' || f.channel === 'Dust');
  const omeletoFilms = state.catalog.filter((f) => f.channel === 'Omeleto');
  const openFilms = state.catalog.filter((f) => f.category.includes('open'));

  renderGrid(Dom.gridStaffPicks, staffPicks);
  renderGrid(Dom.gridRunway, runwayFilms);
  renderGrid(Dom.gridDust, dustFilms);
  renderGrid(Dom.gridOmeleto, omeletoFilms);
  renderGrid(Dom.gridOpen, openFilms);
  renderFilteredGrid();
}

function renderFilteredGrid() {
  let films = state.catalog;

  if (state.currentFilter !== 'all') {
    films = films.filter((f) => f.category.includes(state.currentFilter));
  }

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    films = films.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.channel.toLowerCase().includes(q) ||
        f.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  Dom.emptyState.hidden = films.length > 0;
  renderGrid(Dom.gridAll, films);
}

function renderGrid(container, films) {
  if (!container) return;
  if (!films.length) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = films.map((f) => cardHTML(f)).join('');

  // attach click handlers + stagger entry animation
  container.querySelectorAll('.film-card').forEach((card, i) => {
    card.style.animationDelay = `${Math.min(i * 40, 480)}ms`;
    card.classList.add('is-entering');
    card.addEventListener('animationend', () => {
      card.classList.remove('is-entering');
      card.style.animationDelay = '';
    }, { once: true });
    const id = card.dataset.id;
    const film = state.catalog.find((f) => f.id === id);
    if (!film) return;
    card.addEventListener('click', () => openModal(film));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(film); }
    });

    // prefetch embed on first hover/focus to shorten time-to-play
    let prefetched = false;
    const prefetch = () => {
      if (prefetched) return;
      prefetched = true;
      if (film.source !== 'youtube') return;
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'document';
      link.href = `https://www.youtube-nocookie.com/embed/${film.videoId}?rel=0`;
      document.head.appendChild(link);
    };
    card.addEventListener('mouseenter', prefetch, { once: true });
    card.addEventListener('focusin', prefetch, { once: true });
  });
}

function cardHTML(film) {
  const progress = state.progressMap[film.id];
  const durationSecs = parseDuration(film.duration);
  const pct = durationSecs && progress ? Math.min(100, Math.round((progress / durationSecs) * 100)) : 0;

  const identityLabel = film.channel === 'Runway AI Film Festival'
    ? `<span class="thumb-label thumb-label-award" aria-label="Award Winner">★ Award</span>`
    : film.category.includes('open')
      ? `<span class="thumb-label thumb-label-open" aria-label="Open Film">Open Film</span>`
      : '';

  return `
    <article
      class="film-card"
      data-id="${escHtml(film.id)}"
      role="listitem"
      tabindex="0"
      aria-label="${escHtml(film.title)}, ${escHtml(film.channel)}, ${film.year}"
      itemscope itemtype="https://schema.org/VideoObject"
    >
      <meta itemprop="name" content="${escHtml(film.title)}" />
      <meta itemprop="description" content="${escHtml(film.description)}" />
      <meta itemprop="thumbnailUrl" content="${escHtml(film.thumbnail)}" />
      <meta itemprop="uploadDate" content="${film.year}-01-01" />
      <meta itemprop="duration" content="${escHtml(film.duration)}" />
      ${film.source === 'youtube' ? `<meta itemprop="embedUrl" content="https://www.youtube-nocookie.com/embed/${escHtml(film.videoId)}" />` : ''}

      <div class="film-thumb">
        <img
          src="${escHtml(film.thumbnail)}"
          alt="Thumbnail for ${escHtml(film.title)}"
          loading="lazy"
          decoding="async"
          width="480"
          height="270"
          onerror="this.onerror=null;this.src=this.src.replace('maxresdefault','hqdefault')"
        />
        <div class="thumb-play-overlay" aria-hidden="true">
          <div class="thumb-play-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
          </div>
        </div>
        <span class="thumb-duration" aria-label="Duration: ${escHtml(film.durationLabel)}">${escHtml(film.durationLabel)}</span>
        ${film.aiGenerated ? `<span class="thumb-ai-label ai-badge" aria-label="AI Generated">AI</span>` : ''}
        ${identityLabel}
        ${pct > 0 ? `
          <div class="thumb-progress" aria-label="${pct}% watched">
            <div class="thumb-progress-fill" style="width:${pct}%"></div>
          </div>
        ` : ''}
      </div>

      <div class="film-body">
        <h3 class="film-title" itemprop="name">${escHtml(film.title)}</h3>
        <div class="film-meta">
          <span class="film-channel" itemprop="productionCompany">${escHtml(film.channel)}</span>
          <span aria-hidden="true">·</span>
          <time class="film-year" datetime="${film.year}" itemprop="datePublished">${film.year}</time>
        </div>
      </div>
    </article>
  `;
}

/* ============================================
   CONTINUE WATCHING
   ============================================ */
function renderContinueWatching() {
  const inProgress = state.catalog.filter((f) => {
    const secs = state.progressMap[f.id];
    if (!secs) return false;
    const dur = parseDuration(f.duration);
    const pct = dur ? secs / dur : 0;
    return pct > 0.02 && pct < 0.95;
  });

  Dom.continueSection.hidden = inProgress.length === 0;
  renderGrid(Dom.gridContinue, inProgress);
}

/* ============================================
   MODAL / PLAYER
   ============================================ */
function openModal(film) {
  state.currentFilm = film;
  Storage.saveSession({ filter: state.currentFilter });

  // populate metadata
  Dom.modalTitle.textContent = film.title;
  Dom.modalDescription.textContent = film.description;
  Dom.modalCategory.textContent = (film.category[0] || '').toUpperCase();
  Dom.modalYear.textContent = film.year;
  Dom.modalDuration.textContent = film.durationLabel;
  Dom.modalChannel.textContent = film.channel;
  Dom.modalAiBadge.hidden = !film.aiGenerated;

  Dom.modalTags.innerHTML = film.tags.map((t) =>
    `<span class="tag-chip">${escHtml(t)}</span>`
  ).join('');
  Dom.modalViewDetails.href = `film/?id=${film.id}`;

  // destroy previous player
  destroyPlayer();

  // build player container
  Dom.modalPlayer.innerHTML = '';

  // show thumbnail poster while video loads
  const posterEl = document.createElement('div');
  posterEl.className = 'modal-poster';
  posterEl.style.backgroundImage = `url('${film.thumbnail}')`;
  posterEl.setAttribute('aria-hidden', 'true');
  posterEl.innerHTML = `<div class="modal-poster-spinner-wrap"><div class="modal-poster-spinner"></div><span>Loading video…</span></div>`;
  Dom.modalPlayer.parentElement.appendChild(posterEl);

  let playerEl;
  if (film.source === 'youtube') {
    playerEl = document.createElement('div');
    playerEl.dataset.plyrProvider = 'youtube';
    playerEl.dataset.plyrEmbedId = film.videoId;
  } else if (film.source === 'vimeo') {
    playerEl = document.createElement('div');
    playerEl.dataset.plyrProvider = 'vimeo';
    playerEl.dataset.plyrEmbedId = film.videoId;
  } else {
    playerEl = document.createElement('video');
    playerEl.src = film.videoId;
    playerEl.setAttribute('playsinline', '');
    playerEl.setAttribute('controls', '');
  }
  Dom.modalPlayer.appendChild(playerEl);

  // resume from saved position
  const savedSecs = state.progressMap[film.id] || 0;

  state.currentPlayer = new Plyr(playerEl, {
    controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
    youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3 },
    ratio: '16:9',
  });

  const player = state.currentPlayer;

  // seek to saved position after ready
  if (savedSecs > 30) {
    player.once('ready', () => {
      try { player.currentTime = savedSecs; } catch { /* ignore */ }
    });
  }

  // save progress on timeupdate (throttled to 2s to avoid excessive writes)
  let lastProgressSave = 0;
  player.on('timeupdate', () => {
    const t = Math.floor(player.currentTime || 0);
    if (t > 0) {
      state.progressMap[film.id] = t;
      const now = Date.now();
      if (now - lastProgressSave > 2000) {
        Storage.saveProgress(state.progressMap);
        lastProgressSave = now;
      }
    }
  });

  // fade out loading poster once the player iframe is ready
  const removePoster = () => {
    posterEl.style.opacity = '0';
    setTimeout(() => posterEl.remove(), 320);
  };
  player.once('ready', () => setTimeout(removePoster, 150));
  player.once('playing', removePoster);

  Dom.modal.showModal();
  Dom.modal.focus();
}

function destroyPlayer() {
  // Remove loading poster if still visible
  const existingPoster = Dom.modalPlayer.parentElement?.querySelector('.modal-poster');
  if (existingPoster) existingPoster.remove();
  if (state.currentPlayer) {
    try { state.currentPlayer.destroy(); } catch { /* ignore */ }
    state.currentPlayer = null;
  }
}

function closeModal() {
  destroyPlayer();
  Dom.modal.close();
  Dom.modalPlayer.innerHTML = '';
  // flush any un-saved progress
  Storage.saveProgress(state.progressMap);
  // refresh grids to update progress bars
  renderContinueWatching();
  renderFilteredGrid();
}

/* ============================================
   EVENT BINDING
   ============================================ */
function bindEvents() {
  // Header scroll state
  const header = document.querySelector('.site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Modal close
  Dom.modalClose.addEventListener('click', closeModal);
  Dom.modal.addEventListener('click', (e) => {
    if (e.target === Dom.modal) closeModal();
  });
  Dom.modal.addEventListener('cancel', closeModal); // Escape key

  // Nav links
  Dom.navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const filter = link.dataset.filter;
      setFilter(filter);
      Dom.navLinks.forEach((l) => l.classList.toggle('active', l === link));
    });
  });

  // Filter chips
  Dom.filterChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const filter = chip.dataset.filter;
      setFilter(filter);
      Dom.filterChips.forEach((c) => c.classList.toggle('active', c === chip));
      // sync nav
      Dom.navLinks.forEach((l) => l.classList.toggle('active', l.dataset.filter === filter));
    });
  });

  // Search toggle
  Dom.btnSearch.addEventListener('click', openSearch);
  Dom.btnSearchClose.addEventListener('click', closeSearch);

  Dom.searchInput.addEventListener('input', () => {
    state.searchQuery = Dom.searchInput.value.trim();
    renderFilteredGrid();
  });

  Dom.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSearch();
  });
}

function setFilter(filter) {
  state.currentFilter = filter;
  Storage.saveSession({ filter });
  renderFilteredGrid();
  // scroll to main grid
  const mainGrid = document.querySelector('.catalog-main');
  if (mainGrid) {
    mainGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function openSearch() {
  Dom.searchBar.hidden = false;
  Dom.btnSearch.setAttribute('aria-expanded', 'true');
  Dom.searchInput.focus();
}

function closeSearch() {
  Dom.searchBar.hidden = true;
  Dom.btnSearch.setAttribute('aria-expanded', 'false');
  state.searchQuery = '';
  Dom.searchInput.value = '';
  renderFilteredGrid();
}

/* ============================================
   UTILITIES
   ============================================ */
/**
 * Parse ISO 8601 duration string to seconds
 * e.g. "PT3M44S" → 224
 */
function parseDuration(iso) {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return ((+m[1] || 0) * 3600) + ((+m[2] || 0) * 60) + (+m[3] || 0);
}

/**
 * Escape HTML to prevent XSS when injecting into innerHTML
 */
function escHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ============================================
   START
   ============================================ */
document.addEventListener('DOMContentLoaded', init);
