// Reading-First Wikipedia-Style Article View & Context Trail Builder

export function parseWikiProse(text) {
  if (!text) return '';
  const formatted = text
    .replace(/### ([^\n]+)/g, '<h4>$1</h4>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="font-family:var(--font-mono); font-size:0.86em; background:var(--bg-subtle); padding:0.1rem 0.35rem; border-radius:4px;">$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  const withLinks = formatted.replace(/\[\[([^\]]+)\]\]/g, (_, raw) => {
    const parts = raw.split('|');
    const target = parts[0].trim();
    const label = (parts[1] || parts[0]).trim();
    const safeTarget = target.replace(/"/g, '&quot;');
    return `<a href="#${encodeURIComponent(target)}" class="wiki-link" data-wiki-target="${safeTarget}">${label}</a>`;
  });

  return `<p>${withLinks}</p>`;
}

/**
 * Builds a factual context trail strictly from established canon relationships.
 * Never forces a Universe -> World -> Entry trail onto entries that do not belong to a world.
 */
function buildContextTrail(article) {
  const id = article.id;
  if (id === 'eryndros') {
    return [
      { label: 'The Galactic Federation', target: 'The Galactic Federation' },
      { label: 'Hellonex', target: 'Hellonex' },
      { label: article.title, target: null }
    ];
  }
  if (['astrysis', 'hellonex', 'aetherion-cluster'].includes(id)) {
    return [
      { label: 'The Galactic Federation', target: 'The Galactic Federation' },
      { label: article.title, target: null }
    ];
  }
  if (id === 'independent-and-frontier') {
    return [
      { label: 'The Galactic Federation', target: 'The Galactic Federation' },
      { label: article.title, target: null }
    ];
  }
  if (['cradle-and-atrium', 'orichalcum-frames', 'illyad'].includes(id)) {
    return [
      { label: 'The Celestial Library', target: 'The Celestial Library' },
      { label: article.title, target: null }
    ];
  }
  if (id === 'the-first-kind') {
    return [
      { label: 'The Moons', target: 'The Moons' },
      { label: article.title, target: null }
    ];
  }

  // Check if a branched/created entry explicitly defines a Parent Lore or Affiliation link in its infobox
  if (Array.isArray(article.infobox)) {
    const parentRow = article.infobox.find(r =>
      ['Parent Lore', 'Parent Union', 'Affiliation', 'Referenced In'].includes(r.label)
    );
    if (parentRow) {
      const m = /\[\[([^\]|]+)\]\]/.exec(parentRow.value);
      if (m) {
        return [
          { label: m[1].trim(), target: m[1].trim() },
          { label: article.title, target: null }
        ];
      }
    }
  }

  return [];
}

