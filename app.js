const search = document.querySelector('#search');
const results = document.querySelector('#results');
const count = document.querySelector('#count');

const menu = document.querySelector('#menu');
const menuOverlay = document.querySelector('#menuOverlay');
const menuBtn = document.querySelector('#menuBtn');
const closeMenuBtn = document.querySelector('#closeMenuBtn');
const homeBtn = document.querySelector('#homeBtn');
const categoryList = document.querySelector('#categoryList');
const npcIndexBtn = document.querySelector('#npcIndexBtn');

const searchView = document.querySelector('#searchView');
const categoryView = document.querySelector('#categoryView');
const npcView = document.querySelector('#npcView');
const dialogueView = document.querySelector('#dialogueView');

const categoryTitle = document.querySelector('#categoryTitle');
const categoryResults = document.querySelector('#categoryResults');
const npcList = document.querySelector('#npcList');
const dialogueTitle = document.querySelector('#dialogueTitle');
const dialogueResults = document.querySelector('#dialogueResults');

const backFromCategoryBtn = document.querySelector('#backFromCategoryBtn');
const backFromNpcBtn = document.querySelector('#backFromNpcBtn');
const backFromDialogueBtn = document.querySelector('#backFromDialogueBtn');

let entries = [];
let categories = new Map();
let npcGroups = new Map();

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

const SECTION_CATEGORY = {
  'ActionButtonText.fmg': 'Interactions',
  'ArtsName.fmg': 'Ashes of War',
  'BloodMsg.fmg': 'Messages',
  'EventTextForMap.fmg': 'Event Texts',
  'EventTextForTalk.fmg': 'UI Messages',
  'GemInfo.fmg': 'Ashes of War (Item)',
  'GemName.fmg': 'Ashes of War (Item)',
  'GoodsDialog.fmg': 'Item Prompts',
  'GoodsInfo.fmg': 'Items',
  'GoodsInfo2.fmg': 'Items',
  'GoodsName.fmg': 'Items',
  'GR_Dialogues.fmg': 'UI Prompts',
  'GR_KeyGuide.fmg': 'UI Prompts',
  'GR_LineHelp.fmg': 'UI Prompts',
  'GR_MenuText.fmg': 'UI Prompts',
  'GR_System_Message_win64.fmg': 'UI Prompts',
  'LoadingTitle.fmg': 'Loading Screen Tutorials',
  'NetworkMessage.fmg': 'Multiplayer Prompts',
  'NpcName.fmg': 'NPCs',
  'PlaceName.fmg': 'Locations',
  'ProtectorInfo.fmg': 'Armor',
  'ProtectorName.fmg': 'Armor',
  'TalkMsg.fmg': 'Dialogues',
  'TutorialTitle.fmg': 'Tutorials',
  'WeaponEffect.fmg': 'Weapon Effects',
  'WeaponInfo.fmg': 'Arrow/Bolt Types',
  'WeaponName.fmg': 'Weapons',
  'AccessoryInfo.fmg': 'Talismans',
  'AccessoryName.fmg': 'Talismans'
};

const CATEGORY_ORDER = [
  'Talismans',
  'Weapons',
  'Armor',
  'Items',
  'Ashes of War',
  'Ashes of War (Item)',
  'Arrow/Bolt Types',
  'Weapon Effects',
  'NPCs',
  'Dialogues',
  'Locations',
  'Messages',
  'Interactions',
  'Item Prompts',
  'Event Texts',
  'UI Messages',
  'UI Prompts',
  'Loading Screen Tutorials',
  'Tutorials',
  'Multiplayer Prompts'
];

const TALK_ID_NAMES = {
  '0208': 'Dungeater',
  '0206': 'Intro Narrator',
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
  '0207|Section 00': 'Enia',
  '0207|Section 30': 'Patches',
  '0207|Section 80': 'Patches',
  '0207|Section 50': 'Asimi, Silver Tear',

  '0205|Section 00': 'Melina',
  '0205|Section 80': 'Melina',

  '0204|Section 30': 'Melina',
  '0204|Section 50': 'Morgott',
  '0204|Section 80': 'Ending Narrator',
  '0204|Section 81': 'Ending Narrator',
  '0204|Section 82': 'Ending Narrator',
  '0204|Section 83': 'Ending Narrator',
  '0204|Section 84': 'Ending Narrator',
  '0204|Section 85': 'Ending Narrator',
  '0204|Section 86': 'Ending Narrator',
  '0204|Section 90': 'Ranni',
  '0204|Section 95': 'Ranni',

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

  'PRE_0100|Section 01': 'Intro Narrator'
};

