const search = document.querySelector('#search');
const results = document.querySelector('#results');
const count = document.querySelector('#count');
const searchFilters = document.querySelector('#searchFilters');
const cardControls = document.querySelector('#cardControls');

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

const referenceView = document.querySelector('#referenceView');
const referenceTitle = document.querySelector('#referenceTitle');
const referenceResults = document.querySelector('#referenceResults');
const backFromReferenceBtn = document.querySelector('#backFromReferenceBtn');

const wordIndexBtn = document.querySelector('#wordIndexBtn');
const wordIndexView = document.querySelector('#wordIndexView');
const wordIndexResults = document.querySelector('#wordIndexResults');
const backFromWordIndexBtn = document.querySelector('#backFromWordIndexBtn');
const allWordsBtn = document.querySelector('#allWordsBtn');
const referenceWordsBtn = document.querySelector('#referenceWordsBtn');
const graphBtn = document.querySelector('#graphBtn');
const themeToggleBtn = document.querySelector('#themeToggleBtn');
const graphView = document.querySelector('#graphView');
const graphContainer = document.querySelector('#graphContainer');
const backFromGraphBtn = document.querySelector('#backFromGraphBtn');

let referenceGraph = null;

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
let defaultCardMode = 'ids';
let activeTypeFilter = 'All';
let activeFlagFilter = 'All';
let dialogueDisplayMode = 'cards';
let currentDialogueKey = '';
let references = [];
let entryReferenceMap = new Map();
let npcReferenceRelations = new Map();
let referenceMentionCounts = new Map();
let referenceAliasIndex = new Map();
let validItemReferenceLabels = new Set();
let termReferences = [];
let termReferenceMap = new Map();

let wordFrequency = [];
let currentWordIndexCount = 0;
let activeWordIndexMode = 'all';
let referenceWordFrequency = [];
const WORD_INDEX_PAGE_SIZE = 120;

let currentRenderTarget = results;
let currentVisibleEntries = [];
let currentSearchResults = [];
let renderedEntryCount = 0;
let isAppending = false;
let viewHistory = [];
let currentSearchTokens = [];

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
    .map(refineEntryCategory)
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

