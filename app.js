const search = document.querySelector('#search');
const results = document.querySelector('#results');
const count = document.querySelector('#count');
const searchFilters = document.querySelector('#searchFilters');

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

const PAGE_SIZE = 80;

let entries = [];
let categories = new Map();
let npcGroups = new Map();
let activeLanguage = 'en';
let activeSearchFilter = 'All';
let dialogueDisplayMode = 'cards';
let currentDialogueKey = '';

let currentRenderTarget = results;
let currentVisibleEntries = [];
let currentSearchResults = [];
let renderedEntryCount = 0;
let isAppending = false;

const EXCLUDED_SECTION_CORES = new Set([
  'GemEffect',
  'MagicInfo',
  'MagicName',
  'MagicCaption',
  'TextEmbedImageName_win64',
  'ToS_win64',
  'MovieSubtitle'
]);


const CATEGORY_SEPARATOR_BEFORE = new Set([
  'NPCs',
  'Talismans',
  'Ashes of War',
  'Tutorials',
  'Messages'
]);


const CATEGORY_ORDER = [
  'Japanese-Exclusive',
  'NPCs',
  'Dialogues',
  'Locations',
  'Talismans',
  'Weapons',
  'Arrow/Bolt Types',
  'Armor',
  'Items',
  'Ashes of War',
  'Ashes of War (Item)',
  'Tutorials',
  'Loading Screen Tutorials',
  'Messages',
  'Interactions',
  'Event Texts',
  'UI Messages',
  'UI Prompts',
  'Item Prompts',
  'Multiplayer Prompts'
];

const MERGE_RULES = [
  {
  category: 'Talismans',
  nameCore: 'AccessoryName',
  infoCores: ['AccessoryInfo', 'AccessoryCaption'],
  separator: true
},
  {
    category: 'Ashes of War (Item)',
    nameCore: 'GemName',
    infoCores: ['GemInfo']
  },
  {
    category: 'Loading Screen Tutorials',
    nameCore: 'LoadingTitle',
    infoCores: ['LoadingText']
  },
  {
    category: 'Armor',
    nameCore: 'ProtectorName',
    infoCores: ['ProtectorInfo', 'ProtectorCaption'],
    separator: true
  },
  {
    category: 'Weapons',
    nameCore: 'WeaponName',
    infoCores: ['WeaponEffect', 'WeaponCaption'],
    separator: true
  },
  {
    category: 'Items',
    nameCore: 'GoodsName',
    infoCores: ['GoodsInfo', 'GoodsInfo2', 'GoodsCaption'],
    separator: true
  }
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
    const core = getSectionCore(sectionName);

    if (sectionName.includes('_dlc02')) continue;
    if (EXCLUDED_SECTION_CORES.has(core)) continue;

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
  const usedSections = new Set();

  built.push(...buildMergedEntries(enSections, jpSections, usedSections));
  built.push(...buildDialogueEntries(enSections, jpSections, usedSections));
  built.push(...collectStandaloneSections(enSections, jpSections, usedSections));

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

function buildMergedEntries(enSections, jpSections, usedSections) {
  const allSections = getAllSections(enSections, jpSections);
  const built = [];

  for (const rule of MERGE_RULES) {
    const nameSections = allSections.filter(section =>
      getSectionCore(section) === rule.nameCore
    );

    for (const nameSection of nameSections) {
      const suffix = getSectionSuffix(nameSection);
      const infoSections = rule.infoCores
        .map(core => findSectionByCoreAndSuffix(allSections, core, suffix))
        .filter(Boolean);

      if (!infoSections.length) continue;

      built.push(...mergeNameInfoSections({
        category: rule.category,
        nameSection,
        infoSections,
        enSections,
        jpSections,
        separator: Boolean(rule.separator),
        isDlc: Boolean(suffix)
      }));

      usedSections.add(nameSection);
      infoSections.forEach(section => usedSections.add(section));
    }
  }

  return built;
}

function mergeNameInfoSections({
  category,
  nameSection,
  infoSections,
  enSections,
  jpSections,
  separator = false,
  isDlc = false
}) {
  const sections = [nameSection, ...infoSections];
  const ids = collectIds(enSections, jpSections, sections);

  return ids.map(id => {
    const nameEn = getValue(enSections, nameSection, id);
    const nameJp = getValue(jpSections, nameSection, id);

    const textEnParts = infoSections
  .map(section => getValue(enSections, section, id))
  .filter(Boolean);

const textJpParts = infoSections
  .map(section => getValue(jpSections, section, id))
  .filter(Boolean);

const textEn = separator && textEnParts.length
  ? `---\n${textEnParts.join('\n---\n')}`
  : textEnParts.join('\n\n');

const textJp = separator && textJpParts.length
  ? `---\n${textJpParts.join('\n---\n')}`
  : textJpParts.join('\n\n');

    return {
      section: sections.join(' + '),
      category,
      id,
      nameEn,
      nameJp,
      textEn,
      textJp,
      isDlc,
      type: 'merged'
    };
  });
}

function buildDialogueEntries(enSections, jpSections, usedSections) {
  const allSections = getAllSections(enSections, jpSections);
  const talkSections = allSections.filter(section =>
    getSectionCore(section) === 'TalkMsg'
  );

  const built = [];

  for (const talkSection of talkSections) {
    const suffix = getSectionSuffix(talkSection);
    const npcNameSection =
      findSectionByCoreAndSuffix(allSections, 'NpcName', suffix) ||
      findSectionByCoreAndSuffix(allSections, 'NpcName', '');

    built.push(...parseTalkMsgEntries({
      talkSection,
      npcNameSection,
      enSections,
      jpSections,
      isDlc: Boolean(suffix)
    }));

    usedSections.add(talkSection);
  }

  return built;
}

function parseTalkMsgEntries({
  talkSection,
  npcNameSection,
  enSections,
  jpSections,
  isDlc = false
}) {
  const enTalk = normalizeIdMap(enSections.get(talkSection) || new Map());
  const jpTalk = normalizeIdMap(jpSections.get(talkSection) || new Map());

  const npcNameIsDlc = Boolean(npcNameSection && npcNameSection.includes('_dlc'));

  const npcNamesEn = buildNpcNameLookup(
    npcNameSection ? enSections.get(npcNameSection) || new Map() : new Map(),
    npcNameIsDlc
  );

  const npcNamesJp = buildNpcNameLookup(
    npcNameSection ? jpSections.get(npcNameSection) || new Map() : new Map(),
    npcNameIsDlc
  );

  const ids = collectRawIds(enTalk, jpTalk)
    .filter(id => /^\d+$/.test(id))
    .sort(sortIds);

  const grouped = new Map();

  for (const id of ids) {
    const enText = enTalk.get(id) || '';
    const jpText = jpTalk.get(id) || '';

    if (!enText && !jpText) continue;

    const info = getTalkInfo(id);

    const nameEn =
      lookupNpcName(npcNamesEn, info.npcId) ||
      `Unknown ${info.npcId}`;

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
        isDlc,
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
    isDlc: group.isDlc,
    type: group.type
  }));
}

