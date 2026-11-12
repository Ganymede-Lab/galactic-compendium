// Interactive Spatial Map Layer: Galactic Federation Sector Starmap & Celestial Library Construct Map

let activeMapMode = 'federation'; // 'federation' | 'construct'
let selectedMapNode = null;

const CONSTRUCT_NODES = [
  {
    id: 'moons',
    label: 'The Moons',
    sub: 'Unbound Confluence of Energy & Will Across Realms',
    x: 85,
    y: 195,
    color: '#38bdf8',
    articleId: 'the-moons'
  },
  {
    id: 'library',
    label: 'The Celestial Library',
    sub: 'Central Mechanistic Construct of the First-Kind',
    x: 240,
    y: 195,
    color: '#e8a236',
    articleId: 'celestial-library'
  },
  {
    id: 'cradle',
    label: 'The Cradle & The Atrium',
    sub: 'Sensory-Deprivation Rebirth Conduit & Cerulean Hallway',
    x: 240,
    y: 90,
    color: '#38bdf8',
    articleId: 'cradle-and-atrium'
  },
  {
    id: 'illyad',
    label: 'Caretaker: Illyad',
    sub: 'Plucked from Ancient Earth ("Homer") · Observes His Own Universe\'s Far Future',
    x: 430,
    y: 90,
    color: '#38bdf8',
    articleId: 'illyad'
  },
  {
    id: 'earth',
    label: 'Earth (Ancient Era)',
    sub: 'Shared Persistent Universe (Early Epoch) · Origin of Caretaker Illyad',
    x: 475,
    y: 195,
    color: '#2ac292',
    articleId: 'earth'
  },
  {
    id: 'federation-cosmos',
    label: 'The Galactic Federation (Far Future)',
    sub: 'Same Persistent Universe (Far Future) · Astrysis, Hellonex & Aetherion',
    x: 700,
    y: 195,
    color: '#e8a236',
    articleId: 'galactic-federation'
  },
  {
    id: 'orichalcum',
    label: 'Orichalcum Frames',
    sub: 'First-Kind Sensory & Symbol Decoders',
    x: 385,
    y: 295,
    color: '#e8a236',
    articleId: 'orichalcum-frames'
  }
];

