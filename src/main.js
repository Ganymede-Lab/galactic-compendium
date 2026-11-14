import { renderStarmapView } from './layers/starmapLayer.js?v=phase1';
import { renderWikiArticle } from './components/wikiView.js?v=phase1';
import {
  renderSequenceView,
  setContextPlanetForGenesis,
  setContextYearForTimeline
} from './components/sequenceView.js?v=phase1';
import {
  renderSeederView,
  findMatchingSavedConfiguration
} from './components/seederView.js?v=phase1';
import { renderContinuityView } from './components/continuityView.js?v=phase1';

const CATEGORIES = [
  'All',
  'Galactic Federation',
  'Worlds & Systems',
  'Caretakers',
  'Cosmology & Constructs',
  'Artifacts & Phenomena',
  'Chronicles & Stories'
];

function getSavedUserSidebarPreference() {
  try {
    const val = sessionStorage.getItem('gc_user_sidebar_collapsed');
    if (val === 'true') return true;
    if (val === 'false') return false;
  } catch {}
  return null;
}

const initialSidebarPref = getSavedUserSidebarPreference();

let state = {
  articles: [],
  planetChains: [],
  starmapNodes: {},
  currentArticleId: 'galactic-federation',

  // 4 Primary Task Destinations: 'explore' | 'create' | 'timeline' | 'continuity'
  activeDestination: 'explore',

  // Contextual sub-modes within destinations
  exploreSubMode: 'reader', // 'reader' | 'starmap'
  createSubMode: 'seeder',  // 'seeder' | 'genesis'

  userSidebarPreference: initialSidebarPref,
  sidebarCollapsed: initialSidebarPref !== null ? initialSidebarPref : (window.innerWidth <= 900),
  selectedCategory: 'All',
  searchQuery: '',
  editingArticleId: null
};

// Per-entry reading scroll position memory (articleId -> scrollY)
const entryScrollPositions = new Map();
const destinationScrollPositions = new Map();
let suppressScrollTracking = false;

if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

// Active modal focus management state
let activeModalId = null;
let modalTriggerEl = null;
let modalTriggerSelector = null;

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function ensureUniqueId(baseId, list) {
  let candidate = baseId;
  let suffix = 2;
  while (list.some(item => item.id === candidate)) {
    candidate = `${baseId}-${suffix++}`;
  }
  return candidate;
}

function getDestinationKey() {
  if (state.activeDestination === 'explore') {
    return state.exploreSubMode === 'starmap' ? 'explore/starmap' : `explore/${state.currentArticleId}`;
  }
  if (state.activeDestination === 'create') {
    return `create/${state.createSubMode}`;
  }
  return state.activeDestination;
}

function saveCurrentReadingScroll() {
  if (suppressScrollTracking) return;
  const y = window.scrollY;
  if (state.activeDestination === 'explore' && state.exploreSubMode === 'reader' && state.currentArticleId) {
    entryScrollPositions.set(state.currentArticleId, y);
  }
  destinationScrollPositions.set(getDestinationKey(), y);
}

function buildHistoryState(explicitScrollY = null) {
  const scrollY = typeof explicitScrollY === 'number'
    ? explicitScrollY
    : (state.activeDestination === 'explore' && state.exploreSubMode === 'reader'
        ? (entryScrollPositions.get(state.currentArticleId) ?? window.scrollY)
        : (destinationScrollPositions.get(getDestinationKey()) ?? window.scrollY));
  return {
    activeDestination: state.activeDestination,
    exploreSubMode: state.exploreSubMode,
    createSubMode: state.createSubMode,
    currentArticleId: state.currentArticleId,
    selectedCategory: state.selectedCategory,
    scrollY
  };
}

function buildUrlHash() {
  if (state.activeDestination === 'explore') {
    if (state.exploreSubMode === 'starmap') return '#explore/starmap';
    return `#explore/${encodeURIComponent(state.currentArticleId)}`;
  }
  if (state.activeDestination === 'create') {
    return `#create/${state.createSubMode}`;
  }
  return `#${state.activeDestination}`;
}

function commitNavigationHistory(pushNewEntry = true, explicitScrollY = null) {
  try {
    const newHash = buildUrlHash();
    const newState = buildHistoryState(explicitScrollY);
    if (pushNewEntry && window.location.hash !== newHash) {
      history.pushState(newState, '', newHash);
    } else {
      history.replaceState(newState, '', newHash);
    }
  } catch {}
}

async function fetchCompendiumData() {
  if (window.__GALACTIC_SEED_DATA__) {
    const seed = window.__GALACTIC_SEED_DATA__;
    try {
      const savedArts = localStorage.getItem('gc_phase1_articles');
      const savedChains = localStorage.getItem('gc_phase1_planetChains');
      state.articles = savedArts ? JSON.parse(savedArts) : JSON.parse(JSON.stringify(seed.articles || []));
      state.planetChains = savedChains ? JSON.parse(savedChains) : JSON.parse(JSON.stringify(seed.planetChains || []));
      if (Array.isArray(seed.articles) && Array.isArray(state.articles)) {
        const seedById = new Map(seed.articles.map(a => [a.id, a]));
        const syncedIds = new Set(['galactic-federation', 'celestial-library', 'cradle-and-atrium', 'illyad', 'earth']);
        state.articles = state.articles.map(a => {
          const seedArt = seedById.get(a.id);
          if (!seedArt) return a;
          if (syncedIds.has(a.id)) {
            return JSON.parse(JSON.stringify(seedArt));
          }
          if (seedArt.image && (!a.image || a.image.startsWith('data:image/svg+xml') || a.image === '/assets/cradle-hallway.png')) {
            return { ...a, image: seedArt.image };
          }
          return a;
        });
      }
    } catch {
      state.articles = JSON.parse(JSON.stringify(seed.articles || []));
      state.planetChains = JSON.parse(JSON.stringify(seed.planetChains || []));
    }
    state.starmapNodes = JSON.parse(JSON.stringify(seed.starmapNodes || {}));
    return;
  }
  try {
    const res = await fetch('/api/compendium');
    const data = await res.json();
    state.articles = data.articles || [];
    state.planetChains = data.planetChains || [];
    state.starmapNodes = data.starmapNodes || {};
  } catch (err) {
    console.error('Failed to load compendium data:', err);
  }
}

