// 5-Stage Deep-Time Planetary Genesis Comparator (Planet A vs. Planet B) & Multi-Calendar Synchronizer

const HELLONIAN_SIGNS = [
  'Imix-Forge', 'Ik-Solar', 'Akbal-Obsidian', 'Kan-Core', 'Chicchan-Flare',
  'Cimi-Void', 'Manik-Anvil', 'Lamat-Beacon', 'Muluc-Magma', 'Oc-Iron',
  'Chuen-Spire', 'Eb-Orbit', 'Ben-Pillar', 'Ix-Pulse', 'Men-Crucible',
  'Cib-Ember', 'Caban-Tecton', 'Etznab-Blade', 'Cauac-Storm', 'Ahau-Crown'
];

const STAGES = [
  {
    num: 'Stage 1',
    title: 'Quantum Seed & Fundamental Building Blocks',
    desc: 'How the star system and proto-planetary matter condensed',
    key: 'stage1'
  },
  {
    num: 'Stage 2',
    title: 'Stellar / Orbital Mechanics & Local Calendar',
    desc: 'How orbit, rotation, or relativistic gravity shapes local timekeeping vs. GFST',
    key: 'stage2'
  },
  {
    num: 'Stage 3',
    title: 'Planetary Formation, Crust & Geographical History',
    desc: 'Core accretion, tectonics, surface geography, and crustal stability',
    key: 'stage3'
  },
  {
    num: 'Stage 4',
    title: 'Emergent Resources & Environmental Pressures',
    desc: 'What material wealth or existential hazards resulted from Stage 3',
    key: 'stage4'
  },
  {
    num: 'Stage 5',
    title: 'Civilizational Role & GFST Historical Sequence',
    desc: 'Why this world developed its distinct culture, polity status, and historical events',
    key: 'stage5'
  }
];

const MASTER_MILESTONES = [
  { tag: 'Formative Seq. 1', title: 'The Galactic Front', desc: 'Early interstellar coalition and political alignment preceding the Federation. (Date placeholder preserved).' },
  { tag: 'Formative Seq. 2', title: 'The Starfall War', desc: 'Major interstellar conflict during the formative struggles.' },
  { tag: 'Formative Seq. 3', title: 'The Battle of the Verdant Belt', desc: 'Pivotal engagement during the formative wars.' },
  { tag: 'Formative Seq. 4', title: 'The Collapse of the Galactic Front', desc: 'Dissolution of the earlier Galactic Front framework.' },
  { tag: 'Formative Seq. 5', title: 'The Solace Accord', desc: 'Foundational political compact transitioning the galaxy toward the Galactic Federation.' },
  { tag: 'GFST 75 (Cycle 106)', yr: 75, title: 'Discovery of the Aetherion Beacon', desc: 'Stabilizes the black-hole orbital environment of the Aetherion Cluster; predates the Federation-wide Beacon.' },
  { tag: 'GFST 95 (Cycle 134)', yr: 95, title: 'Thermasis Colony (Eryndros)', desc: 'Establishment of the Thermasis Colony on Hellonex-affiliated world Eryndros.' },
  { tag: 'GFST 140 (Cycle 197)', yr: 140, title: 'Crystalis Collapse (Eryndros)', desc: 'Catastrophic collapse event on Eryndros 45 GFST years after the Thermasis Colony.' },
  { tag: 'GFST 200 (Cycle 281)', yr: 200, title: 'Frostveil Initiative (Eryndros)', desc: 'Launch of the Frostveil Initiative on Eryndros 60 GFST years after the Crystalis Collapse.' }
];

let selectedIdA = 'heilon-prime';
let selectedIdB = 'eryndros';
let calcYear = 140;
let calcDay = 1;

export function setContextPlanetForGenesis(articleId) {
  const map = {
    'hellonex': 'heilon-prime',
    'eryndros': 'eryndros',
    'astrysis': 'astrysis-prime',
    'aetherion-cluster': 'aetherion-cluster',
    'independent-and-frontier': 'omnexis'
  };
  if (map[articleId]) {
    selectedIdA = map[articleId];
  } else if (articleId) {
    selectedIdA = articleId;
  }
}

export function setContextYearForTimeline(yr) {
  if (typeof yr === 'number' && !Number.isNaN(yr)) {
    calcYear = yr;
    calcDay = 1;
  }
}

