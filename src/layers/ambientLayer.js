// Visual Layer 1 & 2: Context-Reactive Artwork Backdrop & Realtime Canvas Energy Currents

const THEME_PALETTES = {
  cradle: {
    primary: 'rgba(28, 168, 242, 0.26)',
    secondary: 'rgba(14, 116, 184, 0.14)',
    artOpacity: '0.52'
  },
  orichalcum: {
    primary: 'rgba(232, 162, 54, 0.22)',
    secondary: 'rgba(28, 168, 242, 0.14)',
    artOpacity: '0.40'
  },
  singularity: {
    primary: 'rgba(42, 194, 146, 0.22)',
    secondary: 'rgba(28, 168, 242, 0.16)',
    artOpacity: '0.28'
  },
  forge: {
    primary: 'rgba(235, 132, 42, 0.22)',
    secondary: 'rgba(232, 162, 54, 0.12)',
    artOpacity: '0.25'
  },
  stellar: {
    primary: 'rgba(56, 189, 248, 0.20)',
    secondary: 'rgba(232, 162, 54, 0.14)',
    artOpacity: '0.32'
  }
};

let currentTheme = 'cradle';
let particles = [];
let animId = null;

export function initAmbientLayer() {
  const canvas = document.getElementById('ambient-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  particles = Array.from({ length: 34 }, (_, i) => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: 1.1 + Math.random() * 2.2,
    vx: (Math.random() - 0.5) * 0.22,
    vy: -0.12 - Math.random() * 0.28,
    phase: i * 0.4
  }));

  function render(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (document.body.getAttribute('data-visual-layer') === 'archival') {
      animId = requestAnimationFrame(render);
      return;
    }

    const palette = THEME_PALETTES[currentTheme] || THEME_PALETTES.cradle;

    // Subtle lower-horizon bioluminescent current (echoing the Cradle hallway vein)
    const grad = ctx.createRadialGradient(
      canvas.width * 0.5,
      canvas.height * 0.88,
      20,
      canvas.width * 0.5,
      canvas.height * 0.88,
      canvas.width * 0.55
    );
    grad.addColorStop(0, palette.primary);
    grad.addColorStop(0.5, palette.secondary);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Drifting motes of energy
    for (const p of particles) {
      p.x += p.vx + Math.sin(time * 0.0006 + p.phase) * 0.12;
      p.y += p.vy;
      if (p.y < -10) p.y = canvas.height + 10;
      if (p.x < -10) p.x = canvas.width + 10;
      if (p.x > canvas.width + 10) p.x = -10;

      const alpha = 0.22 + 0.18 * Math.sin(time * 0.0015 + p.phase);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = currentTheme === 'orichalcum' || currentTheme === 'forge'
        ? `rgba(242, 178, 75, ${alpha})`
        : `rgba(72, 196, 255, ${alpha})`;
      ctx.fill();
    }

    animId = requestAnimationFrame(render);
  }

  animId = requestAnimationFrame(render);
}

export function setAmbientTheme(themeKey) {
  currentTheme = THEME_PALETTES[themeKey] ? themeKey : 'cradle';
  const artEl = document.getElementById('backdrop-artwork');
  if (artEl) {
    artEl.style.opacity = THEME_PALETTES[currentTheme].artOpacity;
  }
}

export function toggleVisualLayerMode() {
  const current = document.body.getAttribute('data-visual-layer') || 'immersive';
  const next = current === 'immersive' ? 'archival' : 'immersive';
  document.body.setAttribute('data-visual-layer', next);
  const btn = document.getElementById('btn-visual-layer');
  if (btn) {
    btn.textContent = next === 'immersive' ? 'Layer: Immersive Orichalcum' : 'Layer: High-Contrast Archive';
  }
}