export function renderWikiArticle(container, article, allArticles, callbacks) {
  if (!container || !article) return;

  // Compute cross-references (outbound + inbound backlinks)
  const crossRefs = new Set();
  const linkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  let match;
  while ((match = linkRegex.exec(article.body || '')) !== null) {
    crossRefs.add(match[1].trim());
  }
  for (const other of allArticles) {
    if (other.id !== article.id && (other.body || '').toLowerCase().includes(`[[${article.title.toLowerCase()}`)) {
      crossRefs.add(other.title);
    }
  }

  const trail = buildContextTrail(article);
  const hasGenesisLink = ['hellonex', 'eryndros', 'astrysis', 'aetherion-cluster', 'independent-and-frontier'].includes(article.id) ||
    article.category === 'Worlds & Systems';

  container.innerHTML = `
    <article class="reading-sheet" aria-labelledby="entry-main-title">
      ${trail.length > 0 ? `
        <nav class="context-trail" aria-label="Lore Context Trail">
          ${trail.map((item, idx) => item.target
            ? `<button type="button" class="context-trail-link" data-wiki-target="${item.target.replace(/"/g, '&quot;')}">${item.label}</button><span aria-hidden="true">&rsaquo;</span>`
            : `<span>${item.label}</span>`
          ).join(' ')}
        </nav>
      ` : ''}

      <!-- 1. Entry Title, Short Description, Category & Canon Status -->
      <header class="article-header">
        <h1 id="entry-main-title" class="article-title">${article.title}</h1>
        ${article.subtitle ? `<p class="article-subtitle">${article.subtitle}</p>` : ''}

        <div class="meta-status-row">
          <div class="meta-tags">
            <span class="tag">Category: <strong>${article.category}</strong></span>
            <span class="tag tag-mono">Canon Status: <strong>${article.canonTier || 'Expanded Compendium'}</strong></span>
            ${article.canonTier !== 'Established Dec 2024 Canon' ? `
              <span class="preview-status-badge preview-status-saved">Saved in this browser</span>
            ` : ''}
          </div>

          <div style="display:flex; flex-wrap:wrap; gap:0.45rem;">
            <button type="button" id="btn-edit-article" class="btn">Edit Entry</button>
            <button type="button" id="btn-branch-story" class="btn">Branch Related Entry</button>
            <button type="button" id="btn-submit-article-community" class="btn">Submit for community review</button>
            ${hasGenesisLink ? `
              <button type="button" id="btn-open-in-genesis" class="btn" title="Open this world in Planetary Genesis comparison">
                Compare in Planetary Genesis &rarr;
              </button>
            ` : ''}
          </div>
        </div>
      </header>

      <!-- Section Jump Navigation -->
      <nav class="section-jump-nav" aria-label="Entry Sections">
        <span class="section-jump-label">Jump to:</span>
        <a href="#sec-overview" class="section-jump-link">Overview &amp; Lore</a>
        <a href="#sec-chronology" class="section-jump-link">Chronology (${article.events ? article.events.length : 0})</a>
        <a href="#sec-threads" class="section-jump-link">Open Threads (${article.hooks ? article.hooks.length : 0})</a>
        <a href="#sec-dossier" class="section-jump-link">Supporting Dossier</a>
      </nav>

      <div class="wiki-columns">
        <!-- Main Reading Column (68ch max width) -->
        <div>
          ${article.quote ? `
            <blockquote class="epigraph-box">
              <div class="epigraph-label">
                <span>Archival Epigraph // Orichalcum Frame Resonance</span>
              </div>
              <div class="epigraph-quote">${parseWikiProse(article.quote)}</div>
            </blockquote>
          ` : ''}

          <section id="sec-overview" class="wiki-section">
            <h2 class="wiki-section-title">Overview &amp; Lore</h2>
            <div class="wiki-prose">${parseWikiProse(article.body)}</div>
          </section>

          <section id="sec-chronology" class="wiki-section">
            <div class="wiki-section-title">
              <h2>Chronology &amp; Historical Events</h2>
              <div style="display:flex; gap:0.4rem;">
                <button type="button" id="btn-add-event" class="btn" style="padding:0.28rem 0.65rem; font-size:0.78rem;">+ Add Event</button>
                <button type="button" id="btn-jump-timeline" class="btn" style="padding:0.28rem 0.65rem; font-size:0.78rem;">Open Timeline Tool &rarr;</button>
              </div>
            </div>
            <div>
              ${article.events && article.events.length > 0
                ? article.events.map(ev => `
                  <div class="event-card">
                    <div class="event-top">
                      <span class="event-title">${ev.title}</span>
                      <span class="event-epoch">${ev.epoch}</span>
                    </div>
                    <div style="font-size:0.9rem; color:var(--text-secondary); line-height:1.6;">
                      ${parseWikiProse(ev.desc)}
                    </div>
                  </div>
                `).join('')
                : `<p style="font-size:0.9rem; color:var(--text-muted); font-style:italic;">No dated or sequential moments recorded for this entry yet.</p>`
              }
            </div>
          </section>

          <section id="sec-threads" class="wiki-section">
            <h2 class="wiki-section-title">Open Development Threads &amp; Story Prompts</h2>
            ${article.hooks && article.hooks.length > 0 ? `
              <ul style="padding-left:1.25rem; font-size:0.92rem; color:var(--text-secondary); display:flex; flex-direction:column; gap:0.5rem;">
                ${article.hooks.map(h => `<li>${parseWikiProse(h).replace(/^<p>|<\/p>$/g, '')}</li>`).join('')}
              </ul>
            ` : `
              <p class="empty-threads-state" style="font-size:0.9rem; color:var(--text-muted); font-style:italic;">
                No open development threads recorded for this entry yet. Branch a related entry or edit this entry to add story prompts.
              </p>
            `}
          </section>
        </div>

        <!-- Secondary Supporting Dossier Column -->
        <aside id="sec-dossier" class="dossier-column" aria-label="Supporting Facts and Related Entries">
          <div class="infobox-card">
            <h2 class="infobox-header" style="font-size:0.78rem; margin:0;">Supporting Facts</h2>
            ${article.image ? `
              <div class="infobox-media">
                <img id="infobox-img-zoom" tabindex="0" role="button" aria-label="Enlarge image: ${article.imageCaption || article.title}" src="${article.image}" alt="${article.title}" />
                <div class="infobox-caption">${article.imageCaption || article.title}</div>
              </div>
            ` : ''}
            <div class="infobox-rows">
              ${article.infobox && article.infobox.length > 0
                ? article.infobox.map(row => `
                  <div class="infobox-row">
                    <span class="infobox-label">${row.label}</span>
                    <span class="infobox-value">${parseWikiProse(row.value).replace(/^<p>|<\/p>$/g, '')}</span>
                  </div>
                `).join('')
                : `<div class="infobox-row"><span class="infobox-label">Category</span><span class="infobox-value">${article.category}</span></div>`
              }
            </div>
          </div>

          <div class="dossier-subblock">
            <div class="panel-heading">Related Entries (${crossRefs.size})</div>
            <div style="display:flex; flex-wrap:wrap; gap:0.4rem;">
              ${crossRefs.size > 0
                ? Array.from(crossRefs).map(ref => `
                  <button type="button" class="btn" data-wiki-target="${ref.replace(/"/g, '&quot;')}" style="padding:0.28rem 0.6rem; font-size:0.8rem;">
                    ${ref}
                  </button>
                `).join('')
                : `<span style="font-size:0.82rem; color:var(--text-muted);">No linked entries yet. Use [[Entry Title]] in prose to link.</span>`
              }
            </div>
          </div>

          ${article.metaTruth ? `
            <div class="dossier-subblock">
              <div class="panel-heading">Continuity &amp; Provenance Note</div>
              <p style="font-size:0.82rem; color:var(--text-secondary); line-height:1.55;">
                ${article.metaTruth}
              </p>
            </div>
          ` : ''}
        </aside>
      </div>
    </article>
  `;

  // Wire section jump links so headings always clear the sticky header
  container.querySelectorAll('.section-jump-link').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href') || '';
      if (!href.startsWith('#')) return;
      const targetId = href.slice(1);
      const targetEl = container.querySelector('#' + targetId);
      if (targetEl) {
        e.preventDefault();
        const headerEl = document.querySelector('.top-header');
        const headerBottom = headerEl ? Math.max(0, headerEl.getBoundingClientRect().bottom) : 72;
        const targetTop = targetEl.getBoundingClientRect().top + window.scrollY;
        const desiredScrollY = Math.max(0, Math.round(targetTop - headerBottom - 16));
        window.scrollTo({ top: desiredScrollY, behavior: 'instant' });
        if (callbacks.onSectionJump) {
          callbacks.onSectionJump(targetId, desiredScrollY);
        }
      }
    });
  });

  // Wire action event listeners (passing trigger element for focus return)
  container.querySelector('#btn-edit-article')?.addEventListener('click', e => callbacks.onEdit(article, e.currentTarget));
  container.querySelector('#btn-branch-story')?.addEventListener('click', e => callbacks.onBranch(article, e.currentTarget));
  container.querySelector('#btn-submit-article-community')?.addEventListener('click', e => {
    if (callbacks.onSubmitForReview) {
      callbacks.onSubmitForReview(article, e.currentTarget, '#btn-submit-article-community');
    }
  });
  container.querySelector('#btn-add-event')?.addEventListener('click', e => callbacks.onAddEvent(article, e.currentTarget));
  container.querySelector('#btn-jump-timeline')?.addEventListener('click', () => callbacks.onOpenTimeline(article));
  container.querySelector('#btn-open-in-genesis')?.addEventListener('click', () => callbacks.onOpenGenesis(article));

  const zoomImg = container.querySelector('#infobox-img-zoom');
  if (zoomImg) {
    zoomImg.addEventListener('click', e => callbacks.onZoomImage(article.image, article.imageCaption || article.title, e.currentTarget));
    zoomImg.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        callbacks.onZoomImage(article.image, article.imageCaption || article.title, e.currentTarget);
      }
    });
  }

  container.querySelectorAll('[data-wiki-target]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const target = el.getAttribute('data-wiki-target');
      if (target) callbacks.onNavigateTitle(target, e.currentTarget);
    });
  });
}
