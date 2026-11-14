import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Parses a human-readable Markdown lore dossier from a GitHub Issue body
 * into a Galactic Compendium article record.
 */
export function parseDossierFromIssue(rawBody = '', rawIssueTitle = '', issueNumber = '', issueUser = '') {
  // Strip trailing maintainer instruction footer if present
  const cleanedBody = String(rawBody || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n---\n\*Maintainer Action:[\s\S]*$/i, '')
    .trim();

  // Split by ## Section Headings
  const sections = {};
  let headerBlock = cleanedBody;
  const firstH2Idx = cleanedBody.search(/^##\s+/m);
  if (firstH2Idx !== -1) {
    headerBlock = cleanedBody.slice(0, firstH2Idx).trim();
    const rest = cleanedBody.slice(firstH2Idx);
    const headingRegex = /^##\s+([^\n]+)\n([\s\S]*?)(?=^##\s+|\z)/gm;
    const parts = rest.split(/^##\s+/m).filter(Boolean);
    for (const part of parts) {
      const nlIdx = part.indexOf('\n');
      if (nlIdx === -1) continue;
      const secName = part.slice(0, nlIdx).trim().toLowerCase();
      const secContent = part.slice(nlIdx + 1).trim();
      sections[secName] = secContent;
    }
  }

  // Parse Title (# Title) and Subtitle (*Subtitle*) and metadata bullets from headerBlock
  const headerLines = headerBlock.split('\n').map(l => l.trim()).filter(Boolean);
  let title = '';
  let subtitle = '';
  let category = 'Worlds & Systems';
  let canonTier = 'Approved Community Canon';
  let submittedBy = '';
  let contributorNotes = '';

  for (const line of headerLines) {
    if (!title && line.startsWith('# ')) {
      title = line.slice(2).trim();
      continue;
    }
    if (!subtitle && /^\*[^*]+\*$/.test(line)) {
      subtitle = line.slice(1, -1).trim();
      continue;
    }
    const metaMatch = /^-\s+\*\*([^*]+)\*\*:\s*(.+)$/.exec(line);
    if (metaMatch) {
      const key = metaMatch[1].trim().toLowerCase();
      const val = metaMatch[2].trim();
      if (key === 'category') category = val;
      else if (key.includes('canon tier') || key.includes('seed')) canonTier = val;
      else if (key === 'submitted by') submittedBy = val;
      else if (key === 'contributor notes') contributorNotes = val;
    }
  }

  if (!title) {
    title = String(rawIssueTitle || '')
      .replace(/^\[Canon Submission\]\s*/i, '')
      .trim() || `Community Entry ${issueNumber || Date.now()}`;
  }

  // Supporting Facts
  const infobox = [];
  const factsRaw = sections['supporting facts'] || '';
  if (factsRaw) {
    for (const line of factsRaw.split('\n')) {
      const m = /^-\s+\*\*([^*]+)\*\*:\s*(.+)$/.exec(line.trim());
      if (m) {
        infobox.push({ label: m[1].trim(), value: m[2].trim() });
      }
    }
  }
  if (submittedBy && !infobox.some(r => r.label.toLowerCase() === 'submitted by')) {
    infobox.push({ label: 'Submitted By', value: submittedBy });
  } else if (!submittedBy && issueUser && !infobox.some(r => r.label.toLowerCase() === 'submitted by')) {
    infobox.push({ label: 'Submitted By', value: `@${issueUser}` });
  }

  // Archival Epigraph
  let quote = '';
  const epigraphRaw = sections['archival epigraph'] || '';
  if (epigraphRaw) {
    quote = epigraphRaw
      .split('\n')
      .map(l => l.replace(/^>\s?/, '').trim())
      .join(' ')
      .trim();
  }

  // Overview & Lore
  const body = sections['overview & lore'] || cleanedBody;

  // Chronology & Historical Sequence
  const events = [];
  const chronoRaw = sections['chronology & historical sequence'] || '';
  if (chronoRaw) {
    for (const line of chronoRaw.split('\n')) {
      const m = /^-\s+\*\*([^*]+)\*\*:\s*(.+)$/.exec(line.trim());
      if (m) {
        const headerPart = m[1].trim();
        const descPart = m[2].trim();
        const dashIdx = headerPart.indexOf('—');
        if (dashIdx !== -1) {
          events.push({
            epoch: headerPart.slice(0, dashIdx).trim(),
            title: headerPart.slice(dashIdx + 1).trim(),
            desc: descPart
          });
        } else {
          events.push({
            epoch: 'GFST Logged Event',
            title: headerPart,
            desc: descPart
          });
        }
      }
    }
  }

  // Open Development Threads
  const hooks = [];
  const threadsRaw = sections['open development threads'] || '';
  if (threadsRaw) {
    for (const line of threadsRaw.split('\n')) {
      const cleaned = line.trim().replace(/^-\s+/, '').trim();
      if (cleaned) hooks.push(cleaned);
    }
  }

  // Provenance Note
  let metaTruth = sections['provenance note'] || '';
  if (contributorNotes) {
    metaTruth = metaTruth
      ? `${metaTruth} (Contributor Notes: ${contributorNotes})`
      : `Contributor Notes: ${contributorNotes}`;
  }
  if (issueNumber) {
    metaTruth = metaTruth
      ? `${metaTruth} · Approved via GitHub Issue #${issueNumber}.`
      : `Approved Community Canon via GitHub Issue #${issueNumber}.`;
  }

  const baseSlug = slugify(title) || `entry-${issueNumber || Date.now()}`;

  return {
    id: baseSlug,
    title,
    category,
    canonTier,
    approvedCanon: true,
    backdropTheme: 'stellar',
    subtitle,
    quote,
    body,
    infobox,
    events,
    hooks,
    metaTruth
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const issueBody = process.env.ISSUE_BODY || '';
  const issueTitle = process.env.ISSUE_TITLE || '';
  const issueNumber = process.env.ISSUE_NUMBER || '';
  const issueUser = process.env.ISSUE_USER || '';

  const parsedEntry = parseDossierFromIssue(issueBody, issueTitle, issueNumber, issueUser);

  const articlesPath = path.join(ROOT_DIR, 'src', 'data', 'articles.json');
  const seedPath = path.join(ROOT_DIR, 'src', 'data', 'seed.json');

  const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf-8'));
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

  // Update if an entry with the same title/id already exists, otherwise prepend
  const existingIdx = articles.findIndex(
    a => a.id === parsedEntry.id || a.title.toLowerCase() === parsedEntry.title.toLowerCase()
  );
  if (existingIdx !== -1) {
    parsedEntry.id = articles[existingIdx].id;
    articles[existingIdx] = { ...articles[existingIdx], ...parsedEntry };
  } else {
    articles.unshift(parsedEntry);
  }

  seed.articles = articles;

  fs.writeFileSync(articlesPath, JSON.stringify(articles, null, 2) + '\n', 'utf-8');
  fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + '\n', 'utf-8');

  console.log(`Approved entry "${parsedEntry.title}" (id: ${parsedEntry.id})`);

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `entry_id=${parsedEntry.id}\nentry_title=${parsedEntry.title.replace(/[\r\n]+/g, ' ')}\n`,
      'utf-8'
    );
  }
}
