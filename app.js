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

const EN_SOURCE = './pc-engus-er-1.16.txt';
const JP_SOURCE = './pc-jpnjp-er-1.16.txt';

let entries = [];
let categories = new Map();
let npcGroups = new Map();
let activeLanguage = 'en';

const EXCLUDED_SECTIONS = new Set([
  'GemEffect.fmg',
  'MagicInfo.fmg',
  'MagicName.fmg',
  'TextEmbedImageName_win64.fmg'
]);

const SECTION_CATEGORY = {
  'AccessoryInfo.fmg': 'Talismans',
  'AccessoryName.fmg': 'Talismans',

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
  'NpcName_dlc01.fmg': 'NPCs',

  'PlaceName.fmg': 'Locations',

  'ProtectorInfo.fmg': 'Armor',
  'ProtectorName.fmg': 'Armor',

  'TalkMsg.fmg': 'Dialogues',
  'TalkMsg_dlc01.fmg': 'Dialogues',

  'TutorialTitle.fmg': 'Tutorials',

  'WeaponEffect.fmg': 'Weapon Effects',
  'WeaponInfo.fmg': 'Arrow/Bolt Types',
  'WeaponName.fmg': 'Weapons'
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
  'Multiplayer Prompts',
  'Japanese-Exclusive'
];

function parseXmlDump(rawText) {
  const normalized = String(rawText || '')
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2028/g, '\n');

  const sections = new Map();

  const sectionRegex = /<filename>\s*([^<]+?)\s*<\/filename>[\s\S]*?<entries>\s*([\s\S]*?)\s*<\/entries>/g;
  const textRegex = /<text\s+id="([^"]+)"\s*>([\s\S]*?)<\/text>/g;

  let sectionMatch;

  while ((sectionMatch = sectionRegex.exec(normalized))) {
    const sectionName = sectionMatch[1].trim();
    const sectionBody = sectionMatch[2];

    if (EXCLUDED_SECTIONS.has(sectionName)) continue;

    if (!sections.has(sectionName)) {
      sections.set(sectionName, new Map());
    }

    const sectionMap = sections.get(sectionName);
    let textMatch;

    while ((textMatch = textRegex.exec(sectionBody))) {
      const id = textMatch[1].trim();
      const value = cleanBodyText(decodeEntities(textMatch[2]));

      if (!id || !value || value === '%null%') continue;

      sectionMap.set(id, value);
    }
  }

  return sections;
}

function buildEntriesFromDumps(enSections, jpSections) {
  const built = [];

  built.push(...mergeNameInfoSections({
    category: 'Talismans',
    nameSection: 'AccessoryName.fmg',
    infoSections: ['AccessoryInfo.fmg'],
    enSections,
    jpSections
  }));

  built.push(...mergeNameInfoSections({
    category: 'Ashes of War (Item)',
    nameSection: 'GemName.fmg',
    infoSections: ['GemInfo.fmg'],
    enSections,
    jpSections
  }));

  built.push(...mergeNameInfoSections({
    category: 'Armor',
    nameSection: 'ProtectorName.fmg',
    infoSections: ['ProtectorInfo.fmg'],
    enSections,
    jpSections,
    separator: true
  }));

  built.push(...mergeItems(enSections, jpSections));

  built.push(...parseTalkMsgEntries({
    talkSection: 'TalkMsg.fmg',
    npcNameSection: 'NpcName.fmg',
    enSections,
    jpSections,
    isDlc: false
  }));

  built.push(...parseTalkMsgEntries({
    talkSection: 'TalkMsg_dlc01.fmg',
    npcNameSection: 'NpcName_dlc01.fmg',
    enSections,
    jpSections,
    isDlc: true
  }));

  built.push(...collectStandaloneSections(enSections, jpSections));

  return built
    .filter(entry =>
      entry.id &&
      (
        entry.nameEn ||
        entry.nameJp ||
        entry.textEn ||
        entry.textJp
      )
    )
    .map(markJapaneseExclusive);
}

function markJapaneseExclusive(entry) {
  const hasEnglish = Boolean(entry.nameEn || entry.textEn);
  const hasJapanese = Boolean(entry.nameJp || entry.textJp);

  if (!hasEnglish && hasJapanese) {
    return {
      ...entry,
      originalCategory: entry.category,
      category: 'Japanese-Exclusive'
    };
  }

  return entry;
}