function buildWordFrequencyIndex() {
  const counts = new Map();

  for (const entry of entries) {
    const blob = [
      getName(entry, 'en'),
      getText(entry, 'en')
    ].filter(Boolean).join('\n');

    const words = blob
      .toLowerCase()
      .replace(/['’]s\b/g, '')
      .match(/[a-z][a-z'-]*/g) || [];

    for (const word of words) {
      if (!word) continue;

      counts.set(word, (counts.get(word) || 0) + 1);
    }
  }

  wordFrequency = [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.word.localeCompare(b.word);
    });
}

function buildReferenceWordFrequencyIndex() {
  const config =
    typeof WORD_INDEX_REFERENCE_WORDS !== 'undefined'
      ? WORD_INDEX_REFERENCE_WORDS
      : { exclude: [], include: [], aliases: {} };

  const excluded = new Set(
    (config.exclude || []).map(item => normalizeReferenceText(item))
  );

  const aliasMap = config.aliases || {};
  const labels = new Set();

  for (const [npcName, relations] of npcReferenceRelations.entries()) {
    labels.add(npcName);

    for (const target of relations.relatedNpcs.keys()) labels.add(target);
    for (const target of relations.relatedItems.keys()) labels.add(target);
    for (const target of relations.relatedTerms.keys()) labels.add(target);
  }

  if (typeof TERM_REFERENCE_WORDS !== 'undefined') {
    for (const term of TERM_REFERENCE_WORDS) {
      labels.add(term);
    }
  }

  for (const item of config.include || []) {
    labels.add(item);
  }

  referenceWordFrequency = [...labels]
    .map(label => {
      const normalized = normalizeReferenceText(label);
      const displayLabel = aliasMap[normalized] || label;

      return {
        word: displayLabel,
        count: referenceMentionCounts.get(label) || 0
      };
    })
    .filter(item =>
      item.count > 0 &&
      !excluded.has(normalizeReferenceText(item.word))
    )
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.word.localeCompare(b.word);
    });
}

function getActiveWordFrequency() {
  return activeWordIndexMode === 'references'
    ? referenceWordFrequency
    : wordFrequency;
}

function renderWordIndex() {
  currentWordIndexCount = 0;
  wordIndexResults.innerHTML = '';

  appendNextWordIndexItems();
}

function appendNextWordIndexItems() {
  if (wordIndexView.hidden) return;

  const activeList = getActiveWordFrequency();

  if (currentWordIndexCount >= activeList.length) return;

  const nextItems = activeList.slice(
    currentWordIndexCount,
    currentWordIndexCount + WORD_INDEX_PAGE_SIZE
  );

  wordIndexResults.insertAdjacentHTML(
    'beforeend',
    nextItems.map(item => `
      <button
        class="word-index-item"
        type="button"
        data-word-search="${escapeAttribute(item.word)}"
      >
        <span class="reference-link reference-link-term">
          ${escapeHtml(item.word)}
        </span>
        <span>${escapeHtml(item.count)}</span>
      </button>
    `).join('')
  );

  currentWordIndexCount += nextItems.length;
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

  const npcNameIsDlc = Boolean(
    npcNameSection && npcNameSection.includes('_dlc')
  );

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

    const manualMapping = lookupManualNpcSectionMapping(
      talkSection,
      info.npcId,
      info.section
    );

    const manualNameEn = lookupManualNpcName(talkSection, info.npcId, 'en');
    const manualNameJp = lookupManualNpcName(talkSection, info.npcId, 'jp');

    const manualSectionNameEn = lookupManualNpcSectionName(
      talkSection,
      info.npcId,
      info.section,
      'en'
    );

    const manualSectionNameJp = lookupManualNpcSectionName(
      talkSection,
      info.npcId,
      info.section,
      'jp'
    );

    const nameEn =
      manualSectionNameEn ||
      manualNameEn ||
      lookupNpcName(npcNamesEn, info.npcId) ||
      `Unknown ${info.npcId}`;

    const nameJp =
      manualSectionNameJp ||
      manualNameJp ||
      lookupNpcName(npcNamesJp, info.npcId) ||
      nameEn;

    const key = `${talkSection}|${info.npcId}|${info.section}`;

    const npcKey = `${talkSection}|${nameEn}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        section: talkSection,
        category: 'Dialogues',
        id: `${talkSection}-${info.npcId}-${info.section.replace(/\s+/g, '-')}`,
        segment: info.npcId,
        npcId: info.npcId,
        npcKey,
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

function lookupManualNpcName(talkSection, npcId, lang) {
  const isDlc = talkSection.includes('_dlc');

  const key = isDlc
    ? `d${npcId}`
    : npcId;

  const mapping = MANUAL_NPC_TALK_MAPPINGS?.[key];

  if (!mapping) return '';

  return lang === 'jp'
    ? mapping[1] || mapping[0] || ''
    : mapping[0] || mapping[1] || '';
}

function lookupManualNpcSectionMapping(talkSection, npcId, section) {
  return MANUAL_NPC_SECTION_MAPPINGS.find(item =>
    item.talkSection === talkSection &&
    item.npcId === npcId &&
    item.sections.includes(section)
  ) || null;
}

function lookupManualNpcSectionName(talkSection, npcId, section, lang) {
  const mapping = MANUAL_NPC_SECTION_MAPPINGS.find(item =>
    item.talkSection === talkSection &&
    item.npcId === npcId &&
    item.sections.includes(section)
  );

  if (!mapping) return '';

  return lang === 'jp'
    ? mapping.labelJp || mapping.labelEn || ''
    : mapping.labelEn || mapping.labelJp || '';
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

function refineEntryCategory(entry) {
  if (entry.category !== 'Items') return entry;

  const blob = `${entry.nameEn || ''}\n${entry.textEn || ''}`;

  const hasSorceryExclusion = SORCERY_EXCLUDE_PHRASES.some(phrase =>
    blob.toLowerCase().includes(phrase.toLowerCase())
  );

  if (hasSorceryExclusion) {
    return entry;
  }

  if (/\bSorcery\b/i.test(blob) || /\bSorceries\b/i.test(blob)) {
    return {
      ...entry,
      originalCategory: entry.originalCategory || entry.category,
      category: 'Sorceries'
    };
  }

  const hasIncantationExclusion = INCANTATION_EXCLUDE_PHRASES.some(phrase =>
  blob.toLowerCase().includes(phrase.toLowerCase())
);

if (
  !hasIncantationExclusion &&
  (/\bIncantation\b/i.test(blob) || /\bIncantations\b/i.test(blob))
) {
  return {
    ...entry,
    originalCategory: entry.originalCategory || entry.category,
    category: 'Incantations'
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
  const value = String(id).trim();

  if (!/^\d+$/.test(value)) {
    return value;
  }

  return value.replace(/^0+(?=\d)/, '');
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
      const npcKey = entry.npcKey || `${entry.section}|${entry.segment}`;

      if (!npcGroups.has(npcKey)) {
        npcGroups.set(npcKey, []);
      }

      npcGroups.get(npcKey).push(entry);
    }
  }
}

function normalizeReferenceText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/^lady\s+/, '')
    .replace(/^sir\s+/, '')
    .replace(/^saint\s+/, '')
    .replace(/^the\s+/, '')
    .replace(/[^a-z0-9\s'-]/g, '')
    .trim();
}

function getWordCount(value) {
  return normalizeReferenceText(value)
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function isCapitalizedMatch(value) {
  return /^[A-Z][a-zA-Z'’+-]*/.test(String(value || ''));
}

function isSentenceStart(text, index) {
  const before = String(text || '').slice(0, index);

  const trimmed = before.replace(/\s+$/g, '');

  if (!trimmed) return true;

  return /[.!?]\s*$/.test(trimmed);
}

function isAllowedItemMatch(rawText, matchStart, matchedText, alias, reference) {
    if (!reference || reference.type !== 'item') return false;

    const normalized = normalizeReferenceText(matchedText);

    // Don't auto-link generic item names
    if (GENERIC_ITEM_REFERENCE_WORDS.has(normalized)) {
        return false;
    }

    return normalized === normalizeReferenceText(reference.label);
}

function isAllowedTermMatch(rawText, matchStart, matchedText, alias) {
  const normalizedAlias = normalizeReferenceText(alias);

  if (
  typeof CASE_INSENSITIVE_TERM_REFERENCES !== 'undefined' &&
  CASE_INSENSITIVE_TERM_REFERENCES.has(normalizedAlias)
) {
    return true;
  }

  if (!isCapitalizedMatch(matchedText)) {
    return false;
  }

  const aliasWordCount = getWordCount(alias);

  if (aliasWordCount === 1 && isSentenceStart(rawText, matchStart)) {
    return false;
  }

  return true;
}

function isPartOfLongerCapitalizedPhrase(rawText, start, end) {
  const before = String(rawText || '').slice(0, start);
  const after = String(rawText || '').slice(end);

  const previousWord = before.match(/([A-Z][a-zA-Z'’+-]*)\s+$/);
  const nextWord = after.match(/^\s+([A-Z][a-zA-Z'’+-]*)/);

  return Boolean(previousWord || nextWord);
}

function getReferenceRule(type, label) {
  return REFERENCE_RULES?.[type]?.[label] || {};
}

function makeReferenceAliasList(type, label, extraAliases = []) {
  const rule = getReferenceRule(type, label);

  if (rule.enabled === false) return [];

  const aliases = new Set();

  aliases.add(label);

  if (type === 'npc') {
    const beforeComma = normalizeReferenceText(label).split(',')[0]?.trim();

    if (
  beforeComma &&
  beforeComma.length >= 4 &&
  !GENERIC_NPC_ALIAS_WORDS.has(beforeComma)
) {
  aliases.add(beforeComma);
}

    const firstWord = normalizeReferenceText(label).split(/\s+/)[0];

if (
  firstWord &&
  firstWord.length >= 4 &&
  !GENERIC_NPC_ALIAS_WORDS.has(firstWord)
) {
  aliases.add(firstWord);
}

    for (const alias of extraAliases || []) {
      aliases.add(alias);
    }

    for (const alias of rule.aliases || []) {
      aliases.add(alias);
    }

    for (const alias of rule.excludeAliases || []) {
      aliases.delete(alias);
      aliases.delete(normalizeReferenceText(alias));
    }
  }

  return [...aliases]
    .map(alias => String(alias || '').trim())
    .filter(alias => {
      const normalized = normalizeReferenceText(alias);

      if (normalized.length < 4) return false;
      if (/^\d+$/.test(normalized)) return false;

      return true;
    });
}

function buildReferences() {
  references = [];

  const seen = new Set();

  for (const [npcKey, group] of npcGroups.entries()) {
    const first = group[0];
    const label = getName(first, 'en');

    if (!label) continue;

    const manualAliases =
  typeof NPC_MENTION_ALIASES !== 'undefined'
    ? NPC_MENTION_ALIASES[label] || []
    : [];

const aliases = makeReferenceAliasList('npc', label, manualAliases);
    if (!aliases.length) continue;

    const key = `npc|${label}`;
    if (seen.has(key)) continue;
    seen.add(key);

    references.push({
      type: 'npc',
      label,
      aliases,
      npcKey
    });
  }

  for (const entry of entries) {
    if (!isReferenceEntry(entry)) continue;

    const label = getName(entry, 'en');
    if (!label) continue;

    const aliases = makeReferenceAliasList('item', label);

    if (!aliases.length) continue;

    const key = `item|${label}`;
    if (seen.has(key)) continue;
    seen.add(key);

    references.push({
      type: 'item',
      label,
      aliases,
      category: entry.category,
      id: entry.id
    });
  }

  references.sort((a, b) =>
    b.label.length - a.label.length
  );
}

function buildTermReferences() {
  const termWords =
    typeof TERM_REFERENCE_WORDS !== 'undefined'
      ? TERM_REFERENCE_WORDS
      : [];

  termReferences = [...termWords].map(term => ({
    type: 'term',
    label: term,
    aliases: [term]
  }));

  termReferenceMap = new Map(
    termReferences.map(reference => [
      normalizeReferenceText(reference.label),
      reference
    ])
  );
}

function buildReferenceAliasIndex() {
  referenceAliasIndex = new Map();

  for (const reference of [...references, ...termReferences]) {
    for (const alias of reference.aliases) {
      const normalizedAlias = normalizeReferenceText(alias);

      if (normalizedAlias.length < 4) continue;

      const words = normalizedAlias
        .split(/\s+/)
        .filter(word => word.length >= 4);

      if (!words.length) continue;

      const firstWord = words[0];

      if (!referenceAliasIndex.has(firstWord)) {
        referenceAliasIndex.set(firstWord, []);
      }

      referenceAliasIndex.get(firstWord).push({
        reference,
        alias
      });
    }
  }

  for (const list of referenceAliasIndex.values()) {
    list.sort((a, b) => b.alias.length - a.alias.length);
  }
}

function buildValidItemReferenceLabels() {
  validItemReferenceLabels = new Set();

  const allText = entries
    .map(entry => getText(entry, 'en'))
    .filter(Boolean)
    .join('\n');

  for (const reference of references) {
    if (reference.type !== 'item') continue;

    for (const alias of reference.aliases) {
      const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedAlias}\\b`, 'g');

      let match;

      while ((match = regex.exec(allText))) {
        if (
          isCapitalizedMatch(match[0]) &&
          !isSentenceStart(allText, match.index)
        ) {
          validItemReferenceLabels.add(reference.label);
          break;
        }
      }

      if (validItemReferenceLabels.has(reference.label)) break;
    }
  }
}

