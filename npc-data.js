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
  'Sorceries',
  'Incantations',
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



const MANUAL_NPC_SECTION_MAPPINGS = [
  {
    talkSection: 'TalkMsg.fmg',
    npcId: '0000',
    sections: ['Section 18', 'Section 19'],
    npcKeySuffix: 'first-manual-npc',
    labelEn: 'First Manual NPC',
    labelJp: '手動NPC 1'
  },

  {
    talkSection: 'TalkMsg.fmg',
    npcId: '0000',
    sections: ['Section 20'],
    npcKeySuffix: 'second-manual-npc',
    labelEn: 'Second Manual NPC',
    labelJp: '手動NPC 2'
  },

  {
    talkSection: 'TalkMsg_dlc01.fmg',
    npcId: '0000',
    sections: ['Section 02'],
    npcKeySuffix: 'dlc-manual-npc',
    labelEn: 'DLC Manual NPC',
    labelJp: 'DLC 手動NPC'
  }
];

const REFERENCE_RULES = {
  npc: {
    'Hornsent': {
      enabled: false
    },

    'Hornsent Grandam': {
      aliases: ['Hornsent Grandam']
    }
  },

  item: {}
};

const TERM_REFERENCE_WORDS = new Set([
  'Abyssal Woods',
  'Academy of Raya Lucaria',
  'Age of Fracture',
  'Age of Order',
  'Age of Stars',
  'Ainsel',
  'Albinauric',
  'Altus Plateau',
  'Ancient Dragon',
  'Ancient Dragon Cult',
  'Ancient Ruins of Rauh',
  'Ancestral Follower',
  'Belurat',
  'Black Knife',
  'Blessing',
  'Bloodfiend',
  'Caelid',
  'Cadaver',
  'Carian',
  'Castle Ensis',
  'Catacomb',
  'Cathedral of Dragon Communion',
  'Cave',
  'Cerulean Coast',
  'Church of Dragon Communion',
  'Cradle',
  'Crucible',
  'Curseblade',
  'Cuckoo',
  'Death',
  'Deathroot',
  'Deeproot Depths',
  'Demi-Human',
  'Destined Death',
  'Divine Beast',
  'Divine Gate',
  'Divinity',
  'Dragon Communion',
  'Dragon Cult',
  'Dragonkin',
  'Drake',
  'Draught',
  'Elden Beast',
  'Elden Ring',
  'Empyrean',
  'Empyrean Grandam',
  'Enir-Ilim',
  'Erdtree',
  'Erdtree Burial',
  'Eternal City',
  'Farum Azula',
  'Fate',
  'Fell God',
  'Finger Reader',
  'Finger Ruins',
  'Fire Giant',
  'Fire Monk',
  'Flame of Frenzy',
  'Flame of Ruin',
  'Formless Mother',
  'Frenzied Flame',
  'Ghostflame',
  'Giants Forge',
  'Gloam-Eyed Queen',
  'Godskin',
  'Golden Lineage',
  'Golden Order',
  'Grace',
  'Grace-Given',
  'Grand Altar of Dragon Communion',
  'Greater Will',
  'Great Rune',
  'Greattree',
  'Gravesite Plain',
  'Guardian Golem',
  'Guidance of Grace',
  'Haligtree',
  'Highroad Cave',
  'Hornsent',
  'Hornsent Inquisitor',
  'Incantation',
  'Incantations',
  'Invocation',
  'Jagged Peak',
  'Jar Saint',
  'Kaiden',
  'Kindling',
  'Lake of Rot',
  'Lamenter',
  'Lands Between',
  'Leyndell',
  'Liurnia',
  'Limgrave',
  'Living Jar',
  'Lord',
  'Lordship',
  'Maiden',
  'Marika',
  'Mausoleum',
  'Mending Rune',
  'Messmerflame',
  'Metyr',
  'Midra\'s Manse',
  'Misbegotten',
  'Mohgwyn Palace',
  'Mother',
  'Mountaintops of the Giants',
  'Mt. Gelmir',
  'Nameless Eternal City',
  'Night\'s Cavalry',
  'Nightfolk',
  'Nokron',
  'Nokstella',
  'Nox',
  'Numen',
  'Omen',
  'Oracle Envoy',
  'Ordina',
  'Outer God',
  'Perfumer',
  'Primordial',
  'Putrescence',
  'Radagon',
  'Raya Lucaria',
  'Realm of Shadow',
  'Rebirth',
  'Recusant',
  'Remembrance',
  'Rauh',
  'Ritual',
  'Rot Kindred',
  'Roundtable Hold',
  'Ruins of Unte',
  'Sacred Relic',
  'Saint',
  'Scadu Altus',
  'Scadutree',
  'Scadutree Avatar',
  'Scarlet Rot',
  'Sellia',
  'Shadow',
  'Shadow Keep',
  'Shadow Realm',
  'Shadowtree',
  'Shaman',
  'Shattering',
  'Silver Tear',
  'Siofra',
  'Site of Grace',
  'Sorcery',
  'Sorceries',
  'Soul',
  'Spirit Ash',
  'Spirit Calling',
  'Spira',
  'Stone Coffin',
  'Stone Coffin Fissure',
  'Stormveil Castle',
  'Tarnished',
  'The Hinterlands',
  'Three Fingers',
  'Torrent',
  'Towerfolk',
  'Tree Sentinel',
  'Tree Worship',
  'Tunnel',
  'Tutelary Deity',
  'Twinbird',
  'Two Fingers',
  'Vessel',
  'Vulgar Militia',
  'Walking Mausoleum',
  'Weeping Peninsula',
  'Wormface',
  'Zamor'
]);