async function persistCompendiumData(candidateArticles = state.articles, candidatePlanetChains = state.planetChains) {
  if (window.__GALACTIC_SEED_DATA__) {
    try {
      if (window.__SIMULATE_SAVE_FAILURE__) {
        return { ok: false, error: 'Simulated storage write error (HTTP 500)' };
      }
      localStorage.setItem('gc_phase1_articles', JSON.stringify(candidateArticles));
      localStorage.setItem('gc_phase1_planetChains', JSON.stringify(candidatePlanetChains));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message || 'Local storage write failed' };
    }
  }
  try {
    if (window.__SIMULATE_SAVE_FAILURE__) {
      return { ok: false, error: 'Server returned HTTP 500 (Simulated Failure)' };
    }
    const res = await fetch('/api/compendium', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        articles: candidateArticles,
        planetChains: candidatePlanetChains
      })
    });
    if (!res.ok) {
      return { ok: false, error: `Server returned HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error('Failed to persist compendium data:', err);
    return { ok: false, error: err?.message || 'Network request failed' };
  }
}

function getCurrentArticle() {
  return state.articles.find(a => a.id === state.currentArticleId) || state.articles[0];
}

function setDestination(dest, subMode = null) {
  // Save current scroll position in outgoing history entry and per-entry scroll map
  saveCurrentReadingScroll();
  commitNavigationHistory(false);

  state.activeDestination = dest;
  if (dest === 'explore' && subMode) {
    state.exploreSubMode = subMode;
  }
  if (dest === 'create' && subMode) {
    state.createSubMode = subMode;
  }
  hideSearchPopover();

  const targetScrollY = (dest === 'explore' && state.exploreSubMode === 'reader')
    ? (entryScrollPositions.get(state.currentArticleId) ?? 0)
    : 0;

  commitNavigationHistory(true, targetScrollY);
  renderApp({ restoreScrollY: targetScrollY });
}

function selectArticle(id, options = {}) {
  saveCurrentReadingScroll();
  commitNavigationHistory(false);

  state.currentArticleId = id;
  state.activeDestination = 'explore';
  state.exploreSubMode = 'reader';

  // On mobile viewports, only auto-collapse if the user hasn't set an explicit preference
  if (window.innerWidth <= 900 && state.userSidebarPreference === null) {
    state.sidebarCollapsed = true;
  }

  if (options.clearSearch) {
    state.searchQuery = '';
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
  }

  hideSearchPopover();
  const savedScrollY = entryScrollPositions.get(id) ?? 0;
  commitNavigationHistory(true, savedScrollY);
  renderApp({ restoreScrollY: savedScrollY });
}

function navigateToTitle(title, triggerEl = null) {
  const lower = title.toLowerCase().trim();
  const found = state.articles.find(
    a => a.title.toLowerCase() === lower ||
         a.id === slugify(title) ||
         (['omnexis', 'crithona', 'vornaxis', 'nomadic void caravans'].includes(lower) && a.id === 'independent-and-frontier')
  );
  if (found) {
    selectArticle(found.id);
  } else {
    const parent = getCurrentArticle();
    openArticleModal({
      title,
      category: 'Worlds & Systems',
      subtitle: `Sub-Entry referenced in [[${parent?.title || 'Galactic Compendium'}]]`,
      quote: '',
      body: `**${title}** is a domain referenced in [[${parent?.title || 'The Galactic Federation'}]]. Expand its lore, 5-stage planetary history, and GFST chronology here.`,
      infobox: [
        { label: 'Referenced In', value: `[[${parent?.title || 'The Galactic Federation'}]]` },
        { label: 'Chronology', value: 'GFST' }
      ],
      hooks: [`Detail the deep-time formation, governance, or Caretaker sightings within ${title}.`],
      metaTruth: ''
    }, false, triggerEl);
  }
}

function renderPrimaryNavState() {
  const destinations = ['explore', 'create', 'timeline', 'continuity'];
  destinations.forEach(dest => {
    const btn = document.getElementById(`nav-dest-${dest}`);
    if (btn) {
      const isActive = state.activeDestination === dest;
      btn.classList.toggle('active', isActive);
      if (isActive) {
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.removeAttribute('aria-current');
      }
    }
  });

  document.querySelectorAll('[data-mobile-dest]').forEach(btn => {
    const dest = btn.getAttribute('data-mobile-dest');
    btn.classList.toggle('active', state.activeDestination === dest);
  });
}

function renderContextSubbar() {
  const subbarInner = document.getElementById('context-subbar-inner');
  if (!subbarInner) return;

  const currentArt = getCurrentArticle();

  if (state.activeDestination === 'explore') {
    subbarInner.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.65rem;">
        <button type="button" id="btn-toggle-sidebar" class="btn" aria-expanded="${!state.sidebarCollapsed}" style="padding:0.3rem 0.65rem; font-size:0.8rem;">
          ${state.sidebarCollapsed ? 'Show Archive Index' : 'Hide Archive Index'}
        </button>
        <span style="font-size:0.8rem; color:var(--text-muted);">
          Viewing: <strong style="color:var(--text-primary);">${currentArt ? currentArt.title : 'Archive'}</strong>
          ${currentArt && state.selectedCategory !== 'All' && currentArt.category !== state.selectedCategory
            ? `<span style="font-size:0.75rem; color:var(--amber-strong); font-weight:600; margin-left:0.25rem;">(${currentArt.category})</span>`
            : ''}
        </span>
      </div>
      <div style="display:flex; align-items:center; gap:0.4rem;">
        <button type="button" id="btn-exp-reader" class="btn ${state.exploreSubMode === 'reader' ? 'active' : ''}" style="padding:0.3rem 0.7rem; font-size:0.8rem;">
          Compendium Reader
        </button>
        <button type="button" id="btn-exp-starmap" class="btn ${state.exploreSubMode === 'starmap' ? 'active' : ''}" style="padding:0.3rem 0.7rem; font-size:0.8rem;">
          Spatial Map
        </button>
      </div>
    `;

    subbarInner.querySelector('#btn-toggle-sidebar')?.addEventListener('click', () => {
      saveCurrentReadingScroll();
      state.sidebarCollapsed = !state.sidebarCollapsed;
      state.userSidebarPreference = state.sidebarCollapsed;
      try {
        sessionStorage.setItem('gc_user_sidebar_collapsed', String(state.sidebarCollapsed));
      } catch {}
      renderContextSubbar();
      renderExploreSidebar();
    });
    subbarInner.querySelector('#btn-exp-reader')?.addEventListener('click', () => {
      setDestination('explore', 'reader');
    });
    subbarInner.querySelector('#btn-exp-starmap')?.addEventListener('click', () => {
      setDestination('explore', 'starmap');
    });
  } else if (state.activeDestination === 'create') {
    subbarInner.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
        <span style="font-size:0.78rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted); margin-right:0.25rem;">
          Creation Tools:
        </span>
        <button type="button" id="btn-create-seeder" class="btn ${state.createSubMode === 'seeder' ? 'active' : ''}" style="padding:0.3rem 0.75rem; font-size:0.8rem;">
          Universe Seeder
        </button>
        <button type="button" id="btn-create-genesis" class="btn ${state.createSubMode === 'genesis' ? 'active' : ''}" style="padding:0.3rem 0.75rem; font-size:0.8rem;">
          Planetary Genesis &amp; World Comparison
        </button>
      </div>
      <div>
        <button type="button" id="btn-return-explore" class="btn" style="padding:0.3rem 0.7rem; font-size:0.8rem;">
          &larr; Return to "${currentArt ? currentArt.title : 'Explore'}"
        </button>
      </div>
    `;

    subbarInner.querySelector('#btn-create-seeder')?.addEventListener('click', () => {
      setDestination('create', 'seeder');
    });
    subbarInner.querySelector('#btn-create-genesis')?.addEventListener('click', () => {
      setDestination('create', 'genesis');
    });
    subbarInner.querySelector('#btn-return-explore')?.addEventListener('click', () => {
      setDestination('explore', 'reader');
    });
  } else if (state.activeDestination === 'timeline') {
    subbarInner.innerHTML = `
      <div style="font-size:0.8rem; color:var(--text-secondary);">
        <strong>Timeline &amp; Calendar Conversion:</strong> Synchronizing Pre-GFST Formative Wars, GFST milestones, and Hellonex's 260-day Tzolk'in cycle.
      </div>
      <div>
        <button type="button" id="btn-return-explore" class="btn" style="padding:0.3rem 0.7rem; font-size:0.8rem;">
          &larr; Return to "${currentArt ? currentArt.title : 'Explore'}"
        </button>
      </div>
    `;
    subbarInner.querySelector('#btn-return-explore')?.addEventListener('click', () => {
      setDestination('explore', 'reader');
    });
  } else if (state.activeDestination === 'continuity') {
    subbarInner.innerHTML = `
      <div style="font-size:0.8rem; color:var(--text-secondary);">
        <strong>Continuity &amp; Canon Distinctions:</strong> Preserving established canon, draft overlaps, and open reconstruction slots.
      </div>
      <div>
        <button type="button" id="btn-return-explore" class="btn" style="padding:0.3rem 0.7rem; font-size:0.8rem;">
          &larr; Return to "${currentArt ? currentArt.title : 'Explore'}"
        </button>
      </div>
    `;
    subbarInner.querySelector('#btn-return-explore')?.addEventListener('click', () => {
      setDestination('explore', 'reader');
    });
  }
}

function renderExploreSidebar() {
  const layoutEl = document.getElementById('workspace-layout');
  const sidebarEl = document.getElementById('explore-sidebar');
  if (!layoutEl || !sidebarEl) return;

  // Contextual rule: only show the archive category/entry sidebar inside Explore
  if (state.activeDestination !== 'explore') {
    layoutEl.className = 'tool-layout';
    return;
  }

  layoutEl.className = state.sidebarCollapsed
    ? 'explore-layout sidebar-collapsed'
    : 'explore-layout';
  sidebarEl.classList.toggle('mobile-hidden', state.sidebarCollapsed);

  const catNav = document.getElementById('category-list');
  if (catNav) {
    catNav.innerHTML = CATEGORIES.map(cat => `
      <button type="button" class="cat-item ${state.selectedCategory === cat ? 'active' : ''}" data-cat="${cat}">
        ${cat}
      </button>
    `).join('');

    catNav.querySelectorAll('.cat-item').forEach(btn => {
      btn.addEventListener('click', () => {
        state.selectedCategory = btn.getAttribute('data-cat');
        commitNavigationHistory(false);
        renderContextSubbar();
        renderExploreSidebar();
      });
    });
  }

  // Header search is exclusively global; the archive list filters ONLY by the selected category
  const filtered = state.articles.filter(a =>
    state.selectedCategory === 'All' || a.category === state.selectedCategory
  );

  const countEl = document.getElementById('entry-count');
  if (countEl) countEl.textContent = filtered.length;

  const currentArt = getCurrentArticle();
  const isOutsideCategory =
    currentArt &&
    state.selectedCategory !== 'All' &&
    currentArt.category !== state.selectedCategory;

  const listEl = document.getElementById('article-list');
  if (listEl) {
    const pinnedHtml = isOutsideCategory ? `
      <div id="pinned-outside-category-entry" class="outside-category-pinned">
        <div style="font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--amber-strong); margin-bottom:0.25rem; padding:0 0.25rem;">
          Viewing (Outside "${state.selectedCategory}")
        </div>
        <button type="button" class="entry-item active" data-art-id="${currentArt.id}" style="width:100%;">
          <div class="entry-item-title">${currentArt.title}</div>
          <div class="entry-item-meta">${currentArt.category}</div>
        </button>
      </div>
    ` : '';

    listEl.innerHTML = pinnedHtml + filtered.map(a => `
      <button type="button" class="entry-item ${a.id === state.currentArticleId ? 'active' : ''}" data-art-id="${a.id}">
        <div class="entry-item-title">${a.title}</div>
        <div class="entry-item-meta">${a.category}</div>
      </button>
    `).join('');

    listEl.querySelectorAll('.entry-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-art-id');
        selectArticle(id);
      });
    });
  }
}

function renderMainContent() {
  const mainEl = document.getElementById('main-view-container');
  if (!mainEl) return;

  if (state.activeDestination === 'explore') {
    if (state.exploreSubMode === 'starmap') {
      renderStarmapView(mainEl, state.starmapNodes, articleId => selectArticle(articleId));
    } else {
      const art = getCurrentArticle();
      renderWikiArticle(mainEl, art, state.articles, {
        onEdit: (a, triggerEl) => openArticleModal(a, true, triggerEl, '#btn-edit-article'),
        onBranch: (a, triggerEl) => openArticleModal({
          title: '',
          category: 'Chronicles & Stories',
          subtitle: `Branched from [[${a.title}]]`,
          quote: '',
          body: `This entry branches off from the established lore of [[${a.title}]] within the Galactic Compendium.\n\nDescribe the event, system, or Caretaker observation here...`,
          infobox: [
            { label: 'Parent Lore', value: `[[${a.title}]]` },
            { label: 'Chronology', value: 'GFST' }
          ],
          hooks: [],
          metaTruth: ''
        }, false, triggerEl, '#btn-branch-story'),
        onAddEvent: (_, triggerEl) => openEventModal(triggerEl, '#btn-add-event'),
        onOpenTimeline: a => {
          if (Array.isArray(a.events)) {
            const gfstMatch = a.events.map(e => /GFST\s+(\d+)/i.exec(e.epoch)).find(Boolean);
            if (gfstMatch) {
              setContextYearForTimeline(parseInt(gfstMatch[1], 10));
            }
          }
          setDestination('timeline');
        },
        onOpenGenesis: a => {
          setContextPlanetForGenesis(a.id);
          setDestination('create', 'genesis');
        },
        onNavigateTitle: (title, triggerEl) => navigateToTitle(title, triggerEl),
        onZoomImage: (src, caption, triggerEl) => openImageLightbox(src, caption, triggerEl, '#infobox-img-zoom'),
        onSubmitForReview: (a, triggerEl, fallbackSel) => openCommunityModal(a, triggerEl, fallbackSel),
        onSectionJump: (_, desiredScrollY) => {
          entryScrollPositions.set(state.currentArticleId, desiredScrollY);
          commitNavigationHistory(false);
        }
      });
    }
  } else if (state.activeDestination === 'create') {
    if (state.createSubMode === 'genesis') {
      renderSequenceView(mainEl, state.planetChains, {
        onOpenNewPlanetModal: triggerEl => openPlanetModal(triggerEl, '#btn-new-planet-chain')
      }, 'genesis');
    } else {
      renderSeederView(mainEl, {
        getArticles: () => state.articles,
        onOpenExistingArticle: existingId => {
          selectArticle(existingId);
        },
        onNavigateTitle: (title, triggerEl) => navigateToTitle(title, triggerEl),
        onSubmitForReview: (a, triggerEl, fallbackSel) => openCommunityModal(a, triggerEl, fallbackSel),
        onInstantiateUniverse: async newArt => {
          // Guard against duplicate saves of the identical configuration
          const existing = findMatchingSavedConfiguration(state.articles, newArt);
          if (existing) {
            selectArticle(existing.id);
            return { ok: true, existing: true };
          }
          // Guarantee unique ID even if different locked settings share a base slug/RNG suffix
          const prepared = JSON.parse(JSON.stringify(newArt));
          prepared.id = ensureUniqueId(prepared.id, state.articles);
          const candidateArticles = [prepared, ...state.articles];
          const res = await persistCompendiumData(candidateArticles, state.planetChains);
          if (!res.ok) {
            return res;
          }
          state.articles = candidateArticles;
          selectArticle(prepared.id);
          return { ok: true };
        }
      });
    }
  } else if (state.activeDestination === 'timeline') {
    renderSequenceView(mainEl, state.planetChains, {
      onOpenNewPlanetModal: triggerEl => openPlanetModal(triggerEl, '#btn-new-planet-chain')
    }, 'timeline');
  } else if (state.activeDestination === 'continuity') {
    renderContinuityView(mainEl, state.articles, state.planetChains, title => navigateToTitle(title));
  }
}

function renderSearchPopover() {
  const popover = document.getElementById('search-popover');
  if (!popover) return;
  const q = state.searchQuery;
  if (!q) {
    popover.classList.add('hidden');
    return;
  }

  // Global search across all categories
  const matches = state.articles.filter(a =>
    a.title.toLowerCase().includes(q) ||
    (a.subtitle || '').toLowerCase().includes(q) ||
    (a.body || '').toLowerCase().includes(q)
  ).slice(0, 8);

  if (matches.length === 0) {
    popover.innerHTML = `<div style="padding:0.5rem 0.65rem; font-size:0.8rem; color:var(--text-muted);">No matching lore entries found.</div>`;
  } else {
    popover.innerHTML = matches.map(a => `
      <button type="button" class="entry-item" data-pop-art="${a.id}" style="width:100%;">
        <div class="entry-item-title">${a.title}</div>
        <div class="entry-item-meta">${a.category} · ${a.canonTier || ''}</div>
      </button>
    `).join('');

    popover.querySelectorAll('[data-pop-art]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-pop-art');
        selectArticle(id, { clearSearch: true });
      });
    });
  }
  popover.classList.remove('hidden');
}

function hideSearchPopover() {
  document.getElementById('search-popover')?.classList.add('hidden');
}

let suppressScrollTimer = null;

function renderApp(options = {}) {
  suppressScrollTracking = true;
  if (suppressScrollTimer) clearTimeout(suppressScrollTimer);

  renderPrimaryNavState();
  renderContextSubbar();
  renderExploreSidebar();
  renderMainContent();

  if (typeof options.restoreScrollY === 'number') {
    window.scrollTo({ top: options.restoreScrollY, behavior: 'instant' });
  }

  suppressScrollTimer = setTimeout(() => {
    suppressScrollTracking = false;
  }, 60);
}

// --- ACCESSIBLE MODAL FOCUS MANAGER ---
let modalSaveInFlight = false;

function setModalFeedback(feedbackId, message) {
  const el = document.getElementById(feedbackId);
  if (!el) return;
  if (!message) {
    el.style.display = 'none';
    el.innerHTML = '';
  } else {
    el.style.display = 'block';
    el.innerHTML = `<div class="validation-banner" role="alert">${message}</div>`;
  }
}

function getModalFocusableElements(modalEl) {
  if (!modalEl) return [];
  return Array.from(
    modalEl.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter(el => el.offsetParent !== null || getComputedStyle(el).display !== 'none');
}

function openModalDialog(modalId, initialFocusId, triggerEl = null, fallbackSelector = null) {
  modalTriggerEl = triggerEl || document.activeElement;
  modalTriggerSelector = fallbackSelector || (modalTriggerEl?.id ? '#' + modalTriggerEl.id : null);
  activeModalId = modalId;
  modalSaveInFlight = false;

  const modalEl = document.getElementById(modalId);
  if (!modalEl) return;
  modalEl.classList.add('open');
  modalEl.setAttribute('aria-hidden', 'false');

  const initialEl = initialFocusId ? document.getElementById(initialFocusId) : null;
  if (initialEl) {
    initialEl.focus();
  } else {
    const focusables = getModalFocusableElements(modalEl);
    focusables[0]?.focus();
  }
}

function closeModalDialog(modalId) {
  const modalEl = document.getElementById(modalId);
  if (!modalEl || !modalEl.classList.contains('open')) return;
  modalEl.classList.remove('open');
  modalEl.setAttribute('aria-hidden', 'true');
  if (activeModalId === modalId) {
    activeModalId = null;
  }
  modalSaveInFlight = false;
}

function restoreModalTriggerFocus() {
  if (modalTriggerEl && document.body.contains(modalTriggerEl)) {
    modalTriggerEl.focus();
  } else if (modalTriggerSelector) {
    const fallbackEl = document.querySelector(modalTriggerSelector);
    fallbackEl?.focus();
  }
  modalTriggerEl = null;
  modalTriggerSelector = null;
}

// --- MODALS ---
function openArticleModal(prefill = null, isEdit = false, triggerEl = null, fallbackSelector = null) {
  state.editingArticleId = isEdit && prefill ? prefill.id : null;
  document.getElementById('modal-article-heading').textContent = isEdit
    ? `Edit Entry: ${prefill.title}`
    : 'Create Compendium Entry';

  const titleEl = document.getElementById('form-art-title');
  titleEl.value = prefill ? prefill.title : '';
  titleEl.removeAttribute('aria-invalid');
  document.getElementById('form-art-category').value = prefill ? prefill.category : 'Galactic Federation';
  document.getElementById('form-art-subtitle').value = prefill ? (prefill.subtitle || '') : '';
  document.getElementById('form-art-quote').value = prefill ? (prefill.quote || '') : '';
  document.getElementById('form-art-body').value = prefill ? (prefill.body || '') : '';
  document.getElementById('form-art-infobox').value = prefill && prefill.infobox
    ? prefill.infobox.map(r => `${r.label}: ${r.value}`).join('\n')
    : '';
  document.getElementById('form-art-meta').value = prefill ? (prefill.metaTruth || '') : '';
  document.getElementById('form-art-hooks').value = prefill && prefill.hooks
    ? prefill.hooks.join('\n')
    : '';

  setModalFeedback('modal-article-feedback', '');
  openModalDialog('modal-article', 'form-art-title', triggerEl, fallbackSelector);
}

function closeArticleModal(restoreFocus = true) {
  setModalFeedback('modal-article-feedback', '');
  closeModalDialog('modal-article');
  if (restoreFocus) restoreModalTriggerFocus();
}

async function saveArticleModal() {
  if (modalSaveInFlight) return;
  const titleEl = document.getElementById('form-art-title');
  const title = titleEl.value.trim();
  if (!title) {
    titleEl.setAttribute('aria-invalid', 'true');
    setModalFeedback('modal-article-feedback', '<strong>Validation Required:</strong> Please enter an <strong>Entry Title</strong> before saving.');
    titleEl.focus();
    return;
  }
  titleEl.removeAttribute('aria-invalid');
  setModalFeedback('modal-article-feedback', '');

  const category = document.getElementById('form-art-category').value;
  const subtitle = document.getElementById('form-art-subtitle').value.trim();
  const quote = document.getElementById('form-art-quote').value.trim();
  const body = document.getElementById('form-art-body').value.trim();
  const infoboxRaw = document.getElementById('form-art-infobox').value.trim();
  const metaTruth = document.getElementById('form-art-meta').value.trim();
  const hooksRaw = document.getElementById('form-art-hooks').value.trim();

  const infobox = infoboxRaw
    ? infoboxRaw.split('\n').map(line => {
        const idx = line.indexOf(':');
        if (idx === -1) return { label: 'Fact', value: line.trim() };
        return { label: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
      })
    : [];

  const hooks = hooksRaw
    ? hooksRaw.split('\n').map(s => s.trim()).filter(Boolean)
    : [];

  const candidateArticles = JSON.parse(JSON.stringify(state.articles));
  let targetArticleId = state.currentArticleId;

  if (state.editingArticleId) {
    const existing = candidateArticles.find(a => a.id === state.editingArticleId);
    if (existing) {
      existing.title = title;
      existing.category = category;
      existing.subtitle = subtitle;
      existing.quote = quote;
      existing.body = body;
      existing.infobox = infobox;
      existing.metaTruth = metaTruth;
      existing.hooks = hooks;
    }
  } else {
    const baseId = slugify(title) + '-' + Math.floor(Math.random() * 900 + 100);
    const newId = ensureUniqueId(baseId, candidateArticles);
    candidateArticles.unshift({
      id: newId,
      title,
      category,
      canonTier: 'Expanded Compendium',
      backdropTheme: 'stellar',
      subtitle,
      quote,
      body,
      infobox,
      events: [],
      hooks,
      metaTruth
    });
    targetArticleId = newId;
  }

  modalSaveInFlight = true;
  const saveBtn = document.getElementById('btn-save-article-modal');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.setAttribute('aria-busy', 'true');
  }

  const res = await persistCompendiumData(candidateArticles, state.planetChains);
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.removeAttribute('aria-busy');
  }
  modalSaveInFlight = false;

  if (!res.ok) {
    setModalFeedback('modal-article-feedback', `<strong>Save Failed:</strong> ${res.error}. Your changes are still in the form—please retry.`);
    saveBtn?.focus();
    return;
  }

  state.articles = candidateArticles;
  if (!state.editingArticleId) {
    state.currentArticleId = targetArticleId;
    state.activeDestination = 'explore';
    state.exploreSubMode = 'reader';
  }

  closeArticleModal(false);
  renderApp();
  commitNavigationHistory(false);
  restoreModalTriggerFocus();
}

function openEventModal(triggerEl = null, fallbackSelector = null) {
  document.getElementById('form-ev-epoch').value = '';
  const titleEl = document.getElementById('form-ev-title');
  titleEl.value = '';
  titleEl.removeAttribute('aria-invalid');
  document.getElementById('form-ev-desc').value = '';
  setModalFeedback('modal-event-feedback', '');
  openModalDialog('modal-event', 'form-ev-epoch', triggerEl, fallbackSelector);
}

function closeEventModal(restoreFocus = true) {
  setModalFeedback('modal-event-feedback', '');
  closeModalDialog('modal-event');
  if (restoreFocus) restoreModalTriggerFocus();
}

async function saveEventModal() {
  if (modalSaveInFlight) return;
  const epoch = document.getElementById('form-ev-epoch').value.trim() || 'GFST Logged Event';
  const titleEl = document.getElementById('form-ev-title');
  const title = titleEl.value.trim();
  const desc = document.getElementById('form-ev-desc').value.trim();
  if (!title) {
    titleEl.setAttribute('aria-invalid', 'true');
    setModalFeedback('modal-event-feedback', '<strong>Validation Required:</strong> Please enter an <strong>Event Title</strong> before saving.');
    titleEl.focus();
    return;
  }
  titleEl.removeAttribute('aria-invalid');
  setModalFeedback('modal-event-feedback', '');

  const candidateArticles = JSON.parse(JSON.stringify(state.articles));
  const art = candidateArticles.find(a => a.id === state.currentArticleId) || candidateArticles[0];
  if (art) {
    if (!art.events) art.events = [];
    art.events.push({ epoch, title, desc });
  }

  modalSaveInFlight = true;
  const saveBtn = document.getElementById('btn-save-event-modal');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.setAttribute('aria-busy', 'true');
  }

  const res = await persistCompendiumData(candidateArticles, state.planetChains);
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.removeAttribute('aria-busy');
  }
  modalSaveInFlight = false;

  if (!res.ok) {
    setModalFeedback('modal-event-feedback', `<strong>Save Failed:</strong> ${res.error}. Please retry.`);
    saveBtn?.focus();
    return;
  }

  state.articles = candidateArticles;
  closeEventModal(false);
  renderApp();
  restoreModalTriggerFocus();
}

function openPlanetModal(triggerEl = null, fallbackSelector = null) {
  ['form-pc-name', 'form-pc-polity', 'form-pc-s1', 'form-pc-s2', 'form-pc-s3', 'form-pc-s4', 'form-pc-s5'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = '';
      el.removeAttribute('aria-invalid');
    }
  });
  setModalFeedback('modal-planet-feedback', '');
  openModalDialog('modal-planet', 'form-pc-name', triggerEl, fallbackSelector);
}

function closePlanetModal(restoreFocus = true) {
  setModalFeedback('modal-planet-feedback', '');
  closeModalDialog('modal-planet');
  if (restoreFocus) restoreModalTriggerFocus();
}

async function savePlanetModal() {
  if (modalSaveInFlight) return;
  const nameEl = document.getElementById('form-pc-name');
  const name = nameEl.value.trim();
  if (!name) {
    nameEl.setAttribute('aria-invalid', 'true');
    setModalFeedback('modal-planet-feedback', '<strong>Validation Required:</strong> Please enter a <strong>World / Habitat Name</strong> before saving.');
    nameEl.focus();
    return;
  }
  nameEl.removeAttribute('aria-invalid');
  setModalFeedback('modal-planet-feedback', '');

  const polity = document.getElementById('form-pc-polity').value.trim() || 'Indexed World';
  const stage1 = document.getElementById('form-pc-s1').value.trim() || 'Condensed from local proto-stellar nebula.';
  const stage2 = document.getElementById('form-pc-s2').value.trim() || 'Synchronized with GFST.';
  const stage3 = document.getElementById('form-pc-s3').value.trim() || 'Distinct planetary geology and tectonic history.';
  const stage4 = document.getElementById('form-pc-s4').value.trim() || 'Emergent planetary resources and ecological pressures.';
  const stage5 = document.getElementById('form-pc-s5').value.trim() || 'Integrated into the historical sequence.';

  const candidateArticles = JSON.parse(JSON.stringify(state.articles));
  const candidateChains = JSON.parse(JSON.stringify(state.planetChains));
  const baseId = slugify(name) + '-' + Math.floor(Math.random() * 900 + 100);
  const newId = ensureUniqueId(baseId, candidateArticles);

  candidateChains.unshift({
    id: newId,
    name,
    polity,
    stage1,
    stage2,
    stage3,
    stage4,
    stage5
  });

  candidateArticles.unshift({
    id: newId,
    title: name,
    category: 'Worlds & Systems',
    canonTier: '5-Stage Causal Genesis',
    backdropTheme: 'stellar',
    subtitle: polity,
    quote: `"From proto-stellar dust to historical destiny: every world is a causal sequence written in stone and orbit."`,
    body: `**${name}** (${polity}) was developed using the 5-stage Deep-Time Causal Sequence methodology:\n\n### 1. Quantum & Stellar Building Blocks\n${stage1}\n\n### 2. Orbital Mechanics & Local Calendar\n${stage2}\n\n### 3. Planetary Formation & Geographical History\n${stage3}\n\n### 4. Emergent Resources & Pressures\n${stage4}\n\n### 5. Civilizational & Historical Outcome\n${stage5}`,
    infobox: [
      { label: 'Polity Status', value: polity },
      { label: 'Methodology', value: '5-Stage Causal Genesis' }
    ],
    events: [],
    hooks: [`How does ${name} contrast with neighboring worlds in its sector?`],
    metaTruth: 'Created via the Planetary Genesis & Causal Sequence Builder.'
  });

  modalSaveInFlight = true;
  const saveBtn = document.getElementById('btn-save-planet-modal');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.setAttribute('aria-busy', 'true');
  }

  const res = await persistCompendiumData(candidateArticles, candidateChains);
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.removeAttribute('aria-busy');
  }
  modalSaveInFlight = false;

  if (!res.ok) {
    setModalFeedback('modal-planet-feedback', `<strong>Save Failed:</strong> ${res.error}. Please retry.`);
    saveBtn?.focus();
    return;
  }

  state.articles = candidateArticles;
  state.planetChains = candidateChains;
  closePlanetModal(false);
  renderApp();
  restoreModalTriggerFocus();
}