function mergeNameInfoSections({
  category,
  nameSection,
  infoSections,
  enSections,
  jpSections,
  separator = false
}) {
  const ids = collectIds(enSections, jpSections, [nameSection, ...infoSections]);

  return ids.map(id => {
    const nameEn = getValue(enSections, nameSection, id);
    const nameJp = getValue(jpSections, nameSection, id);

    const textEnParts = infoSections
      .map(section => getValue(enSections, section, id))
      .filter(Boolean);

    const textJpParts = infoSections
      .map(section => getValue(jpSections, section, id))
      .filter(Boolean);

    return {
      section: [nameSection, ...infoSections].join(' + '),
      category,
      id,
      nameEn,
      nameJp,
      textEn: textEnParts.join(separator ? '\n---\n' : '\n\n'),
      textJp: textJpParts.join(separator ? '\n---\n' : '\n\n'),
      type: 'merged'
    };
  });
}

function mergeItems(enSections, jpSections) {
  const sections = ['GoodsName.fmg', 'GoodsInfo.fmg', 'GoodsInfo2.fmg'];
  const ids = collectIds(enSections, jpSections, sections);

  return ids.map(id => {
    const nameEn = getValue(enSections, 'GoodsName.fmg', id);
    const nameJp = getValue(jpSections, 'GoodsName.fmg', id);

    const enParts = [];
    const jpParts = [];

    const enInfo = getValue(enSections, 'GoodsInfo.fmg', id);
    const jpInfo = getValue(jpSections, 'GoodsInfo.fmg', id);

    const enInfo2 = getValue(enSections, 'GoodsInfo2.fmg', id);
    const jpInfo2 = getValue(jpSections, 'GoodsInfo2.fmg', id);

    if (enInfo) enParts.push(enInfo);
    if (jpInfo) jpParts.push(jpInfo);

    if (enInfo2) enParts.push(enInfo2);
    if (jpInfo2) jpParts.push(jpInfo2);

    return {
      section: 'GoodsName.fmg + GoodsInfo.fmg + GoodsInfo2.fmg',
      category: 'Items',
      id,
      nameEn,
      nameJp,
      textEn: enParts.join('\n---\n'),
      textJp: jpParts.join('\n---\n'),
      type: 'merged'
    };
  });
}

