const search = document.querySelector('#search');
const results = document.querySelector('#results');
const count = document.querySelector('#count');

let entries = [];

const EXCLUDED_SECTIONS = new Set([
  'GemEffect.fmg',
  'MagicInfo.fmg',
  'MagicName.fmg',
  'TextEmbedImageName_win64.fmg'
]);

const NAME_FIRST_SECTIONS = new Set([
  'AccessoryName.fmg',
  'BloodMsg.fmg',
  'GemName.fmg',
  'GoodsName.fmg',
  'LoadingTitle.fmg',
  'ProtectorName.fmg',
  'TutorialTitle.fmg',
  'WeaponName.fmg'
]);

const TALK_ID_NAMES = {
  '0208': 'Dungeater',
  '0207': 'Enia',
  '0206': 'Intro Narrator',
  '0205': 'Melina',
  '0204': 'Melina',
  '0201': 'Mohg',
  '0165': 'Ranni',
  '0160': 'Ranni',
  '0150': 'Intro Narrator',
  '0140': 'Intro Narrator',
  '0130': 'Intro Narrator',
  '0120': 'Intro Narrator',
  '0110': 'Godfrey',
  '0100': 'Intro Narrator'
};

const TALK_SECTION_NAMES = {
  '0203|Section 00': 'Rykard',
  '0203|Section 91': 'Jerren',
  '0202|Section 10': 'Morgott',
  '0202|Section 11': 'Morgott',
  '0202|Section 30': 'Maliketh',
  '0202|Section 40': 'Rennala',
  '0202|Section 45': 'Rennala',
  '0202|Section 50': 'Rennala',
  '0202|Section 55': 'Rennala',
  '0202|Section 60': 'Malenia',
  '0202|Section 65': 'Malenia',
  '0202|Section 70': 'Malenia',
  '0202|Section 75': 'Malenia',
  '0202|Section 90': 'Unknown',
  '0200|Section 10': 'Melina',
  '0200|Section 15': 'Melina',
  '0200|Section 30': 'Margit',
  '0200|Section 40': 'Godrick',
  '0200|Section 50': 'Godrick',
  '0200|Section 70': 'Godfrey',
  '0200|Section 80': 'Godfrey',
  '|Section 01': 'Intro Narrator'
};

function parseEntries(text) {
  const normalized = normalizeText(text);
  const sections = splitIntoSections(normalized);
  const parsed = [];

  for (const section of sections) {
    if (EXCLUDED_SECTIONS.has(section.name)) continue;

    if (section.name === 'TalkMsg.fmg') {
      parsed.push(...parseTalkMsgSection(section));
    } else if (NAME_FIRST_SECTIONS.has(section.name)) {
      parsed.push(...parseNameFirstSection(section));
    } else {
      parsed.push(...parseIdFirstSection(section));
    }
  }

  return parsed;
}

function normalizeText(text) {
  return (text || '')
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2028/g, '\n')
    .trim();
}

function splitIntoSections(text) {
  const sectionRegex = /^([A-Za-z0-9_]+\.fmg)\s*$/gm;
  const matches = [...text.matchAll(sectionRegex)];
  const sections = [];

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];

    sections.push({
      name: current[1],
      text: text.slice(
        current.index + current[0].length,
        next ? next.index : text.length
      ).trim()
    });
  }

  return sections;
}

function parseIdFirstSection(section) {
  const matches = [...section.text.matchAll(/\[(\d+)\]\s*/g)];

  return matches.map((match, index) => {
    const nextMatch = matches[index + 1];
    const id = match[1];
    const start = match.index + match[0].length;
    const end = nextMatch ? nextMatch.index : section.text.length;
    const body = section.text.slice(start, end).trim();

    return {
      section: section.name,
      id,
      name: '',
      text: cleanBodyText(body),
      type: 'id-first'
    };
  }).filter(entry => entry.id && entry.text);
}