function openImageLightbox(src, caption, triggerEl = null, fallbackSelector = null) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox-caption').textContent = caption || '';
  openModalDialog('modal-lightbox', 'btn-close-lightbox', triggerEl, fallbackSelector);
}

function closeImageLightbox(restoreFocus = true) {
  closeModalDialog('modal-lightbox');
  if (restoreFocus) restoreModalTriggerFocus();
}

let activeCommunityArticle = null;

function formatReadableDossier(article, author = '', notes = '') {
  if (!article) return '';
  const lines = [
    `# ${article.title}`,
    article.subtitle ? `*${article.subtitle}*` : '',
    '',
    `- **Category**: ${article.category || 'Worlds & Systems'}`,
    `- **Canon Tier / Seed**: ${article.canonTier || 'Community Submission'}`,
    author.trim() ? `- **Submitted By**: ${author.trim()}` : '',
    notes.trim() ? `- **Contributor Notes**: ${notes.trim()}` : ''
  ].filter(Boolean);

  if (Array.isArray(article.infobox) && article.infobox.length > 0) {
    lines.push('', '## Supporting Facts');
    for (const row of article.infobox) {
      lines.push(`- **${row.label}**: ${row.value}`);
    }
  }

  if (article.quote) {
    lines.push('', '## Archival Epigraph', `> ${article.quote}`);
  }

  if (article.body) {
    lines.push('', '## Overview & Lore', article.body);
  }

  if (Array.isArray(article.events) && article.events.length > 0) {
    lines.push('', '## Chronology & Historical Sequence');
    for (const ev of article.events) {
      lines.push(`- **${ev.epoch} — ${ev.title}**: ${ev.desc}`);
    }
  }

  if (Array.isArray(article.hooks) && article.hooks.length > 0) {
    lines.push('', '## Open Development Threads');
    for (const h of article.hooks) {
      lines.push(`- ${h}`);
    }
  }

  if (article.metaTruth) {
    lines.push('', '## Provenance Note', article.metaTruth);
  }

  return lines.join('\n');
}