function buildNpcNameLookup(sectionMap, isDlc = false) {
  const lookup = new Map();

  for (const [id, name] of sectionMap.entries()) {
    if (!id || !name) continue;

    const raw = String(id);
    const padded = raw.padStart(4, '0');
    const unpadded = String(Number(raw));

    lookup.set(raw, name);
    lookup.set(padded, name);
    lookup.set(unpadded, name);

    if (/^\d{6}$/.test(raw)) {
      if (isDlc) {
        // DLC format:
        // 123456 -> 1345
        lookup.set(
          raw.charAt(0) + raw.slice(2, 5),
          name
        );
      } else {
        // Base-game format:
        // 123456 -> 2345
        lookup.set(
          raw.slice(1, 5),
          name
        );
      }
    }
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

function collectStandaloneSections(enSections, jpSections, usedSections) {
  const allSections = getAllSections(enSections, jpSections);
  const collected = [];

  for (const section of allSections) {
    if (usedSections.has(section)) continue;

    const core = getSectionCore(section);
    if (EXCLUDED_SECTION_CORES.has(core)) continue;

    const category = getCategoryForSection(section);
    const ids = collectIds(enSections, jpSections, [section]);
    const isDlc = Boolean(getSectionSuffix(section));

    for (const id of ids) {
      const enText = getValue(enSections, section, id);
      const jpText = getValue(jpSections, section, id);
      const asName = shouldUseTextAsName(section);

      collected.push({
        section,
        category,
        id,
        nameEn: asName ? enText : '',
        nameJp: asName ? jpText : '',
        textEn: asName ? '' : enText,
        textJp: asName ? '' : jpText,
        isDlc,
        type: 'single'
      });
    }
  }

  return collected;
}

function shouldUseTextAsName(section) {
  const core = getSectionCore(section);

  return (
    core.endsWith('Name') ||
    core.endsWith('Title') ||
    core === 'NpcName' ||
    core === 'PlaceName' ||
    core === 'LoadingTitle'
  );
}

function markJapaneseExclusive(entry) {
  const hasEnglish = hasDirectLanguage(entry, 'en');
  const hasJapanese = hasDirectLanguage(entry, 'jp');

  if (!hasEnglish && hasJapanese) {
    return {
      ...entry,
      originalCategory: entry.category,
      category: 'Japanese-Exclusive'
    };
  }

  return entry;
}

function getCategoryForSection(section) {
  const core = getSectionCore(section);

  if (core === 'AccessoryName' || core === 'AccessoryInfo') return 'Talismans';
  if (core === 'TalkMsg') return 'Dialogues';
  if (core === 'NpcName') return 'NPCs';

  if (core.startsWith('GR_')) return 'UI Prompts';

  if (core.includes('GoodsDialog')) return 'Item Prompts';
  if (core.includes('Goods')) return 'Items';

  if (core.includes('WeaponName')) return 'Weapons';
  if (core.includes('WeaponInfo')) return 'Arrow/Bolt Types';
  if (core.includes('WeaponEffect')) return 'Weapon Effects';

  if (core.includes('Protector')) return 'Armor';
  if (core.includes('Gem')) return 'Ashes of War (Item)';
  if (core.includes('Arts')) return 'Ashes of War';

  if (core.includes('PlaceName')) return 'Locations';
  if (core.includes('BloodMsg')) return 'Messages';
  if (core.includes('ActionButton')) return 'Interactions';
  if (core.includes('EventTextForMap')) return 'Event Texts';
  if (core.includes('EventTextForTalk')) return 'UI Messages';
  if (core.includes('Tutorial')) return 'Tutorials';
  if (core.includes('LoadingTitle')) return 'Loading Screen Tutorials';
  if (core.includes('Network')) return 'Multiplayer Prompts';

  return cleanSectionName(section);
}

function getAllSections(enSections, jpSections) {
  return [...new Set([
    ...enSections.keys(),
    ...jpSections.keys()
  ])].sort((a, b) => a.localeCompare(b));
}

function getSectionCore(section) {
  return String(section || '')
    .replace(/\.fmg$/i, '')
    .replace(/_dlc\d+$/i, '');
}

function getSectionSuffix(section) {
  const match = String(section || '').match(/(_dlc\d+)\.fmg$/i);
  return match ? match[1] : '';
}

function findSectionByCoreAndSuffix(allSections, core, suffix) {
  return allSections.find(section =>
    getSectionCore(section) === core &&
    getSectionSuffix(section) === suffix
  ) || '';
}

function cleanSectionName(section) {
  return String(section || '')
    .replace(/\.fmg$/i, '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\bdlc(\d+)\b/i, 'DLC $1')
    .trim();
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

  return [...ids].sort(sortIds);
}

function collectRawIds(...maps) {
  const ids = new Set();

  for (const map of maps) {
    if (!map) continue;
    for (const id of map.keys()) ids.add(id);
  }

  return [...ids];
}



function normalizeId(id) {
  return String(Number(id));
}

function normalizeIdMap(map) {
  const normalized = new Map();

  for (const [id, value] of map.entries()) {
    normalized.set(normalizeId(id), value);
  }

  return normalized;
}



function sortIds(a, b) {
  const numA = Number(a);
  const numB = Number(b);

  if (Number.isFinite(numA) && Number.isFinite(numB)) {
    return numA - numB;
  }

  return String(a).localeCompare(String(b));
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
  ${CATEGORY_SEPARATOR_BEFORE.has(name) ? '<div class="menu-separator"></div>' : ''}
  <button class="menu-item" data-category="${escapeHtml(name)}">
    ${escapeHtml(name)}
  </button>
`).join('');

  categoryList.querySelectorAll('[data-category]').forEach(button => {
    button.addEventListener('click', () => showCategory(button.dataset.category));
  });
}

function matchesSearchFilter(entry) {
  if (activeSearchFilter === 'All') return true;

  if (activeSearchFilter === 'DLC') {
    return Boolean(entry.isDlc);
  }

  if (activeSearchFilter === 'Japanese-Exclusive') {
    return entry.category === 'Japanese-Exclusive';
  }

  return entry.category === activeSearchFilter;
}

function render() {
  const q = search.value.trim().toLowerCase();

  const visible = entries.filter(e =>
    matchesSearchFilter(e) &&
    (
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
    )
  );
  
  currentSearchResults = visible;

  count.textContent =
    `${visible.length} ${visible.length === 1 ? 'entry' : 'entries'}`;

  renderEntryList({
    target: results,
    items: visible,
    emptyText: 'No entries found.'
  });
}

function renderEntryList({ target, items, emptyText }) {
  currentRenderTarget = target;
  currentVisibleEntries = items;
  renderedEntryCount = 0;

  if (!items.length) {
    target.innerHTML = `<div class="empty">${emptyText}</div>`;
    return;
  }

  target.innerHTML = '';
  appendNextEntries();
}

function appendNextEntries() {
  if (isAppending) return;
  if (!currentRenderTarget) return;
  if (renderedEntryCount >= currentVisibleEntries.length) return;

  isAppending = true;

  const nextItems = currentVisibleEntries.slice(
    renderedEntryCount,
    renderedEntryCount + PAGE_SIZE
  );

  currentRenderTarget.insertAdjacentHTML(
    'beforeend',
    nextItems.map(renderEntry).join('')
  );

  renderedEntryCount += nextItems.length;
  isAppending = false;
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

  const hasEnglish = hasDirectLanguage(e, 'en');
const hasJapanese = hasDirectLanguage(e, 'jp');

  const languageControl =
    hasEnglish && hasJapanese
      ? `<button class="lang-btn" type="button" data-language-toggle>${lang === 'en' ? 'JP' : 'EN'}</button>`
      : !hasEnglish && hasJapanese
        ? `<span class="tag-badge lang-static">JP-only</span>`
        : '';

  const dlcBadge = e.isDlc
    ? `<span class="tag-badge dlc-badge">DLC</span>`
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
      data-copy-code-en="${escapeAttribute(getCopyTextCode(e, 'en'))}"
      data-copy-code-jp="${escapeAttribute(getCopyTextCode(e, 'jp'))}"
    >
      <div class="entry-actions">
        ${dlcBadge}
        ${languageControl}
        <button class="copy-btn" type="button">Copy</button>
      </div>

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
            <div class="entry-text entry-text-code">
            ${formatEntryText(`\`\`\`\n${formatRawTextClean(e, lang)}\n\`\`\``)}
            </div>
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



function hasDirectLanguage(entry, lang) {
  if (lang === 'jp') {
    return Boolean(entry.nameJp || entry.textJp);
  }

  return Boolean(entry.nameEn || entry.textEn);
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

function getCopyTextCode(entry, lang) {
  return `\`\`\`\n${getCopyTextClean(entry, lang)}\n\`\`\``;
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

  renderEntryList({
    target: categoryResults,
    items,
    emptyText: 'No entries found.'
  });

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
  currentDialogueKey = npcKey;

  const group = npcGroups.get(npcKey) || [];
  const first = group[0];

  dialogueTitle.textContent =
    first ? getName(first, activeLanguage) : 'Dialogues';

  const modeBtn = document.querySelector('#dialogueModeBtn');

  if (modeBtn) {
    modeBtn.textContent =
      dialogueDisplayMode === 'cards'
        ? 'Full Dialogue'
        : 'Cards';

    modeBtn.onclick = event => {
      event.stopPropagation();

      dialogueDisplayMode =
        dialogueDisplayMode === 'cards'
          ? 'full'
          : 'cards';

      showDialogue(currentDialogueKey);
    };
  }

  if (dialogueDisplayMode === 'full') {
    dialogueResults.innerHTML = group.length
      ? renderFullDialogue(group)
      : '<div class="empty">No dialogue found.</div>';
  } else {
    renderEntryList({
      target: dialogueResults,
      items: group,
      emptyText: 'No dialogue found.'
    });
  }

  searchView.hidden = true;
  categoryView.hidden = true;
  npcView.hidden = true;
  dialogueView.hidden = false;

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function renderFullDialogue(group) {
  const lang = activeLanguage;
  const first = group[0];

  const hasEnglish = group.some(entry => hasDirectLanguage(entry, 'en'));
  const hasJapanese = group.some(entry => hasDirectLanguage(entry, 'jp'));

  const languageControl =
    hasEnglish && hasJapanese
      ? `<button class="lang-btn" type="button" data-full-dialogue-language-toggle>${lang === 'en' ? 'JP' : 'EN'}</button>`
      : !hasEnglish && hasJapanese
        ? `<span class="tag-badge lang-static">JP-only</span>`
        : '';

  const isDlc = group.some(entry => entry.isDlc);

const dlcBadge = isDlc
  ? `<span class="tag-badge dlc-badge">DLC</span>`
  : '';

  const textWithIds = group
    .map(entry => formatRawTextWithIds(entry, lang))
    .filter(Boolean)
    .join('\n');

  const textClean = getCleanText(textWithIds);
  const textCode = `\`\`\`\n${textClean}\n\`\`\``;

  return `
    <article
      class="entry full-dialogue-entry"
      data-mode="ids"
      data-lang="${escapeHtml(lang)}"
      data-copy-ids="${escapeAttribute(textWithIds)}"
      data-copy-clean="${escapeAttribute(textClean)}"
      data-copy-code="${escapeAttribute(textCode)}"
    >
      <div class="entry-actions">
  ${dlcBadge}
  ${languageControl}
  <button class="copy-btn" type="button">Copy</button>
</div>

      <div class="entry-section">
        ${escapeHtml(first ? `${first.category} · ${first.section}` : 'Dialogues')}
      </div>

      <div class="entry-header">
        <div class="entry-name">${escapeHtml(first ? getName(first, lang) : 'Dialogues')}</div>
      </div>

      <div class="entry-text entry-text-ids">${formatEntryText(textWithIds)}</div>
      <div class="entry-text entry-text-clean">${formatEntryText(textClean)}</div>
      <div class="entry-text entry-text-code">${formatEntryText(textCode)}</div>
    </article>
  `;
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

function handleScroll() {
  const distanceFromBottom =
    document.documentElement.scrollHeight -
    window.innerHeight -
    window.scrollY;

  if (distanceFromBottom < 900) {
    appendNextEntries();
  }
}

search.addEventListener('input', render);

searchFilters.addEventListener('click', event => {
  const button = event.target.closest('[data-search-filter]');
  if (!button) return;

  activeSearchFilter = button.dataset.searchFilter;

  searchFilters.querySelectorAll('[data-search-filter]').forEach(filterButton => {
    filterButton.classList.toggle(
      'active',
      filterButton.dataset.searchFilter === activeSearchFilter
    );
  });

  render();
});

copySearchResultsBtn.addEventListener('click', async () => {
  const text = currentSearchResults
    .map(entry =>
      `\`\`\`\n${getCopyTextClean(entry, activeLanguage)}\n\`\`\``
    )
    .filter(Boolean)
    .join('\n\n');

  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);

    copySearchResultsBtn.textContent = 'Copied';

    setTimeout(() => {
      copySearchResultsBtn.textContent = 'Copy all Search Results';
    }, 900);

  } catch {
    copySearchResultsBtn.textContent = 'Failed';

    setTimeout(() => {
      copySearchResultsBtn.textContent = 'Copy all Search Results';
    }, 900);
  }
});

window.addEventListener('scroll', handleScroll, { passive: true });

document.addEventListener('click', async event => {

  const fullDialogueLanguageButton =
    event.target.closest('[data-full-dialogue-language-toggle]');

  if (fullDialogueLanguageButton) {
    event.stopPropagation();

    activeLanguage = activeLanguage === 'en' ? 'jp' : 'en';

    showDialogue(currentDialogueKey);
    return;
  }
  
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

  let text;

  if (card.classList.contains('full-dialogue-entry')) {
    if (mode === 'clean') {
      text = card.dataset.copyClean;
    } else if (mode === 'code') {
      text = card.dataset.copyCode;
    } else {
      text = card.dataset.copyIds;
    }
  } else {
    if (mode === 'clean') {
      text = card.dataset[`copyClean${suffix}`];
    } else if (mode === 'code') {
      text = card.dataset[`copyCode${suffix}`];
    } else {
      text = card.dataset[`copyIds${suffix}`];
    }
  }

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

  if (currentMode === 'ids') {
    card.dataset.mode = 'clean';
  } else if (currentMode === 'clean') {
    card.dataset.mode = 'code';
  } else {
    card.dataset.mode = 'ids';
  }
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