function parseEntries(text) {
  const normalized = normalizeText(text);
  const rawSections = splitIntoSections(normalized);
  const sectionEntries = new Map();

  for (const section of rawSections) {
    if (EXCLUDED_SECTIONS.has(section.name)) continue;

    if (section.name === 'TalkMsg.fmg') {
      sectionEntries.set(section.name, parseTalkMsgSection(section));
    } else if (NAME_FIRST_SECTIONS.has(section.name)) {
      sectionEntries.set(section.name, parseNameFirstSection(section));
    } else {
      sectionEntries.set(section.name, parseIdFirstSection(section));
    }
  }

  const parsed = [
    ...mergeTalismans(sectionEntries),
    ...mergeAshOfWarItems(sectionEntries),
    ...mergeItems(sectionEntries),
    ...mergeArmor(sectionEntries),
    ...collectStandaloneSections(sectionEntries)
  ];

  return parsed.map(entry => ({
    ...entry,
    category: entry.category || SECTION_CATEGORY[entry.section] || entry.section
  }));
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
      type: 'id-first',
      category: SECTION_CATEGORY[section.name] || section.name
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
      type: 'name-first',
      category: SECTION_CATEGORY[section.name] || section.name
    };
  }).filter(entry => entry.id && (entry.name || entry.text));
}