export function renderStarmapView(container, starmapData, onNavigateArticle) {
  if (!container) return;

  const nodes = activeMapMode === 'federation'
    ? (starmapData?.federation || [])
    : CONSTRUCT_NODES;

  if (!selectedMapNode || !nodes.some(n => n.id === selectedMapNode.id)) {
    selectedMapNode = nodes[0] || null;
  }

  let svgLinks = '';
  if (activeMapMode === 'federation' && Array.isArray(starmapData?.links)) {
    svgLinks = starmapData.links.map(([fromId, toId, linkType]) => {
      const a = nodes.find(n => n.id === fromId);
      const b = nodes.find(n => n.id === toId);
      if (!a || !b) return '';
      const isPillar = linkType === 'pillar';
      const isFrontier = linkType === 'frontier' || linkType === 'trade';
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
        stroke="${isPillar ? '#e8a236' : '#38bdf8'}"
        stroke-width="${isPillar ? '2.2' : '1.2'}"
        stroke-dasharray="${isFrontier ? '4 4' : 'none'}"
        opacity="${isPillar ? '0.65' : '0.35'}" />`;
    }).join('');
  } else {
    // Construct Tentacle paths: Earth (Ancient Era) -> The Galactic Federation (Far Future) share the primary persistent tentacle
    svgLinks = `
      <path d="M 85 195 L 240 195" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4 4" opacity="0.55" fill="none" />
      <path d="M 240 195 L 240 90" stroke="#38bdf8" stroke-width="2.2" opacity="0.75" fill="none" />
      <path d="M 240 90 L 430 90 L 475 195" stroke="#38bdf8" stroke-width="1.6" stroke-dasharray="3 3" opacity="0.65" fill="none" />
      <path d="M 430 90 L 700 195" stroke="#38bdf8" stroke-width="1.3" stroke-dasharray="2 4" opacity="0.45" fill="none" />
      <path d="M 240 195 C 340 140, 460 110, 740 95" stroke="#e8a236" stroke-width="1.6" stroke-dasharray="5 3" opacity="0.35" fill="none" />
      <path d="M 240 195 L 475 195 L 770 195" stroke="#e8a236" stroke-width="3" opacity="0.85" fill="none" />
      <path d="M 240 195 C 320 255, 410 300, 690 325" stroke="#e8a236" stroke-width="1.8" stroke-dasharray="5 3" opacity="0.5" fill="none" />
      <text x="588" y="183" text-anchor="middle" fill="#f3c66f" font-size="10.5" font-style="italic" opacity="0.9">Deep Time (Same Universe) &rarr;</text>
    `;
  }

  const svgNodes = nodes.map(n => {
    const isSel = selectedMapNode && selectedMapNode.id === n.id;
    const radius = n.type === 'stellar-state' || n.id === 'library' ? 12 : 8;
    return `
      <g class="map-node-group" data-node-id="${n.id}" style="cursor:pointer;">
        ${isSel ? `<circle cx="${n.x}" cy="${n.y}" r="${radius + 9}" fill="none" stroke="${n.color}" stroke-width="1.6" stroke-dasharray="3 2" />` : ''}
        <circle cx="${n.x}" cy="${n.y}" r="${radius + 4}" fill="${n.color}" fill-opacity="0.18" />
        <circle cx="${n.x}" cy="${n.y}" r="${radius}" fill="${n.color}" />
        <text x="${n.x}" y="${n.y + radius + 15}" text-anchor="middle" fill="#e2e8f0" font-size="11.5" font-weight="${isSel ? '700' : '500'}">${n.label}</text>
      </g>
    `;
  }).join('');

  container.innerHTML = `
    <div class="glass-panel">
      <div class="article-header" style="padding-bottom: 1rem; margin-bottom: 1rem;">
        <div>
          <div class="meta-tags">
            <span class="tag tag-orichalcum">Interactive Spatial Layer</span>
            <span class="tag tag-mono">${activeMapMode === 'federation' ? 'Scale: Galactic Federation Ecosystem' : 'Scale: Celestial Library & Winding Tentacles'}</span>
          </div>
          <h2 class="article-title" style="font-size: 1.5rem;">
            ${activeMapMode === 'federation' ? 'Galactic Federation & Independent Sector Starmap' : 'The Celestial Library & Construct Seeding Map'}
          </h2>
          <p class="article-subtitle">
            Tap any stellar system, rogue cluster, or construct node to inspect its coordinates and jump directly to its Wiki article.
          </p>
        </div>
        <div style="display:flex; gap:0.5rem;">
          <button id="btn-map-fed" class="btn ${activeMapMode === 'federation' ? 'active' : ''}">Galactic Federation Map</button>
          <button id="btn-map-con" class="btn ${activeMapMode === 'construct' ? 'active' : ''}">Celestial Library Construct</button>
        </div>
      </div>

      <div class="starmap-canvas-wrap">
        <svg viewBox="0 0 820 390" style="width:100%; height:auto; max-height:420px; display:block; user-select:none;">
          <defs>
            <radialGradient id="bhGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#2ac292" stop-opacity="0.35" />
              <stop offset="100%" stop-color="#2ac292" stop-opacity="0" />
            </radialGradient>
          </defs>
          ${activeMapMode === 'federation' ? `<circle cx="420" cy="310" r="46" fill="url(#bhGlow)" />` : ''}
          ${svgLinks}
          ${svgNodes}
        </svg>
      </div>

      ${selectedMapNode ? `
        <div style="margin-top: 1rem; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:1rem; padding: 1rem; background: var(--surface-interactive); border: 1px solid var(--hairline); border-radius: var(--radius-md);">
          <div>
            <div style="font-size: 0.74rem; text-transform:uppercase; letter-spacing:0.08em; color: var(--orichalcum); font-weight:600;">
              Selected Spatial Node
            </div>
            <div style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-top: 0.15rem;">
              ${selectedMapNode.label}
            </div>
            <div style="font-size: 0.84rem; color: var(--text-secondary);">
              ${selectedMapNode.sub}
            </div>
          </div>
          <button id="btn-open-node-article" class="btn btn-primary">
            Open Compendium Wiki Article &rarr;
          </button>
        </div>
      ` : ''}
    </div>
  `;

  container.querySelector('#btn-map-fed')?.addEventListener('click', () => {
    activeMapMode = 'federation';
    selectedMapNode = null;
    renderStarmapView(container, starmapData, onNavigateArticle);
  });

  container.querySelector('#btn-map-con')?.addEventListener('click', () => {
    activeMapMode = 'construct';
    selectedMapNode = null;
    renderStarmapView(container, starmapData, onNavigateArticle);
  });

  container.querySelectorAll('.map-node-group').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-node-id');
      selectedMapNode = nodes.find(n => n.id === id) || null;
      renderStarmapView(container, starmapData, onNavigateArticle);
    });
  });

  container.querySelector('#btn-open-node-article')?.addEventListener('click', () => {
    if (selectedMapNode && selectedMapNode.articleId) {
      onNavigateArticle(selectedMapNode.articleId);
    }
  });
}