const CASE_INSENSITIVE_TERM_REFERENCES = new Set([
  'sorceries',
  'sorcery',
  'incantations',
  'incantation'
]);

const GENERIC_ITEM_REFERENCE_WORDS = new Set([
  'talisman',
  'sword',
  'shield',
  'greatshield',
  'armor',
  'helm',
  'gauntlets',
  'greaves',
  'robe',
  'hood',
  'staff',
  'seal',
  'bow',
  'arrow',
  'bolt',
  'perfume',
  'bottle',
  'flask',
  'pot',
  'grease',
  'stone',
  'flower',
  'fire',
  'leaf',
  'root',
  'mushroom',
  'meat',
  'liver',
  'bone',
  'golden',
  'sacred',
  'hidden',
  'secret',
  'finger',
  'primeval',
  'blessed',
  'broken',
  'old',
  'new',
  'body',
  'head',
  'my lord',
  'My thanks',
  'rest',
  'count',
  'drake',
  'light',
  'Oh mother',
  'Let us go together'
]);

const GENERIC_NPC_ALIAS_WORDS = new Set([
  'fire',
  'finger',
  'lord',
  'saint',
  'knight',
  'commander',
  'beast',
  'dragon',
  'spirit',
  'ancestor',
  'reader',
  'crone',
  'ancient',
  'count',
  'drake',
  'My thanks',
  'Rest'
]);



const SORCERY_EXCLUDE_PHRASES = [
  'their sorcery',
  'faux sorcery',
  'Town of Sorcery',
  'sorcery scroll',
  'catalyst for glintstone sorcery',
  'Glintstone Stars sorcery',
  'processing using sorceries',
  'Enchanted by sorceries of the Cuckoos',
  'learn glintstone sorceries'
];

const INCANTATION_EXCLUDE_PHRASES = [
  'Enchanted by the incantations',
  'blessed with a velvety purple incantation',
  'Enchanted with an ancient Erdtree incantation',
  'imparting a festive incantation',
  'boosts Dragon Communion incantations'
];