function updateCommunityPreviewText() {
  const previewEl = document.getElementById('form-sub-preview');
  const authorEl = document.getElementById('form-sub-author');
  const notesEl = document.getElementById('form-sub-notes');
  if (!previewEl || !activeCommunityArticle) return;
  previewEl.value = formatReadableDossier(
    activeCommunityArticle,
    authorEl ? authorEl.value : '',
    notesEl ? notesEl.value : ''
  );
}

function setCommunityPositiveFeedback(htmlMsg) {
  const el = document.getElementById('modal-community-feedback');
  if (!el) return;
  if (!htmlMsg) {
    el.style.display = 'none';
    el.innerHTML = '';
  } else {
    el.style.display = 'block';
    el.innerHTML = `<div class="seeder-existing-banner" style="margin-bottom:0;">${htmlMsg}</div>`;
  }
}

function openCommunityModal(article, triggerEl = null, fallbackSelector = null) {
  activeCommunityArticle = article ? JSON.parse(JSON.stringify(article)) : getCurrentArticle();
  const headingEl = document.getElementById('modal-community-heading');
  if (headingEl && activeCommunityArticle?.title) {
    headingEl.textContent = `Submit for Community Review: ${activeCommunityArticle.title}`;
  }
  const authorEl = document.getElementById('form-sub-author');
  const notesEl = document.getElementById('form-sub-notes');
  if (authorEl) authorEl.value = '';
  if (notesEl) notesEl.value = '';
  setCommunityPositiveFeedback('');
  updateCommunityPreviewText();
  openModalDialog('modal-community', 'form-sub-author', triggerEl, fallbackSelector);
}

