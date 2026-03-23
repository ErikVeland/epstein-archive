// Rules for consolidating Top 100 VIP entities into canonical profiles
// This prevents fragmentation (e.g. "Jeffry Epstein" vs "Jeffrey Epstein")

export interface VipRule {
  canonicalName: string;
  aliases: string[];
  patterns: RegExp[]; // Regex for aggressive matching (use with caution)
  type: 'Person' | 'Organization' | 'Term' | 'Concept';
  metadata?: {
    category?:
      | 'Perpetrator'
      | 'Complicit'
      | 'Associate'
      | 'Witness'
      | 'Survivor'
      | 'Visitor'
      | 'Reporter'
      | 'Family'
      | 'Codeword';
    riskLevel?: 'high' | 'medium' | 'low';
    deathDate?: string; // YYYY-MM-DD
    birthDate?: string; // YYYY-MM-DD
    notes?: string;
    bio?: string;
  };
}

const BASE_VIP_RULES: VipRule[] = [
  // --- KEY FIGURES (PERPETRATORS / COMPLICIT) ---
  {
    canonicalName: 'Jeffrey Epstein',
    type: 'Person',
    aliases: [
      'Jeff Epstein',
      'Mr. Epstein',
      'Jeffry Epstein',
      'Jeffrey E. Epstein',
      'Jeff E Epstein',
      'J E Epstein',
      'J.E. Epstein',
      'J. Epstein',
      'Jeffery Epstein',
      'Sam Epstein',
    ],
    patterns: [/Jeffrey\s+Epstein/i, /Jeff\s+Epstein/i, /Jeffery\s+Epstein/i, /Sam\s+Epstein/i],
    metadata: {
      category: 'Perpetrator',
      riskLevel: 'high',
      birthDate: '1953-01-20',
      deathDate: '2019-08-10',
      notes: 'Died in custody at MCC New York.',
      bio: 'American financier and convicted sex offender who trafficked underage girls. Center of the network connecting high-profile figures.',
    },
  },
  {
    canonicalName: 'Ghislaine Maxwell',
    type: 'Person',
    aliases: ['G. Maxwell', 'Ms. Maxwell', 'Miss Maxwell', 'Ghislane Maxwell', 'Ghislaine Maxwel'],
    patterns: [/Ghislaine\s+Maxwell/i, /Ghislane\s+Maxwell/i, /Ghislaine\s+Maxwel/i],
    metadata: {
      category: 'Perpetrator',
      riskLevel: 'high',
      birthDate: '1961-12-25',
      bio: 'British socialite and daughter of Robert Maxwell. Convicted of sex trafficking and conspiracy to commit sex trafficking ensuring Epstein had a steady supply of victims.',
    },
  },
  {
    canonicalName: 'Jean Luc Brunel',
    type: 'Person',
    aliases: [
      'Jean-Luc Brunel',
      'Jean Luc Brunel',
      'Jean Luc Brunnel',
      'Jean-Luc Brunnel',
      'Jean Luc Brunelc',
      'MC2 Model Management',
      'J.L. Brunel',
    ],
    patterns: [/Jean\s+Luc\s+Brunel/i, /Jean-Luc\s+Brunel/i, /Jean\s+Luc\s+Brunnel/i],
    metadata: {
      category: 'Perpetrator',
      riskLevel: 'high',
      birthDate: '1946-01-01', // Approx year
      deathDate: '2022-02-19',
      notes: 'Found dead in cell in La Santé Prison, Paris.',
      bio: 'French modeling agent and scout. Accused of sourcing girls for Epstein and participating in abuse. Founded MC2 Model Management.',
    },
  },
  {
    canonicalName: 'Prince Andrew',
    type: 'Person',
    aliases: ['Duke of York', 'Andrew Albert Christian Edward', 'HRH Prince Andrew'],
    patterns: [/Prince\s+Andrew/i, /Duke\s+of\s+York/i, /Andrew\s+Duke\s+of\s+York/i],
    metadata: {
      category: 'Perpetrator',
      riskLevel: 'high',
      birthDate: '1960-02-19',
      bio: 'Member of the British Royal Family. Accused by Virginia Giuffre of sexual assault (settled out of court). Long-time associate of Epstein and Maxwell.',
    },
  },
  {
    canonicalName: 'Bill Clinton',
    type: 'Person',
    aliases: [
      'William Jefferson Clinton',
      'President Clinton',
      'Mr. Clinton',
      'William Clinton',
      'WJ Clinton',
      'WJC',
    ],
    patterns: [/Bill\s+Clinton/i, /President\s+Clinton/i, /William\s+Clinton/i, /\bWJC\b/i],
    metadata: {
      category: 'Perpetrator',
      riskLevel: 'high',
      birthDate: '1946-08-19',
      bio: '42nd U.S. President. Flew on Epstein’s plane multiple times. Documented dining with Epstein and Maxwell.',
    },
  },
  {
    canonicalName: 'Hillary Clinton',
    type: 'Person',
    aliases: ['Hillary Rodham Clinton', 'Secretary Clinton', 'Mrs Clinton', 'HRC'],
    patterns: [/Hillary\s+Clinton/i, /Hillary\s+Rodham\s+Clinton/i, /\bHRC\b/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'high',
      birthDate: '1947-10-26',
      bio: 'Former U.S. Secretary of State and First Lady. Appears in Epstein-linked correspondence and network context.',
    },
  },
  {
    canonicalName: 'Barack Obama',
    type: 'Person',
    aliases: ['President Obama', 'Barack H Obama', 'Barack Hussein Obama'],
    patterns: [/Barack\s+Obama/i, /President\s+Obama/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1961-08-04',
      bio: '44th U.S. President. Referenced in multiple Epstein-related communications and context chains.',
    },
  },
  {
    canonicalName: 'Joe Biden',
    type: 'Person',
    aliases: ['President Biden', 'Joseph Biden', 'Joseph R Biden', 'Joseph Robinette Biden'],
    patterns: [/Joe\s+Biden/i, /President\s+Joe\s+Biden/i, /President\s+Biden/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1942-11-20',
      bio: '46th U.S. President. Appears in network-adjacent references across case-related communications.',
    },
  },
  {
    canonicalName: 'Donald Trump',
    type: 'Person',
    aliases: [
      'Donald J. Trump',
      'Donald J Trump',
      'Donald J. Trump Jr',
      'Mr. Trump',
      'President Trump',
      'The Donald',
      'Donald John Trump',
      'Donald John Trump Sr',
      'Trump, Doinac',
      'President Donald Trump',
      'President Donald J Trump',
      'President Donald J. Trump',
      'DJT',
      'D.J.T.',
      'DT',
      'D.T.',
    ],
    patterns: [
      /Donald\s+Trump/i,
      /President\s+Trump/i,
      /Trump,\s+Doinac/i,
      /President\s+Donald\s+Trump/i,
      /\bDJT\b/i,
      /\bDT\b/i,
    ],
    metadata: {
      category: 'Associate',
      riskLevel: 'high',
      birthDate: '1946-06-14',
      bio: '45th U.S. President. Socialized with Epstein in Palm Beach and NYC in the 90s/00s. Quoted calling Epstein a "terrific guy".',
    },
  },
  {
    canonicalName: 'Bill Barr',
    type: 'Person',
    aliases: ['William Barr', 'Attorney General Barr', 'AG Barr'],
    patterns: [/Bill\s+Barr/i, /William\s+Barr/i, /Attorney\s+General\s+Barr/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1950-05-23',
      bio: 'Former U.S. Attorney General. Frequently referenced in legal/procedural context around Epstein proceedings.',
    },
  },
  {
    canonicalName: 'Warren Buffett',
    type: 'Person',
    aliases: ['Warren E Buffett', 'Mr Buffett'],
    patterns: [/Warren\s+Buffett/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1930-08-30',
      bio: 'Berkshire Hathaway chairman referenced in Epstein-adjacent financial and social context.',
    },
  },
  {
    canonicalName: 'Vladimir Putin',
    type: 'Person',
    aliases: ['President Putin', 'Vladimir Vladimirovich Putin'],
    patterns: [/Vladimir\s+Putin/i, /President\s+Putin/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1952-10-07',
      bio: 'Russian president referenced in geopolitical and network context within related communications.',
    },
  },
  {
    canonicalName: 'Harvey Weinstein',
    type: 'Person',
    aliases: ['Harvey W Weinstein'],
    patterns: [/Harvey\s+Weinstein/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'high',
      birthDate: '1952-03-19',
      bio: 'Disgraced film producer repeatedly co-mentioned in trafficking/abuse network context analyses.',
    },
  },
  {
    canonicalName: 'Larry Summers',
    type: 'Person',
    aliases: ['Lawrence Summers', 'Lawrence H Summers', 'Secretary Summers'],
    patterns: [/Larry\s+Summers/i, /Lawrence\s+Summers/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'high',
      birthDate: '1954-11-30',
      bio: 'Former U.S. Treasury Secretary and Harvard president. Documented as part of Epstein’s elite contact network.',
    },
  },
  {
    canonicalName: 'Howard Lutnick',
    type: 'Person',
    aliases: ['Howard W Lutnick', 'Howard W. Lutnick', 'Mr. Lutnick'],
    patterns: [/Howard\s+Lutnick/i, /Howard\s+W\.?\s+Lutnick/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1961-07-14',
      bio: 'Business executive and chairman/CEO of Cantor Fitzgerald. Included for high-profile entity consolidation.',
    },
  },
  {
    canonicalName: 'Mark Epstein',
    type: 'Person',
    aliases: ['izmo'],
    patterns: [/Mark\s+Epstein/i, /izmo/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      bio: 'Brother of Jeffrey Epstein. Real estate developer. Listed in the Black Book as "izmo".',
    },
  },
  {
    canonicalName: 'Sean "Diddy" Combs',
    type: 'Person',
    aliases: ['P Diddy', 'p daddy', 'Sean Combs', 'Puffy', 'Puff Daddy', 'Brother Love'],
    patterns: [/Sean\s+"?Diddy"?\s+Combs/i, /P\s+Diddy/i, /p\s+daddy/i, /Puff\s+Daddy/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1969-11-04',
      bio: 'American rapper and record producer. Associated with Epstein through various social circles.',
    },
  },
  {
    canonicalName: 'Bill Richardson',
    type: 'Person',
    aliases: ['Governor Richardson', 'William Richardson', 'Gov. Richardson'],
    patterns: [/Bill\s+Richardson/i],
    metadata: {
      category: 'Complicit',
      riskLevel: 'high',
      birthDate: '1947-11-15',
      deathDate: '2023-09-01',
      bio: 'Former NM Governor and UN Ambassador. Accused by Virginia Giuffre; named in unsealed documents.',
    },
  },
  {
    canonicalName: 'Benjamin Netanyahu',
    type: 'Person',
    aliases: [
      'Bibi',
      'Bibi Netanyahu',
      'Benjamin Nitay',
      'Binyamin Netanyahu',
      'Mr. Netanyahu',
      'PM Netanyahu',
    ],
    patterns: [/Bibi\s+Netanyahu/i, /Benjamin\s+Nitay/i, /Binyamin\s+Netanyahu/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'high',
      birthDate: '1949-10-21',
      bio: 'Prime Minister of Israel. Introduced to Epstein by Ehud Barak. Met with Epstein on multiple occasions.',
    },
  },
  {
    canonicalName: 'Ehud Barak',
    type: 'Person',
    aliases: ['Prime Minister Barak', 'Mr. Barak', 'Ehud Barack'],
    patterns: [/Ehud\s+Barak/i, /Ehud\s+Barack/i],
    metadata: {
      category: 'Complicit',
      riskLevel: 'high',
      birthDate: '1942-02-12',
      bio: 'Former Prime Minister of Israel. Visited Epstein frequently in NYC. Received investments from Epstein connected entities.',
    },
  },
  {
    canonicalName: 'Les Wexner',
    type: 'Person',
    aliases: ['Leslie Wexner', 'Mr. Wexner', 'Leslie H. Wexner'],
    patterns: [/Les\s+Wexner/i, /Leslie\s+Wexner/i],
    metadata: {
      category: 'Complicit',
      riskLevel: 'high',
      birthDate: '1937-09-08',
      bio: 'Retail billionaire (Victoria’s Secret, The Limited). Epstein’s primary financial patron and power of attorney holder for decades.',
    },
  },
  {
    canonicalName: 'Glenn Dubin',
    type: 'Person',
    aliases: ['Mr. Dubin'],
    patterns: [/Glenn\s+Dubin/i],
    metadata: {
      category: 'Complicit',
      riskLevel: 'high',
      birthDate: '1957-04-13',
      bio: 'Hedge fund manager (Highbridge Capital). Married to Eva Andersson-Dubin (Epstein’s ex). Accused by Virginia Giuffre.',
    },
  },
  {
    canonicalName: 'Leon Black',
    type: 'Person',
    aliases: ['Mr. Black', 'Apollo Global Management'],
    patterns: [/Leon\s+Black/i],
    metadata: {
      category: 'Complicit',
      riskLevel: 'high',
      birthDate: '1951-07-31',
      bio: 'Private equity billionaire (Apollo). Paid Epstein $158m for tax/estate advice after Epstein’s 2008 conviction.',
    },
  },
  {
    canonicalName: 'Jes Staley',
    type: 'Person',
    aliases: ['James Staley', 'Mr. Staley', 'Barclays CEO'],
    patterns: [/Jes\s+Staley/i, /James\s+Staley/i],
    metadata: {
      category: 'Complicit',
      riskLevel: 'high',
      birthDate: '1956-12-27',
      bio: 'Former Barclays CEO and JPMorgan executive. Managed Epstein’s accounts. Exchanged thousands of emails with Epstein. Allegations include that he liked his victims to dress up as Disney characters like Snow White, Tinkerbell and Belle from Beauty and the Beast.',
    },
  },
  {
    canonicalName: 'Peter Thiel',
    type: 'Person',
    aliases: ['Mr. Thiel'],
    patterns: [/Peter\s+Thiel/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'high',
      birthDate: '1967-10-11',
      bio: 'Tech billionaire/investor. Met Epstein on multiple occasions.',
    },
  },
  {
    canonicalName: 'Alan Dershowitz',
    type: 'Person',
    aliases: [
      'Alan M. Dershowitz',
      'Alan M Dershowitz',
      'Mr. Dershowitz',
      'Professor Dershowitz',
      'Alan Dershowits',
      'Allen Dershowitz',
    ],
    patterns: [/Alan\s+Dershowitz/i, /Alan\s+Dershowits/i],
    metadata: {
      category: 'Complicit',
      riskLevel: 'high',
      birthDate: '1938-09-01',
      bio: 'Harvard Law professor. Helped negotiate Epstein’s 2008 non-prosecution agreement. Accused by Virginia Giuffre (later dropped/settled).',
    },
  },
  {
    canonicalName: 'Sarah Kellen',
    type: 'Person',
    aliases: ['Sarah Kellen Vidal', 'Sarah Vickers', 'Sarah Vidal'],
    patterns: [/Sarah\s+Kellen/i],
    metadata: {
      category: 'Complicit',
      riskLevel: 'high',
      birthDate: '1979-01-01', // Approx
      bio: 'Epstein’s scheduler and assistant. Accused of coordinating abuse and managing victims.',
    },
  },
  {
    canonicalName: 'Nadia Marcinkova',
    type: 'Person',
    aliases: ['Nadia Marcinko', 'Global Girl'],
    patterns: [/Nadia\s+Marcinkova/i, /Nadia\s+Marcinko/i],
    metadata: {
      category: 'Complicit',
      riskLevel: 'high',
      birthDate: '1980-01-01', // Approx
      bio: 'Model and pilot. Accused of recruiting girls and participating in abuse.',
    },
  },

  // --- SURVIVORS / VICTIMS (GREEN) ---
  {
    canonicalName: 'Virginia Giuffre',
    type: 'Person',
    aliases: [
      'Virginia Roberts',
      'Virginia Roberts Giuffre',
      'Virginia Roberts-Giuffre',
      'Ms. Roberts',
      'V. Giuffre',
    ],
    patterns: [/Virginia\s+Giuffre/i, /Virginia\s+Roberts/i, /Virginia\s+Roberts[-\s]+Giuffre/i],
    metadata: {
      category: 'Survivor',
      riskLevel: 'low',
      birthDate: '1983-08-09',
      deathDate: '2025-04-25', // Future date from prompt
      bio: 'Primary whistleblower and survivor. Detailed allegations against Epstein, Maxwell, Prince Andrew, and others.',
    },
  },
  {
    canonicalName: 'Sascha Riley',
    type: 'Person',
    aliases: ['Sasha Riley'],
    patterns: [/Sascha\s+Riley/i, /Sasha\s+Riley/i],
    metadata: {
      category: 'Survivor',
      riskLevel: 'low',
      notes:
        'Self-reported testimony source; allegations remain unverified pending independent corroboration.',
      bio: 'Referenced in published 2025 testimony/audio material as an alleged survivor. Claims are tracked as allegations only unless corroborated.',
    },
  },
  {
    canonicalName: 'Carolyn Andriano',
    type: 'Person',
    aliases: ['Carolyn'],
    patterns: [/Carolyn\s+Andriano/i],
    metadata: {
      category: 'Survivor',
      riskLevel: 'low',
      birthDate: '1986-01-01', // Approx
      deathDate: '2023-05-23',
      bio: 'Survivor who testified at Maxwell’s trial. Died of drug overdose.',
    },
  },
  {
    canonicalName: 'Brad Edwards',
    type: 'Person',
    aliases: ['Bradley Edwards'],
    patterns: [/Bradley\s+Edwards/i, /Brad\s+Edwards/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'low',
      birthDate: '1970-01-01', // Approx
      bio: 'Civil attorney representing many of Epstein’s victims. Author of "Relentless Pursuit".',
    },
  },

  // --- VISITORS / FAMOUS FIGURES (YELLOW) ---
  {
    canonicalName: 'Michael Jackson',
    type: 'Person',
    aliases: ['MJ', 'King of Pop'],
    patterns: [/Michael\s+Jackson/i],
    metadata: {
      category: 'Visitor',
      riskLevel: 'medium',
      birthDate: '1958-08-29',
      deathDate: '2009-06-25', // Died before the user provided timeline updates, but valid context
      bio: 'Pop icon. Visited Epstein in Palm Beach and NYC to discuss finances.',
    },
  },
  {
    canonicalName: 'Naomi Campbell',
    type: 'Person',
    aliases: [],
    patterns: [/Naomi\s+Campbell/i],
    metadata: {
      category: 'Visitor',
      riskLevel: 'medium',
      birthDate: '1970-05-22',
      bio: 'Supermodel. Photographed with Epstein and Maxwell. Maxwell attended her birthday party.',
    },
  },
  {
    canonicalName: 'Alec Baldwin',
    type: 'Person',
    aliases: [],
    patterns: [/Alec\s+Baldwin/i],
    metadata: {
      category: 'Visitor',
      riskLevel: 'medium',
      birthDate: '1958-04-03',
      bio: 'Actor. Name appears in Epstein’s Little Black Book.',
    },
  },
  {
    canonicalName: 'Mick Jagger',
    type: 'Person',
    aliases: ['Sir Mick Jagger'],
    patterns: [/Mick\s+Jagger/i],
    metadata: {
      category: 'Visitor',
      riskLevel: 'medium',
      birthDate: '1943-07-26',
      bio: 'Lead singer of the Rolling Stones. Attended events where Epstein/Maxwell were present.',
    },
  },
  {
    canonicalName: 'Cate Blanchett',
    type: 'Person',
    aliases: [],
    patterns: [/Cate\s+Blanchett/i],
    metadata: {
      category: 'Visitor',
      riskLevel: 'medium',
      birthDate: '1969-05-14',
      bio: 'Actress. Name appears in Epstein’s contacts.',
    },
  },
  {
    canonicalName: 'Cameron Diaz',
    type: 'Person',
    aliases: [],
    patterns: [/Cameron\s+Diaz/i],
    metadata: {
      category: 'Visitor',
      riskLevel: 'medium',
      birthDate: '1972-08-30',
      bio: 'Actress. Name appears in flight logs/contacts, though she has denied meeting him.',
    },
  },
  {
    canonicalName: 'Bruce Willis',
    type: 'Person',
    aliases: [],
    patterns: [/Bruce\s+Willis/i],
    metadata: {
      category: 'Visitor',
      riskLevel: 'medium',
      birthDate: '1955-03-19',
      bio: 'Actor. Name appears in Epstein’s contacts.',
    },
  },
  {
    canonicalName: 'Leonardo DiCaprio',
    type: 'Person',
    aliases: ['Leo DiCaprio'],
    patterns: [/Leonardo\s+DiCaprio/i],
    metadata: {
      category: 'Visitor',
      riskLevel: 'medium',
      birthDate: '1974-11-11',
      bio: 'Actor. Cited in documents, though reps deny he knew Epstein.',
    },
  },
  {
    canonicalName: 'Chris Tucker',
    type: 'Person',
    aliases: [],
    patterns: [/Chris\s+Tucker/i],
    metadata: {
      category: 'Visitor',
      riskLevel: 'medium',
      birthDate: '1971-08-31',
      bio: 'Comedian/Actor. Flew on Epstein’s plane to Africa with Clinton.',
    },
  },
  {
    canonicalName: 'Stephen Hawking',
    type: 'Person',
    aliases: ['Professor Hawking'],
    patterns: [/Stephen\s+Hawking/i],
    metadata: {
      category: 'Visitor',
      riskLevel: 'medium',
      birthDate: '1942-01-08',
      deathDate: '2018-03-14',
      bio: "Physicist. Visited Epstein's island for a conference funded by Epstein.",
    },
  },
  {
    canonicalName: 'Noam Chomsky',
    type: 'Person',
    aliases: [],
    patterns: [/Noam\s+Chomsky/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1928-12-07',
      bio: 'Linguist and activist. Confirmed meetings with Epstein to discuss politics/finance.',
    },
  },
  {
    canonicalName: 'Robert F. Kennedy Jr',
    type: 'Person',
    aliases: ['RFK Jr', 'Robert Kennedy Jr'],
    patterns: [/Robert\s+F\.?\s+Kennedy\s+Jr/i, /RFK\s+Jr/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1954-01-17',
      bio: 'Politician/Lawyer. Flew on Epstein’s plane.',
    },
  },
  {
    canonicalName: 'Sarah Ferguson',
    type: 'Person',
    aliases: ['Duchess of York', 'Fergie'],
    patterns: [/Sarah\s+Ferguson/i, /Duchess\s+of\s+York/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1959-10-15',
      bio: 'Duchess of York. Accepted money from Epstein to pay off debts; later apologized.',
    },
  },

  // --- DEATH TIMELINE ENTRIES ---
  {
    canonicalName: 'Robert Maxwell',
    type: 'Person',
    aliases: ['Captain Bob'],
    patterns: [/Robert\s+Maxwell/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'high',
      birthDate: '1923-06-10',
      deathDate: '1991-01-05',
      bio: 'Media proprietor and Ghislaine’s father. Died suspiciously falling off his yacht.',
    },
  },
  {
    canonicalName: 'Alfredo Rodriguez',
    type: 'Person',
    aliases: [],
    patterns: [/Alfredo\s+Rodriguez/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      deathDate: '2015-01-01',
      bio: 'Epstein’s house manager/butler in Palm Beach. Deceased.',
    },
  },
  {
    canonicalName: 'Marvin Minsky',
    type: 'Person',
    aliases: [],
    patterns: [/Marvin\s+Minsky/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1927-08-09',
      deathDate: '2016-01-24',
      bio: 'Cognitive scientist (AI). Organized conferences on Epstein’s island. Accused by Giuffre.',
    },
  },
  {
    canonicalName: 'Wendy Leigh',
    type: 'Person',
    aliases: [],
    patterns: [/Wendy\s+Leigh/i],
    metadata: {
      category: 'Reporter',
      riskLevel: 'medium',
      deathDate: '2016-05-29',
      bio: 'Author and Daily Mail reporter. Investigated Ghislaine Maxwell. Fell from balcony.',
    },
  },
  {
    canonicalName: 'Leigh Skye Patrick',
    type: 'Person',
    aliases: [],
    patterns: [/Leigh\s+Skye\s+Patrick/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      deathDate: '2017-05-30',
      bio: 'Associate mentioned in context of deaths/timeline.',
    },
  },
  {
    canonicalName: 'Mark Salling',
    type: 'Person',
    aliases: [],
    patterns: [/Mark\s+Salling/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1982-08-17',
      deathDate: '2018-01-30',
      bio: 'Actor (Glee). Convicted of possession of child pornography. Suicide.',
    },
  },
  {
    canonicalName: 'Thomas Bowers',
    type: 'Person',
    aliases: [],
    patterns: [/Thomas\s+Bowers/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      deathDate: '2019-11-01',
      bio: 'Deutsche Bank executive who signed off on Epstein loans. Suicide.',
    },
  },
  {
    canonicalName: 'Steve Bing',
    type: 'Person',
    aliases: [],
    patterns: [/Steve\s+Bing/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1965-03-31',
      deathDate: '2020-06-22',
      bio: 'Film producer and financier. Clinton friend. Suicide.',
    },
  },
  {
    canonicalName: 'Efrain Reyes',
    type: 'Person',
    aliases: ['Efrain Stone Reyes', 'Stone'],
    patterns: [/Efrain\s+Reyes/i, /Efrain\s+Stone\s+Reyes/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      deathDate: '2020-11-01',
      bio: 'Epstein’s groundskeeper. Died of COVID-19 complications.',
    },
  },
  {
    canonicalName: 'Mark Middleton',
    type: 'Person',
    aliases: [],
    patterns: [/Mark\s+Middleton/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      deathDate: '2022-05-07',
      bio: 'Special assistant to Bill Clinton. Admitted Epstein to White House 17 times. Suicide.',
    },
  },
  {
    canonicalName: 'Ivana Trump',
    type: 'Person',
    aliases: [],
    patterns: [/Ivana\s+Trump/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1949-02-20',
      deathDate: '2022-07-14',
      bio: 'Businesswoman and Donald Trump’s first wife. Knew Maxwell/Epstein.',
    },
  },
  {
    canonicalName: 'Ken Starr',
    type: 'Person',
    aliases: ['Kenneth Starr'],
    patterns: [/Ken\s+Starr/i, /Kenneth\s+Starr/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1946-07-21',
      deathDate: '2022-09-13',
      bio: 'Lawyer. Joined Epstein’s defense team for the 2008 plea deal.',
    },
  },
  {
    canonicalName: 'Steven Hoffenberg',
    type: 'Person',
    aliases: [],
    patterns: [/Steven\s+Hoffenberg/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'high',
      deathDate: '2022-09-01',
      bio: 'Epstein’s mentor/partner in Towers Financial Ponzi scheme. Later claimed Epstein was a spy.',
    },
  },
  {
    canonicalName: 'Roy Black',
    type: 'Person',
    aliases: [],
    patterns: [/Roy\s+Black/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      deathDate: '2025-07-21', // Future date from prompt
      bio: 'Defense attorney for Epstein in 2008.',
    },
  },
  {
    canonicalName: 'Celina Midelfart',
    type: 'Person',
    aliases: ['Celina Midelfahrt', 'Ms. Midelfart'],
    patterns: [/Celina\s+Midelfart/i, /Celina\s+Midelfahrt/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1973-02-12',
      bio: "Norwegian heir and businesswoman. Dated Donald Trump in the 90s. Flew on Epstein's plane (the 'Lolita Express') in 1996 and 1997 with Trump and Ghislaine Maxwell. Listed in Epstein's Little Black Book.",
    },
  },

  // --- OTHERS ---
  {
    canonicalName: 'Melania Trump',
    type: 'Person',
    aliases: ['Melania Knauss', 'Melania Knauss-Trump', 'Mrs. Trump'],
    patterns: [/Melania\s+Trump/i, /Melania\s+Knauss/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1970-04-26',
      bio: 'Wife of Donald Trump. Socialized with Epstein/Maxwell in the 90s.',
    },
  },
  {
    canonicalName: 'Ivanka Trump',
    type: 'Person',
    aliases: ['Ivanka Marie Trump'],
    patterns: [/Ivanka\s+Trump/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1981-10-30',
      bio: 'Daughter of Donald Trump. Socialized with Epstein/Maxwell.',
    },
  },
  {
    canonicalName: 'George Mitchell',
    type: 'Person',
    aliases: ['George J. Mitchell', 'Senator Mitchell', 'Mr. Mitchell'],
    patterns: [/George\s+Mitchell/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1933-08-20',
      bio: 'Former Senator. Named in documents by Giuffre (denied allegation).',
    },
  },
  {
    canonicalName: 'Kevin Spacey',
    type: 'Person',
    aliases: ['Kevin Spacey Fowler'],
    patterns: [/Kevin\s+Spacey/i],
    metadata: {
      category: 'Visitor',
      riskLevel: 'medium',
      birthDate: '1959-07-26',
      bio: 'Actor. Flew on Epstein’s plane.',
    },
  },
  {
    canonicalName: 'Michael Cohen',
    type: 'Person',
    aliases: ['Michael D. Cohen', 'Mr. Cohen', 'Attorney Cohen'],
    patterns: [/Michael\s+Cohen/i],
    metadata: {
      category: 'Associate',
      riskLevel: 'medium',
      birthDate: '1966-08-25',
      bio: 'Former Trump attorney. Contact details in Epstein’s book.',
    },
  },
  {
    canonicalName: 'The Trump Organization',
    type: 'Organization',
    aliases: ['Trump Org', 'Trump Organization'],
    patterns: [/Trump\s+Org/i, /Trump\s+Organization/i],
    metadata: { category: 'Associate' },
  },
  {
    canonicalName: "Victoria's Secret",
    type: 'Organization',
    aliases: ['Victorias Secret', 'Victoria Secret'],
    patterns: [/Victoria'?s\s+Secret/i],
    metadata: { category: 'Associate' },
  },

  // --- CODEWORDS / TERMS ---
  {
    canonicalName: 'Hotdog',
    type: 'Term',
    aliases: ['hotdog'],
    patterns: [/\bhotdog\b/i],
    metadata: {
      category: 'Codeword',
      riskLevel: 'high',
      bio: 'Code term used in the circle to covertly refer to a **boy** to evade detection.',
    },
  },
  {
    canonicalName: 'Pizza',
    type: 'Term',
    aliases: ['pizza'],
    patterns: [/\bpizza\b/i],
    metadata: {
      category: 'Codeword',
      riskLevel: 'high',
      bio: 'Code term used in the circle to covertly refer to a **girl** to evade detection.',
    },
  },
  {
    canonicalName: 'Cheese',
    type: 'Term',
    aliases: ['cheese'],
    patterns: [/\bcheese\b/i],
    metadata: {
      category: 'Codeword',
      riskLevel: 'high',
      bio: 'Code term used in the circle to covertly refer to a **little girl** to evade detection.',
    },
  },
  {
    canonicalName: 'Pasta',
    type: 'Term',
    aliases: ['pasta'],
    patterns: [/\bpasta\b/i],
    metadata: {
      category: 'Codeword',
      riskLevel: 'high',
      bio: 'Code term used in the circle to covertly refer to a **little boy** to evade detection.',
    },
  },
  {
    canonicalName: 'Ice Cream',
    type: 'Term',
    aliases: ['ice cream'],
    patterns: [/\bice\s+cream\b/i],
    metadata: {
      category: 'Codeword',
      riskLevel: 'high',
      bio: 'Code term used in the circle to covertly refer to a **male prostitute**.',
    },
  },
  {
    canonicalName: 'Walnut',
    type: 'Term',
    aliases: ['walnut'],
    patterns: [/\bwalnut\b/i],
    metadata: {
      category: 'Codeword',
      riskLevel: 'high',
      bio: 'Code term used in the circle to covertly refer to a **person of colour**.',
    },
  },
  {
    canonicalName: 'Map',
    type: 'Term',
    aliases: ['map'],
    patterns: [/\bmap\b/i],
    metadata: {
      category: 'Codeword',
      riskLevel: 'high',
      bio: 'Code term used in the circle to covertly refer to **semen**.',
    },
  },
  {
    canonicalName: 'Sauce',
    type: 'Term',
    aliases: ['sauce'],
    patterns: [/\bsauce\b/i],
    metadata: {
      category: 'Codeword',
      riskLevel: 'high',
      bio: 'Code term used in the circle to covertly refer to an **orgy**.',
    },
  },
  {
    canonicalName: 'Pizza Party',
    type: 'Term',
    aliases: ['pizza party'],
    patterns: [/\bpizza\s+party\b/i],
    metadata: {
      category: 'Codeword',
      riskLevel: 'high',
      bio: 'Code term used in the circle to covertly refer to a **party with girls/prostitutes**.',
    },
  },
  {
    canonicalName: 'Pizza Slice',
    type: 'Term',
    aliases: ['pizza slice', 'slice'],
    patterns: [/\bpizza\s+slice\b/i, /\bslice\b/i],
    metadata: {
      category: 'Codeword',
      riskLevel: 'high',
      bio: 'Code term used in the circle to covertly refer to a **single girl**.',
    },
  },
  {
    canonicalName: 'Whoops',
    type: 'Term',
    aliases: ['whoops'],
    patterns: [/\bwhoops\b/i],
    metadata: {
      category: 'Codeword',
      riskLevel: 'high',
      bio: 'Code term used in the circle to covertly refer to **killing someone and making it look like suicide**.',
    },
  },
];

const BULK_VIP_POLITICIANS = [
  'Acosta, Alexander',
  'Allred, Gloria',
  'Bannon, Steve',
  'Barr, William',
  'Becerra, Xavier',
  'Biden, Ashley',
  'Biden, Hunter',
  'Biden, Jill',
  'Biden, Joe',
  'Blair, Tony',
  'Blinken, Antony',
  'Bolton, John',
  'Bondi, Pam',
  'Booker, Cory',
  'Brennan, John',
  'Bush Jr., George',
  'Bush, George W.',
  'Bush, Jeb',
  'Carper, Tom',
  'Cheney, Dick',
  'Clayton, Jay',
  'Clinton, Bill',
  'Clinton, Chelsea',
  'Clinton, Hillary',
  'Comey, James',
  'Comey, Maureen',
  'Conway, George',
  'Desantis, Ron',
  'Emanuel, Rahm',
  'Feinberg, Stephen',
  'Flynn, Michael',
  'Foley, Mark',
  'Garland, Merrick',
  'Geithner, Timothy',
  'Giuliani, Rudy',
  'Goldman, Dan',
  'Graham, Lindsey',
  'Haley, Nikki',
  'Harris, Kamala',
  'Hatch, Orrin',
  'Higgins, Tony',
  'Holder, Eric',
  'Hoyer, Steny',
  'Huckabee, Mike',
  'Huckabee, Sarah',
  'Jeffries, Hakeem',
  'Johnson, Hank',
  'Kasich, John',
  'Kerry, John',
  'Khanna, Ro',
  'Kudlow, Larry',
  'Kushner, Jared',
  'Kyl, Jon',
  'Lew, Jack',
  'Lieu, Ted',
  'Lofgren, Zoe',
  'Lynch, Loretta',
  'Mace, Nancy',
  'Mandelson, Peter',
  'Markey, Ed',
  'Massie, Thomas',
  'May, Theresa',
  'McCain, John',
  'Meadows, Mark',
  'Menendez, Robert',
  'Mnuchin, Steve',
  'Monaco, Lisa',
  'Moskowitz, Jared',
  'Mueller III, Robert S.',
  'Mulvaney, Mick',
  'Nadler, Jerry',
  'Napolitano, Janet',
  'Netanyahu, Benjamin',
  'Newsom, Gavin',
  'Obama, Barack',
  'Obama, Michelle',
  'Ocasio Cortez, Alexandria',
  'Patel, Kash',
  'Paul, Ron',
  'Pelosi, Nancy',
  'Pence, Mike',
  'Plaskett, Stacey',
  'Pompeo, Mike',
  'Power, Samantha',
  'Pritzker, JB',
  'Quayle, Dan',
  'Raskin, Jamie',
  'Ratcliffe, John',
  'Reagan, Ronald',
  'Reno, Janet',
  'Rice, Susan',
  'Richardson, Bill',
  'Rohrabach, Andrew',
  'Romney, Mitt',
  'Rosenstein, Rod',
  'Rove, Karl',
  'Rubio, Marco',
  'Ryan, Paul',
  'Sasse, Ben',
  'Schiff, Adam',
  'Schumer, Chuck',
  'Scott, Tim',
  'Sessions, Jeff',
  'Starmer, Keir',
  'Starr, Kenneth',
  'Stoltenberg, Jens',
  'Taylor Green, Marjorie',
  'Thatcher, Margaret',
  'Trump, Donald',
  'Trump, Ivanka',
  'Trump, Melania',
  'Vance, JD',
  'Williams, Damian',
  'Wyden, Ron',
];

const BULK_VIP_CELEBRITIES = [
  'Allen, Woody',
  'Assange, Julian',
  'Baldwin, Alec',
  'Beyonce',
  'Bono',
  'Bradshaw, Ric',
  'Branson, Richard',
  'Clooney, George',
  'Cobain, Kurt',
  'Cohen, Michael',
  'Copperfield, David',
  'Cosby, Bill',
  'De Niro, Robert',
  'Diller, Barry',
  'Donahue, Phil',
  'Eisenberg, John',
  'Ferguson, Sarah',
  'Gates, Bill',
  'Gates, Melinda',
  'Ho, Stanley',
  'Hoffman, Reid',
  'Jackson, Michael',
  'Jagger, Mick',
  'Jay Z',
  'Joplin, Janis',
  'Jones, Alex',
  'Lewinsky, Monica',
  'Markle, Meghan',
  'Milano, Alyssa',
  'Monroe, Marilyn',
  'Murdoch, Rupert',
  'Musk, Elon',
  "O'Donnell, Rosie",
  'Oz, Mehmet',
  'Ratner, Brett',
  'Reynolds, Tom',
  'Ross, Diana',
  'Schumer, Amy',
  'Snowden, Edward',
  'Spacey, Kevin',
  'Springsteen, Bruce',
  'Streisand, Barbara',
  'Summers, Larry',
  'Thiel, Peter',
  'Tucker, Chris',
  'Wolff, Michael',
  'Zuckerberg, Mark',
  'Zucker, Jeff',
  'Woodward, Stanley',
];

const BULK_VIP_OTHER_NOTABLE = [
  'Adelson, Miriam',
  'Andrew Mountbatten-Windsor',
  'Arthur Edward Rory Guinness',
  'Avakian, Stephanie',
  'Babino/Babine, Vincent',
  'Band, Doug',
  'Belohlavek, Lanna',
  'Berman, Geoffrey',
  'Bezos, Jeff',
  'Birger, Laura',
  'Bistricer, David',
  'Bistricer, Marc',
  'Black, Leon',
  'Blanche, Todd',
  'Boies, David',
  'Bongino, Dan',
  'Book, Lauren',
  'Bowdich, David',
  'Boyd, Stephen E.',
  'Brockman, John',
  'Brunel, Jean Luc',
  'Buckley, Sean',
  'Bull, Gerald',
  'Byrne, Patrick',
  'Calk, Stephen',
  'Capone, Russell',
  'Carlson, Tucker',
  'Castro, Fidel',
  'Chomsky, Noam',
  'Colleran, Brian',
  'Collins, Linda',
  'Daza, Omar',
  'Diana, Princess of Wales',
  'Donaleski, Rebekah',
  'Dupont, Kathleen',
  'Economou, George',
  'Egauger, Michael',
  'Elizabeth II',
  'Ellison, Keith',
  'Erben, Germann',
  'Fortelni, Marius',
  'Friedland, Edward',
  'Frost, Phillip',
  'Harish, Joshua',
  'Hawk, Ronny',
  'Heiss, Howard',
  'Horowitz, Andreessen',
  'Horowitz, Michael',
  'Hosenball, Mark',
  'Hunter, Florence',
  'Inge Rokke, Kjell',
  'Iveagh, Clare',
  'Jarecki, Henry',
  'Kendall Rowlands, John',
  'Kennedy Jr., Robert F.',
  'Kline, Carl',
  'Krisher, Barry',
  'Lady Victoria Hervey',
  'Lefkowitz, Jay',
  'Lefroy, Jeremy',
  'Leo, Leonard',
  'Lonergan, Jessica',
  'Lorber, Howard',
  'Lord Robert May',
  'Lutnick, Howard',
  'Mao, Coreen',
  'Margolin, James',
  'Maxwell, Ghislaine',
  'Maxwell, Robert',
  'McFarland, Nicole',
  'Milikowski, Nathan',
  'Milken, Michael',
  'Moe, Alison',
  'Mook, William',
  'Nassar, Larry',
  'Papapetru, Sophia',
  'Parker, Daniel',
  'Pecorino, Joseph',
  'Pestana, Diego',
  'Phelan, John',
  'Plourde, Lee',
  'Podesta, Tony',
  'Pomerantz, Lara',
  'Pope John Paul II',
  'Pope, Susan',
  'Presley, Elvis',
  'Presley, Lisa Marie',
  'Prince Harry, Duke of Sussex',
  'Prince Philip',
  'Pritzker, Thomas',
  'Readler, Chad',
  'Recarey, Joseph',
  'Reiter, Michael',
  'Rod-Larsen, Terje',
  'Rogers, Matthew',
  'Roos, Nicolas',
  'Rosen, Jeffrey',
  'Rossmiller, Alexander',
  'Roth, John',
  'Routh, Timothy',
  'Rowan, Marc',
  'Rubensetin/Rubenstein, Howard',
  'Ruemmier, Kathy',
  'Salinger, Pierre',
  'Scanlon, Mary Gay',
  'Scarola, John',
  'Schenberg, Janis',
  'Schlaf, Martin',
  'Schwarzman, Stephen',
  'Sekulow, Jay',
  'Senatore, Adrienne',
  'Shamir, Yitzhak',
  'Shapiro, Ben',
  'Shapper, Gretchen',
  'Shea, Timothy',
  'Siad, Daniel',
  'Soros, Alex',
  'Soros, George',
  'Spitzer, Eliot',
  'Stabenow, Debbie',
  'Staley, Jes',
  'Stordalen, Gunhild',
  'Straub, Glenn',
  'Sultan Ahmed bin Sulayem',
  'Swalwell, Eric',
  'Sweeney Jr., William',
  'Thomas-Jacobs, Carol',
  'Thiel, Peter',
  'Thomas-Jacobs, Carol',
  'Tucker, Chris',
  'Villafana, Marie',
  'Walker, Richard',
  'Warsh, Kevin',
  'Wexner, Abigail',
  'Wexner, Les',
  'Yung, Mark',
  'Zampolli, Paolo',
];

function escapeRegexSegment(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function canonicalizeVipSeedName(raw: string): string {
  const cleaned = raw.replace(/\s+/g, ' ').replace(/[;]/g, '').trim();
  if (!cleaned.includes(',')) return cleaned;

  const parts = cleaned
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return cleaned.replace(',', '').trim();

  const firstChunk = parts[0];
  const remainder = parts.slice(1).join(' ');

  if (
    /\b(prince|princess|duke|duchess|lady|lord|pope|queen|king)\b/i.test(firstChunk) ||
    /\bduke|duchess|of\b/i.test(remainder)
  ) {
    return `${firstChunk} ${remainder}`.replace(/\s+/g, ' ').trim();
  }

  return `${remainder} ${firstChunk}`.replace(/\s+/g, ' ').trim();
}

function parseVipSeedVariants(raw: string): string[] {
  const cleaned = raw.trim();
  if (!cleaned) return [];

  if (cleaned.includes('/') && cleaned.includes(',')) {
    const [surnameVariantPart, trailing] = cleaned.split(',', 2);
    const firstNamePart = trailing.trim();
    return surnameVariantPart
      .split('/')
      .map((surname) => `${firstNamePart} ${surname.trim()}`.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }

  if (!cleaned.includes('/')) {
    return [canonicalizeVipSeedName(cleaned)];
  }

  return cleaned
    .split('/')
    .map((variant) => canonicalizeVipSeedName(variant))
    .filter(Boolean);
}

function generatedVipAliases(canonicalName: string, rawName: string): string[] {
  const aliases = new Set<string>();
  const normalizedCanonical = canonicalizeVipSeedName(canonicalName);
  aliases.add(normalizedCanonical);
  aliases.add(rawName.trim());
  if (rawName.includes(',')) aliases.add(rawName.replace(',', '').trim());

  if (normalizedCanonical.includes(' ')) {
    const tokens = normalizedCanonical.split(' ').filter(Boolean);
    const first = tokens[0];
    const last = tokens[tokens.length - 1];
    aliases.add(`${last}, ${first}`);
    aliases.add(`${first} ${last}`);
  }

  return Array.from(aliases).filter(Boolean);
}

function buildBulkVipRules(
  rawNames: string[],
  category: NonNullable<VipRule['metadata']>['category'],
  riskLevel: NonNullable<VipRule['metadata']>['riskLevel'],
): VipRule[] {
  const built: VipRule[] = [];
  for (const raw of rawNames) {
    const variants = parseVipSeedVariants(raw);
    if (!variants.length) continue;
    const canonicalName = variants[0];
    const aliasSet = new Set<string>();
    for (const variant of variants) {
      for (const alias of generatedVipAliases(variant, raw)) aliasSet.add(alias);
      aliasSet.add(variant);
    }
    aliasSet.delete(canonicalName);

    const canonicalTokens = canonicalName
      .replace(/[^\w\s.'-]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    const pattern =
      canonicalTokens.length >= 2
        ? new RegExp(canonicalTokens.map(escapeRegexSegment).join('\\s+'), 'i')
        : new RegExp(escapeRegexSegment(canonicalName), 'i');

    built.push({
      canonicalName,
      type: 'Person',
      aliases: Array.from(aliasSet),
      patterns: [pattern],
      metadata: {
        category,
        riskLevel,
        notes: 'Bulk VIP seed for consolidation and entity surface stabilization.',
      },
    });
  }
  return built;
}

function mergeVipRules(primary: VipRule[], secondary: VipRule[]): VipRule[] {
  const byCanonical = new Map<string, VipRule>();
  for (const rule of primary) {
    byCanonical.set(normalizeVipToken(rule.canonicalName), {
      ...rule,
      aliases: [...rule.aliases],
      patterns: [...rule.patterns],
      metadata: rule.metadata ? { ...rule.metadata } : undefined,
    });
  }

  for (const rule of secondary) {
    const key = normalizeVipToken(rule.canonicalName);
    const existing = byCanonical.get(key);
    if (!existing) {
      byCanonical.set(key, {
        ...rule,
        aliases: [...rule.aliases],
        patterns: [...rule.patterns],
        metadata: rule.metadata ? { ...rule.metadata } : undefined,
      });
      continue;
    }

    const mergedAliasSet = new Set<string>([...existing.aliases, ...rule.aliases]);
    existing.aliases = Array.from(mergedAliasSet);

    const existingPatterns = new Set(existing.patterns.map((pattern) => pattern.source));
    for (const pattern of rule.patterns) {
      if (!existingPatterns.has(pattern.source)) existing.patterns.push(pattern);
    }

    if (!existing.metadata && rule.metadata) {
      existing.metadata = { ...rule.metadata };
    } else if (existing.metadata && rule.metadata) {
      existing.metadata = {
        ...rule.metadata,
        ...existing.metadata,
        notes: existing.metadata.notes || rule.metadata.notes,
      };
    }
  }

  return Array.from(byCanonical.values()).sort((a, b) =>
    a.canonicalName.localeCompare(b.canonicalName, 'en'),
  );
}

const BULK_VIP_RULES = [
  ...buildBulkVipRules(BULK_VIP_POLITICIANS, 'Associate', 'high'),
  ...buildBulkVipRules(BULK_VIP_CELEBRITIES, 'Visitor', 'medium'),
  ...buildBulkVipRules(BULK_VIP_OTHER_NOTABLE, 'Associate', 'medium'),
];

// Extended alias patches for top-150 figures — honorifics, nicknames, misspellings, initials
const EXTENDED_VIP_ALIAS_PATCHES: Array<{
  canonicalName: string;
  aliases: string[];
  patterns?: RegExp[];
}> = [
  // --- Core perpetrators ---
  {
    canonicalName: 'Jeffrey Epstein',
    aliases: [
      'Jeffrey E Epstein',
      'Jeff E. Epstein',
      'J. Epstein',
      'JE',
      'J.E.',
      'Epstein',
      'Mr Epstein',
      'Jeffrey Epstien',
      'Jeffery Epstien',
      'Jeffrey Epstein Jr',
      'Jeffrey Epstein Sr',
      'Epstein Jeffrey',
    ],
    patterns: [/\bEpstein\b/i],
  },
  {
    canonicalName: 'Ghislaine Maxwell',
    aliases: [
      'Ghislaine',
      'Maxwell',
      'G Maxwell',
      'Ms Maxwell',
      'Ghislaine Maxwel',
      'Ghislaine Maxell',
      'Ghislaine Maxwelll',
      'Ghislane Maxwel',
      'Ghislaine Maxwell-Scott',
      'GM',
    ],
    patterns: [/Ghislaine/i],
  },
  // --- US Presidents / Politicians ---
  {
    canonicalName: 'Donald Trump',
    aliases: [
      'Trump',
      'Donald',
      'POTUS 45',
      'POTUS45',
      '45th President',
      'Donald Trump Sr',
      'Donald J Trump Sr',
      'Mr Donald Trump',
      'Donald Trump Jr Sr',
      'Donnie Trump',
      'Don Trump',
    ],
  },
  {
    canonicalName: 'Bill Clinton',
    aliases: [
      'Clinton',
      'President Bill Clinton',
      'Pres Clinton',
      'Pres. Clinton',
      'Bill',
      'Billy Clinton',
      'William J Clinton',
      'William J. Clinton',
      'POTUS 42',
      'POTUS42',
      '42nd President',
      'BC',
    ],
  },
  {
    canonicalName: 'Hillary Clinton',
    aliases: [
      'Hillary',
      'Mrs Clinton',
      'Secretary Hillary Clinton',
      'Hillary R Clinton',
      'H Clinton',
      'H.R.C.',
      'Sec Clinton',
      'Sec. Clinton',
      'Hillary Rodham',
    ],
  },
  {
    canonicalName: 'Barack Obama',
    aliases: [
      'Obama',
      'President Barack Obama',
      'Pres Obama',
      'Barry Obama',
      'Barry Soetoro',
      'Barack H. Obama',
      'B Obama',
      'POTUS 44',
      'POTUS44',
      '44th President',
      'BO',
    ],
  },
  {
    canonicalName: 'Joe Biden',
    aliases: [
      'Biden',
      'President Joe Biden',
      'Pres Biden',
      'VP Biden',
      'Vice President Biden',
      'Joseph R. Biden Jr',
      'Joseph Biden Jr',
      'POTUS 46',
      'POTUS46',
      '46th President',
      'JB',
    ],
  },
  {
    canonicalName: 'Bill Richardson',
    aliases: [
      'Richardson',
      'Gov Richardson',
      'Governor Bill Richardson',
      'William Blaine Richardson',
      'William B Richardson',
    ],
  },
  {
    canonicalName: 'Benjamin Netanyahu',
    aliases: [
      'Netanyahu',
      'Bibi',
      'PM Bibi',
      'Prime Minister Netanyahu',
      'Binyamin Netanyhu',
      'Benjamin Netanyhu',
      'Bibi Netanyhu',
    ],
  },
  {
    canonicalName: 'Ehud Barak',
    aliases: [
      'Barak',
      'PM Barak',
      'Prime Minister Ehud Barak',
      'Ehud Barak Ben-Arzi',
      'Ehud Barack',
    ],
  },
  {
    canonicalName: 'George Mitchell',
    aliases: [
      'Mitchell',
      'Sen Mitchell',
      'Senator George Mitchell',
      'George J Mitchell',
      'George Mitchell Jr',
    ],
  },
  // --- Royals ---
  {
    canonicalName: 'Prince Andrew',
    aliases: [
      'Andrew',
      'Prince Andrew Windsor',
      'Andrew Windsor',
      'HRH Andrew',
      'Duke of York Andrew',
      'Prince Andrew Duke of York',
      'Andrew Albert Christian Edward Windsor',
    ],
  },
  {
    canonicalName: 'Sarah Ferguson',
    aliases: [
      'Ferguson',
      'Fergie',
      'Sarah Duchess of York',
      'Sarah Ferguson-Windsor',
      'Sarah Ferguson Windsor',
    ],
  },
  // --- Key associates / complicit ---
  {
    canonicalName: 'Alan Dershowitz',
    aliases: [
      'Dershowitz',
      'Prof Dershowitz',
      'Alan M. Dershowitz',
      'Alan Dershowits',
      'Allen Dershowitz',
      'Alan Dershowits',
      'A Dershowitz',
      'A. Dershowitz',
    ],
  },
  {
    canonicalName: 'Les Wexner',
    aliases: [
      'Wexner',
      'Leslie Wexner',
      'Les H Wexner',
      'L Wexner',
      'Leslie H Wexner',
      'Mr Wexner',
    ],
  },
  {
    canonicalName: 'Leon Black',
    aliases: ['Black', 'Leon D Black', 'Leon D. Black', 'Mr Black', 'Leon Black Apollo'],
  },
  {
    canonicalName: 'Glenn Dubin',
    aliases: ['Dubin', 'Glenn R Dubin', 'Glenn R. Dubin', 'Mr Dubin'],
  },
  {
    canonicalName: 'Jes Staley',
    aliases: ['Staley', 'James E Staley', 'James E. Staley', 'Mr Staley', 'Jes Staley Barclays'],
  },
  {
    canonicalName: 'Larry Summers',
    aliases: [
      'Summers',
      'Lawrence H. Summers',
      'Larry H Summers',
      'Secretary Larry Summers',
      'Sec Summers',
      'L Summers',
    ],
  },
  {
    canonicalName: 'Harvey Weinstein',
    aliases: ['Weinstein', 'Harvey W. Weinstein', 'Mr Weinstein', 'Harvey Weinstein Producer'],
  },
  {
    canonicalName: 'Peter Thiel',
    aliases: ['Thiel', 'Peter A Thiel', 'Peter A. Thiel', 'Mr Thiel'],
  },
  {
    canonicalName: 'Steven Hoffenberg',
    aliases: ['Hoffenberg', 'Steve Hoffenberg', 'Steven B Hoffenberg', 'Mr Hoffenberg'],
  },
  {
    canonicalName: 'Mark Epstein',
    aliases: ['Mark Epstein', 'izmo', 'M Epstein', 'Mark J Epstein'],
  },
  // --- Survivors ---
  {
    canonicalName: 'Virginia Giuffre',
    aliases: [
      'Giuffre',
      'Virginia',
      'Virginia Roberts',
      'Virginia R Giuffre',
      'Virginia Roberts-Giuffre',
      'V Roberts',
      'V Giuffre',
      'Virginia Giuffre Roberts',
    ],
  },
  // --- Celebrities ---
  {
    canonicalName: 'Bill Gates',
    aliases: [
      'Gates',
      'William Gates',
      'William H Gates',
      'William H. Gates III',
      'Bill Gates III',
      'Mr Gates',
    ],
  },
  {
    canonicalName: 'Elon Musk',
    aliases: ['Musk', 'Elon R Musk', 'Mr Musk', 'Elon Reeve Musk'],
  },
  {
    canonicalName: 'Jeff Bezos',
    aliases: ['Bezos', 'Jeffrey Bezos', 'Jeffrey P Bezos', 'Jeffrey P. Bezos', 'Mr Bezos'],
  },
  {
    canonicalName: 'George Soros',
    aliases: ['Soros', 'György Schwartz', 'George Schwartz', 'Mr Soros', 'George Soros Sr'],
  },
  {
    canonicalName: 'Michael Jackson',
    aliases: [
      'Jackson',
      'MJ',
      'Michael J Jackson',
      'Michael Joseph Jackson',
      'King of Pop',
      'Jacko',
    ],
  },
  {
    canonicalName: 'Kevin Spacey',
    aliases: ['Spacey', 'Kevin Spacey Fowler', 'Kevin S Fowler', 'Mr Spacey'],
  },
  {
    canonicalName: 'Naomi Campbell',
    aliases: ['Campbell', 'Naomi Elaine Campbell', 'Ms Campbell'],
  },
  {
    canonicalName: 'Leonardo DiCaprio',
    aliases: ['DiCaprio', 'Leo DiCaprio', 'Leonardo Wilhelm DiCaprio', 'Mr DiCaprio'],
  },
  {
    canonicalName: 'Mick Jagger',
    aliases: ['Jagger', 'Sir Mick', 'Michael Jagger', 'Michael Philip Jagger', 'Mr Jagger'],
  },
  {
    canonicalName: 'Stephen Hawking',
    aliases: [
      'Hawking',
      'Prof Hawking',
      'Stephen W Hawking',
      'Stephen William Hawking',
      'Dr Hawking',
    ],
  },
  {
    canonicalName: 'Noam Chomsky',
    aliases: ['Chomsky', 'Avram Chomsky', 'Avram Noam Chomsky', 'Prof Chomsky'],
  },
  {
    canonicalName: 'Robert F. Kennedy Jr',
    aliases: [
      'RFK Jr',
      'RFK',
      'Robert Kennedy Jr',
      'Robert F Kennedy Jr',
      'Bobby Kennedy Jr',
      'Kennedy Jr',
    ],
  },
  {
    canonicalName: 'Sarah Kellen',
    aliases: ['Kellen', 'Sarah Vickers', 'Sarah Vidal', 'Sarah Kellen Vidal', 'Ms Kellen'],
  },
  {
    canonicalName: 'Nadia Marcinkova',
    aliases: ['Marcinkova', 'Nadia Marcinko', 'Global Girl', 'Nadia M', 'Nadia Marcinkova Pilot'],
  },
  {
    canonicalName: 'Jean Luc Brunel',
    aliases: [
      'Brunel',
      'Jean-Luc Brunel',
      'JL Brunel',
      'J.L. Brunel',
      'Jean Luc Brunnel',
      'Jean-Luc Brunnel',
      'Mr Brunel',
    ],
  },
  {
    canonicalName: 'Sean "Diddy" Combs',
    aliases: [
      'Diddy',
      'Puff Daddy',
      'P Diddy',
      'Puffy',
      'Brother Love',
      'Sean Combs',
      'Sean John Combs',
      'Mr Combs',
    ],
  },
  {
    canonicalName: 'Melania Trump',
    aliases: [
      'Melania',
      'Melania Knauss',
      'Melania Knauss-Trump',
      'Mrs Trump',
      'Mrs. Melania Trump',
    ],
  },
  {
    canonicalName: 'Ivanka Trump',
    aliases: ['Ivanka', 'Ivanka Marie Trump', 'Ms Ivanka Trump', 'Ivanka Trump Kushner'],
  },
  {
    canonicalName: 'Robert Maxwell',
    aliases: [
      'Maxwell',
      'Captain Bob',
      'Ian Robert Maxwell',
      'Jan Ludvik Hoch',
      'Robert Maxwell Sr',
    ],
  },
  {
    canonicalName: 'Mark Middleton',
    aliases: ['Middleton', 'Mark Middleton Clinton', 'Mr Middleton'],
  },
  {
    canonicalName: 'Ken Starr',
    aliases: ['Starr', 'Kenneth W Starr', 'Kenneth Winston Starr', 'Judge Starr', 'Mr Starr'],
  },
  {
    canonicalName: 'Brad Edwards',
    aliases: ['Edwards', 'Bradley J Edwards', 'Bradley J. Edwards', 'Attorney Edwards'],
  },
  {
    canonicalName: 'Howard Lutnick',
    aliases: ['Lutnick', 'Howard W Lutnick', 'Howard W. Lutnick', 'Mr Lutnick', 'Lutnick Cantor'],
  },
  {
    canonicalName: 'Warren Buffett',
    aliases: ['Buffett', 'Warren E Buffett', 'Warren E. Buffett', 'Mr Buffett', 'Oracle of Omaha'],
  },
  {
    canonicalName: 'Vladimir Putin',
    aliases: [
      'Putin',
      'Vladimir V Putin',
      'Vladimir Vladimirovich Putin',
      'Pres Putin',
      'Mr Putin',
    ],
  },
];

function applyExtendedAliasPatches(rules: VipRule[]): VipRule[] {
  const byCanonical = new Map<string, VipRule>(
    rules.map((r) => [normalizeVipToken(r.canonicalName), r]),
  );
  for (const patch of EXTENDED_VIP_ALIAS_PATCHES) {
    const key = normalizeVipToken(patch.canonicalName);
    const rule = byCanonical.get(key);
    if (!rule) continue;
    const aliasSet = new Set(rule.aliases);
    for (const alias of patch.aliases) aliasSet.add(alias);
    rule.aliases = Array.from(aliasSet);
    if (patch.patterns) {
      const existingSources = new Set(rule.patterns.map((p) => p.source));
      for (const p of patch.patterns) {
        if (!existingSources.has(p.source)) rule.patterns.push(p);
      }
    }
  }
  return rules;
}

export const VIP_RULES: VipRule[] = applyExtendedAliasPatches(
  mergeVipRules(BASE_VIP_RULES, BULK_VIP_RULES),
);

const HONORIFIC_PREFIXES = [
  'mr',
  'mrs',
  'ms',
  'miss',
  'dr',
  'prof',
  'president',
  'prime minister',
  'pm',
  'governor',
  'gov',
  'senator',
  'sen',
  'rep',
  'representative',
  'judge',
  'justice',
];

const VIP_WRAPPER_PREFIXES = [
  'dear',
  'dearest',
  'defendant',
  'defendants',
  'plaintiff',
  'plaintiffs',
  'watch',
  'watching',
  'philanthropy',
] as const;

const VIP_WRAPPER_SUFFIXES = ['to', 'from'] as const;

function normalizeVipToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,'"`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHonorificPrefix(value: string): string {
  let current = normalizeVipToken(value);
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of HONORIFIC_PREFIXES) {
      if (current === prefix) continue;
      if (current.startsWith(`${prefix} `)) {
        current = current.slice(prefix.length + 1).trim();
        changed = true;
        break;
      }
    }
  }
  return current;
}

function unwrapVipCandidate(value: string): string[] {
  const seen = new Set<string>();
  const queue = [stripHonorificPrefix(value)];

  while (queue.length > 0) {
    const current = normalizeVipToken(queue.shift() || '');
    if (!current || seen.has(current)) continue;
    seen.add(current);

    for (const prefix of VIP_WRAPPER_PREFIXES) {
      if (current.startsWith(`${prefix} `)) {
        queue.push(current.slice(prefix.length + 1));
      }
    }

    for (const suffix of VIP_WRAPPER_SUFFIXES) {
      if (current.endsWith(` ${suffix}`)) {
        queue.push(current.slice(0, -(suffix.length + 1)));
      }
    }
  }

  return Array.from(seen);
}

function buildGeneratedPersonAliases(canonicalName: string): string[] {
  const clean = normalizeVipToken(canonicalName);
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length < 2) return [];

  const first = parts[0];
  const last = parts[parts.length - 1];
  const middle = parts.slice(1, -1);
  const aliases = new Set<string>();

  aliases.add(`${first} ${last}`);
  aliases.add(`${last}, ${first}`);
  aliases.add(`${first[0]} ${last}`);
  aliases.add(`${first[0]}. ${last}`);

  if (middle.length > 0) {
    const middleInitials = middle.map((p) => p[0]).join('');
    aliases.add(`${first} ${middleInitials} ${last}`);
    aliases.add(`${first[0]}${middleInitials}${last[0]}`);
    aliases.add(`${first[0]}.${middleInitials}.${last[0]}.`);
  }

  return Array.from(aliases).map((a) => normalizeVipToken(a));
}

function buildAliasSet(rule: VipRule): Set<string> {
  const aliases = new Set<string>();
  aliases.add(normalizeVipToken(rule.canonicalName));
  aliases.add(stripHonorificPrefix(rule.canonicalName));

  for (const alias of rule.aliases || []) {
    const normalized = normalizeVipToken(alias);
    aliases.add(normalized);
    aliases.add(stripHonorificPrefix(normalized));
  }

  if (rule.type === 'Person') {
    for (const generated of buildGeneratedPersonAliases(rule.canonicalName)) {
      aliases.add(generated);
      aliases.add(stripHonorificPrefix(generated));
    }
  }

  return aliases;
}

const VIP_ALIAS_CACHE = new Map<string, Set<string>>(
  VIP_RULES.map((rule) => [rule.canonicalName, buildAliasSet(rule)]),
);

export function resolveVip(name: string): string | null {
  const candidates = unwrapVipCandidate(name);
  if (candidates.length === 0) return null;

  for (const candidate of candidates) {
    for (const rule of VIP_RULES) {
      const aliases = VIP_ALIAS_CACHE.get(rule.canonicalName);
      if (aliases && aliases.has(candidate)) {
        return rule.canonicalName;
      }
      for (const pattern of rule.patterns) {
        const candidateMatch = candidate.match(pattern);
        if (candidateMatch && candidateMatch[0].trim() === candidate) {
          return rule.canonicalName;
        }
      }
    }
  }

  return null;
}