const NPC_METADATA = {
  "Aureliette": {
    image: "images/aureliette.webp",

    trivia: [
      "One of the jellyfish sisters.",
      "Can be reunited with her sister at Stargazer's Ruins."
    ],

    notes: [
      "Uses dialogue ID 2270."
    ],

    relatedNpcs: [
      "Jellyfish",
      "Roderika"
    ],

    relatedItems: [
      "Spirit Jellyfish Ashes"
    ]
  },

  "Ranni the Witch": {
    image: "images/ranni.webp",

    trivia: [
      "Appears under multiple dialogue IDs.",
      "Central character of the Age of Stars ending."
    ],

    relatedNpcs: [
      "Renna",
      "Blaidd the Half-Wolf",
      "War Counselor Iji",
      "Seluvis"
    ],

    relatedItems: [
      "Dark Moon Ring",
      "Miniature Ranni",
      "Discarded Palace Key"
    ]
  },
  
    "Margit, the Fell Omen": {
    trivia: [
      "A projection used by Morgott to bar the Tarnished from Stormveil Castle.",
      "Guards the approach to Godrick the Grafted.",
      "Shares identity with Morgott, the Omen King.",
      "Uses a golden spectral hammer and holy weapons in battle."
    ],

    relatedNpcs: [
      "Morgott, the Omen King",
      "Godrick the Grafted"
    ],

    relatedItems: [
      "Margit's Shackle"
    ]
  },

  "Morgott, the Omen King": {
    trivia: [
      "The veiled monarch of Leyndell.",
      "One of the demigod children of Queen Marika and Godfrey.",
      "An omen who remained loyal to the Erdtree despite being rejected by it.",
      "Also appears under the name Margit, the Fell Omen."
    ],

    relatedNpcs: [
      "Margit, the Fell Omen",
      "Godfrey, First Elden Lord",
      "Mohg, Lord of Blood",
      "Marika"
    ],

    relatedItems: [
      "Remembrance of the Omen King",
      "Morgott's Cursed Sword",
      "Regal Omen Bairn",
      "Margit's Shackle"
    ]
  },

  "Godrick the Grafted": {
    trivia: [
      "A shardbearer of the Golden Lineage.",
      "Rules Stormveil Castle.",
      "Practices grafting to increase his strength.",
      "Reveres Godfrey and the Golden Lineage."
    ],

    relatedNpcs: [
      "Godfrey, First Elden Lord",
      "Gostoc",
      "Nepheli Loux",
      "Kenneth Haight"
    ],

    relatedItems: [
      "Remembrance of the Grafted",
      "Axe of Godrick",
      "Grafted Dragon",
      "Godrick's Great Rune"
    ]
  },

  "Rennala, Queen of the Full Moon": {
    trivia: [
      "Queen of the Carian royal family.",
      "Head of the Academy of Raya Lucaria.",
      "Former wife of Radagon.",
      "Mother of Ranni, Radahn, and Rykard.",
      "Holds the Amber Egg left to her by Radagon."
    ],

    relatedNpcs: [
      "Ranni the Witch",
      "Radagon of the Golden Order",
      "Starscourge Radahn",
      "Rykard, Lord of Blasphemy"
    ],

    relatedItems: [
      "Remembrance of the Full Moon Queen",
      "Carian Regal Scepter",
      "Rennala's Full Moon",
      "Great Rune of the Unborn",
      "Queen's Crescent Crown",
      "Queen's Robe",
      "Queen's Bracelets",
      "Queen's Leggings"
    ]
  },

  "Starscourge Radahn": {
    trivia: [
      "A demigod son of Rennala and Radagon.",
      "Known as the mightiest hero of the demigods.",
      "Mastered gravitational magic in Sellia.",
      "Held back the stars with his gravity magic.",
      "Fought Malenia during the Shattering."
    ],

    relatedNpcs: [
      "Rennala, Queen of the Full Moon",
      "Radagon of the Golden Order",
      "Malenia, Blade of Miquella",
      "Alexander, Warrior Jar",
      "Blaidd the Half-Wolf"
    ],

    relatedItems: [
      "Remembrance of the Starscourge",
      "Starscourge Greatsword",
      "Lion Greatbow",
      "Radahn's Great Rune",
      "Radahn's Redmane Helm"
    ]
  },
  
  "Mohg, Lord of Blood": {
  trivia: [
    "A demigod son of Queen Marika and Godfrey, and twin brother of Morgott.",
    "Founded the Mohgwyn Dynasty in secret beneath the Lands Between.",
    "Abducted Miquella from the Haligtree in an attempt to raise him to godhood.",
    "Serves the Formless Mother and wields cursed bloodflame.",
    "One of the Shardbearers."
  ],

  relatedNpcs: [
    "Morgott, the Omen King",
    "Marika",
    "Godfrey, First Elden Lord",
    "Miquella",
    "White Mask Varré"
  ],

  relatedItems: [
    "Remembrance of the Blood Lord",
    "Mohgwyn's Sacred Spear",
    "Bloodboon",
    "Mohg's Great Rune",
    "Pureblood Knight's Medal"
  ]
},

"Godfrey, First Elden Lord": {
  trivia: [
    "The first Elden Lord and first husband of Queen Marika.",
    "Originally known as Hoarah Loux.",
    "Leader of the Tarnished before their exile.",
    "Father of Morgott, Mohg and Godwyn."
  ],

  relatedNpcs: [
    "Hoarah Loux, Warrior",
    "Marika",
    "Morgott, the Omen King",
    "Mohg, Lord of Blood",
    "Godwyn the Golden",
    "Nepheli Loux"
  ],

  relatedItems: [
    "Remembrance of Hoarah Loux",
    "Axe of Godfrey",
    "Hoarah Loux's Earthshaker",
    "Elden Lord Armor"
  ]
},

"Rykard, Lord of Blasphemy": {
  trivia: [
    "A demigod son of Rennala and Radagon.",
    "Lord of Volcano Manor and leader of those who opposed the Erdtree.",
    "Allowed himself to be devoured by the God-Devouring Serpent to achieve immortality.",
    "Created the Blasphemous Claw to oppose Maliketh.",
    "One of the Shardbearers."
  ],

  relatedNpcs: [
    "Rennala, Queen of the Full Moon",
    "Radagon of the Golden Order",
    "Ranni the Witch",
    "Praetor Rykard",
    "Tanith",
    "Blackguard Big Boggart",
    "Recusant Bernahl",
    "Patches"
  ],

  relatedItems: [
    "Remembrance of the Blasphemous",
    "Blasphemous Blade",
    "Rykard's Rancor",
    "Rykard's Great Rune",
    "Blasphemous Claw",
    "Taker's Cameo"
  ]
},

"Malenia, Blade of Miquella": {
  trivia: [
    "An Empyrean and daughter of Marika and Radagon.",
    "Twin sister of Miquella.",
    "Afflicted from birth by Scarlet Rot.",
    "Fought Starscourge Radahn to a standstill during the Shattering.",
    "Transforms into the Goddess of Rot during her final battle."
  ],

  relatedNpcs: [
    "Miquella",
    "Millicent",
    "Starscourge Radahn",
    "Marika",
    "Radagon of the Golden Order",
    "Gowry"
  ],

  relatedItems: [
    "Remembrance of the Rot Goddess",
    "Hand of Malenia",
    "Scarlet Aeonia",
    "Malenia's Great Rune",
    "Malenia's Winged Helm",
    "Malenia's Armor",
    "Malenia's Gauntlet",
    "Malenia's Greaves",
    "Unalloyed Gold Needle"
  ]
},

"Radagon of the Golden Order": {
  trivia: [
    "Second Elden Lord and second husband of Queen Marika.",
    "Former husband of Rennala, Queen of the Full Moon.",
    "Father of Radahn, Rykard and Ranni through Rennala.",
    "Father of Malenia and Miquella through Marika.",
    "Ultimately revealed to be Marika's other self."
  ],

  relatedNpcs: [
    "Marika",
    "Rennala, Queen of the Full Moon",
    "Malenia, Blade of Miquella",
    "Miquella",
    "Ranni the Witch",
    "Starscourge Radahn",
    "Rykard, Lord of Blasphemy",
    "Elden Beast"
  ],

  relatedItems: [
    "Elden Remembrance",
    "Marika's Hammer",
    "Golden Order Greatsword",
    "Radagon Icon",
    "Radagon's Scarseal",
    "Radagon's Soreseal",
    "Radagon's Rings of Light"
  ]
},

"Elden Beast": {
  trivia: [
    "The vassal beast of the Greater Will.",
    "Embodies the concept of Order.",
    "Became the Elden Ring upon its arrival in the Lands Between.",
    "Serves as the final opponent after Radagon.",
    "Wields the Sacred Relic Sword forged from Radagon's body."
  ],

  relatedNpcs: [
    "Radagon of the Golden Order",
    "Marika",
    "Greater Will"
  ],

  relatedItems: [
    "Elden Remembrance",
    "Sacred Relic Sword",
    "Marika's Hammer",
    "Elden Stars"
  ]
},

"Lichdragon Fortissax": {
  trivia: [
    "An ancient dragon who became a close companion of Godwyn the Golden.",
    "Battled alongside Godwyn after the Ancient Dragon War ended.",
    "Entered Godwyn's dream in an attempt to fight the spreading Death Blight.",
    "Was ultimately corrupted by Death himself."
  ],

  relatedNpcs: [
    "Godwyn the Golden",
    "Fia",
    "Ancient Dragon Lansseax"
  ],

  relatedItems: [
    "Remembrance of the Lichdragon",
    "Fortissax's Lightning Spear",
    "Death Lightning",
    "Prince of Death's Pustule",
    "Mending Rune of the Death-Prince"
  ]
},

"Dragonlord Placidusax": {
  trivia: [
    "The Elden Lord before the age of the Erdtree.",
    "Waits beyond time in Crumbling Farum Azula.",
    "His god fled, leaving him behind.",
    "One of the oldest known dragons in the Lands Between."
  ],

  relatedNpcs: [
    "Ancient Dragon Lansseax",
    "Lichdragon Fortissax",
    "Greater Will"
  ],

  relatedItems: [
    "Remembrance of the Dragonlord",
    "Dragon King's Cragblade",
    "Placidusax's Ruin"
  ]
},

"Regal Ancestor Spirit": {
  trivia: [
    "A great ancestral spirit worshipped by the ancestral followers.",
    "Embodies the cycle of life, death and rebirth.",
    "Encountered within Nokron, Eternal City.",
    "Restores itself by drawing upon nearby spirits."
  ],

  relatedNpcs: [
    "Ancestor Spirit",
    "Ancestral Follower"
  ],

  relatedItems: [
    "Remembrance of the Regal Ancestor",
    "Winged Greathorn",
    "Ancestral Spirit's Horn"
  ]
},

"Astel, Naturalborn of the Void": {
  trivia: [
    "A malformed star born in the void.",
    "Destroyed one of the Eternal Cities.",
    "Guards the path leading to the Moonlight Altar.",
    "Manipulates gravity and meteoric sorceries."
  ],

  relatedNpcs: [
  ],

  relatedItems: [
    "Remembrance of the Naturalborn",
    "Bastard's Stars",
    "Waves of Darkness"
  ]
},

"Maliketh, the Black Blade": {
  trivia: [
    "Marika's shadowbound beast.",
    "Entrusted with safeguarding the Rune of Death.",
    "Known as Gurranq, Beast Clergyman, while gathering Deathroot.",
    "His defeat releases Destined Death back into the world."
  ],

  relatedNpcs: [
    "Gurranq, Beast Clergyman",
    "Marika",
    "Godwyn the Golden"
  ],

  relatedItems: [
    "Remembrance of the Black Blade",
    "Maliketh's Black Blade",
    "Black Blade",
    "Deathroot",
    "Maliketh's Helm",
    "Maliketh's Armor",
    "Maliketh's Gauntlets",
    "Maliketh's Greaves"
  ]
},

"Fire Giant": {
  trivia: [
    "The final surviving Fire Giant.",
    "Guards the Forge of the Giants.",
    "Bears the Fell God's face upon his torso.",
    "Cursed with tending the Flame of Ruin by Queen Marika."
  ],

  relatedNpcs: [
    "Marika",
    "Fell God"
  ],

  relatedItems: [
    "Remembrance of the Fire Giant",
    "Giant's Red Braid",
    "Burn, O Flame!"
  ]
},

"Godskin Duo": {
  trivia: [
    "Consists of a Godskin Apostle and a Godskin Noble.",
    "Servants of the Gloam-Eyed Queen.",
    "Users of the Black Flame.",
    "Encountered together in Crumbling Farum Azula."
  ],

  relatedNpcs: [
    "Godskin Apostle",
    "Godskin Noble",
    "Gloam-Eyed Queen"
  ],

  relatedItems: [
    "Black Flame Tornado",
    "Smithing-Stone Miner's Bell Bearing [4]"
  ]
},

"Hoarah Loux, Warrior": {
  trivia: [
    "The true identity of Godfrey, First Elden Lord.",
    "Returns to his original warrior persona after slaying Serosh.",
    "Renowned as the greatest chieftain of the Badlands.",
    "Fights with overwhelming physical strength."
  ],

  relatedNpcs: [
    "Godfrey, First Elden Lord",
    "Serosh",
    "Marika",
    "Nepheli Loux"
  ],

  relatedItems: [
    "Remembrance of Hoarah Loux",
    "Axe of Godfrey",
    "Hoarah Loux's Earthshaker"
  ]
}
};