function findReferencesInText(text, options = {}) {
  const {
    types = ['npc']
  } = options;

  const rawText = String(text || '');
  const normalizedText = normalizeReferenceText(rawText);

  if (!rawText || !normalizedText) return [];

  const words = new Set(
    normalizedText
      .split(/\s+/)
      .filter(word => word.length >= 4)
  );

  const candidates = [];

  for (const word of words) {
    const list = referenceAliasIndex.get(word);
    if (!list) continue;

    for (const item of list) {
      if (!types.includes(item.reference.type)) continue;
      candidates.push(item);
    }
  }

  if (!candidates.length) return [];

  const matches = [];

  for (const item of candidates) {
    const escapedAlias = item.alias
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const regex = new RegExp(`\\b${escapedAlias}\\b`, 'gi');

    let match;

    while ((match = regex.exec(rawText))) {
      if (item.reference.type === 'item') {
  if (
    !isAllowedItemMatch(
      rawText,
      match.index,
      match[0],
      item.alias,
      item.reference
    )
  ) {
    continue;
  }
}

if (item.reference.type === 'term') {
  if (
    !isAllowedTermMatch(
      rawText,
      match.index,
      match[0],
      item.alias
    )
  ) {
    continue;
  }

  if (
    getWordCount(match[0]) === 1 &&
    isPartOfLongerCapitalizedPhrase(
      rawText,
      match.index,
      match.index + match[0].length
    )
  ) {
    continue;
  }
}

      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
        reference: item.reference
      });
    }
  }

  if (!matches.length) return [];

  matches.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return (b.end - b.start) - (a.end - a.start);
  });

  const accepted = [];
  let lastEnd = -1;

  for (const match of matches) {
    if (match.start < lastEnd) continue;

    accepted.push(match);
    lastEnd = match.end;
  }

  return accepted;
}

function buildReferenceRelations() {
  entryReferenceMap = new Map();
  npcReferenceRelations = new Map();
  referenceMentionCounts = new Map();

  for (const [npcKey, group] of npcGroups.entries()) {
    const first = group[0];
    const npcName = getName(first, 'en');

    if (!npcName) continue;

    const relatedNpcScores = new Map();
    const relatedItemScores = new Map();
    const relatedTermScores = new Map();

    const text = group
      .map(entry => getText(entry, 'en'))
      .filter(Boolean)
      .join('\n');

    const matches = findReferencesInText(text, {
      types: ['npc', 'item', 'term']
    });

    for (const entry of group) {
      entryReferenceMap.set(
        entry.id,
        matches.map(match => match.reference)
      );
    }

    for (const match of matches) {
      const reference = match.reference;
      const score = getReferenceMatchScore(match);
      const label = reference.label;

      referenceMentionCounts.set(
        label,
        (referenceMentionCounts.get(label) || 0) + 1
      );

      if (reference.type === 'npc' && label !== npcName) {
        relatedNpcScores.set(
          label,
          (relatedNpcScores.get(label) || 0) + score
        );
      }

      if (reference.type === 'item') {
        relatedItemScores.set(
          label,
          (relatedItemScores.get(label) || 0) + score
        );
      }

      if (reference.type === 'term') {
        relatedTermScores.set(
          label,
          (relatedTermScores.get(label) || 0) + score
        );
      }
    }

    npcReferenceRelations.set(npcName, {
      relatedNpcs: relatedNpcScores,
      relatedItems: relatedItemScores,
      relatedTerms: relatedTermScores
    });
  }
}

function buildGraphData(limit = 140) {
  const nodes = new Map();
  const rawEdges = [];

  for (const [npcName, relations] of npcReferenceRelations.entries()) {
    nodes.set(npcName, {
      data: {
        id: npcName,
        label: npcName,
        type: 'npc'
      }
    });

    const addEdges = (map, type) => {
      for (const [target, score] of map.entries()) {
        if (score <= 0) continue;

        nodes.set(target, {
          data: {
            id: target,
            label: target,
            type
          }
        });

        rawEdges.push({
          source: npcName,
          target,
          weight: score,
          type
        });
      }
    };

    addEdges(relations.relatedNpcs, 'npc');
    addEdges(relations.relatedItems, 'item');
    addEdges(relations.relatedTerms, 'term');
  }

  const strongestRawEdges = rawEdges
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);

  const mergedEdges = new Map();

  for (const edge of strongestRawEdges) {
    const pairKey = [edge.source, edge.target].sort().join('↔');

    if (!mergedEdges.has(pairKey)) {
      mergedEdges.set(pairKey, {
        source: edge.source,
        target: edge.target,
        weight: edge.weight,
        type: edge.type,
        hasForward: true,
        hasReverse: false
      });
      continue;
    }

    const existing = mergedEdges.get(pairKey);

    existing.weight += edge.weight;

    if (
      existing.source === edge.target &&
      existing.target === edge.source
    ) {
      existing.hasReverse = true;
    } else {
      existing.hasForward = true;
    }
  }

  const keptEdges = [...mergedEdges.values()].map(edge => ({
    data: {
      id: `${edge.source}->${edge.target}`,
      source: edge.source,
      target: edge.target,
      weight: edge.weight,
      type: edge.type,
      sourceArrow: edge.hasReverse ? 'triangle' : 'none',
      targetArrow: 'triangle'
    }
  }));

  const usedNodes = new Set();

  keptEdges.forEach(edge => {
    usedNodes.add(edge.data.source);
    usedNodes.add(edge.data.target);
  });

  const incomingWeight = new Map();

  keptEdges.forEach(edge => {
    incomingWeight.set(
      edge.data.target,
      (incomingWeight.get(edge.data.target) || 0) + edge.data.weight
    );

    if (edge.data.sourceArrow === 'triangle') {
      incomingWeight.set(
        edge.data.source,
        (incomingWeight.get(edge.data.source) || 0) + edge.data.weight
      );
    }
  });

  return {
    nodes: [...nodes.values()]
      .filter(node => usedNodes.has(node.data.id))
      .map(node => ({
        ...node,
        data: {
          ...node.data,
          references: incomingWeight.get(node.data.id) || 1
        }
      })),
    edges: keptEdges
  };
}