function closeCommunityModal(restoreFocus = true) {
  setCommunityPositiveFeedback('');
  closeModalDialog('modal-community');
  if (restoreFocus) restoreModalTriggerFocus();
}

function applyHashState(hashStr) {
  const clean = (hashStr || '').replace(/^#/, '');
  if (!clean) return;
  const [part1, part2] = clean.split('/');
  if (part1 === 'explore') {
    state.activeDestination = 'explore';
    if (part2 === 'starmap') {
      state.exploreSubMode = 'starmap';
    } else if (part2) {
      state.exploreSubMode = 'reader';
      const decoded = decodeURIComponent(part2);
      if (state.articles.some(a => a.id === decoded)) {
        state.currentArticleId = decoded;
      }
    }
  } else if (part1 === 'create') {
    state.activeDestination = 'create';
    state.createSubMode = part2 === 'genesis' ? 'genesis' : 'seeder';
  } else if (part1 === 'timeline' || part1 === 'continuity') {
    state.activeDestination = part1;
  }
}

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', async () => {
  await fetchCompendiumData();

  if (window.location.hash) {
    applyHashState(window.location.hash);
  }
  renderApp();
  commitNavigationHistory(false);

  // Track reading scroll position continuously while not in a programmatic render/restore
  window.addEventListener('scroll', () => {
    if (suppressScrollTracking) return;
    saveCurrentReadingScroll();
    commitNavigationHistory(false, window.scrollY);
  }, { passive: true });

  // Respect mobile default collapse unless user set an explicit preference
  window.addEventListener('resize', () => {
    if (state.userSidebarPreference === null) {
      const shouldCollapse = window.innerWidth <= 900;
      if (state.sidebarCollapsed !== shouldCollapse) {
        state.sidebarCollapsed = shouldCollapse;
        renderContextSubbar();
        renderExploreSidebar();
      }
    }
  });

  // Browser Back / Forward navigation handler
  window.addEventListener('popstate', e => {
    if (e.state && e.state.activeDestination) {
      state.activeDestination = e.state.activeDestination;
      state.exploreSubMode = e.state.exploreSubMode || 'reader';
      state.createSubMode = e.state.createSubMode || 'seeder';
      if (e.state.currentArticleId) {
        state.currentArticleId = e.state.currentArticleId;
      }
      if (e.state.selectedCategory) {
        state.selectedCategory = e.state.selectedCategory;
      }
      const targetScroll = (state.activeDestination === 'explore' && state.exploreSubMode === 'reader')
        ? (entryScrollPositions.get(state.currentArticleId) ?? e.state.scrollY ?? 0)
        : (destinationScrollPositions.get(getDestinationKey()) ?? e.state.scrollY ?? 0);
      renderApp({ restoreScrollY: targetScroll });
    } else if (window.location.hash) {
      applyHashState(window.location.hash);
      const targetScroll = (state.activeDestination === 'explore' && state.exploreSubMode === 'reader')
        ? (entryScrollPositions.get(state.currentArticleId) ?? 0)
        : (destinationScrollPositions.get(getDestinationKey()) ?? 0);
      renderApp({ restoreScrollY: targetScroll });
    }
  });

  // Global Search input (Exclusively controls global popover, not sidebar archive list)
  const searchInput = document.getElementById('search-input');
  searchInput?.addEventListener('input', e => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    renderSearchPopover();
  });

  searchInput?.addEventListener('focus', () => {
    if (state.searchQuery) renderSearchPopover();
  });

  // Dismiss search popover on outside click
  document.addEventListener('click', e => {
    const utils = document.querySelector('.header-utilities');
    if (utils && !utils.contains(e.target)) {
      hideSearchPopover();
    }
  });

  // 4 Primary Task Destinations (Header)
  document.getElementById('nav-dest-explore')?.addEventListener('click', () => {
    setDestination('explore', 'reader');
  });
  document.getElementById('nav-dest-create')?.addEventListener('click', () => {
    setDestination('create', state.createSubMode);
  });
  document.getElementById('nav-dest-timeline')?.addEventListener('click', () => {
    setDestination('timeline');
  });
  document.getElementById('nav-dest-continuity')?.addEventListener('click', () => {
    setDestination('continuity');
  });

  // 4 Primary Task Destinations (Mobile Persistent Bar)
  document.querySelectorAll('[data-mobile-dest]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dest = btn.getAttribute('data-mobile-dest');
      setDestination(dest);
    });
  });

  // New Entry button
  document.getElementById('btn-new-entry')?.addEventListener('click', e => {
    openArticleModal(null, false, e.currentTarget, '#btn-new-entry');
  });

  // Export JSON
  document.getElementById('btn-export-json')?.addEventListener('click', () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({
      articles: state.articles,
      planetChains: state.planetChains
    }, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', 'galactic_compendium_lore.json');
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  // Sync Canon Seed
  document.getElementById('btn-reset-seed')?.addEventListener('click', async () => {
    if (window.__GALACTIC_SEED_DATA__) {
      const seed = window.__GALACTIC_SEED_DATA__;
      state.articles = JSON.parse(JSON.stringify(seed.articles || []));
      state.planetChains = JSON.parse(JSON.stringify(seed.planetChains || []));
      try {
        localStorage.removeItem('gc_phase1_articles');
        localStorage.removeItem('gc_phase1_planetChains');
      } catch {}
    } else {
      const res = await fetch('/api/reset', { method: 'POST' });
      const data = await res.json();
      if (data.articles) state.articles = data.articles;
      if (data.planetChains) state.planetChains = data.planetChains;
    }
    state.currentArticleId = 'galactic-federation';
    state.activeDestination = 'explore';
    renderApp({ restoreScrollY: 0 });
  });

  // Modal buttons
  document.getElementById('btn-close-article-modal')?.addEventListener('click', () => closeArticleModal(true));
  document.getElementById('btn-cancel-article-modal')?.addEventListener('click', () => closeArticleModal(true));
  document.getElementById('btn-save-article-modal')?.addEventListener('click', saveArticleModal);

  document.getElementById('btn-close-event-modal')?.addEventListener('click', () => closeEventModal(true));
  document.getElementById('btn-save-event-modal')?.addEventListener('click', saveEventModal);

  document.getElementById('btn-close-planet-modal')?.addEventListener('click', () => closePlanetModal(true));
  document.getElementById('btn-save-planet-modal')?.addEventListener('click', savePlanetModal);

  document.getElementById('btn-close-community-modal')?.addEventListener('click', () => closeCommunityModal(true));
  document.getElementById('form-sub-author')?.addEventListener('input', updateCommunityPreviewText);
  document.getElementById('form-sub-notes')?.addEventListener('input', updateCommunityPreviewText);

  document.getElementById('btn-copy-community-dossier')?.addEventListener('click', async () => {
    updateCommunityPreviewText();
    const previewEl = document.getElementById('form-sub-preview');
    const text = previewEl ? previewEl.value : '';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (previewEl) {
        previewEl.focus();
        previewEl.select();
        document.execCommand('copy');
      }
      setCommunityPositiveFeedback('<strong>Copied to clipboard:</strong> Readable dossier copied! You can paste it directly into Discord, email, or a message.');
    } catch {
      if (previewEl) {
        previewEl.focus();
        previewEl.select();
        try { document.execCommand('copy'); } catch {}
      }
      setCommunityPositiveFeedback('<strong>Ready to copy:</strong> Dossier selected above—press Ctrl+C / Cmd+C to copy.');
    }
  });

  document.getElementById('btn-download-community-dossier')?.addEventListener('click', () => {
    updateCommunityPreviewText();
    const previewEl = document.getElementById('form-sub-preview');
    const text = previewEl ? previewEl.value : '';
    const slug = slugify(activeCommunityArticle?.title || 'universe-dossier') || 'universe-dossier';
    const dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `${slug}-dossier.txt`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setCommunityPositiveFeedback(`<strong>Downloaded:</strong> Saved readable dossier as <code>${slug}-dossier.txt</code>.`);
  });

  document.getElementById('btn-open-github-submission')?.addEventListener('click', () => {
    updateCommunityPreviewText();
    const previewEl = document.getElementById('form-sub-preview');
    const bodyText = previewEl ? previewEl.value : '';
    const titleText = `[Canon Submission] ${activeCommunityArticle?.title || 'New Lore Entry'}`;
    const issueUrl = `https://github.com/Ganymede-Lab/galactic-compendium/issues/new?title=${encodeURIComponent(titleText)}&body=${encodeURIComponent(bodyText)}`;
    window.open(issueUrl, '_blank', 'noopener,noreferrer');
    setCommunityPositiveFeedback('<strong>Opened GitHub submission:</strong> Complete your submission in the new tab, or use <strong>Copy readable dossier</strong> if you prefer to share without GitHub.');
  });

  document.getElementById('btn-close-lightbox')?.addEventListener('click', e => {
    e.stopPropagation();
    closeImageLightbox(true);
  });
  document.getElementById('modal-lightbox')?.addEventListener('click', e => {
    if (e.target.id === 'modal-lightbox' || e.target.id === 'lightbox-img') {
      closeImageLightbox(true);
    }
  });

  // Keyboard Focus Trap & Escape Handler for Open Modals and Popovers
  document.addEventListener('keydown', e => {
    if (activeModalId) {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (activeModalId === 'modal-article') closeArticleModal(true);
        else if (activeModalId === 'modal-event') closeEventModal(true);
        else if (activeModalId === 'modal-planet') closePlanetModal(true);
        else if (activeModalId === 'modal-community') closeCommunityModal(true);
        else if (activeModalId === 'modal-lightbox') closeImageLightbox(true);
        return;
      }

      if (e.key === 'Tab') {
        const modalEl = document.getElementById(activeModalId);
        const focusables = getModalFocusableElements(modalEl);
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first || !modalEl.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !modalEl.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
      return;
    }

    if (e.key === 'Escape') {
      hideSearchPopover();
    }
  });
});