function parseTalkMsgEntries({
  talkSection,
  npcNameSection,
  enSections,
  jpSections,
  isDlc = false
}) {
  const enTalk = enSections.get(talkSection) || new Map();
  const jpTalk = jpSections.get(talkSection) || new Map();

  const npcNamesEn = buildNpcNameLookup(enSections.get(npcNameSection) || new Map());
  const npcNamesJp = buildNpcNameLookup(jpSections.get(npcNameSection) || new Map());

  const ids = [...new Set([...enTalk.keys(), ...jpTalk.keys()])]
    .filter(id => /^\d+$/.test(id))
    .sort((a, b) => Number(a) - Number(b));

  const grouped = new Map();

  for (const id of ids) {
    const enText = enTalk.get(id) || '';
    const jpText = jpTalk.get(id) || '';

    if (!enText && !jpText) continue;

    const info = getTalkInfo(id);
    const nameEn =
      lookupNpcName(npcNamesEn, info.npcId) ||
      `Unknown ${isDlc ? 'DLC ' : ''}${info.npcId}`;

    const nameJp =
      lookupNpcName(npcNamesJp, info.npcId) ||
      nameEn;

    const key = `${talkSection}|${info.npcId}|${info.section}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        section: talkSection,
        category: 'Dialogues',
        id: `${talkSection}-${info.npcId}-${info.section.replace(/\s+/g, '-')}`,
        segment: info.npcId,
        npcId: info.npcId,
        npcKey: `${talkSection}|${info.npcId}|${nameEn}`,
        nameEn,
        nameJp,
        talkSection: info.section,
        linesEn: [],
        linesJp: [],
        type: 'talk'
      });
    }

    const group = grouped.get(key);

    if (enText) group.linesEn.push(`[${id}] ${enText}`);
    if (jpText) group.linesJp.push(`[${id}] ${jpText}`);
  }

  return [...grouped.values()].map(group => ({
    section: group.section,
    category: group.category,
    id: group.id,
    segment: group.segment,
    npcId: group.npcId,
    npcKey: group.npcKey,
    nameEn: group.nameEn,
    nameJp: group.nameJp,
    talkSection: group.talkSection,
    textEn: group.linesEn.join('\n'),
    textJp: group.linesJp.join('\n'),
    type: group.type
  }));
}

function buildNpcNameLookup(sectionMap) {
  const lookup = new Map();

  for (const [id, name] of sectionMap.entries()) {
    if (!id || !name) continue;

    const raw = String(id);
    const padded = raw.padStart(4, '0');
    const unpadded = String(Number(raw));

    lookup.set(raw, name);
    lookup.set(padded, name);
    lookup.set(unpadded, name);
  }

  return lookup;
}

function lookupNpcName(lookup, npcId) {
  if (!npcId) return '';

  const raw = String(npcId);
  const padded = raw.padStart(4, '0');
  const unpadded = String(Number(raw));

  return lookup.get(raw) ||
    lookup.get(padded) ||
    lookup.get(unpadded) ||
    '';
}

function getTalkInfo(id) {
  const value = String(id);

  if (value.length >= 8) {
    return {
      npcId: value.slice(0, 4),
      section: `Section ${value.slice(4, 6)}`
    };
  }

  return {
    npcId: value.padStart(4, '0'),
    section: 'Section 00'
  };
}

function collectStandaloneSections(enSections, jpSections) {
  const alreadyMerged = new Set([
    'AccessoryName.fmg',
    'AccessoryInfo.fmg',

    'GemName.fmg',
    'GemInfo.fmg',

    'GoodsName.fmg',
    'GoodsInfo.fmg',
    'GoodsInfo2.fmg',

    'ProtectorName.fmg',
    'ProtectorInfo.fmg',

    'TalkMsg.fmg',
    'TalkMsg_dlc01.fmg'
  ]);

  const allSections = [...new Set([
    ...enSections.keys(),
    ...jpSections.keys()
  ])];

  const collected = [];

  for (const section of allSections) {
    if (alreadyMerged.has(section)) continue;
    if (EXCLUDED_SECTIONS.has(section)) continue;

    const category = SECTION_CATEGORY[section] || section;
    const ids = collectIds(enSections, jpSections, [section]);

    for (const id of ids) {
      const enText = getValue(enSections, section, id);
      const jpText = getValue(jpSections, section, id);

      collected.push({
        section,
        category,
        id,
        nameEn: shouldUseTextAsName(section) ? enText : '',
        nameJp: shouldUseTextAsName(section) ? jpText : '',
        textEn: shouldUseTextAsName(section) ? '' : enText,
        textJp: shouldUseTextAsName(section) ? '' : jpText,
        type: 'single'
      });
    }
  }

  return collected;
}

function shouldUseTextAsName(section) {
  return [
    'ArtsName.fmg',
    'LoadingTitle.fmg',
    'NpcName.fmg',
    'NpcName_dlc01.fmg',
    'PlaceName.fmg',
    'TutorialTitle.fmg',
    'WeaponName.fmg'
  ].includes(section);
}

function collectIds(enSections, jpSections, sectionNames) {
  const ids = new Set();

  for (const section of sectionNames) {
    const enMap = enSections.get(section);
    const jpMap = jpSections.get(section);

    if (enMap) {
      for (const id of enMap.keys()) ids.add(id);
    }

    if (jpMap) {
      for (const id of jpMap.keys()) ids.add(id);
    }
  }

  return [...ids].sort((a, b) => Number(a) - Number(b));
}

function getValue(sectionMap, section, id) {
  return sectionMap.get(section)?.get(id) || '';
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
      const npcKey = entry.npcKey || `${entry.section}|${entry.segment}|${entry.nameEn}`;

      if (!npcGroups.has(npcKey)) {
        npcGroups.set(npcKey, []);
      }

      npcGroups.get(npcKey).push(entry);
    }
  }
}

function renderCategoryMenu() {
  const orderedNames = CATEGORY_ORDER.filter(name => categories.has(name));
  const extraNames = [...categories.keys()]
    .filter(name => !CATEGORY_ORDER.includes(name))
    .sort((a, b) => a.localeCompare(b));

  const names = [...orderedNames, ...extraNames];

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
    String(e.originalCategory || '').toLowerCase().includes(q) ||
    e.section.toLowerCase().includes(q) ||
    e.id.includes(q) ||
    getName(e, 'en').toLowerCase().includes(q) ||
    getName(e, 'jp').toLowerCase().includes(q) ||
    getText(e, 'en').toLowerCase().includes(q) ||
    getText(e, 'jp').toLowerCase().includes(q) ||
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
  const lang = activeLanguage;
  const metaParts = [e.category];

  if (e.originalCategory) metaParts.push(e.originalCategory);
  if (e.category !== e.section && e.section) metaParts.push(e.section);
  if (e.segment) metaParts.push(`NPC ${e.segment}`);
  if (e.talkSection) metaParts.push(e.talkSection);

  const name = getName(e, lang);
  const text = getText(e, lang);

  const hasJapanese = Boolean(getName(e, 'jp') || getText(e, 'jp'));
  const languageButton = hasJapanese
    ? `<button class="lang-btn" type="button" data-language-toggle>${lang === 'en' ? 'JP' : 'EN'}</button>`
    : '';

  return `
    <article
      class="entry"
      id="entry-${escapeHtml(e.section)}-${escapeHtml(e.id)}"
      data-mode="ids"
      data-lang="${escapeHtml(lang)}"

      data-name-en="${escapeAttribute(getName(e, 'en'))}"
      data-name-jp="${escapeAttribute(getName(e, 'jp'))}"

      data-text-ids-en="${escapeAttribute(formatRawTextWithIds(e, 'en'))}"
      data-text-ids-jp="${escapeAttribute(formatRawTextWithIds(e, 'jp'))}"
      data-text-clean-en="${escapeAttribute(formatRawTextClean(e, 'en'))}"
      data-text-clean-jp="${escapeAttribute(formatRawTextClean(e, 'jp'))}"

      data-copy-ids-en="${escapeAttribute(getCopyTextWithIds(e, 'en'))}"
      data-copy-ids-jp="${escapeAttribute(getCopyTextWithIds(e, 'jp'))}"
      data-copy-clean-en="${escapeAttribute(getCopyTextClean(e, 'en'))}"
      data-copy-clean-jp="${escapeAttribute(getCopyTextClean(e, 'jp'))}"
    >
      <button class="copy-btn" type="button">Copy</button>
      ${languageButton}

      <div class="entry-section">${escapeHtml(metaParts.join(' · '))}</div>

      <div class="entry-header">
        ${
          name
            ? e.type === 'talk'
              ? `
                <button
                  class="entry-name entry-name-link"
                  data-dialogue-key="${escapeAttribute(e.npcKey || `${e.section}|${e.segment}|${e.nameEn}`)}"
                  type="button"
                >
                  <span class="entry-name-content">${escapeHtml(name)}</span>
                </button>
              `
              : `<div class="entry-name entry-name-content">${escapeHtml(name)}</div>`
            : ''
        }

        ${
          e.type !== 'talk'
            ? `<div class="entry-id">[${escapeHtml(e.id)}]</div>`
            : ''
        }
      </div>

      ${
        text
          ? `
            <div class="entry-text entry-text-ids">${formatEntryText(formatRawTextWithIds(e, lang))}</div>
            <div class="entry-text entry-text-clean">${formatEntryText(formatRawTextClean(e, lang))}</div>
          `
          : ''
      }
    </article>
  `;
}

function getName(entry, lang) {
  return lang === 'jp'
    ? entry.nameJp || entry.nameEn || ''
    : entry.nameEn || entry.nameJp || '';
}

function getText(entry, lang) {
  return lang === 'jp'
    ? entry.textJp || entry.textEn || ''
    : entry.textEn || entry.textJp || '';
}

function formatRawTextWithIds(entry, lang) {
  return getText(entry, lang) || '';
}

function formatRawTextClean(entry, lang) {
  return getCleanText(getText(entry, lang));
}

function formatEntryText(text) {
  return escapeHtml(text)
    .replace(/\n---\n/g, '<hr>')
    .replace(/\n/g, '<br>');
}

function getCopyTextWithIds(entry, lang) {
  if (entry.type === 'talk') {
    return getText(entry, lang);
  }

  const lines = [];
  const name = getName(entry, lang);
  const text = getText(entry, lang);

  if (name) lines.push(`${name} [${entry.id}]`);
  else lines.push(`[${entry.id}]`);

  if (text) lines.push(text);

  return lines.join('\n').trim();
}

function getCopyTextClean(entry, lang) {
  if (entry.type === 'talk') {
    return getCleanText(getText(entry, lang));
  }

  const lines = [];
  const name = getName(entry, lang);
  const text = getText(entry, lang);

  if (name) lines.push(name);
  if (text) lines.push(getCleanText(text));

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

function updateCardLanguage(card, lang) {
  card.dataset.lang = lang;

  const suffix = lang === 'jp' ? 'Jp' : 'En';

  const name = card.dataset[`name${suffix}`] || '';
  const textIds = card.dataset[`textIds${suffix}`] || '';
  const textClean = card.dataset[`textClean${suffix}`] || '';

  const nameEl = card.querySelector('.entry-name-content');
  const idsEl = card.querySelector('.entry-text-ids');
  const cleanEl = card.querySelector('.entry-text-clean');
  const langBtn = card.querySelector('[data-language-toggle]');

  if (nameEl) nameEl.innerHTML = escapeHtml(decodeHtml(name));
  if (idsEl) idsEl.innerHTML = formatEntryText(decodeHtml(textIds));
  if (cleanEl) cleanEl.innerHTML = formatEntryText(decodeHtml(textClean));
  if (langBtn) langBtn.textContent = lang === 'en' ? 'JP' : 'EN';
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
  const groups = [...npcGroups.entries()].sort((a, b) => {
    const aName = getName(a[1][0], activeLanguage);
    const bName = getName(b[1][0], activeLanguage);
    return aName.localeCompare(bName);
  });

  npcList.innerHTML = groups.map(([key, group]) => {
    const first = group[0];
    const name = getName(first, activeLanguage);
    const segmentCount = new Set(group.map(entry => entry.segment).filter(Boolean)).size;

    return `
      <button class="npc-item" data-npc-key="${escapeAttribute(key)}">
        <span>${escapeHtml(name)}</span>
        <small>${group.length} sections · ${segmentCount} segments</small>
      </button>
    `;
  }).join('');

  npcList.querySelectorAll('[data-npc-key]').forEach(button => {
    button.addEventListener('click', () => showDialogue(button.dataset.npcKey));
  });

  searchView.hidden = true;
  categoryView.hidden = true;
  npcView.hidden = false;
  dialogueView.hidden = true;

  closeMenu();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showDialogue(npcKey) {
  const group = npcGroups.get(npcKey) || [];
  const first = group[0];

  dialogueTitle.textContent = first ? getName(first, activeLanguage) : 'Dialogues';

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

function decodeEntities(value) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
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

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

async function loadDump() {
  results.innerHTML = '<div class="empty">Loading language files…</div>';

  try {
    const [enResponse, jpResponse] = await Promise.all([
      fetch(EN_SOURCE),
      fetch(JP_SOURCE)
    ]);

    if (!enResponse.ok) {
      throw new Error(`Could not load ${EN_SOURCE}`);
    }

    if (!jpResponse.ok) {
      throw new Error(`Could not load ${JP_SOURCE}`);
    }

    const [enText, jpText] = await Promise.all([
      enResponse.text(),
      jpResponse.text()
    ]);

    const enSections = parseXmlDump(enText);
    const jpSections = parseXmlDump(jpText);

    entries = buildEntriesFromDumps(enSections, jpSections);

    buildIndexes();
    renderCategoryMenu();
    render();
  } catch (error) {
    console.error(error);

    count.textContent = '0 entries';
    results.innerHTML = `
      <div class="empty">
        Could not load the language source files.<br>
        Make sure these files are in the same folder as <code>index.html</code>:<br>
        <code>pc-engus-er-1.16.txt</code><br>
        <code>pc-jpnjp-er-1.16.txt</code>
      </div>
    `;
  }
}

search.addEventListener('input', render);

document.addEventListener('click', async event => {
  const languageButton = event.target.closest('[data-language-toggle]');

  if (languageButton) {
    event.stopPropagation();

    const card = languageButton.closest('.entry');
    if (!card) return;

    const nextLang = card.dataset.lang === 'en' ? 'jp' : 'en';
    updateCardLanguage(card, nextLang);

    return;
  }

  const dialogueNameButton = event.target.closest('[data-dialogue-key]');

  if (dialogueNameButton) {
    event.stopPropagation();
    showDialogue(decodeHtml(dialogueNameButton.dataset.dialogueKey));
    return;
  }

  const copyButton = event.target.closest('.copy-btn');

  if (copyButton) {
    event.stopPropagation();

    const card = copyButton.closest('.entry');
    if (!card) return;

    const mode = card.dataset.mode || 'ids';
    const lang = card.dataset.lang || 'en';
    const suffix = lang === 'jp' ? 'Jp' : 'En';

    const text =
      mode === 'clean'
        ? card.dataset[`copyClean${suffix}`]
        : card.dataset[`copyIds${suffix}`];

    try {
      await navigator.clipboard.writeText(decodeHtml(text || ''));
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