function renderGraph() {
  const data = buildGraphData(140);
  const maxRefs = Math.max(
  1,
  ...data.nodes.map(node => node.data.references || 1)
);

  const css = getComputedStyle(document.documentElement);
  const graphText = css.getPropertyValue('--text').trim();
  const graphAccent = css.getPropertyValue('--accent').trim();
  const graphBorder = css.getPropertyValue('--border').trim();

  if (referenceGraph) {
    referenceGraph.destroy();
  }

  referenceGraph = cytoscape({
    container: graphContainer,

    elements: [
      ...data.nodes,
      ...data.edges
    ],

    style: [
      {
        selector: 'node',
        style: {
          label: 'data(label)',
          color: graphText,
          'background-color': graphAccent,
          'font-size': 11,
          'text-wrap': 'wrap',
          'text-max-width': 90,
          'text-valign': 'center',
          'text-halign': 'center',
          width: `mapData(references, 1, ${maxRefs}, 30, 82)`,
height: `mapData(references, 1, ${maxRefs}, 30, 82)`,
'font-size': `mapData(references, 1, ${maxRefs}, 9, 15)`,
        }
      },
      {
        selector: 'node[type = "item"]',
        style: {
          'background-color': graphBorder
        }
      },
      {
        selector: 'node[type = "term"]',
        style: {
          'background-color': graphBorder
        }
      },
      {
  selector: 'edge',
  style: {
    width: 1.5,
    'line-color': graphBorder,
    'target-arrow-color': graphBorder,
    'source-arrow-color': graphBorder,
    'target-arrow-shape': 'data(targetArrow)',
    'source-arrow-shape': 'data(sourceArrow)',
    'curve-style': 'bezier',
    opacity: 0.55
  }
}
    ],

    layout: {
      name: 'cose',
      animate: false,
      fit: true,
      padding: 40,
      nodeRepulsion: 7000,
      idealEdgeLength: 90,
      edgeElasticity: 80
    }
  });

  referenceGraph.on('tap', 'node', event => {
    const node = event.target.data();

    pushViewHistory({
      type: 'graph'
    });

    showReferencePage({
      type: node.type === 'npc' ? 'npc' : node.type,
      label: node.label,
      aliases: [node.label]
    }, false);
  });
}

function getReferenceMatchScore(match) {
  const reference = match.reference;
  const wordCount = getWordCount(match.text);

  let score = 1;

  if (reference.type === 'npc') {
    score += 5;
  }

  if (reference.type === 'item') {
    score += 2;
  }

  if (wordCount >= 2) {
    score += 4;
  }

  if (match.text === reference.label) {
    score += 8;
  }

  if (
    normalizeReferenceText(match.text) ===
    normalizeReferenceText(reference.label)
  ) {
    score += 6;
  }

  return score;
}