export function renderSequenceView(container, planetChains, callbacks, mode = 'both') {
  if (!container) return;

  if (!planetChains.some(p => p.id === selectedIdA)) {
    selectedIdA = planetChains[0]?.id || '';
  }
  if (!planetChains.some(p => p.id === selectedIdB)) {
    selectedIdB = planetChains[1]?.id || planetChains[0]?.id || '';
  }

  const pA = planetChains.find(p => p.id === selectedIdA) || planetChains[0];
  const pB = planetChains.find(p => p.id === idOrFallback(selectedIdB, planetChains)) || planetChains[0];

  const optionsHtml = planetChains.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  const showGenesis = mode === 'both' || mode === 'genesis';
  const showTimeline = mode === 'both' || mode === 'timeline';

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      ${showGenesis ? `
      <!-- SECTION A: 5-STAGE PLANET A vs PLANET B COMPARATOR -->
      <section class="glass-panel">
        <div class="article-header" style="padding-bottom:1rem; margin-bottom:1rem; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:flex-start; gap:1rem;">
          <div>
            <div class="meta-tags" style="margin-bottom:0.4rem;">
              <span class="tag tag-orichalcum">5-Stage Causal Methodology</span>
              <span class="tag tag-mono">Physics &rarr; Formation &rarr; Geography &rarr; Civilization</span>
            </div>
            <h1 class="article-title" style="font-size:1.65rem;">
              Planetary Genesis &amp; Causal Sequence Comparator
            </h1>
            <p class="article-subtitle">
              Compare how fundamental building blocks, orbital mechanics, and geological formation lead World A to develop differently from World B.
            </p>
          </div>
          <button type="button" id="btn-new-planet-chain" class="btn btn-primary">
            + Add World Causal Sequence
          </button>
        </div>

        <div class="comparator-selectors">
          <div style="background:var(--surface-interactive); border:1px solid var(--hairline); border-radius:var(--radius-md); padding:0.9rem;">
            <label for="sel-world-a" style="display:block; font-size:0.76rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-secondary); margin-bottom:0.4rem;">
              World A (Left Column)
            </label>
            <select id="sel-world-a" class="form-select">${optionsHtml}</select>
          </div>

          <div style="background:var(--surface-interactive); border:1px solid var(--hairline); border-radius:var(--radius-md); padding:0.9rem;">
            <label for="sel-world-b" style="display:block; font-size:0.76rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-secondary); margin-bottom:0.4rem;">
              World B (Right Column)
            </label>
            <select id="sel-world-b" class="form-select">${optionsHtml}</select>
          </div>
        </div>

        <div id="stages-comparison-list">
          ${STAGES.map(st => `
            <div class="stage-block">
              <div class="stage-header">
                <span style="font-size:0.84rem; font-weight:700; color:var(--text-primary);">
                  ${st.num}: ${st.title}
                </span>
                <span style="font-size:0.78rem; color:var(--text-muted);">${st.desc}</span>
              </div>
              <div class="stage-pair">
                <div class="stage-cell">
                  <div style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:0.3rem;">${pA?.name || ''}</div>
                  <p style="font-size:0.9rem; color:var(--text-primary); line-height:1.6;">${pA?.[st.key] || ''}</p>
                </div>
                <div class="stage-cell">
                  <div style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); margin-bottom:0.3rem;">${pB?.name || ''}</div>
                  <p style="font-size:0.9rem; color:var(--text-primary); line-height:1.6;">${pB?.[st.key] || ''}</p>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
      ` : ''}

      ${showTimeline ? `
      <!-- SECTION B: MULTI-CALENDAR CHRONOLOGY SYNCHRONIZER & HISTORICAL SEQUENCE -->
      <section class="glass-panel">
        <div class="article-header" style="padding-bottom:1rem; margin-bottom:1.25rem;">
          <div>
            <div class="meta-tags" style="margin-bottom:0.4rem;">
              <span class="tag tag-orichalcum">Chronology &amp; Calendar Conversion</span>
              <span class="tag tag-mono">GFST &harr; 260-Day Hellonian Tzolk'in Calendar</span>
            </div>
            <h1 class="article-title" style="font-size:1.65rem;">
              Multi-Calendar Converter &amp; Event Sequence
            </h1>
            <p class="article-subtitle">
              Convert between Galactic Federation Standard Time (GFST) and localized Stellar-State calendars while tracking the formative and dated historical sequence.
            </p>
          </div>
        </div>

        <div class="stage-pair" style="align-items:stretch; margin-bottom:1.75rem;">
          <div style="background:var(--surface-interactive); border:1px solid var(--hairline); border-radius:var(--radius-md); padding:1rem; display:flex; flex-direction:column; gap:0.75rem;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
              <div>
                <label for="input-gfst-yr" style="display:block; font-size:0.78rem; font-weight:600; color:var(--text-secondary); margin-bottom:0.3rem;">GFST Year</label>
                <input id="input-gfst-yr" type="number" value="${calcYear}" class="form-input" style="font-family:var(--font-mono);" />
              </div>
              <div>
                <label for="input-gfst-day" style="display:block; font-size:0.78rem; font-weight:600; color:var(--text-secondary); margin-bottom:0.3rem;">Standard Day (1–365)</label>
                <input id="input-gfst-day" type="number" min="1" max="365" value="${calcDay}" class="form-input" style="font-family:var(--font-mono);" />
              </div>
            </div>

            <div style="display:flex; flex-wrap:wrap; gap:0.4rem;">
              <button type="button" class="btn preset-date-btn" data-yr="75" style="font-size:0.76rem; padding:0.32rem 0.6rem;">GFST 75 (Aetherion Beacon)</button>
              <button type="button" class="btn preset-date-btn" data-yr="95" style="font-size:0.76rem; padding:0.32rem 0.6rem;">GFST 95 (Thermasis Colony)</button>
              <button type="button" class="btn preset-date-btn" data-yr="140" style="font-size:0.76rem; padding:0.32rem 0.6rem;">GFST 140 (Crystalis Collapse)</button>
              <button type="button" class="btn preset-date-btn" data-yr="200" style="font-size:0.76rem; padding:0.32rem 0.6rem;">GFST 200 (Frostveil Initiative)</button>
            </div>
          </div>

          <div id="calendar-readout-card" style="background:var(--surface-interactive); border:1px solid var(--hairline); border-radius:var(--radius-md); padding:1rem; display:flex; flex-direction:column; justify-content:space-between;">
          </div>
        </div>

        <div>
          <h2 class="wiki-section-title" style="font-size:1.15rem;">Established Historical Sequence (Formative Era &rarr; GFST Milestones)</h2>
          <p style="font-size:0.84rem; color:var(--text-muted); margin-bottom:0.85rem;">
            Formative events preserve their established canon order without fabricated dates; dated GFST milestones can be clicked to load into the converter above.
          </p>
          <div class="stage-pair">
            ${MASTER_MILESTONES.map(m => `
              <div class="stage-cell" ${m.yr ? `style="cursor:pointer;" data-jump-yr="${m.yr}"` : ''}>
                <div style="display:flex; justify-content:space-between; align-items:baseline; gap:0.5rem; margin-bottom:0.25rem;">
                  <strong style="font-size:0.9rem; color:var(--text-primary);">${m.title}</strong>
                  <span class="event-epoch">${m.tag}</span>
                </div>
                <p style="font-size:0.84rem; color:var(--text-secondary); line-height:1.55;">${m.desc}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
      ` : ''}
    </div>
  `;

  const selA = container.querySelector('#sel-world-a');
  const selB = container.querySelector('#sel-world-b');
  if (selA) selA.value = selectedIdA;
  if (selB) selB.value = selectedIdB;

  selA?.addEventListener('change', e => {
    selectedIdA = e.target.value;
    renderSequenceView(container, planetChains, callbacks, mode);
  });

  selB?.addEventListener('change', e => {
    selectedIdB = e.target.value;
    renderSequenceView(container, planetChains, callbacks, mode);
  });

  container.querySelector('#btn-new-planet-chain')?.addEventListener('click', e => {
    callbacks.onOpenNewPlanetModal(e.currentTarget);
  });

  const yrInput = container.querySelector('#input-gfst-yr');
  const dayInput = container.querySelector('#input-gfst-day');

  function refreshCalendar() {
    if (!yrInput || !dayInput) return;
    const readout = container.querySelector('#calendar-readout-card');
    if (!readout) return;

    const yrRaw = yrInput.value.trim();
    const dayRaw = dayInput.value.trim();

    if (yrRaw === '' || dayRaw === '') {
      readout.innerHTML = `
        <div class="validation-banner" role="alert">
          <strong>Validation Required:</strong> Enter both a <strong>GFST Year</strong> and a <strong>Standard Day (1–365)</strong> to calculate the synchronized Hellonian date.
        </div>
      `;
      return;
    }

    if (!/^-?\d+$/.test(yrRaw) || !/^-?\d+$/.test(dayRaw)) {
      readout.innerHTML = `
        <div class="validation-banner" role="alert">
          <strong>Invalid Date Format:</strong> Both GFST Year and Standard Day must be whole numbers.
        </div>
      `;
      return;
    }

    const parsedYear = parseInt(yrRaw, 10);
    const parsedDay = parseInt(dayRaw, 10);

    if (parsedDay < 1 || parsedDay > 365) {
      readout.innerHTML = `
        <div class="validation-banner" role="alert">
          <strong>Out of Range:</strong> Standard Day must be between <strong>1 and 365</strong> (entered: <code>${dayRaw}</code>).
        </div>
      `;
      return;
    }

    calcYear = parsedYear;
    calcDay = parsedDay;
    const totalDays = calcYear * 365 + (calcDay - 1);
    const cycleNum = Math.floor(totalDays / 260) + 1;
    const dayIn260 = ((totalDays % 260) + 260) % 260;
    const trecena = (dayIn260 % 13) + 1;
    const sign = HELLONIAN_SIGNS[dayIn260 % 20];

    let context = '';
    if (calcYear < 0) {
      context = 'Pre-GFST Formative Wars (The Galactic Front -> Starfall War -> Battle of the Verdant Belt -> Collapse -> Solace Accord).';
    } else if (calcYear < 75) {
      context = `Early Post-Solace Accord Era (${75 - calcYear} GFST years before discovery of the Aetherion Beacon).`;
    } else if (calcYear === 75) {
      context = 'Milestone Year: Discovery of the Aetherion Beacon (GFST 75), stabilizing the black-hole settlements of the Aetherion Cluster.';
    } else if (calcYear < 95) {
      context = `Post-Beacon Expansion (${calcYear - 75} yrs after Aetherion Beacon; ${95 - calcYear} yrs prior to Eryndros Thermasis Colony).`;
    } else if (calcYear === 95) {
      context = 'Milestone Year: Founding of the Thermasis Colony on Hellonex-affiliated world Eryndros (GFST 95).';
    } else if (calcYear < 140) {
      context = `Active Thermasis Colonial Era on Eryndros (${calcYear - 95} yrs after founding; ${140 - calcYear} yrs before Crystalis Collapse).`;
    } else if (calcYear === 140) {
      context = 'Milestone Year: The Crystalis Collapse on Eryndros (GFST 140) — 45 GFST years after settlement.';
    } else if (calcYear < 200) {
      context = `Post-Collapse Recovery Interval (${calcYear - 140} yrs after Crystalis Collapse; ${200 - calcYear} yrs before Frostveil Initiative).`;
    } else if (calcYear === 200) {
      context = 'Milestone Year: Launch of the Frostveil Initiative on Eryndros (GFST 200).';
    } else {
      context = `High Federation Era (${calcYear - 200} GFST years after the Frostveil Initiative on Eryndros).`;
    }

    readout.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--hairline); padding-bottom:0.5rem; margin-bottom:0.65rem;">
        <span style="font-size:0.75rem; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted);">Synchronized Chronology</span>
        <span style="font-family:var(--font-mono); font-size:0.86rem; font-weight:700; color:var(--text-primary);">GFST ${calcYear}.${String(calcDay).padStart(3, '0')}</span>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.85rem;">
        <div>
          <div style="font-size:0.75rem; color:var(--text-muted);">Hellonex 260-Day Cycle (Tzolk'in)</div>
          <div style="font-family:var(--font-mono); font-size:0.95rem; font-weight:700; color:var(--emerald); margin-top:0.2rem;">
            Cycle ${cycleNum} · ${trecena} ${sign}
          </div>
          <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.15rem;">
            Day ${dayIn260 + 1} of 260-Day Hellonian Year
          </div>
        </div>
        <div>
          <div style="font-size:0.75rem; color:var(--text-muted);">Sequence Context</div>
          <div style="font-size:0.82rem; color:var(--text-primary); margin-top:0.2rem; line-height:1.5;">
            ${context}
          </div>
        </div>
      </div>
    `;
  }

  yrInput?.addEventListener('input', refreshCalendar);
  dayInput?.addEventListener('input', refreshCalendar);
  container.querySelectorAll('.preset-date-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      yrInput.value = btn.getAttribute('data-yr');
      dayInput.value = '1';
      refreshCalendar();
    });
  });

  container.querySelectorAll('[data-jump-yr]').forEach(card => {
    card.addEventListener('click', () => {
      if (yrInput && dayInput) {
        yrInput.value = card.getAttribute('data-jump-yr');
        dayInput.value = '1';
        refreshCalendar();
      }
    });
  });

  refreshCalendar();
}

function idOrFallback(id, list) {
  return list.some(x => x.id === id) ? id : (list[1]?.id || list[0]?.id);
}