function parseTalkMsgSection(section) {
  const lines = section.text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const npcNameById = {};

  for (const line of lines) {
    const namedNpcMatch = line.match(/^(.+?)\s*\[(\d{4})\]\s*$/);

    if (namedNpcMatch) {
      npcNameById[namedNpcMatch[2]] = cleanBodyText(namedNpcMatch[1]);
    }
  }

  const grouped = new Map();

  let segment = '';
  let talkSection = '';
  let npcName = '';

  for (const line of lines) {
    const namedNpcMatch = line.match(/^(.+?)\s*\[(\d{4})\]\s*$/);

    if (namedNpcMatch) {
      segment = namedNpcMatch[2];
      npcName = cleanBodyText(namedNpcMatch[1]);
      talkSection = '';
      continue;
    }

    if (/^\d{4}$/.test(line)) {
      segment = line;
      npcName = TALK_ID_NAMES[segment] || `Unknown ${segment}`;
      talkSection = '';
      continue;
    }

    if (/^Section\s+\d+/i.test(line)) {
      talkSection = line;
      continue;
    }

    const dialogueParts = splitDialogueLine(line);

    for (const part of dialogueParts) {
      const id = part.id;
      const body = part.text;

      if (id === '100' && body === '(dummyText)') continue;
      if (id === '200' && body === '(dummyText)') continue;

      const derivedNpcId = id.length >= 4 ? id.substring(0, 4) : segment;
      const finalNpcId = derivedNpcId || segment || '0000';
      const finalSection = talkSection || 'Section Unknown';

      const mappedName =
        TALK_SECTION_NAMES[`${segment}|${finalSection}`] ||
        (!segment && finalSection === 'Section 01'
          ? TALK_SECTION_NAMES[`PRE_0100|${finalSection}`]
          : '');

      let finalNpcName = mappedName || npcName;

      if (
        !mappedName &&
        (!finalNpcName || finalNpcName.startsWith('Unknown')) &&
        npcNameById[finalNpcId]
      ) {
        finalNpcName = npcNameById[finalNpcId];
      }

      if (!finalNpcName) {
        finalNpcName = `Unknown ${finalNpcId}`;
      }

      const key = `${finalNpcId}|${finalNpcName}|${finalSection}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          section: section.name,
          category: 'Dialogues',
          segment: finalNpcId,
          npcId: finalNpcId,
          npcName: finalNpcName,
          talkSection: finalSection,
          id: `${finalNpcId}-${finalSection.replace(/\s+/g, '-')}`,
          name: finalNpcName,
          lines: [],
          type: 'talk'
        });
      }

      grouped.get(key).lines.push({
        id,
        text: cleanBodyText(body)
      });
    }
  }

  return [...grouped.values()]
    .map(group => ({
      section: group.section,
      category: group.category,
      segment: group.segment,
      npcId: group.npcId,
      npcName: group.npcName,
      talkSection: group.talkSection,
      id: group.id,
      name: group.name,
      text: group.lines
        .map(line => `[${line.id}] ${line.text}`)
        .join('\n'),
      type: group.type
    }))
    .filter(entry => entry.text);
}



function splitDialogueLine(line) {
  const cleaned = line
    .replace(/\(\s*(?=\[\d+\])/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const matches = [...cleaned.matchAll(/\[(\d+)\]\s*/g)];

  if (!matches.length) return [];

  return matches.map((match, index) => {
    const nextMatch = matches[index + 1];

    const id = match[1];
    const start = match.index + match[0].length;
    const end = nextMatch ? nextMatch.index : cleaned.length;

    const text = cleaned
      .slice(start, end)
      .replace(/\(\s*$/g, '')
      .trim();

    return { id, text };
  }).filter(part => part.id && part.text);
}



function mergeTalismans(sectionEntries) {
  return mergeNameInfoSections({
    category: 'Talismans',
    nameSection: 'AccessoryName.fmg',
    infoSection: 'AccessoryInfo.fmg',
    sectionEntries
  });
}

function mergeAshOfWarItems(sectionEntries) {
  return mergeNameInfoSections({
    category: 'Ashes of War (Item)',
    nameSection: 'GemName.fmg',
    infoSection: 'GemInfo.fmg',
    sectionEntries
  });
}

function mergeArmor(sectionEntries) {
  return mergeNameInfoSections({
    category: 'Armor',
    nameSection: 'ProtectorName.fmg',
    infoSection: 'ProtectorInfo.fmg',
    sectionEntries,
    separator: true
  });
}

function mergeNameInfoSections({ category, nameSection, infoSection, sectionEntries, separator = false }) {
  const names = sectionEntries.get(nameSection) || [];
  const infos = sectionEntries.get(infoSection) || [];

  const nameMap = mapById(names);
  const infoMap = mapById(infos);
  const ids = uniqueIds([...names, ...infos]);

  return ids.map(id => {
    const nameEntry = nameMap.get(id);
    const infoEntry = infoMap.get(id);

    const parts = [];

    if (infoEntry?.text) parts.push(infoEntry.text);
    if (nameEntry?.text) parts.push(nameEntry.text);

    return {
      section: `${nameSection} + ${infoSection}`,
      category,
      id,
      name: nameEntry?.name || '',
      text: separator ? parts.join('\n---\n') : parts.join('\n\n'),
      type: 'merged'
    };
  }).filter(entry => entry.id && (entry.name || entry.text));
}

function mergeItems(sectionEntries) {
  const names = sectionEntries.get('GoodsName.fmg') || [];
  const infos = sectionEntries.get('GoodsInfo.fmg') || [];
  const infos2 = sectionEntries.get('GoodsInfo2.fmg') || [];

  const nameMap = mapById(names);
  const infoMap = mapById(infos);
  const info2Map = mapById(infos2);
  const ids = uniqueIds([...names, ...infos, ...infos2]);

  return ids.map(id => {
    const nameEntry = nameMap.get(id);
    const infoEntry = infoMap.get(id);
    const info2Entry = info2Map.get(id);

    const topParts = [];

    if (infoEntry?.text) topParts.push(infoEntry.text);
    if (nameEntry?.text) topParts.push(nameEntry.text);

    const parts = [];

    if (topParts.length) parts.push(topParts.join('\n\n'));
    if (info2Entry?.text) parts.push(info2Entry.text);

    return {
      section: 'GoodsName.fmg + GoodsInfo.fmg + GoodsInfo2.fmg',
      category: 'Items',
      id,
      name: nameEntry?.name || '',
      text: parts.join('\n---\n'),
      type: 'merged'
    };
  }).filter(entry => entry.id && (entry.name || entry.text));
}

function collectStandaloneSections(sectionEntries) {
  const alreadyMerged = new Set([
    'AccessoryName.fmg',
    'AccessoryInfo.fmg',
    'GemName.fmg',
    'GemInfo.fmg',
    'GoodsName.fmg',
    'GoodsInfo.fmg',
    'GoodsInfo2.fmg',
    'ProtectorName.fmg',
    'ProtectorInfo.fmg'
  ]);

  const collected = [];

  for (const [sectionName, items] of sectionEntries.entries()) {
    if (alreadyMerged.has(sectionName)) continue;

    collected.push(...items.map(item => ({
      ...item,
      category: SECTION_CATEGORY[sectionName] || sectionName
    })));
  }

  return collected;
}

function mapById(items) {
  return new Map(items.map(item => [item.id, item]));
}

function uniqueIds(items) {
  return [...new Set(items.map(item => item.id))];
}

function buildIndexes() {
  categories = new Map();
  npcGroups = new Map();

  for (const entry of entries) {
    if (!categories.has(entry.category)) {
      categories.set(entry.category, []);
    }

    categories.get(entry.category).push(entry);

    if (entry.category === 'Dialogues') {
      const npcKey = entry.name || `Unknown ${entry.segment || 'NPC'}`;

      if (!npcGroups.has(npcKey)) {
        npcGroups.set(npcKey, []);
      }

      npcGroups.get(npcKey).push(entry);
    }
  }
}

function renderCategoryMenu() {
  const names = CATEGORY_ORDER.filter(name => categories.has(name));

  categoryList.innerHTML = names.map(name => `
    <button class="menu-item" data-category="${escapeHtml(name)}">
      ${escapeHtml(name)}
    </button>
  `).join('');

  categoryList.querySelectorAll('[data-category]').forEach(button => {
    button.addEventListener('click', () => showCategory(button.dataset.category));
  });
}

function render() {
  const q = search.value.trim().toLowerCase();

  const visible = entries.filter(e =>
    !q ||
    e.category.toLowerCase().includes(q) ||
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
  const metaParts = [e.category];

  if (e.category !== e.section && e.section) metaParts.push(e.section);
  if (e.segment) metaParts.push(`NPC ${e.segment}`);
  if (e.talkSection) metaParts.push(e.talkSection);

  const textWithIds = formatEntryText(e.text);
  const textWithoutIds = formatCleanEntryText(e.text);

  return `
    <article
      class="entry"
      id="entry-${escapeHtml(e.section)}-${escapeHtml(e.id)}"
      data-mode="ids"
      data-copy-ids="${escapeAttribute(getCopyTextWithIds(e))}"
      data-copy-clean="${escapeAttribute(getCopyTextClean(e))}"
    >
      <button class="copy-btn" type="button">Copy</button>

      <div class="entry-section">${escapeHtml(metaParts.join(' · '))}</div>

      <div class="entry-header">
        ${
          e.name
            ? e.type === 'talk'
              ? `
                <button
                  class="entry-name entry-name-link"
                  data-dialogue-name="${escapeAttribute(e.name)}"
                  type="button"
                >
                  ${escapeHtml(e.name)}
                </button>
              `
              : `<div class="entry-name">${escapeHtml(e.name)}</div>`
            : ''
        }

        ${
          e.type !== 'talk'
            ? `<div class="entry-id">[${escapeHtml(e.id)}]</div>`
            : ''
        }
      </div>

      ${
        e.text
          ? `
            <div class="entry-text entry-text-ids">${textWithIds}</div>
            <div class="entry-text entry-text-clean">${textWithoutIds}</div>
          `
          : ''
      }
    </article>
  `;
}

function formatEntryText(text) {
  return escapeHtml(text)
    .replace(/\n---\n/g, '<hr>')
    .replace(/\n/g, '<br>');
}

function formatCleanEntryText(text) {
  return escapeHtml(getCleanText(text))
    .replace(/\n---\n/g, '<hr>')
    .replace(/\n/g, '<br>');
}

function getCopyTextWithIds(e) {
  if (e.type === 'talk') {
    return e.text || '';
  }

  const lines = [];

  if (e.name) lines.push(`${e.name} [${e.id}]`);
  else lines.push(`[${e.id}]`);

  if (e.text) lines.push(e.text);

  return lines.join('\n').trim();
}

function getCopyTextClean(e) {
  if (e.type === 'talk') {
    return getCleanText(e.text);
  }

  const lines = [];

  if (e.name) lines.push(e.name);
  if (e.text) lines.push(getCleanText(e.text));

  return lines.join('\n').trim();
}

function getCleanText(text) {
  return String(text || '')
    .replace(/\[(\d+)\]\s*/g, '')
    .replace(/\n---\n/g, '\n---\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

function showHome() {
  searchView.hidden = false;
  categoryView.hidden = true;
  npcView.hidden = true;
  dialogueView.hidden = true;
  closeMenu();
  render();
}

function showCategory(categoryName) {
  const items = categories.get(categoryName) || [];

  categoryTitle.textContent = categoryName;
  categoryResults.innerHTML = items.length
    ? items.map(renderEntry).join('')
    : '<div class="empty">No entries found.</div>';

  searchView.hidden = true;
  categoryView.hidden = false;
  npcView.hidden = true;
  dialogueView.hidden = true;

  closeMenu();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showNpcIndex() {
  const names = [...npcGroups.keys()].sort((a, b) => a.localeCompare(b));

  npcList.innerHTML = names.map(name => {
    const group = npcGroups.get(name) || [];
    const segmentCount = new Set(group.map(entry => entry.segment).filter(Boolean)).size;

    return `
      <button class="npc-item" data-npc="${escapeHtml(name)}">
        <span>${escapeHtml(name)}</span>
        <small>${group.length} sections · ${segmentCount} segments</small>
      </button>
    `;
  }).join('');

  npcList.querySelectorAll('[data-npc]').forEach(button => {
    button.addEventListener('click', () => showDialogue(button.dataset.npc));
  });

  searchView.hidden = true;
  categoryView.hidden = true;
  npcView.hidden = false;
  dialogueView.hidden = true;

  closeMenu();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showDialogue(npcName) {
  const group = npcGroups.get(npcName) || [];

  dialogueTitle.textContent = npcName;
  dialogueResults.innerHTML = group.length
    ? group.map(renderEntry).join('')
    : '<div class="empty">No dialogue found.</div>';

  searchView.hidden = true;
  categoryView.hidden = true;
  npcView.hidden = true;
  dialogueView.hidden = false;

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openMenu() {
  menu.classList.add('open');
  menuOverlay.classList.add('open');
}

function closeMenu() {
  menu.classList.remove('open');
  menuOverlay.classList.remove('open');
}

function cleanBodyText(value) {
  return String(value || '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
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
    buildIndexes();
    renderCategoryMenu();
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

document.addEventListener('click', async event => {
  const copyButton = event.target.closest('.copy-btn');

  if (copyButton) {
    event.stopPropagation();

    const card = copyButton.closest('.entry');
    if (!card) return;

    const mode = card.dataset.mode || 'ids';
    const text =
      mode === 'clean'
        ? card.dataset.copyClean
        : card.dataset.copyIds;

    try {
      await navigator.clipboard.writeText(decodeHtml(text));
      copyButton.textContent = 'Copied';

      setTimeout(() => {
        copyButton.textContent = 'Copy';
      }, 900);
    } catch {
      copyButton.textContent = 'Failed';

      setTimeout(() => {
        copyButton.textContent = 'Copy';
      }, 900);
    }

    return;
  }

  const card = event.target.closest('.entry');

  if (!card) return;

  const currentMode = card.dataset.mode || 'ids';
  card.dataset.mode = currentMode === 'ids' ? 'clean' : 'ids';
});

function decodeHtml(value) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

menuBtn.addEventListener('click', openMenu);
closeMenuBtn.addEventListener('click', closeMenu);
menuOverlay.addEventListener('click', closeMenu);

homeBtn.addEventListener('click', showHome);
npcIndexBtn.addEventListener('click', showNpcIndex);

backFromCategoryBtn.addEventListener('click', showHome);
backFromNpcBtn.addEventListener('click', showHome);
backFromDialogueBtn.addEventListener('click', showNpcIndex);

loadDump();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
