import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlTemplate = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf-8');
const tokensCss = fs.readFileSync(path.join(__dirname, 'src', 'styles', 'tokens.css'), 'utf-8');
const layoutCss = fs.readFileSync(path.join(__dirname, 'src', 'styles', 'layout.css'), 'utf-8');
const componentsCss = fs.readFileSync(path.join(__dirname, 'src', 'styles', 'components.css'), 'utf-8');

const articles = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'data', 'articles.json'), 'utf-8'));
const planetChains = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'data', 'planetChains.json'), 'utf-8'));
const starmapNodes = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'data', 'starmapNodes.json'), 'utf-8'));

// Inline the Cradle-to-Library hallway artwork as a base64 data URI for the standalone artifact and GitHub Pages build
const webpPath = path.join(__dirname, 'public', 'assets', 'cradle-hallway.webp');
const pngPath = path.join(__dirname, 'public', 'assets', 'cradle-hallway.png');
const imgPath = fs.existsSync(webpPath) ? webpPath : pngPath;
const imgMime = fs.existsSync(webpPath) ? 'image/webp' : 'image/png';
if (fs.existsSync(imgPath)) {
  const b64 = fs.readFileSync(imgPath).toString('base64');
  const dataUri = `data:${imgMime};base64,${b64}`;
  for (const art of articles) {
    if (art.image === '/assets/cradle-hallway.png') {
      art.image = dataUri;
    }
    if (Array.isArray(art.visuals)) {
      for (const v of art.visuals) {
        if (v.src === '/assets/cradle-hallway.png') {
          v.src = dataUri;
        }
      }
    }
  }
}

function stripEsmSyntax(code) {
  // Remove multi-line or single-line import statements
  let cleaned = code.replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '');
  // Replace 'export function' / 'export const' / 'export let' with plain declarations
  cleaned = cleaned.replace(/^export\s+(function|const|let|var|class)\s+/gm, '$1 ');
  return cleaned;
}

const starmapJs = stripEsmSyntax(fs.readFileSync(path.join(__dirname, 'src', 'layers', 'starmapLayer.js'), 'utf-8'));
const wikiJs = stripEsmSyntax(fs.readFileSync(path.join(__dirname, 'src', 'components', 'wikiView.js'), 'utf-8'));
const sequenceJs = stripEsmSyntax(fs.readFileSync(path.join(__dirname, 'src', 'components', 'sequenceView.js'), 'utf-8'));
const seederJs = stripEsmSyntax(fs.readFileSync(path.join(__dirname, 'src', 'components', 'seederView.js'), 'utf-8'));
const continuityJs = stripEsmSyntax(fs.readFileSync(path.join(__dirname, 'src', 'components', 'continuityView.js'), 'utf-8'));
const mainJs = stripEsmSyntax(fs.readFileSync(path.join(__dirname, 'src', 'main.js'), 'utf-8'));

const combinedCss = [tokensCss, layoutCss, componentsCss].join('\n\n');
const seedPayload = JSON.stringify({ articles, planetChains, starmapNodes });

const combinedJs = `
window.__GALACTIC_SEED_DATA__ = ${seedPayload};

${starmapJs}
${wikiJs}
${sequenceJs}
${seederJs}
${continuityJs}
${mainJs}
`;

let outputHtml = htmlTemplate
  .replace(/<link rel="stylesheet" href="\/src\/styles\/tokens\.css[^"]*" \/>\s*<link rel="stylesheet" href="\/src\/styles\/layout\.css[^"]*" \/>\s*<link rel="stylesheet" href="\/src\/styles\/components\.css[^"]*" \/>/, () => `<style>\n${combinedCss}\n</style>`)
  .replace(/<script type="module" src="\/src\/main\.js[^"]*"><\/script>/, () => `<script>\n${combinedJs}\n</script>`);

fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
const distFile = path.join(__dirname, 'dist', 'galactic_compendium.html');
fs.writeFileSync(distFile, outputHtml, 'utf-8');

fs.mkdirSync(path.join(__dirname, 'docs'), { recursive: true });
const docsFile = path.join(__dirname, 'docs', 'index.html');
fs.writeFileSync(docsFile, outputHtml, 'utf-8');

console.log('Built standalone artifact & GitHub Pages index:', distFile, docsFile, 'Bytes:', Buffer.byteLength(outputHtml));