function parseNameFirstSection(section) {
  const matches = [...section.text.matchAll(/([^\n\[]+?)\s*\[(\d+)\]/g)];

  return matches.map((match, index) => {
    const nextMatch = matches[index + 1];
    const name = cleanBodyText(match[1]);
    const id = match[2];
    const start = match.index + match[0].length;
    const end = nextMatch ? nextMatch.index : section.text.length;
    const body = section.text.slice(start, end).trim();

    return {
      section: section.name,
      id,
      name,
      text: cleanBodyText(body),
      type: 'name-first'
    };
  }).filter(entry => entry.id && (entry.name || entry.text));
}

function parseTalkMsgSection(section) {
  const lines = section.text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const parsed = [];
  let segment = '';
  let talkSection = '';
  let npcName = '';

  for (const line of lines) {
    const namedNpcMatch = line.match(/^(.+?)\s*\[(\d{4})\]\s*$/);

    if (namedNpcMatch) {
      npcName = cleanBodyText(namedNpcMatch[1]);
      segment = namedNpcMatch[2];
      talkSection = '';
      continue;
    }

    if (/^\d{4}$/.test(line)) {
      segment = line;
      npcName = TALK_ID_NAMES[segment] || '';
      talkSection = '';
      continue;
    }

    if (/^Section\s+\d+/i.test(line)) {
      talkSection = line;

      const sectionSpecificName =
        TALK_SECTION_NAMES[`${segment}|${talkSection}`] ||
        TALK_SECTION_NAMES[`|${talkSection}`];

      if (sectionSpecificName) {
        npcName = sectionSpecificName;
      }

      continue;
    }

    const match = line.match(/^\[(\d+)\]\s*(.*)$/s);

    if (!match) continue;

    const id = match[1];
    const body = match[2].trim();

    if (id === '100' && body === '(dummyText)') continue;
    if (id === '200' && body === '(dummyText)') continue;

    parsed.push({
      section: section.name,
      segment,
      talkSection,
      id,
      name: npcName,
      text: cleanBodyText(body),
      type: 'talk'
    });
  }

  return parsed;
}

function cleanBodyText(value) {
  return String(value || '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function render() {
  const q = search.value.trim().toLowerCase();

  const visible = entries.filter(e =>
    !q ||
    e.section.toLowerCase().includes(q) ||
    e.id.includes(q) ||
    e.name.toLowerCase().includes(q) ||
    e.text.toLowerCase().includes(q) ||
    String(e.segment || '').includes(q) ||
    String(e.talkSection || '').toLowerCase().includes(q)
  );

  count.textContent = `${visible.length} ${visible.length === 1 ? 'entry' : 'entries'}`;

  if (!visible.length) {
    results.innerHTML = '<div class="empty">No entries found.</div>';
    return;
  }

  results.innerHTML = visible.map(renderEntry).join('');
}

function renderEntry(e) {
  const metaParts = [e.section];

  if (e.segment) metaParts.push(`NPC ${e.segment}`);
  if (e.talkSection) metaParts.push(e.talkSection);

  return `
    <article class="entry" id="entry-${escapeHtml(e.section)}-${escapeHtml(e.id)}">
      <div class="entry-section">${escapeHtml(metaParts.join(' · '))}</div>

      <div class="entry-header">
        ${e.name ? `<div class="entry-name">${escapeHtml(e.name)}</div>` : ''}
        <div class="entry-id">[${escapeHtml(e.id)}]</div>
      </div>

      ${e.text ? `<div class="entry-text">${escapeHtml(e.text).replace(/\n/g, '<br>')}</div>` : ''}
    </article>
  `;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}

async function loadDump() {
  results.innerHTML = '<div class="empty">Loading EldenDump.html…</div>';

  try {
    const response = await fetch('./EldenDump.html');

    if (!response.ok) {
      throw new Error('Could not load EldenDump.html');
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = doc.body?.innerText || html;

    entries = parseEntries(text);
    render();
  } catch (error) {
    count.textContent = '0 entries';
    results.innerHTML = `
      <div class="empty">
        Could not load <code>EldenDump.html</code>.<br>
        Make sure it is in the same folder as <code>index.html</code>.
      </div>
    `;
  }
}

search.addEventListener('input', render);

loadDump();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
