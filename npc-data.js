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
      "An omen projection used by Morgott to bar the Tarnished from Stormveil Castle.",
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
    "Noble"
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