const NPC_MENTION_ALIASES = {
  "Ranni the Witch": [
    "Ranni",
    "Lady Ranni",
    "Princess Ranni",
    "Snow Witch"
  ],

  "Count Ymir, High Priest": [
    "Ymir",
    "Count Ymir"
  ],

  "Alexander, Warrior Jar": [
    "Alexander",
    "Iron Fist",
    "Iron Fist Alexander"
  ],

  "Blaidd the Half-Wolf": [
    "Blaidd",
    "Half-Wolf"
  ],

  "War Counselor Iji": [
    "Iji",
    "Smithing Master Iji",
    "War Counselor Iji"
  ],

  "Sir Ansbach": [
    "Ansbach",
    "Pureblood Knight Ansbach"
  ],

  "Margit, the Fell Omen": [
    "Margit",
    "Fell Omen"
  ],

  "Morgott, the Omen King": [
    "Morgott",
    "Omen King"
  ],

  "Godrick the Grafted": [
    "Godrick",
    "the Grafted"
  ],

  "Rennala, Queen of the Full Moon": [
    "Rennala",
    "Queen of the Full Moon"
  ],

  "Starscourge Radahn": [
    "Radahn",
    "Starscourge",
    "General Radahn"
  ],

  "Malenia, Blade of Miquella": [
    "Malenia",
    "Blade of Miquella"
  ],

  "Miquella": [
    "Miquella",
    "Kind Miquella",
    "Kindly Miquella"
  ],

  "Mohg, Lord of Blood": [
    "Mohg",
    "Lord of Blood",
    "Lord Mohg"
  ],

  "Rykard, Lord of Blasphemy": [
    "Rykard",
    "Lord of Blasphemy"
  ],

  "Dragonlord Placidusax": [
    "Placidusax",
    "Dragonlord"
  ],

  "Maliketh, the Black Blade": [
    "Maliketh",
    "Black Blade"
  ],

  "Godfrey, First Elden Lord": [
    "Godfrey",
    "First Elden Lord"
  ],

  "Hoarah Loux, Warrior": [
    "Hoarah Loux"
  ],

  "Radagon of the Golden Order": [
    "Radagon"
  ],

  "Elden Beast": [],

  "Fire Giant": [],

  "Godskin Apostle": [
    "Apostle"
  ],

  "Godskin Noble": [
  ],

  "Astel, Naturalborn of the Void": [
    "Astel",
    "Naturalborn of the Void"
  ],

  "Ancestor Spirit": [],

  "Regal Ancestor Spirit": [
    "Ancestor Spirit"
  ],

  "Lichdragon Fortissax": [
    "Fortissax"
  ],

  "Commander Niall": [
    "Niall"
  ],

  "Commander O'Neil": [
    "O'Neil"
  ],

  "Elemer of the Briar": [
    "Elemer"
  ],

  "Royal Knight Loretta": [
    "Royal Knight Loretta"
  ],

  "Loretta, Knight of the Haligtree": [
    "Loretta",
    "Knight of the Haligtree"
  ],

  "God-Devouring Serpent": [
    "Serpent",
    "God-Devouring Serpent"
  ],

  // Shadow of the Erdtree

  "Divine Beast Dancing Lion": [
    "Dancing Lion",
    "Divine Beast"
  ],

  "Rellana, Twin Moon Knight": [
    "Rellana",
    "Twin Moon Knight"
  ],

  "Messmer the Impaler": [
    "Messmer",
    "the Impaler"
  ],

  "Putrescent Knight": [],

  "Romina, Saint of the Bud": [
    "Romina",
    "Saint of the Bud"
  ],

  "Bayle the Dread": [
    "Bayle",
    "the Dread"
  ],

  "Midra, Lord of Frenzied Flame": [
    "Midra",
    "Lord of Frenzied Flame"
  ],

  "Commander Gaius": [
    "Gaius",
    "General Gaius"
  ],

  "Scadutree Avatar": [],

  "Metyr, Mother of Fingers": [
    "Metyr",
    "Mother of Fingers"
  ],

  "Needle Knight Leda": [
    "Leda"
  ],

  "Promised Consort Radahn": [
    "Consort Radahn",
    "Promised Consort",
    "Promised Consort Radahn"
  ]
};