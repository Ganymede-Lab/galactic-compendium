// Universe Seeding Engine (Quantum Ignition Generator)

import { parseWikiProse } from './wikiView.js';

let currentSeed = 'TENTACLE-05::SOLACE-075';
let customName = '';
let lockTentacle = 'random';
let lockPhysics = 'random';
let lockArch = 'random';
let lockCiv = 'random';
let lockCaretaker = '[[Illyad]]';
let lastPreview = null;
let duplicateNoticeArticle = null;
let saveInFlight = false;
let customizeExpanded = false;
let renameExpanded = false;
let hasUserGeneratedOrEdited = false;

function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function () {
    h += h << 13; h ^= h >>> 7;
    h += h << 3;  h ^= h >>> 17;
    h += h << 5;
    return (h >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function findMatchingSavedConfiguration(articles, preview) {
  if (!Array.isArray(articles) || !preview) return null;
  return articles.find(a => {
    if (a.configSignature && preview.configSignature) {
      return a.configSignature === preview.configSignature;
    }
    return (
      a.canonTier === preview.canonTier &&
      a.title === preview.title &&
      a.subtitle === preview.subtitle &&
      a.body === preview.body
    );
  }) || null;
}

let saveErrorMessage = null;

function getActiveCustomizationsCount() {
  let count = 0;
  if (lockTentacle !== 'random') count++;
  if (lockPhysics !== 'random') count++;
  if (lockArch !== 'random') count++;
  if (lockCiv !== 'random') count++;
  return count;
}

export function renderSeederView(container, callbacks) {
  if (!container) return;
  saveInFlight = false;
  saveErrorMessage = null;

  function buildPreview() {
    const rng = hashSeed(currentSeed || 'SEED-01');
    const sylA = ['Vesp', 'Aeth', 'Sol', 'Kael', 'Oryn', 'Thal', 'Nyra', 'Zeph', 'Cyr', 'Val'];
    const sylB = ['era', 'gard', 'ion', 'os', 'is', 'axis', 'vane', 'ora', 'um', 'en'];
    const suf = ['Prime', 'Cluster', 'IV', 'IX', 'Sector', 'Compact', 'Reach'];

    const autoTitle = `${pick(rng, sylA)}${pick(rng, sylB)} ${pick(rng, suf)}`;
    const title = customName.trim() || autoTitle;

    const tentacles = [
      'Inner Core Framework (Tentacle-01)',
      'Mid-Span Resonant Conduit (Tentacle-04)',
      'Outer Frontier Filament (Tentacle-09)',
      'Deep Moon-Confluence Branch (Tentacle-12)'
    ];
    const physicsList = [
      'Persistent (Self-Stabilizing Equilibrium)',
      'Persistent (Beacon-Stabilized Singularities)',
      'Metastable (Shifting Gravitational Tides)',
      'Volatile (High-Radiative Decay)'
    ];
    const architectures = [
      'Tripartite Stellar-States & Black Hole Cluster',
      'Galactic Spiral Web & Terrestrial Worlds',
      'Luminous Nebula Sea & Trade Hubs',
      'Shattered Dyson Relics & Fallen Sectors'
    ];
    const civs = [
      'Layered Political Federation & Independent Enclaves',
      'Mythic Antiquity & Bronze-Star Kingdoms',
      'Industrial / Early Void-Faring Awakening',
      'Post-Cataclysmic Ark Survivors'
    ];

    const tentacle = lockTentacle === 'random' ? pick(rng, tentacles) : lockTentacle;
    const physics = lockPhysics === 'random' ? pick(rng, physicsList) : lockPhysics;
    const arch = lockArch === 'random' ? pick(rng, architectures) : lockArch;
    const civ = lockCiv === 'random' ? pick(rng, civs) : lockCiv;

    const isVolatile = physics.startsWith('Volatile');
    const isMeta = physics.startsWith('Metastable');
    const stabilityPct = isVolatile
      ? Math.floor(14 + rng() * 26)
      : isMeta
      ? Math.floor(55 + rng() * 25)
      : Math.floor(86 + rng() * 13);

    const quote = `"Through the [[Orichalcum Frames]], ${title} unfolds first as a sensory torrent of beacon-light and orbital resonance before dissolving into First-Kind glyphs."`;
    const body = `**${title}** is a seeded cosmos along the **${tentacle}** of [[The Celestial Library]] (Stability Index: **${stabilityPct}%**, **${physics}**). Its astro-geography features **${arch}**, while its **All-Kind** inhabitants have developed into a **${civ}** horizon observed by ${lockCaretaker}.`;

    const events = [
      {
        epoch: 'Epoch I · Quantum Ignition',
        title: 'Radiative Seeding on the Construct',
        desc: `A burst of radiative construction energy along ${tentacle} seeds ${title}, locking in its ${arch.toLowerCase()}.`
      },
      {
        epoch: 'Epoch II · Planetary Accretion',
        title: 'Divergent Geological Formation',
        desc: `Inner and outer worlds differentiate by core composition and orbital resonance, establishing distinct local calendars.`
      },
      {
        epoch: 'Epoch III · All-Kind Horizon',
        title: `Emergence of ${civ}`,
        desc: `All-Kind polities take shape across the sector, observed by ${lockCaretaker}.`
      }
    ];

    const baseId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(rng() * 900 + 100);
    const configSignature = JSON.stringify({
      seed: currentSeed,
      title,
      tentacle,
      physics,
      arch,
      civ,
      stabilityPct,
      caretaker: lockCaretaker
    });

    lastPreview = {
      id: baseId,
      autoTitle,
      configSignature,
      title,
      category: 'Worlds & Systems',
      canonTier: `Seed: ${currentSeed}`,
      backdropTheme: isVolatile ? 'forge' : 'stellar',
      subtitle: `${physics.split(' ')[0]} Cosmos · ${tentacle}`,
      quote,
      body,
      infobox: [
        { label: 'Quantum Seed', value: currentSeed },
        { label: 'Construct Sector', value: tentacle },
        { label: 'Physics Regime', value: physics },
        { label: 'Stability Index', value: `${stabilityPct}%` },
        { label: 'Architecture', value: arch },
        { label: 'All-Kind Tier', value: civ },
        { label: 'Assigned Caretaker', value: lockCaretaker }
      ],
      events,
      hooks: [
        `Use the "Sequence & Planetary Genesis" tab to map how Planet A vs. Planet B formed inside ${title}.`,
        `Zero-Impact Caretaker Candidate: An All-Kind native of ${title} whose disappearance in a historical blind spot leaves 0.00% disruption.`
      ],
      metaTruth: `Instantiated via the Galactic Compendium Universe Seeding Engine using seed [${currentSeed}].`
    };
  }

  function updateActionAndHeaderState() {
    buildPreview();

    const articles = callbacks.getArticles ? callbacks.getArticles() : [];
    const existingMatch = findMatchingSavedConfiguration(articles, lastPreview);
    if (!existingMatch) {
      duplicateNoticeArticle = null;
    }
    const matchedEntry = duplicateNoticeArticle || existingMatch;
    const customCount = getActiveCustomizationsCount();
    const isModifiedFromInitial = hasUserGeneratedOrEdited || customName.trim() !== '' || customCount > 0;

    // 1. Update Top Action Bar ("Generate universe" vs. "Generate another", Customize count)
    const rollBtn = container.querySelector('#btn-roll-seed');
    const toggleBtn = container.querySelector('#btn-toggle-customize');
    const resetBtn = container.querySelector('#btn-reset-seeder-locks');
    const statusEl = container.querySelector('#seeder-active-status');

    if (rollBtn) {
      rollBtn.textContent = (isModifiedFromInitial || matchedEntry) ? 'Generate another' : 'Generate universe';
    }
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', String(customizeExpanded));
      toggleBtn.classList.toggle('btn-disclosure-open', customizeExpanded);
      toggleBtn.textContent = customCount > 0
        ? `Customize parameters (${customCount})`
        : 'Customize parameters';
    }
    if (resetBtn) {
      resetBtn.style.display = customCount > 0 ? 'inline-flex' : 'none';
    }
    if (statusEl) {
      statusEl.innerHTML = `
        <span>Seed: <strong style="font-family:var(--font-mono); color:var(--text-primary);">${currentSeed || 'SEED-01'}</strong></span>
        <span style="color:var(--border-strong);">&middot;</span>
        <span>${customCount === 0 ? 'All parameters rolled from seed' : `${customCount} parameter${customCount === 1 ? '' : 's'} locked`}</span>
      `;
    }

    // 2. Update Preview Status Badge ("Example preview" vs. "Unsaved preview" vs. "Already in compendium")
    const statusBadge = container.querySelector('#seeder-preview-status');
    const stabilityTag = container.querySelector('#seeder-preview-stability');
    const customNamePill = container.querySelector('#seeder-custom-name-pill');
    const titleEl = container.querySelector('#seeder-preview-title');
    const subtitleEl = container.querySelector('#seeder-preview-subtitle');
    const renameBtn = container.querySelector('#btn-rename-universe');
    const renameEditor = container.querySelector('#seeder-rename-editor');
    const resetNameBtn = container.querySelector('#btn-reset-name');
    const nameInput = container.querySelector('#seeder-name');
    const saveBtn = container.querySelector('#btn-instantiate-seed');

    if (statusBadge) {
      if (matchedEntry) {
        statusBadge.className = 'preview-status-badge preview-status-saved';
        statusBadge.textContent = 'Already in compendium';
      } else if (isModifiedFromInitial) {
        statusBadge.className = 'preview-status-badge preview-status-unsaved';
        statusBadge.textContent = 'Unsaved preview';
      } else {
        statusBadge.className = 'preview-status-badge preview-status-example';
        statusBadge.textContent = 'Example preview';
      }
    }
    if (stabilityTag) {
      stabilityTag.textContent = `${lastPreview.infobox[3].value} Stability`;
    }
    if (customNamePill) {
      customNamePill.style.display = customName.trim() ? 'inline-flex' : 'none';
    }
    if (titleEl) {
      titleEl.textContent = lastPreview.title;
    }
    if (subtitleEl) {
      subtitleEl.textContent = lastPreview.subtitle;
    }
    if (renameBtn) {
      renameBtn.setAttribute('aria-expanded', String(renameExpanded));
      renameBtn.classList.toggle('btn-disclosure-open', renameExpanded);
    }
    if (renameEditor) {
      renameEditor.classList.toggle('hidden', !renameExpanded);
    }
    if (resetNameBtn) {
      resetNameBtn.style.display = customName.trim() ? 'inline-flex' : 'none';
    }
    if (nameInput && document.activeElement !== nameInput) {
      nameInput.value = customName;
      nameInput.placeholder = `Generated name: ${lastPreview.autoTitle}`;
    }
    if (saveBtn) {
      saveBtn.disabled = saveInFlight;
      if (saveInFlight) {
        saveBtn.setAttribute('aria-busy', 'true');
        saveBtn.textContent = 'Saving…';
      } else {
        saveBtn.removeAttribute('aria-busy');
        saveBtn.textContent = 'Save to compendium';
      }
    }

    // 3. Update Alert / Existing Notice Banner & Preview Body (Summary, Lore, Sequence)
    const bannersEl = container.querySelector('#seeder-preview-banners');
    if (bannersEl) {
      bannersEl.innerHTML = `
        ${saveErrorMessage ? `
          <div id="seeder-save-error" class="validation-banner" role="alert" style="margin-bottom:0.85rem;">
            <strong>Save Failed:</strong> ${saveErrorMessage}
          </div>
        ` : ''}

        ${matchedEntry ? `
          <div id="seeder-existing-notice" class="seeder-existing-banner" role="status" aria-live="polite">
            <div style="font-size:0.83rem; color:var(--text-primary);">
              <strong>Already in Compendium:</strong> This generated universe (<strong>${matchedEntry.title}</strong>) has already been saved.
            </div>
            <button type="button" id="btn-open-existing-seed" class="btn btn-primary" style="padding:0.35rem 0.8rem; font-size:0.82rem;">
              Open existing entry
            </button>
          </div>
        ` : ''}
      `;

      bannersEl.querySelector('#btn-open-existing-seed')?.addEventListener('click', () => {
        if (matchedEntry && callbacks.onOpenExistingArticle) {
          callbacks.onOpenExistingArticle(matchedEntry.id);
        }
      });
    }

    const bodyEl = container.querySelector('#seeder-preview-body');
    if (bodyEl) {
      bodyEl.innerHTML = `
        <!-- 1. Concise Generated Summary (Before Longer Lore & Historical Sequence) -->
        <section id="seeder-summary-card" class="seeder-summary-card" aria-label="Generated universe summary">
          <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:0.5rem; margin-bottom:0.75rem;">
            <div class="panel-heading" style="color:var(--text-primary); margin-bottom:0;">Generated Summary</div>
            <span style="font-size:0.75rem; color:var(--text-muted);">
              Target Category: <strong>Worlds &amp; Systems</strong> &middot; Observer: <strong>Illyad</strong>
            </span>
          </div>

          <div class="seeder-summary-grid">
            <div class="seeder-summary-item">
              <div class="seeder-summary-label">
                <span>Construct Branch (Sector)</span>
                ${lockTentacle !== 'random' ? `<span class="seeder-lock-pill">Locked</span>` : ''}
              </div>
              <div class="seeder-summary-value">${lastPreview.infobox[1].value}</div>
            </div>

            <div class="seeder-summary-item">
              <div class="seeder-summary-label">
                <span>Physics &amp; Stability</span>
                ${lockPhysics !== 'random' ? `<span class="seeder-lock-pill">Locked</span>` : ''}
              </div>
              <div class="seeder-summary-value">${lastPreview.infobox[3].value} &middot; ${lastPreview.infobox[2].value}</div>
            </div>

            <div class="seeder-summary-item">
              <div class="seeder-summary-label">
                <span>Cosmic Architecture</span>
                ${lockArch !== 'random' ? `<span class="seeder-lock-pill">Locked</span>` : ''}
              </div>
              <div class="seeder-summary-value">${lastPreview.infobox[4].value}</div>
            </div>

            <div class="seeder-summary-item">
              <div class="seeder-summary-label">
                <span>Civilization Horizon</span>
                ${lockCiv !== 'random' ? `<span class="seeder-lock-pill">Locked</span>` : ''}
              </div>
              <div class="seeder-summary-value">${lastPreview.infobox[5].value}</div>
            </div>
          </div>
        </section>

        <!-- 2. Longer Lore Narrative -->
        <section id="seeder-lore-section" style="margin-bottom:1.25rem;">
          <div class="panel-heading" style="color:var(--text-secondary); margin-bottom:0.55rem;">Lore Overview</div>
          <div class="epigraph-box" style="margin:0 0 0.85rem 0;">
            <div class="epigraph-quote" style="font-size:0.9rem;">${parseWikiProse(lastPreview.quote)}</div>
          </div>
          <div class="wiki-prose" style="font-size:0.92rem; margin:0;">
            ${parseWikiProse(lastPreview.body)}
          </div>
        </section>

        <!-- 3. Historical Sequence -->
        <section id="seeder-sequence-section" style="margin-top:1rem; padding-top:1rem; border-top:1px solid var(--border-subtle);">
          <div class="panel-heading" style="color:var(--orichalcum); margin-bottom:0.65rem;">
            Historical Sequence &middot; Simultaneous Span (First-Kind Non-Linear Index)
          </div>
          ${lastPreview.events.map(ev => `
            <div class="event-card" style="padding:0.65rem 0.85rem;">
              <div class="event-top">
                <span class="event-title" style="font-size:0.84rem;">${ev.title}</span>
                <span class="event-epoch">${ev.epoch}</span>
              </div>
              <div style="font-size:0.8rem; color:var(--text-secondary);">${ev.desc}</div>
            </div>
          `).join('')}
        </section>
      `;

      bodyEl.querySelectorAll('[data-wiki-target]').forEach(el => {
        el.addEventListener('click', e => {
          e.preventDefault();
          const target = el.getAttribute('data-wiki-target');
          if (target && callbacks.onNavigateTitle) {
            callbacks.onNavigateTitle(target, el);
          }
        });
      });
    }
  }

  container.innerHTML = `
    <div class="glass-panel">
      <div class="article-header" style="padding-bottom:1rem; margin-bottom:1rem;">
        <div class="meta-tags">
          <span class="tag tag-orichalcum">First-Kind Construct Byproduct Simulator</span>
          <span class="tag tag-mono">Deterministic Quantum Seeding</span>
        </div>
        <h1 class="article-title" style="font-size:1.55rem;">Universe Seeding Engine</h1>
        <p class="article-subtitle">
          Generate a new star sector along a Celestial Library branch, optionally customize individual parameters, and save it directly to the compendium.
        </p>
      </div>

      <!-- Step 1: Obvious First Action ("Generate universe" / "Generate another") + Optional Depth Toggle ("Customize parameters") -->
      <div class="seeder-action-bar">
        <div class="seeder-action-buttons">
          <button type="button" id="btn-roll-seed" class="btn btn-primary" style="font-size:0.9rem; padding:0.5rem 1.05rem;">
            Generate universe
          </button>
          <button
            type="button"
            id="btn-toggle-customize"
            class="btn ${customizeExpanded ? 'btn-disclosure-open' : ''}"
            aria-expanded="${customizeExpanded}"
            aria-controls="seeder-customize-panel"
          >
            Customize parameters
          </button>
          <button
            type="button"
            id="btn-reset-seeder-locks"
            class="btn"
            style="font-size:0.78rem; padding:0.35rem 0.7rem; display:none;"
          >
            Reset locks
          </button>
        </div>
        <div id="seeder-active-status" style="font-size:0.8rem; color:var(--text-secondary); display:flex; flex-wrap:wrap; align-items:center; gap:0.45rem;">
        </div>
      </div>

      <!-- Step 2: Expandable Customization Panel (Worldbuilding Parameters & Seed Identifier) -->
      <section
        id="seeder-customize-panel"
        class="seeder-customize-panel ${customizeExpanded ? '' : 'hidden'}"
        aria-label="Customize universe parameters"
      >
        <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:0.5rem; margin-bottom:0.85rem;">
          <div class="panel-heading" style="color:var(--orichalcum); margin-bottom:0;">
            Customize Worldbuilding Parameters &amp; Seed
          </div>
          <span style="font-size:0.76rem; color:var(--text-muted);">
            Locked traits stay fixed when you click <strong>Generate another</strong>.
          </span>
        </div>

        <div class="seeder-customize-grid">
          <div>
            <label for="seeder-tentacle" style="display:block; font-size:0.76rem; font-weight:600; color:var(--text-secondary); margin-bottom:0.25rem;">Construct Tentacle Sector</label>
            <select id="seeder-tentacle" class="form-select">
              <option value="random">[Quantum Roll — Any Tentacle]</option>
              <option value="Inner Core Framework (Tentacle-01)">Inner Core Framework (Tentacle-01)</option>
              <option value="Mid-Span Resonant Conduit (Tentacle-04)">Mid-Span Resonant Conduit (Tentacle-04)</option>
              <option value="Outer Frontier Filament (Tentacle-09)">Outer Frontier Filament (Tentacle-09)</option>
              <option value="Deep Moon-Confluence Branch (Tentacle-12)">Deep Moon-Confluence Branch (Tentacle-12)</option>
            </select>
          </div>

          <div>
            <label for="seeder-physics" style="display:block; font-size:0.76rem; font-weight:600; color:var(--text-secondary); margin-bottom:0.25rem;">Physics &amp; Persistence Regime</label>
            <select id="seeder-physics" class="form-select">
              <option value="random">[Quantum Roll — Emergent Physics]</option>
              <option value="Persistent (Self-Stabilizing Equilibrium)">Persistent (Self-Stabilizing Equilibrium)</option>
              <option value="Persistent (Beacon-Stabilized Singularities)">Persistent (Beacon-Stabilized Singularities)</option>
              <option value="Metastable (Shifting Gravitational Tides)">Metastable (Shifting Gravitational Tides)</option>
              <option value="Volatile (High-Radiative Decay)">Volatile (High-Radiative Decay)</option>
            </select>
          </div>

          <div>
            <label for="seeder-arch" style="display:block; font-size:0.76rem; font-weight:600; color:var(--text-secondary); margin-bottom:0.25rem;">Cosmic Architecture</label>
            <select id="seeder-arch" class="form-select">
              <option value="random">[Quantum Roll — Any Architecture]</option>
              <option value="Tripartite Stellar-States & Black Hole Cluster">Tripartite Stellar-States &amp; Black Hole Cluster</option>
              <option value="Galactic Spiral Web & Terrestrial Worlds">Galactic Spiral Web &amp; Terrestrial Worlds</option>
              <option value="Luminous Nebula Sea & Trade Hubs">Luminous Nebula Sea &amp; Trade Hubs</option>
              <option value="Shattered Dyson Relics & Fallen Sectors">Shattered Dyson Relics &amp; Fallen Sectors</option>
            </select>
          </div>

          <div>
            <label for="seeder-civ" style="display:block; font-size:0.76rem; font-weight:600; color:var(--text-secondary); margin-bottom:0.25rem;">All-Kind Civilization Horizon</label>
            <select id="seeder-civ" class="form-select">
              <option value="random">[Quantum Roll — Any Epoch Tier]</option>
              <option value="Layered Political Federation & Independent Enclaves">Layered Political Federation &amp; Independent Enclaves</option>
              <option value="Mythic Antiquity & Bronze-Star Kingdoms">Mythic Antiquity &amp; Bronze-Star Kingdoms</option>
              <option value="Industrial / Early Void-Faring Awakening">Industrial / Early Void-Faring Awakening</option>
              <option value="Post-Cataclysmic Ark Survivors">Post-Cataclysmic Ark Survivors</option>
            </select>
          </div>

          <div style="grid-column: 1 / -1;">
            <label for="seeder-code" style="display:block; font-size:0.76rem; font-weight:600; color:var(--text-secondary); margin-bottom:0.25rem;">Quantum Seed Signature (Shareable Identifier)</label>
            <input id="seeder-code" type="text" value="${currentSeed}" aria-describedby="seeder-code-help" class="form-input" style="font-family:var(--font-mono);" />
            <p id="seeder-code-help" style="font-size:0.72rem; color:var(--text-muted); margin-top:0.25rem; line-height:1.4;">
              Seed text acts as a deterministic identifier; the generated Construct Tentacle branch is shown in the preview or locked separately above.
            </p>
          </div>
        </div>
      </section>

      <!-- Step 3: Live Generated Preview (Static Header with Status & Inline Rename + Dynamic Body) -->
      <div class="seeder-grid">
        <div id="seeder-preview-pane" style="background:var(--surface-interactive); border:1px solid var(--hairline); border-radius:var(--radius-md); padding:1.25rem; display:flex; flex-direction:column; gap:0; min-width:0;">
          <div id="seeder-preview-banners"></div>

          <!-- Static Preview Header so Inline Rename and Save Button Never Unmount While Typing -->
          <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:flex-start; gap:0.85rem; border-bottom:1px solid var(--hairline); padding-bottom:0.95rem; margin-bottom:1.1rem;">
            <div style="min-width:0; flex:1 1 320px;">
              <div style="display:flex; flex-wrap:wrap; align-items:center; gap:0.45rem;">
                <span id="seeder-preview-status" class="preview-status-badge preview-status-example" role="status" aria-live="polite">Example preview</span>
                <span id="seeder-preview-stability" class="tag tag-orichalcum">57% Stability</span>
                <span id="seeder-custom-name-pill" class="seeder-lock-pill" style="display:none;">Custom name</span>
              </div>

              <div style="display:flex; flex-wrap:wrap; align-items:baseline; gap:0.65rem; margin-top:0.4rem;">
                <h2 id="seeder-preview-title" style="font-family:var(--font-serif); font-size:1.55rem; font-weight:700; color:var(--text-primary); margin:0;"></h2>
                <button
                  type="button"
                  id="btn-rename-universe"
                  class="btn ${renameExpanded ? 'btn-disclosure-open' : ''}"
                  aria-expanded="${renameExpanded}"
                  aria-controls="seeder-rename-editor"
                  style="padding:0.22rem 0.6rem; font-size:0.78rem;"
                >
                  Rename
                </button>
              </div>

              <!-- Inline Rename Editor right beside/under the title -->
              <div id="seeder-rename-editor" class="seeder-rename-editor ${renameExpanded ? '' : 'hidden'}">
                <label for="seeder-name" style="font-size:0.76rem; font-weight:600; color:var(--text-secondary);">Universe Name:</label>
                <input
                  id="seeder-name"
                  type="text"
                  value="${customName}"
                  placeholder="Enter custom universe name..."
                  class="form-input"
                  style="flex:1 1 200px; min-width:160px; padding:0.35rem 0.6rem; font-size:0.85rem;"
                />
                <button type="button" id="btn-done-rename" class="btn" style="padding:0.32rem 0.65rem; font-size:0.78rem;">
                  Done
                </button>
                <button type="button" id="btn-reset-name" class="btn" style="padding:0.32rem 0.65rem; font-size:0.78rem; display:none;">
                  Use generated name
                </button>
              </div>

              <p id="seeder-preview-subtitle" style="font-size:0.86rem; color:var(--text-secondary); margin-top:0.25rem;"></p>
            </div>

            <div style="display:flex; flex-wrap:wrap; align-items:center; gap:0.5rem;">
              <button type="button" id="btn-instantiate-seed" class="btn btn-primary">
                Save to compendium
              </button>
            </div>
          </div>

          <div id="seeder-preview-body"></div>
        </div>
      </div>
    </div>
  `;

  // Preserve dropdown selections
  container.querySelector('#seeder-tentacle').value = lockTentacle;
  container.querySelector('#seeder-physics').value = lockPhysics;
  container.querySelector('#seeder-arch').value = lockArch;
  container.querySelector('#seeder-civ').value = lockCiv;

  updateActionAndHeaderState();

  // Toggle Customize Parameters
  container.querySelector('#btn-toggle-customize')?.addEventListener('click', () => {
    customizeExpanded = !customizeExpanded;
    const panel = container.querySelector('#seeder-customize-panel');
    if (panel) {
      panel.classList.toggle('hidden', !customizeExpanded);
    }
    updateActionAndHeaderState();
  });

  // Toggle Inline Rename Editor beside title
  container.querySelector('#btn-rename-universe')?.addEventListener('click', () => {
    renameExpanded = !renameExpanded;
    updateActionAndHeaderState();
    if (renameExpanded) {
      const nameInput = container.querySelector('#seeder-name');
      if (nameInput) {
        if (!nameInput.value && lastPreview?.title) {
          nameInput.value = lastPreview.title;
        }
        nameInput.focus();
        nameInput.select();
      }
    }
  });

  container.querySelector('#btn-done-rename')?.addEventListener('click', () => {
    renameExpanded = false;
    updateActionAndHeaderState();
    container.querySelector('#btn-rename-universe')?.focus();
  });

  container.querySelector('#btn-reset-name')?.addEventListener('click', () => {
    customName = '';
    duplicateNoticeArticle = null;
    const nameInput = container.querySelector('#seeder-name');
    if (nameInput) nameInput.value = '';
    renameExpanded = false;
    updateActionAndHeaderState();
    container.querySelector('#btn-rename-universe')?.focus();
  });

  container.querySelector('#seeder-name')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      renameExpanded = false;
      updateActionAndHeaderState();
      container.querySelector('#btn-rename-universe')?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      renameExpanded = false;
      updateActionAndHeaderState();
      container.querySelector('#btn-rename-universe')?.focus();
    }
  });

  const handleNameInput = e => {
    customName = e.target.value;
    hasUserGeneratedOrEdited = true;
    duplicateNoticeArticle = null;
    updateActionAndHeaderState();
  };
  container.querySelector('#seeder-name')?.addEventListener('input', handleNameInput);
  container.querySelector('#seeder-name')?.addEventListener('change', handleNameInput);

  // Reset worldbuilding locks
  container.querySelector('#btn-reset-seeder-locks')?.addEventListener('click', () => {
    lockTentacle = 'random';
    lockPhysics = 'random';
    lockArch = 'random';
    lockCiv = 'random';
    duplicateNoticeArticle = null;

    container.querySelector('#seeder-tentacle').value = 'random';
    container.querySelector('#seeder-physics').value = 'random';
    container.querySelector('#seeder-arch').value = 'random';
    container.querySelector('#seeder-civ').value = 'random';
    updateActionAndHeaderState();
  });

  // Generate universe / Generate another
  container.querySelector('#btn-roll-seed')?.addEventListener('click', () => {
    const prefixes = ['TENTACLE-01', 'TENTACLE-04', 'TENTACLE-05', 'TENTACLE-09', 'TENTACLE-12'];
    const roots = ['SOLACE', 'AETHERION', 'ASTRYSIS', 'HELLONEX', 'ORICHALCUM', 'VERDANT', 'STARFALL'];
    currentSeed = `${prefixes[Math.floor(Math.random() * prefixes.length)]}::${roots[Math.floor(Math.random() * roots.length)]}-${Math.floor(100 + Math.random() * 900)}`;
    hasUserGeneratedOrEdited = true;
    duplicateNoticeArticle = null;
    const codeEl = container.querySelector('#seeder-code');
    if (codeEl) codeEl.value = currentSeed;
    updateActionAndHeaderState();
  });

  const handleSeedInput = e => {
    currentSeed = e.target.value;
    hasUserGeneratedOrEdited = true;
    duplicateNoticeArticle = null;
    updateActionAndHeaderState();
  };
  container.querySelector('#seeder-code')?.addEventListener('input', handleSeedInput);
  container.querySelector('#seeder-code')?.addEventListener('change', handleSeedInput);

  container.querySelector('#seeder-tentacle')?.addEventListener('change', e => {
    lockTentacle = e.target.value;
    hasUserGeneratedOrEdited = true;
    duplicateNoticeArticle = null;
    updateActionAndHeaderState();
  });

  container.querySelector('#seeder-physics')?.addEventListener('change', e => {
    lockPhysics = e.target.value;
    hasUserGeneratedOrEdited = true;
    duplicateNoticeArticle = null;
    updateActionAndHeaderState();
  });

  container.querySelector('#seeder-arch')?.addEventListener('change', e => {
    lockArch = e.target.value;
    hasUserGeneratedOrEdited = true;
    duplicateNoticeArticle = null;
    updateActionAndHeaderState();
  });

  container.querySelector('#seeder-civ')?.addEventListener('change', e => {
    lockCiv = e.target.value;
    hasUserGeneratedOrEdited = true;
    duplicateNoticeArticle = null;
    updateActionAndHeaderState();
  });

  // Save to compendium
  container.querySelector('#btn-instantiate-seed')?.addEventListener('click', async () => {
    if (saveInFlight) return;
    saveErrorMessage = null;

    // Read live input values right at activation to guarantee exact sync
    const codeInput = container.querySelector('#seeder-code');
    const nameInput = container.querySelector('#seeder-name');
    if (codeInput) currentSeed = codeInput.value;
    if (nameInput && renameExpanded) customName = nameInput.value;
    buildPreview();

    const currentArticles = callbacks.getArticles ? callbacks.getArticles() : [];
    const alreadySaved = findMatchingSavedConfiguration(currentArticles, lastPreview);
    if (alreadySaved) {
      duplicateNoticeArticle = alreadySaved;
      updateActionAndHeaderState();
      container.querySelector('#btn-open-existing-seed')?.focus();
      return;
    }

    saveInFlight = true;
    renameExpanded = false;
    updateActionAndHeaderState();

    const result = await callbacks.onInstantiateUniverse(JSON.parse(JSON.stringify(lastPreview)));
    if (result && result.ok === false) {
      saveInFlight = false;
      saveErrorMessage = result.error || 'Could not persist entry to storage. Please retry.';
      updateActionAndHeaderState();
      container.querySelector('#btn-instantiate-seed')?.focus();
    }
  });
}