function isReferenceEntry(entry) {
  return [
    'Items',
    'Weapons',
    'Armor',
    'Talismans',
    'Ashes of War',
    'Ashes of War (Item)',
    'Locations'
  ].includes(entry.category);
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

function updateSearchFilterButtons() {
  searchFilters.querySelectorAll('[data-clear-filters]').forEach(button => {
    button.classList.toggle(
      'active',
      activeTypeFilter === 'All' && activeFlagFilter === 'All'
    );
  });

  searchFilters.querySelectorAll('[data-type-filter]').forEach(button => {
    button.classList.toggle(
      'active',
      button.dataset.typeFilter === activeTypeFilter
    );
  });

  searchFilters.querySelectorAll('[data-flag-filter]').forEach(button => {
    button.classList.toggle(
      'active',
      button.dataset.flagFilter === activeFlagFilter
    );
  });
}

function matchesSearchFilter(entry) {
  const matchesType =
    activeTypeFilter === 'All' ||
    entry.category === activeTypeFilter;

  const matchesFlag =
  activeFlagFilter === 'All' ||

  (activeFlagFilter === 'Base' && !entry.isDlc) ||

  (activeFlagFilter === 'DLC' && entry.isDlc) ||

  (
    activeFlagFilter === 'Japanese-Exclusive' &&
    entry.category === 'Japanese-Exclusive'
  );

  return matchesType && matchesFlag;
}

function tokenizeSearchQuery(query) {
  const tokens = [];
  const regex = /(\w+):"([^"]+)"|(\w+):(\S+)|"([^"]+)"|(\S+)/g;

  let match;

  while ((match = regex.exec(query))) {
    if (match[1]) {
      tokens.push({
        operator: match[1].toLowerCase(),
        value: match[2],
        exact: true
      });
    } else if (match[3]) {
      tokens.push({
        operator: match[3].toLowerCase(),
        value: match[4],
        exact: false
      });
    } else if (match[5]) {
      tokens.push({
        operator: 'text',
        value: match[5],
        exact: true
      });
    } else if (match[6]) {
      const raw = match[6];

      if (raw.endsWith(':')) {
        continue;
      }

      tokens.push({
        operator: 'text',
        value: raw,
        exact: false
      });
    }
  }

  return tokens.filter(token =>
    token.value &&
    token.value.trim().length > 0
  );
}

function searchIncludes(value, needle, exact = false) {
  const haystack = String(value || '').toLowerCase();
  const q = String(needle || '').toLowerCase();

  if (!q) return true;

  if (exact) {
    return haystack.includes(q);
  }

  return q
    .split(/\s+/)
    .filter(Boolean)
    .every(part => haystack.includes(part));
}

function getSearchBlob(entry, lang = 'both') {
  const parts = [
    entry.category,
    entry.originalCategory,
    entry.section,
    entry.id,
    entry.segment,
    entry.talkSection
  ];

  if (lang === 'en' || lang === 'both') {
    parts.push(getName(entry, 'en'));
    parts.push(getText(entry, 'en'));
  }

  if (lang === 'jp' || lang === 'both') {
    parts.push(getName(entry, 'jp'));
    parts.push(getText(entry, 'jp'));
  }

  return parts.filter(Boolean).join('\n');
}

function normalizeSearchValue(value) {
  return String(value || '')
    .toLowerCase()
    .trim();
}

function getSearchRelevance(entry, tokens) {
  if (!tokens.length) return 0;

  let score = 0;

  for (const token of tokens) {
    const value = normalizeSearchValue(token.value);
    if (!value) continue;

    const nameEn = normalizeSearchValue(getName(entry, 'en'));
    const nameJp = normalizeSearchValue(getName(entry, 'jp'));
    const textEn = normalizeSearchValue(getText(entry, 'en'));
    const section = normalizeSearchValue(entry.section);
    const category = normalizeSearchValue(entry.category);

    if (nameEn === value || nameJp === value) {
      score += 1000;
    } else if (nameEn.startsWith(value) || nameJp.startsWith(value)) {
      score += 800;
    } else if (nameEn.includes(value) || nameJp.includes(value)) {
      score += 600;
    } else if (category.includes(value)) {
      score += 250;
    } else if (section.includes(value)) {
      score += 200;
    } else if (textEn.includes(value)) {
      score += 50;
    }

    const parts = value
      .split(/\s+/)
      .filter(Boolean);

    if (
      parts.length > 1 &&
      parts.every(part => nameEn.includes(part))
    ) {
      score += 400;
    }
  }

  return score;
}

function entryMatchesSearchToken(entry, token) {
  const operator = token.operator;
  const value = token.value;
  const exact = token.exact;

  if (operator === 'text') {
  if (searchIncludes(getSearchBlob(entry), value, exact)) {
    return true;
  }

  if (shouldUseFuzzyToken(token)) {
    return fuzzyNameMatches(value, getNpcSearchCandidates(entry));
  }

  return false;
}

  if (operator === 'id') {
    return searchIncludes(entry.id, value, exact);
  }

  if (operator === 'category') {
    return searchIncludes(entry.category, value, exact) ||
      searchIncludes(entry.originalCategory, value, exact);
  }

  if (operator === 'section') {
    return searchIncludes(entry.section, value, exact) ||
      searchIncludes(entry.talkSection, value, exact);
  }

  if (operator === 'en') {
    return searchIncludes(
      `${getName(entry, 'en')}\n${getText(entry, 'en')}`,
      value,
      exact
    );
  }

  if (operator === 'jp') {
    return searchIncludes(
      `${getName(entry, 'jp')}\n${getText(entry, 'jp')}`,
      value,
      exact
    );
  }

  if (operator === 'npc') {
  if (entry.category !== 'Dialogues') return false;

  if (searchIncludes(getName(entry, 'en'), value, exact)) {
    return true;
  }

  return shouldUseFuzzyToken(token) &&
    fuzzyNameMatches(value, getNpcSearchCandidates(entry));
}

  if (operator === 'dialogue') {
    return entry.category === 'Dialogues' &&
      searchIncludes(getSearchBlob(entry), value, exact);
  }

  if (operator === 'item') {
    return (
      entry.category === 'Items' ||
      entry.category === 'Weapons' ||
      entry.category === 'Armor' ||
      entry.category === 'Talismans' ||
      entry.category === 'Ashes of War (Item)'
    ) && searchIncludes(getSearchBlob(entry), value, exact);
  }

  if (operator === 'mentions') {
    return entryMentionsReference(entry, value, exact);
  }

  return searchIncludes(getSearchBlob(entry), value, exact);
}

function entryMatchesSearchQuery(entry, tokens) {
  if (!tokens.length) return true;

  return tokens.every(token =>
    entryMatchesSearchToken(entry, token)
  );
}

function entryMentionsReference(entry, value, exact = false) {
  const query = String(value || '').trim();

  if (query.length < 3) {
    return false;
  }

  const refs = entryReferenceMap.get(entry.id) || [];

  return refs.some(reference => {
    if (searchIncludes(reference.label, query, exact)) {
      return true;
    }

    return reference.aliases.some(alias =>
      searchIncludes(alias, query, exact)
    );
  });
}

function getHighlightTerms(tokens) {
  const terms = [];

  for (const token of tokens) {
    if (!token.value) continue;

    if (
      token.operator === 'id' ||
      token.operator === 'category' ||
      token.operator === 'section'
    ) {
      continue;
    }

    if (token.exact) {
      terms.push(token.value);
    } else {
      terms.push(
        ...String(token.value)
          .split(/\s+/)
          .filter(part => part.length >= 2)
      );
    }
  }

  return [...new Set(terms)]
    .sort((a, b) => b.length - a.length);
}

function highlightSearchTerms(value) {
  const text = String(value || '');
  const terms = getHighlightTerms(currentSearchTokens);

  if (!terms.length) {
    return escapeHtml(text);
  }

  const escapedTerms = terms.map(term =>
    term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );

  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');

  return escapeHtml(text).replace(regex, '<mark class="search-hit">$1</mark>');
}

function highlightSearchTermsHtml(html) {
  const terms = getHighlightTerms(currentSearchTokens);

  if (!terms.length) return html;

  const escapedTerms = terms.map(term =>
    term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );

  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');

  return html.replace(regex, '<mark class="search-hit">$1</mark>');
}

function levenshteinDistance(a, b) {
  a = String(a || '').toLowerCase();
  b = String(b || '').toLowerCase();

  const matrix = Array.from(
    { length: a.length + 1 },
    () => Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function getAllowedFuzzyDistance(value) {
  const length = String(value || '').length;

  if (length < 4) return 0;
  if (length <= 5) return 1;
  if (length <= 9) return 2;

  return 2;
}

function shouldUseFuzzyToken(token) {
  const value = String(token.value || '');

  if (token.exact) return false;
  if (value.length < 4) return false;

  if (
    token.operator === 'npc' ||
    token.operator === 'mentions'
  ) {
    return true;
  }

  return /^[A-Z]/.test(value);
}

function fuzzyNameMatches(value, candidates) {
  const normalizedValue = normalizeReferenceText(value);
  const allowedDistance = getAllowedFuzzyDistance(normalizedValue);

  if (!allowedDistance) return false;
  if (!normalizedValue[0]) return false;

  return candidates.some(candidate => {
    const normalizedCandidate = normalizeReferenceText(candidate);

    if (!normalizedCandidate) return false;

    if (normalizedCandidate[0] !== normalizedValue[0]) {
      return false;
    }

    if (normalizedCandidate.includes(normalizedValue)) {
      return true;
    }

    const candidateParts = normalizedCandidate
      .split(/\s+/)
      .filter(part => part.length >= 4);

    return candidateParts.some(part =>
      part[0] === normalizedValue[0] &&
      levenshteinDistance(normalizedValue, part) <= allowedDistance
    );
  });
}

function getNpcSearchCandidates(entry) {
  const nameEn = getName(entry, 'en');
  const nameJp = getName(entry, 'jp');

  const candidates = [
    nameEn,
    nameJp
  ];

  const npcReference = references.find(reference =>
    reference.type === 'npc' &&
    reference.label === nameEn
  );

  if (npcReference) {
    candidates.push(...npcReference.aliases);
  }

  return candidates.filter(Boolean);
}

function renderWikiSection(title, content, open = false) {
  if (!content) return '';

  return `
    <details class="wiki-section" ${open ? 'open' : ''}>
      <summary>${escapeHtml(title)}</summary>
      <div class="wiki-section-content">
        ${content}
      </div>
    </details>
  `;
}

function getEntriesRelatedToReference(reference) {
  const label = reference.pageLabel || reference.label;

  const aliases =
    reference.type === 'term'
      ? [label]
      : reference.aliases;

  return entries.filter(entry => {
    const name = getName(entry, 'en');
    const text = getText(entry, 'en');
    const blob = `${name}\n${text}`;

    if (reference.type !== 'term' && name === reference.label) {
      return true;
    }

    return aliases.some(alias =>
      searchIncludes(blob, alias, true)
    );
  });
}

function groupEntriesByCategory(items) {
  const grouped = new Map();

  for (const item of items) {
    if (!grouped.has(item.category)) {
      grouped.set(item.category, []);
    }

    grouped.get(item.category).push(item);
  }

  return grouped;
}

function showReferencePage(reference, addToHistory = true) {
  if (!reference) return;

  if (addToHistory && !wordIndexView.hidden) {
    pushViewHistory({ type: 'wordIndex' });
  }

  referenceTitle.textContent = reference.label;

  const relatedEntries = getEntriesRelatedToReference(reference);
  const grouped = groupEntriesByCategory(relatedEntries);

  const ownEntries = relatedEntries.filter(entry =>
    getName(entry, 'en') === reference.label
  );

  const ownContent = ownEntries.length
    ? ownEntries.map(renderEntry).join('')
    : '<div class="empty">No direct entry found.</div>';

  const mentionedContent = [...grouped.entries()]
    .map(([category, items]) =>
      renderWikiSection(
        `${category} (${items.length})`,
        items.map(renderEntry).join('')
      )
    )
    .join('');

  referenceResults.innerHTML = `
    ${renderWikiSection('Basic Info', ownContent, true)}
    ${renderWikiSection('Mentioned By', mentionedContent, true)}
  `;

  //applyReferenceLinksToElement(referenceResults);

  searchView.hidden = true;
  categoryView.hidden = true;
  npcView.hidden = true;
  dialogueView.hidden = true;
  referenceView.hidden = false;
  wordIndexView.hidden = true;
  graphView.hidden = true;

  closeMenu();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function render() {
  const tokens = tokenizeSearchQuery(search.value.trim());
currentSearchTokens = tokens;

  const visible = entries
  .filter(entry =>
    matchesSearchFilter(entry) &&
    entryMatchesSearchQuery(entry, tokens)
  )
  .sort((a, b) => {
    const scoreA = getSearchRelevance(a, tokens);
    const scoreB = getSearchRelevance(b, tokens);

    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    return getName(a, 'en').localeCompare(getName(b, 'en'));
  });

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
  
  const newCards = [...currentRenderTarget.querySelectorAll('.entry')]
  .slice(renderedEntryCount);

newCards.forEach(card => {
  applyReferenceLinksToElement(card);
});

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

  const textIds = formatRawTextWithIds(e, lang);
  const textClean = formatRawTextClean(e, lang);
  const textCode = `\`\`\`\n${textClean}\n\`\`\``;

  return `
    <article
      class="entry"
      id="entry-${escapeHtml(e.section)}-${escapeHtml(e.id)}"
      data-mode="${escapeHtml(defaultCardMode)}"
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
  ${
    hasJapanese
      ? `
        <button
          class="lang-btn translate-btn"
          type="button"
          ${lang !== 'jp' ? 'hidden' : ''}
        >
          Translate
        </button>
      `
      : ''
  }

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
                  <span class="entry-name-content">${highlightSearchTerms(name)}</span>
                </button>
              `
              : `<div class="entry-name entry-name-content">${highlightSearchTerms(name)}</div>`
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
            <div class="entry-text entry-text-ids">${formatEntryText(textIds, false)}</div>
<div class="entry-text entry-text-clean">${formatEntryText(textClean, false)}</div>
<div class="entry-text entry-text-code">${formatEntryText(textCode, false)}</div>
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

function formatEntryText(text, highlight = false) {
  let html = escapeHtml(text);

  if (highlight) {
    html = highlightSearchTermsHtml(html);
  }

  return html
    .replace(/\n---\n/g, '<hr>')
    .replace(/\n/g, '<br>');
}

function applyReferenceLinksToElement(root) {
  if (!root || (!references.length && !termReferences.length)) return;

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;

        if (!parent) return NodeFilter.FILTER_REJECT;

        if (
          parent.closest('button') ||
          parent.closest('mark') ||
          parent.closest('.entry-actions') ||
          parent.closest('.entry-section') ||
          parent.closest('.entry-header') ||
          parent.closest('.entry-text-code')
        ) {
          return NodeFilter.FILTER_REJECT;
        }

        if (!node.nodeValue.trim()) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes = [];

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  for (const node of textNodes) {
    linkReferencesInTextNode(node);
  }
}

function linkReferencesInTextNode(textNode) {
  const text = textNode.nodeValue;
  const matches = findReferencesInText(text, {
    types: ['npc', 'item', 'term']
  });

  if (!matches.length) return;

  const fragment = document.createDocumentFragment();
  let cursor = 0;

  for (const match of matches) {
    if (match.start > cursor) {
      fragment.append(
        document.createTextNode(text.slice(cursor, match.start))
      );
    }

    const button = document.createElement('button');
    button.className =
      `reference-link reference-link-${match.reference.type}`;
    button.type = 'button';
    button.dataset.referenceType = match.reference.type;
    button.dataset.referenceLabel = match.reference.label;
    button.textContent = match.text;

    fragment.append(button);
    cursor = match.end;
  }

  if (cursor < text.length) {
    fragment.append(
      document.createTextNode(text.slice(cursor))
    );
  }

  textNode.replaceWith(fragment);
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
  const codeEl = card.querySelector('.entry-text-code');
  const langBtn = card.querySelector('[data-language-toggle]');
  const translateBtn = card.querySelector('.translate-btn');

  if (nameEl) nameEl.innerHTML = escapeHtml(decodeHtml(name));
  if (idsEl) idsEl.innerHTML = formatEntryText(decodeHtml(textIds));
  if (cleanEl) cleanEl.innerHTML = formatEntryText(decodeHtml(textClean));
  if (codeEl) {
    codeEl.innerHTML = formatEntryText(`\`\`\`\n${decodeHtml(textClean)}\n\`\`\``);
  }

applyReferenceLinksToElement(card);

  if (langBtn) langBtn.textContent = lang === 'en' ? 'JP' : 'EN';

  if (translateBtn) {
    translateBtn.hidden = lang !== 'jp';
  }
}

function pushViewHistory(view) {
  viewHistory.push(view);
}

function goBack() {
  const previous = viewHistory.pop();

  if (!previous) {
    showHome(false);
    return;
  }

  if (previous.type === 'home') {
    showHome(false);
  }

  if (previous.type === 'npcIndex') {
    showNpcIndex(false);
  }

  if (previous.type === 'dialogue') {
    showDialogue(previous.npcKey, false);
  }

  if (previous.type === 'category') {
    showCategory(previous.categoryName, false);
  }
  
  if (previous.type === 'wordIndex') {
  showWordIndex(false);
  }
  
  if (previous.type === 'graph') {
  showGraph(false);
}
}

function showHome(addToHistory = true) {
  if (addToHistory) {
    if (!categoryView.hidden) {
      pushViewHistory({
        type: 'category',
        categoryName: categoryTitle.textContent
      });
    } else if (!npcView.hidden) {
      pushViewHistory({ type: 'npcIndex' });
    } else if (!dialogueView.hidden && currentDialogueKey) {
      pushViewHistory({
        type: 'dialogue',
        npcKey: currentDialogueKey
      });
    }
  }

  searchView.hidden = false;
  categoryView.hidden = true;
  npcView.hidden = true;
  dialogueView.hidden = true;
  referenceView.hidden = true;
  wordIndexView.hidden = true;
  graphView.hidden = true;

  closeMenu();
  render();
}

function showCategory(categoryName, addToHistory = true) {

  if (addToHistory) {
    if (!searchView.hidden) {
      pushViewHistory({ type: 'home' });
    } else if (!npcView.hidden) {
      pushViewHistory({ type: 'npcIndex' });
    } else if (!dialogueView.hidden && currentDialogueKey) {
      pushViewHistory({
        type: 'dialogue',
        npcKey: currentDialogueKey
      });
    }
  }

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
  referenceView.hidden = true;
  wordIndexView.hidden = true;
  graphView.hidden = true;

  closeMenu();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showWordIndex(addToHistory = true) {
  if (addToHistory) {
    if (!searchView.hidden) {
      pushViewHistory({ type: 'home' });
    } else if (!categoryView.hidden) {
      pushViewHistory({
        type: 'category',
        categoryName: categoryTitle.textContent
      });
    } else if (!npcView.hidden) {
      pushViewHistory({ type: 'npcIndex' });
    } else if (!dialogueView.hidden && currentDialogueKey) {
      pushViewHistory({
        type: 'dialogue',
        npcKey: currentDialogueKey
      });
    }
  }

  searchView.hidden = true;
  categoryView.hidden = true;
  npcView.hidden = true;
  dialogueView.hidden = true;
  referenceView.hidden = true;
  wordIndexView.hidden = false;
graphView.hidden = true;

if (allWordsBtn && referenceWordsBtn) {
  allWordsBtn.classList.toggle('active', activeWordIndexMode === 'all');
  referenceWordsBtn.classList.toggle('active', activeWordIndexMode === 'references');
}

renderWordIndex();

  closeMenu();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showGraph(addToHistory = true) {
  if (addToHistory) {
    if (!searchView.hidden) {
      pushViewHistory({ type: 'home' });
    } else if (!categoryView.hidden) {
      pushViewHistory({
        type: 'category',
        categoryName: categoryTitle.textContent
      });
    } else if (!npcView.hidden) {
      pushViewHistory({ type: 'npcIndex' });
    } else if (!dialogueView.hidden && currentDialogueKey) {
      pushViewHistory({
        type: 'dialogue',
        npcKey: currentDialogueKey
      });
    } else if (!wordIndexView.hidden) {
      pushViewHistory({ type: 'wordIndex' });
    }
  }

  searchView.hidden = true;
  categoryView.hidden = true;
  npcView.hidden = true;
  dialogueView.hidden = true;
  referenceView.hidden = true;
  wordIndexView.hidden = true;
  graphView.hidden = false;

  renderGraph();

  closeMenu();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showNpcIndex(addToHistory = true) {
  if (addToHistory) {
    if (!searchView.hidden) {
      pushViewHistory({ type: 'home' });
    } else if (!categoryView.hidden) {
      pushViewHistory({
        type: 'category',
        categoryName: categoryTitle.textContent
      });
    } else if (!dialogueView.hidden && currentDialogueKey) {
      pushViewHistory({
        type: 'dialogue',
        npcKey: currentDialogueKey
      });
    }
  }

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
  referenceView.hidden = true;
  wordIndexView.hidden = true;
  graphView.hidden = true;

  closeMenu();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getNpcMetadata(entry) {
  if (typeof NPC_METADATA === 'undefined') return null;
  if (!entry) return null;

  const nameEn = getName(entry, 'en');

  return NPC_METADATA[nameEn] || null;
}

function renderMetadataList(title, items, type = '') {
  if (!items?.length) return '';

  const dataAttribute =
  type === 'npc'
    ? 'data-related-npc'
    : type === 'item'
      ? 'data-related-item'
      : type === 'term'
        ? 'data-related-term'
        : '';

  return `
    <div class="npc-meta-section">
      <h3>${escapeHtml(title)}</h3>

      <div class="npc-meta-tags">
        ${items.map(item => `
          <button
            class="npc-meta-tag ${type ? `npc-meta-tag-${escapeHtml(type)}` : ''}"
            type="button"
            ${dataAttribute}="${escapeAttribute(item)}"
          >
            ${escapeHtml(item)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderNpcProfile(entry) {
  const meta = getNpcMetadata(entry) || {};
  const nameEn = getName(entry, 'en');
  const name = getName(entry, activeLanguage);

  const relations = npcReferenceRelations.get(nameEn) || {
  relatedNpcs: new Map(),
  relatedItems: new Map(),
  relatedTerms: new Map()
};

const manualRelatedNpcs = meta.relatedNpcs || [];

const relatedNpcs = [
  ...new Set([
    ...manualRelatedNpcs,
    ...relations.relatedNpcs.keys()
  ])
].sort((a, b) => {
  const scoreA = relations.relatedNpcs.get(a) || 0;
  const scoreB = relations.relatedNpcs.get(b) || 0;

  if (scoreA !== scoreB) return scoreB - scoreA;

  return a.localeCompare(b);
});

const manualRelatedItems = meta.relatedItems || [];

const relatedItems = [
  ...new Set([
    ...manualRelatedItems,
    ...relations.relatedItems.keys()
  ])
].sort((a, b) => {
  const scoreA = relations.relatedItems.get(a) || 0;
  const scoreB = relations.relatedItems.get(b) || 0;

  if (scoreA !== scoreB) return scoreB - scoreA;

  return a.localeCompare(b);
});

const relatedTerms = [
  ...relations.relatedTerms.keys()
].sort((a, b) => {
  const scoreA = relations.relatedTerms.get(a) || 0;
  const scoreB = relations.relatedTerms.get(b) || 0;

  if (scoreA !== scoreB) return scoreB - scoreA;

  return a.localeCompare(b);
});

  const hasProfileData =
    meta.image ||
    relatedNpcs.length ||
    relatedItems.length ||
    relatedTerms.length ||
    meta.trivia?.length ||
    meta.notes?.length;

  if (!hasProfileData) return '';

  return `
    <section class="npc-profile">
      ${
        meta.image
          ? `
            <img
              class="npc-profile-image"
              src="${escapeAttribute(meta.image)}"
              alt="${escapeAttribute(name)}"
              loading="lazy"
              onerror="this.remove()"
            >
          `
          : ''
      }

      ${renderMetadataList('Related NPCs', relatedNpcs, 'npc')}
      ${renderMetadataList('Related Items', relatedItems, 'item')}
      ${renderMetadataList('Related Concepts', relatedTerms, 'term')}

      ${
        meta.trivia?.length
          ? `
            <div class="npc-meta-section">
              <h3>Trivia</h3>

              <ul class="npc-meta-list">
                ${meta.trivia.map(item => `
                  <li>${escapeHtml(item)}</li>
                `).join('')}
              </ul>
            </div>
          `
          : ''
      }

      ${
        meta.notes?.length
          ? `
            <div class="npc-meta-section">
              <h3>Notes</h3>

              <ul class="npc-meta-list">
                ${meta.notes.map(item => `
                  <li>${escapeHtml(item)}</li>
                `).join('')}
              </ul>
            </div>
          `
          : ''
      }
    </section>
  `;
}

function showDialogue(npcKey, addToHistory = true) {

  if (
    addToHistory &&
    currentDialogueKey &&
    currentDialogueKey !== npcKey
  ) {
    pushViewHistory({
      type: 'dialogue',
      npcKey: currentDialogueKey
    });
  }

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
    ? `
        ${renderNpcProfile(first)}
        ${renderFullDialogueByNpcId(group)}
      `
    : '<div class="empty">No dialogue found.</div>';
} else {
  if (group.length) {
    dialogueResults.innerHTML = renderNpcProfile(first);
    currentRenderTarget = dialogueResults;
    currentVisibleEntries = group;
    renderedEntryCount = 0;
    appendNextEntries();
  } else {
    dialogueResults.innerHTML = '<div class="empty">No dialogue found.</div>';
  }
}

  searchView.hidden = true;
  categoryView.hidden = true;
  npcView.hidden = true;
  dialogueView.hidden = false;
  referenceView.hidden = true;
  wordIndexView.hidden = true;
  graphView.hidden = true;

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

${
  hasJapanese
    ? `
      <button
        class="lang-btn translate-btn"
        type="button"
        ${lang !== 'jp' ? 'hidden' : ''}
      >
        Translate
      </button>
    `
    : ''
}
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

function renderFullDialogueByNpcId(group) {
  const groupsById = new Map();

  for (const entry of group) {
    const npcId = entry.segment || entry.npcId || 'unknown';

    if (!groupsById.has(npcId)) {
      groupsById.set(npcId, []);
    }

    groupsById.get(npcId).push(entry);
  }

  return [...groupsById.entries()]
    .sort((a, b) => sortIds(a[0], b[0]))
    .map(([npcId, entries]) => `
      <section class="dialogue-id-block">
        <div class="entry-section dialogue-id-heading">
          NPC ID ${escapeHtml(npcId)} · ${entries.length} ${entries.length === 1 ? 'section' : 'sections'}
        </div>

        ${renderFullDialogue(entries)}
      </section>
    `)
    .join('');
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

buildWordFrequencyIndex();
buildIndexes();
buildReferences();
buildTermReferences();
buildReferenceAliasIndex();
//buildValidItemReferenceLabels();
buildReferenceRelations();
buildReferenceWordFrequencyIndex();
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
  if (!wordIndexView.hidden) {
    appendNextWordIndexItems();
  } else {
    appendNextEntries();
  }
}
}

let searchRenderTimer = null;

search.addEventListener('input', () => {
  clearTimeout(searchRenderTimer);

  searchRenderTimer = setTimeout(() => {
    render();
  }, 120);
});

searchFilters.addEventListener('click', event => {
  const clearButton = event.target.closest('[data-clear-filters]');
  const typeButton = event.target.closest('[data-type-filter]');
  const flagButton = event.target.closest('[data-flag-filter]');

  if (clearButton) {
    activeTypeFilter = 'All';
    activeFlagFilter = 'All';
  } else if (typeButton) {
    activeTypeFilter =
      activeTypeFilter === typeButton.dataset.typeFilter
        ? 'All'
        : typeButton.dataset.typeFilter;
  } else if (flagButton) {
    activeFlagFilter =
      activeFlagFilter === flagButton.dataset.flagFilter
        ? 'All'
        : flagButton.dataset.flagFilter;
  } else {
    return;
  }

  updateSearchFilterButtons();
  render();
});

cardControls.addEventListener('click', event => {
  const languageButton = event.target.closest('[data-language-mode]');
  const modeButton = event.target.closest('[data-card-mode]');

  if (!languageButton && !modeButton) return;

  if (languageButton) {
    activeLanguage = languageButton.dataset.languageMode;

    cardControls.querySelectorAll('[data-language-mode]').forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.languageMode === activeLanguage
      );
    });

    document.querySelectorAll('.entry').forEach(card => {
      updateCardLanguage(card, activeLanguage);
    });
  }

  if (modeButton) {
    defaultCardMode = modeButton.dataset.cardMode;

    cardControls.querySelectorAll('[data-card-mode]').forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.cardMode === defaultCardMode
      );
    });

    document.querySelectorAll('.entry').forEach(card => {
      card.dataset.mode = defaultCardMode;
    });
  }
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
  
  const themeButton = event.target.closest('#themeToggleBtn');

if (themeButton) {
  event.stopPropagation();
  cycleTheme();
  return;
}

const referenceButton = event.target.closest('[data-reference-type]');

if (referenceButton) {
  event.stopPropagation();

  const type = referenceButton.dataset.referenceType;
  const label = referenceButton.dataset.referenceLabel;

  const reference = [...references, ...termReferences].find(item =>
    item.type === type &&
    item.label === label
  );

  if (!reference) return;

  showReferencePage(reference);
  return;
}


const relatedTermButton = event.target.closest('[data-related-term]');

if (relatedTermButton) {
  event.stopPropagation();

  const label = relatedTermButton.dataset.relatedTerm;

  const reference = termReferences.find(item =>
    item.label === label
  );

  if (reference) {
    showReferencePage(reference);
  }

  return;
}


const relatedNpcButton = event.target.closest('[data-related-npc]');

if (relatedNpcButton) {
  event.stopPropagation();

  const name = relatedNpcButton.dataset.relatedNpc;
  const match = [...npcGroups.entries()].find(([, group]) =>
    group.some(entry => getName(entry, 'en') === name)
  );

  if (match) {
    showDialogue(match[0]);
  } else {
    search.value = name;
    showHome();
    render();
  }

  return;
}

const relatedItemButton = event.target.closest('[data-related-item]');

if (relatedItemButton) {
  event.stopPropagation();

  search.value = relatedItemButton.dataset.relatedItem;
  showHome();
  render();

  return;
}

const wordSearchButton = event.target.closest('[data-word-search]');

if (wordSearchButton) {
  event.stopPropagation();

  const word = wordSearchButton.dataset.wordSearch;

  showReferencePage({
    type: 'term',
    label: word,
    aliases: [word]
  });

  return;
}

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
  
  const translateButton =
  event.target.closest('.translate-btn');

if (translateButton) {
  event.stopPropagation();

  const card = translateButton.closest('.entry');
  if (!card) return;

  let text = '';

  if (card.classList.contains('full-dialogue-entry')) {
    text = decodeHtml(card.dataset.copyClean || '');
  } else {
    text =
      decodeHtml(
        card.dataset.copyCleanJp ||
        card.dataset.copyCleanEn ||
        ''
      );
  }

  if (!text.trim()) return;

  window.open(
    `https://www.deepl.com/translator#ja/en/${encodeURIComponent(text)}`,
    '_blank'
  );

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

const isTouchDevice =
  window.matchMedia('(hover: none)').matches;

if (!isTouchDevice) return;

if (window.getSelection()?.toString()) return;

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
wordIndexBtn.addEventListener('click', showWordIndex);
graphBtn.addEventListener('click', showGraph);

if (allWordsBtn && referenceWordsBtn) {

  allWordsBtn.addEventListener('click', () => {
    activeWordIndexMode = 'all';

    allWordsBtn.classList.add('active');
    referenceWordsBtn.classList.remove('active');

    renderWordIndex();
  });

  referenceWordsBtn.addEventListener('click', () => {
    activeWordIndexMode = 'references';

    referenceWordsBtn.classList.add('active');
    allWordsBtn.classList.remove('active');

    renderWordIndex();
  });

}

backFromCategoryBtn.addEventListener('click', goBack);
backFromNpcBtn.addEventListener('click', goBack);
backFromDialogueBtn.addEventListener('click', goBack);
backFromReferenceBtn.addEventListener('click', goBack);
backFromWordIndexBtn.addEventListener('click', goBack);
backFromGraphBtn.addEventListener('click', goBack);


function showAnnouncement() {
  if (typeof BUILD_INFO === 'undefined') return;

  const announcements = BUILD_INFO.announcements || [];
  const visibleAnnouncements = announcements
  .filter(item => {
  if (!item.enabled) return false;

  const now = Date.now();
  const updatedAt = new Date(item.updatedAt).getTime();

  if (!Number.isFinite(updatedAt)) return true;

  if (updatedAt > now) {
    return false;
  }

  const ageHours =
    (now - updatedAt) / (1000 * 60 * 60);

  return ageHours <= (item.showForHours || 24);
})
  .sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const latest = visibleAnnouncements[0];
  if (!latest) return;

  const box = document.querySelector('#announcementBox');
  const title = document.querySelector('#announcementTitle');
  const message = document.querySelector('#announcementMessage');

  if (!box || !title || !message) return;

  title.textContent = `${latest.title} • v${latest.version || BUILD_INFO.version}`;
  message.textContent = latest.message;

  if (visibleAnnouncements.length > 1) {
    box.insertAdjacentHTML(
      'beforeend',
      `
        <div id="announcementHistory" class="announcement-history" hidden>
          ${visibleAnnouncements.slice(1).map(item => `
            <div class="announcement-history-item">
              <strong>${escapeHtml(item.title)} • v${escapeHtml(item.version || '')}</strong>
              <span>${escapeHtml(item.message)}</span>
            </div>
          `).join('')}
        </div>
      `
    );

    box.addEventListener('click', () => {
      const history = document.querySelector('#announcementHistory');
      if (history) history.hidden = !history.hidden;
    });
  }

  box.hidden = false;
}

showAnnouncement();

const THEME_STORAGE_KEY = 'eldenDumpTheme';

function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.dataset.theme = theme;
  } else {
    delete document.documentElement.dataset.theme;
  }

  if (themeToggleBtn) {
    const label =
      theme === 'light'
        ? 'Theme: Light'
        : theme === 'dark'
          ? 'Theme: Dark'
          : 'Theme: System';

    themeToggleBtn.textContent = label;
  }
}

function getSavedTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY) || 'system';
}

function cycleTheme() {
  const current = getSavedTheme();

  const next =
    current === 'system'
      ? 'dark'
      : current === 'dark'
        ? 'light'
        : 'system';

  localStorage.setItem(THEME_STORAGE_KEY, next);
  applyTheme(next);

  if (!graphView.hidden) {
    renderGraph();
  }
}

applyTheme(getSavedTheme());

loadDump();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
