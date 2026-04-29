import { Entity } from '@client/types/documents';

export class EntityNameService {
  // Common verbs that indicate sentence fragments
  private static readonly COMMON_VERBS = new Set([
    'abandoned',
    'about',
    'according',
    'across',
    'actually',
    'added',
    'after',
    'against',
    'announced',
    'appeared',
    'arrived',
    'asked',
    'became',
    'before',
    'began',
    'behind',
    'being',
    'believe',
    'below',
    'between',
    'beyond',
    'brought',
    'called',
    'came',
    'cannot',
    'certainly',
    'clearly',
    'close',
    'come',
    'coming',
    'considered',
    'continued',
    'could',
    'created',
    'decided',
    'despite',
    'different',
    'directly',
    'discovered',
    'does',
    'doing',
    'done',
    'down',
    'during',
    'ended',
    'enough',
    'especially',
    'even',
    'eventually',
    'expected',
    'explained',
    'felt',
    'finally',
    'finished',
    'first',
    'followed',
    'following',
    'former',
    'found',
    'from',
    'further',
    'gave',
    'generally',
    'getting',
    'given',
    'goes',
    'going',
    'gone',
    'great',
    'happened',
    'hardly',
    'having',
    'held',
    'help',
    'helped',
    'helping',
    'hence',
    'herself',
    'higher',
    'highest',
    'himself',
    'however',
    'immediately',
    'important',
    'including',
    'indeed',
    'instead',
    'into',
    'involved',
    'itself',
    'just',
    'keep',
    'kept',
    'knew',
    'know',
    'known',
    'large',
    'largely',
    'last',
    'later',
    'latest',
    'least',
    'left',
    'less',
    'like',
    'likely',
    'little',
    'long',
    'longer',
    'looked',
    'looking',
    'lost',
    'made',
    'mainly',
    'make',
    'making',
    'many',
    'maybe',
    'mean',
    'means',
    'meanwhile',
    'might',
    'more',
    'moreover',
    'most',
    'mostly',
    'moved',
    'much',
    'must',
    'myself',
    'near',
    'nearly',
    'need',
    'needed',
    'neither',
    'never',
    'next',
    'none',
    'nothing',
    'nowhere',
    'obtained',
    'often',
    'once',
    'only',
    'onto',
    'opened',
    'other',
    'others',
    'otherwise',
    'ourselves',
    'outside',
    'over',
    'particular',
    'particularly',
    'past',
    'perhaps',
    'placed',
    'possible',
    'possibly',
    'present',
    'presented',
    'previously',
    'probably',
    'quite',
    'rather',
    'reached',
    'really',
    'recent',
    'recently',
    'regarding',
    'related',
    'relatively',
    'remained',
    'reported',
    'required',
    'resulted',
    'said',
    'same',
    'saying',
    'says',
    'second',
    'seeing',
    'seem',
    'seemed',
    'seems',
    'seen',
    'sent',
    'several',
    'should',
    'showed',
    'shown',
    'shows',
    'significant',
    'significantly',
    'similar',
    'similarly',
    'since',
    'some',
    'someone',
    'something',
    'sometimes',
    'somewhat',
    'somewhere',
    'soon',
    'sought',
    'spent',
    'started',
    'still',
    'stopped',
    'such',
    'suddenly',
    'suggested',
    'taken',
    'taking',
    'than',
    'that',
    'their',
    'theirs',
    'them',
    'themselves',
    'then',
    'there',
    'therefore',
    'these',
    'they',
    'thing',
    'things',
    'think',
    'third',
    'this',
    'those',
    'though',
    'thought',
    'three',
    'through',
    'throughout',
    'thus',
    'together',
    'told',
    'took',
    'toward',
    'towards',
    'tried',
    'tries',
    'trying',
    'turned',
    'under',
    'unless',
    'unlike',
    'until',
    'upon',
    'used',
    'useful',
    'using',
    'usually',
    'various',
    'very',
    'wanted',
    'well',
    'went',
    'were',
    'what',
    'whatever',
    'when',
    'whenever',
    'where',
    'whereas',
    'wherever',
    'whether',
    'which',
    'while',
    'whole',
    'whom',
    'whose',
    'widely',
    'will',
    'with',
    'within',
    'without',
    'would',
    'your',
    'yours',
    'yourself',
    'yourselves',
    'was',
    'is',
    'are',
    'am',
    'be',
    'been',
    'being',
    'conducts',
    'claims',
    'argues',
    'notes',
    'states',
    'suggests',
    'implies',
    'mentions',
    'references',
    'discusses',
    'describes',
    'explains',
    'identifies',
    'indicates',
    'reveals',
    'shows',
    'tells',
    'writes',
    'reported',
    'testified',
    'stated',
    'noted',
    'alleged',
    'accused',
    'charged',
    'convicted',
    'sentenced',
    'sued',
    'filed',
    'appealed',
    'ruled',
    'ordered',
    'granted',
    'denied',
    'dismissed',
    'settled',
    'agreed',
    'negotiated',
    'signed',
    'authored',
    'co-authored',
    'edited',
    'published',
    'released',
    'issued',
    'distributed',
    'circulated',
    'broadcast',
    'televised',
    'streamed',
    'posted',
    'tweeted',
    'shared',
    'liked',
    'commented',
    'replied',
    'responded',
    'answered',
  ]);

  // Common prepositions
  private static readonly PREPOSITIONS = new Set([
    'about',
    'above',
    'across',
    'after',
    'against',
    'along',
    'among',
    'around',
    'at',
    'before',
    'behind',
    'below',
    'beneath',
    'beside',
    'besides',
    'between',
    'beyond',
    'by',
    'concerning',
    'considering',
    'despite',
    'down',
    'during',
    'except',
    'for',
    'from',
    'in',
    'inside',
    'into',
    'like',
    'near',
    'of',
    'off',
    'on',
    'onto',
    'out',
    'outside',
    'over',
    'past',
    'regarding',
    'since',
    'through',
    'throughout',
    'to',
    'toward',
    'towards',
    'under',
    'underneath',
    'unlike',
    'until',
    'up',
    'upon',
    'via',
    'with',
    'within',
    'without',
  ]);

  // Common conjunctions
  private static readonly CONJUNCTIONS = new Set(['and', 'or', 'but']);

  // Common adverbs that shouldn't end a name
  private static readonly ADVERBS = new Set([
    'directly',
    'immediately',
    'quickly',
    'slowly',
    'carefully',
    'easily',
    'hardly',
    'nearly',
    'really',
    'simply',
    'truly',
    'actually',
    'basically',
    'certainly',
    'clearly',
    'completely',
    'definitely',
    'especially',
    'exactly',
    'extremely',
    'finally',
    'fully',
    'generally',
    'greatly',
    'highly',
    'largely',
    'likely',
    'mainly',
    'mostly',
    'naturally',
    'normally',
    'obviously',
    'particularly',
    'possibly',
    'potentially',
    'previously',
    'primarily',
    'probably',
    'properly',
    'quickly',
    'quite',
    'rarely',
    'recently',
    'regularly',
    'relatively',
    'seriously',
    'significantly',
    'similarly',
    'simply',
    'slightly',
    'specifically',
    'strongly',
    'successfully',
    'suddenly',
    'supposedly',
    'surely',
    'totally',
    'typically',
    'ultimately',
    'unfortunately',
    'usually',
    'virtually',
    'widely',
  ]);

  // Modal verbs
  private static readonly MODAL_VERBS = new Set([
    'may',
    'might',
    'can',
    'could',
    'will',
    'would',
    'shall',
    'should',
    'must',
  ]);

  // Infinitive verbs (common verbs that follow modals)
  private static readonly INFINITIVE_VERBS = new Set([
    'be',
    'have',
    'do',
    'make',
    'get',
    'take',
    'give',
    'go',
    'come',
    'see',
    'know',
    'think',
    'want',
    'use',
    'find',
    'tell',
    'ask',
    'work',
    'seem',
    'feel',
    'try',
    'leave',
    'call',
    'keep',
    'let',
    'begin',
    'help',
    'show',
    'hear',
    'play',
    'run',
    'move',
    'live',
    'believe',
    'bring',
    'happen',
    'write',
    'provide',
    'sit',
    'stand',
    'lose',
    'pay',
    'meet',
    'include',
    'continue',
    'set',
    'learn',
    'change',
    'lead',
    'understand',
    'watch',
    'follow',
    'stop',
    'create',
    'speak',
    'read',
    'allow',
    'add',
    'spend',
    'grow',
    'open',
    'walk',
    'win',
    'offer',
    'remember',
    'love',
    'consider',
    'appear',
    'buy',
    'wait',
    'serve',
    'die',
    'send',
    'expect',
    'build',
    'stay',
    'fall',
    'cut',
    'reach',
    'kill',
    'remain',
    'suggest',
    'raise',
    'pass',
    'sell',
    'require',
    'report',
    'decide',
    'pull',
    'choose',
    'constitute',
  ]);

  // Common pronouns that shouldn't follow titles
  private static readonly PRONOUNS = new Set([
    'who',
    'whom',
    'whose',
    'which',
    'that',
    'this',
    'these',
    'those',
    'what',
    'whatever',
    'whichever',
    'whoever',
    'whomever',
    'i',
    'you',
    'he',
    'she',
    'it',
    'we',
    'they',
    'me',
    'him',
    'her',
    'us',
    'them',
    'my',
    'mine',
    'your',
    'yours',
    'his',
    'hers',
    'its',
    'our',
    'ours',
    'their',
    'theirs',
  ]);

  // Past tense and gerund verbs that shouldn't follow titles
  private static readonly PAST_TENSE_VERBS = new Set([
    'watched',
    'finished',
    'praised',
    'praising',
    'ended',
    'started',
    'began',
    'said',
    'told',
    'asked',
    'wanted',
    'needed',
    'felt',
    'thought',
    'knew',
    'believed',
    'hoped',
    'tried',
    'attempted',
    'decided',
    'chose',
    'selected',
    'picked',
    'named',
    'called',
    'titled',
    'labeled',
    'marked',
    'noted',
    'mentioned',
    'stated',
    'declared',
    'announced',
    'proclaimed',
    'revealed',
    'disclosed',
    'exposed',
    'showed',
    'demonstrated',
    'proved',
    'confirmed',
    'verified',
    'validated',
    'established',
    'determined',
    'concluded',
    'found',
    'discovered',
    'learned',
    'realized',
    'understood',
    'recognized',
    'acknowledged',
    'admitted',
    'accepted',
    'agreed',
    'approved',
    'endorsed',
    'supported',
    'backed',
    'favored',
    'preferred',
    'liked',
    'loved',
    'enjoyed',
    'appreciated',
    'valued',
    'treasured',
    'cherished',
    'held',
    'seeking',
    'sought',
    'walking',
    'going',
    'coming',
    'arriving',
    'leaving',
    'departing',
    'entering',
    'exiting',
    'moving',
    'running',
    'rushing',
    'hurrying',
    'hastening',
    'speeding',
    'racing',
    'dashing',
    'sprinting',
    'bolting',
    'addressed',
    'contacted',
    'phoned',
    'emailed',
    'texted',
    'visited',
    'met',
    'saw',
    'heard',
    'listened',
    'spoke',
    'talked',
    'discussed',
    'argued',
    'debated',
    'agreed',
    'disagreed',
    'refused',
    'accepted',
    'declined',
    'rejected',
    'denied',
    'admitted',
    'confessed',
    'claimed',
  ]);

  // Generic nouns that shouldn't follow titles
  private static readonly GENERIC_NOUNS = new Set([
    'jet',
    'court',
    'government',
    'operations',
    'research',
    'learning',
    'finance',
    'history',
    'biology',
    'pediatrics',
    'harvard',
    'middle',
    'global',
    'international',
    'national',
    'federal',
    'state',
    'local',
    'public',
    'private',
    'general',
    'special',
    'chief',
    'senior',
    'junior',
    'assistant',
    'associate',
    'deputy',
    'vice',
    'acting',
    'interim',
    'emeritus',
    'honorary',
    'distinguished',
    'visiting',
    'ads',
    'allegations',
    'article',
    'articles',
    'report',
    'reports',
    'case',
    'cases',
    'court',
    'courts',
    'judge',
    'judges',
    'lawyer',
    'lawyers',
    'attorney',
    'attorneys',
    'prosecutor',
    'prosecutors',
    'witness',
    'witnesses',
    'victim',
    'victims',
    'plaintiff',
    'plaintiffs',
    'defendant',
    'defendants',
    'source',
    'sources',
    'official',
    'officials',
    'page',
    'pages',
    'paragraph',
    'paragraphs',
    'section',
    'sections',
    'exhibit',
    'exhibits',
    'document',
    'documents',
    'file',
    'files',
    'email',
    'emails',
    'message',
    'messages',
    'letter',
    'letters',
    'memo',
    'memos',
    'note',
    'notes',
    'call',
    'calls',
    'meeting',
    'meetings',
    'flight',
    'flights',
    'log',
    'logs',
    'record',
    'records',
    'account',
    'accounts',
    'bank',
    'banks',
    'fund',
    'funds',
    'money',
    'cash',
    'dollar',
    'dollars',
    'check',
    'checks',
    'payment',
    'payments',
    'transfer',
    'transfers',
    'question',
    'questions',
    'answer',
    'answers',
    'statement',
    'statements',
    'testimony',
    'testimonies',
    'deposition',
    'depositions',
    'interview',
    'interviews',
    'investigation',
    'investigations',
    'inquiry',
    'inquiries',
    'police',
    'fbi',
    'cia',
    'nsa',
    'doj',
    'sec',
    'irs',
    'news',
    'media',
    'press',
    'reporter',
    'reporters',
    'journalist',
    'journalists',
    'client',
    'clients',
    'mail',
    'information',
    'info',
    'subject',
    're',
    'fw',
    'fwd',
    'privileged',
    'confidential',
    'secret',
    'top',
    'classification',
    'rights',
    'reserved',
    'copyright',
    'guid',
    'uuid',
    'id',
    'all',
    'no',
    'any',
    'some',
    'yes',
    'com',
    'time',
    'date',
    'year',
    'month',
    'day',
    // Location names that are commonly extracted as entities
    'york',
    'florida',
    'california',
    'texas',
    'washington',
    'london',
    'paris',
    'moscow',
    'beijing',
    'tokyo',
    'berlin',
    'rome',
    'madrid',
    'vienna',
    'manhattan',
    'brooklyn',
    'queens',
    'bronx',
    'chicago',
    'boston',
    'miami',
    'angeles',
    'francisco',
    'seattle',
    'atlanta',
    'houston',
    'dallas',
    // Government/institutional terms
    'house',
    'senate',
    'congress',
    'parliament',
    'committee',
    'commission',
    'oversight',
    'judiciary',
    'intelligence',
    'armed',
    'services',
    'foreign',
    'relations',
    'appropriations',
    'budget',
    'ways',
    'means',
    // Common organizational terms
    'foundation',
    'institute',
    'center',
    'centre',
    'society',
    'association',
    'organization',
    'organisation',
    'corporation',
    'company',
    'group',
    'team',
    'department',
    'division',
    'bureau',
    'agency',
    'office',
    'administration',
    // Document/legal artifacts
    'supra',
    'infra',
    'ibid',
    'id',
    'cf',
    'see',
    'note',
    'notes',
    'footnote',
    'endnote',
    'appendix',
    'exhibit',
    'attachment',
    'annex',
    'schedule',
    'endstream',
    'endobj',
    'obj',
    'stream',
    'xref',
    'trailer',
    'startxref',
    'http',
    'https',
    'www',
    'pdf',
    'doc',
    'docx',
    'txt',
    'html',
    'xml',
    'available',
    'retrieved',
    'accessed',
    'downloaded',
    'uploaded',
    'posted',
    // Relationship/connection terms
    'friendship',
    'relationship',
    'connection',
    'association',
    'partnership',
    'collaboration',
    'alliance',
    'affiliation',
    'ties',
    'links',
    'bonds',
    // Test/placeholder data
    'test',
    'example',
    'sample',
    'placeholder',
    'dummy',
    'mock',
    'fake',
    'nt',
    'na',
    'n/a',
    'tbd',
    'tba',
    'unknown',
    'unnamed',
    'anonymous',
  ]);

  // Titles that should only appear with proper names
  private static readonly TITLES = new Set([
    'president',
    'senator',
    'governor',
    'professor',
    'prince',
    'princess',
    'king',
    'queen',
    'duke',
    'duchess',
    'lord',
    'lady',
    'sir',
    'dr',
    'mr',
    'mrs',
    'ms',
    'miss',
  ]);

  // Known person name variants that should be consolidated
  // AGGRESSIVE consolidation for top 100+ high-profile individuals
  // Variants should be specific enough to avoid false positives
  private static readonly NAME_VARIANTS: { [key: string]: string[] } = {
    // === PRIMARY TARGETS - MOST AGGRESSIVE CONSOLIDATION ===
    'Donald Trump': [
      'Trump',
      'DT',
      'DJT',
      'Donnie',
      'Donald',
      'President Trump',
      'The President',
      'Mr Trump',
      'Mr. Trump',
      'Trump Jr',
      'Donald Trump And',
      'Trump And',
      'Trump Is',
      'Trump To',
      'Trump The',
      'Trump But',
      'With Trump',
      'After Trump',
      'As Trump',
      'Under Trump',
      'Elect Trump',
      'Trump Importance',
      'Donald J Trump',
      'Donald J. Trump',
    ],
    'Jeffrey Epstein': [
      'Epstein',
      'Jeffrey',
      'Jeff Epstein',
      'J. Epstein',
      'J Epstein',
      'Mr Epstein',
      'Mr. Epstein',
      'Epstein And',
      'Epstein Is',
      'Epstein To',
      'Epstein The',
      'With Epstein',
      'After Epstein',
      'Jeffrey E',
    ],
    'Bill Clinton': [
      'Clinton',
      'President Clinton',
      'William Clinton',
      'Bill',
      'Mr Clinton',
      'Mr. Clinton',
      'William Jefferson Clinton',
      'Clinton And',
      'Clinton Is',
      'Clinton To',
      'With Clinton',
      'Former President Clinton',
      'Ex President Clinton',
    ],
    'Hillary Clinton': [
      'Hillary',
      'Secretary Clinton',
      'HRC',
      'Hillary Rodham Clinton',
      'Mrs Clinton',
      'Mrs. Clinton',
      'Senator Clinton',
      'Hillary And',
    ],
    'Ghislaine Maxwell': [
      'Maxwell',
      'Ghislaine',
      'G. Maxwell',
      'G Maxwell',
      'Ms Maxwell',
      'Ms. Maxwell',
      'Miss Maxwell',
      'Maxwell And',
      'Maxwell Is',
      'Maxwell To',
      'With Maxwell',
    ],
    'Prince Andrew': [
      'Prince Andrew',
      'Andrew',
      'Duke of York',
      'The Duke',
      'Prince Andrew And',
      'HRH Prince Andrew',
      'Andrew Windsor',
    ],
    'Alan Dershowitz': [
      'Dershowitz',
      'Professor Dershowitz',
      'Alan',
      'Prof Dershowitz',
      'Prof. Dershowitz',
      'Alan D',
      'Dershowitz And',
    ],

    // === OTHER HIGH-PROFILE INDIVIDUALS ===
    'Bill Gates': ['Gates', 'William Gates', 'Bill Gates And', 'Mr Gates', 'Mr. Gates'],
    'Jeff Bezos': ['Bezos', 'Jeffrey Bezos', 'Jeff Bezos And', 'Mr Bezos'],
    'Elon Musk': ['Musk', 'Elon', 'Elon Musk And', 'Mr Musk'],
    'Mark Zuckerberg': ['Zuckerberg', 'Mark', 'Zuckerberg And', 'Mr Zuckerberg'],
    'Tim Cook': ['Cook', 'Timothy Cook', 'Tim Cook And'],
    'Satya Nadella': ['Nadella', 'Satya', 'Nadella And'],
    'Sergey Brin': ['Brin', 'Sergey', 'Brin And'],
    'Larry Page': ['Page', 'Lawrence Page', 'Page And'],
    'Steve Jobs': ['Jobs', 'Steven Jobs', 'Jobs And'],
    'Warren Buffett': ['Buffett', 'Warren', 'Buffett And', 'Mr Buffett'],
    'Charlie Munger': ['Munger', 'Charles Munger', 'Munger And'],
    'Michael Bloomberg': ['Bloomberg', 'Mike Bloomberg', 'Mayor Bloomberg', 'Bloomberg And'],
    'Jamie Dimon': ['Dimon', 'James Dimon', 'Dimon And'],
    'Lloyd Blankfein': ['Blankfein', 'Lloyd', 'Blankfein And'],
    'Ken Griffin': ['Griffin', 'Kenneth Griffin', 'Griffin And'],
    'Les Wexner': ['Wexner', 'Leslie Wexner', 'Wexner And', 'Mr Wexner'],

    // === MEDIA / ENTERTAINMENT ===
    'Oprah Winfrey': ['Oprah', 'Winfrey', 'Ms Winfrey', 'Oprah And'],
    'Harvey Weinstein': ['Weinstein', 'Harvey', 'Mr Weinstein', 'Weinstein And', 'Harvey W'],
    'Kevin Spacey': ['Spacey', 'Kevin Spacey And'],
    'Woody Allen': ['Woody', 'Allen', 'Woody Allen And'],

    // === POLITICIANS ===
    'Barack Obama': [
      'Obama',
      'President Obama',
      'Barack',
      'Mr Obama',
      'Obama And',
      'Former President Obama',
    ],
    'George Bush': ['Bush', 'President Bush', 'George W Bush', 'George HW Bush', 'Bush And'],
    'Joe Biden': [
      'Biden',
      'President Biden',
      'Joe',
      'Mr Biden',
      'Biden And',
      'Vice President Biden',
    ],
    'Nancy Pelosi': ['Pelosi', 'Speaker Pelosi', 'Nancy', 'Pelosi And'],
    'Mitch McConnell': ['McConnell', 'Senator McConnell', 'Mitch', 'McConnell And'],

    // === ROYALTY ===
    'Queen Elizabeth': [
      'The Queen',
      'Queen Elizabeth II',
      'Her Majesty',
      'HM The Queen',
      'Elizabeth And',
    ],
    'King Charles': ['Prince Charles', 'Charles', 'King Charles III', 'HRH Prince Charles'],
    'Prince William': ['William', 'Duke of Cambridge', 'Prince William And'],
    'Prince Harry': ['Harry', 'Duke of Sussex', 'Prince Harry And'],

    // === SCIENTISTS / ACADEMICS ===
    'Stephen Hawking': ['Hawking', 'Professor Hawking', 'Dr Hawking'],
    'Neil deGrasse Tyson': ['Neil Tyson', 'Tyson', 'Dr Tyson'],
    'Lawrence Krauss': ['Krauss', 'Larry Krauss', 'Professor Krauss'],

    // === FINANCIERS ===
    'George Soros': ['Soros', 'Mr Soros', 'Soros And'],
    'Carl Icahn': ['Icahn', 'Carl Icahn And'],
    'Ray Dalio': ['Dalio', 'Ray Dalio And'],
    'Steve Cohen': ['Cohen', 'Steven Cohen'],
    'Leon Black': ['Black', 'Leon Black And', 'Mr Black'],
    'Glenn Dubin': ['Dubin', 'Glenn Dubin And', 'Mr Dubin'],
    'Jes Staley': ['Staley', 'Jes Staley And', 'Mr Staley'],

    // === TRUMP FAMILY (separate from Donald) ===
    'Ivanka Trump': ['Ivanka', 'Ivanka And', 'Ms Trump'],
    'Melania Trump': ['Melania', 'First Lady', 'Mrs Trump', 'Melania And'],
    'Donald Trump Jr': ['Don Jr', 'Donald Jr', 'Trump Jr And'],
    'Eric Trump': ['Eric', 'Eric Trump And'],
    'Jared Kushner': ['Kushner', 'Jared', 'Kushner And', 'Mr Kushner'],

    // === EPSTEIN ASSOCIATES ===
    'Jean-Luc Brunel': ['Brunel', 'Jean Luc Brunel', 'JL Brunel'],
    'Sarah Kellen': ['Kellen', 'Sarah Kellen And', 'Sarah K'],
    'Nadia Marcinkova': ['Marcinkova', 'Nadia', 'Nadia And'],
    'Lesley Groff': ['Groff', 'Lesley Groff And'],
    'Adriana Ross': ['Ross', 'Adriana', 'Adriana Ross And'],
  };

  // Organization names that should be recognized as entities
  private static readonly ORGANIZATION_NAMES = [
    'Russia',
    'Russian Federation',
    'Kremlin',
    'CIA',
    'Central Intelligence Agency',
    'FBI',
    'Federal Bureau of Investigation',
    'NSA',
    'National Security Agency',
    'MI6',
    'Secret Intelligence Service',
    'Mossad',
    'Institute for Intelligence and Special Operations',
    'Pentagon',
    'Department of Defense',
    'White House',
    'Executive Office',
    'State Department',
    'Department of State',
    'Treasury',
    'Department of Treasury',
    'Justice Department',
    'Department of Justice',
    'SEC',
    'Securities and Exchange Commission',
    'IRS',
    'Internal Revenue Service',
    'NASA',
    'National Aeronautics and Space Administration',
    'WHO',
    'World Health Organization',
    'UN',
    'United Nations',
    'NATO',
    'North Atlantic Treaty Organization',
    'WTO',
    'World Trade Organization',
    'IMF',
    'International Monetary Fund',
    'World Bank',
    'International Bank for Reconstruction and Development',
    'Goldman Sachs',
    'Goldman Sachs Group',
    'JPMorgan Chase',
    'JPMorgan Chase & Co',
    'Morgan Stanley',
    'Morgan Stanley & Co',
    'Bank of America',
    'Bank of America Corporation',
    'Citigroup',
    'Citigroup Inc',
    'Wells Fargo',
    'Wells Fargo & Company',
    'HSBC',
    'Hongkong and Shanghai Banking Corporation',
    'Barclays',
    'Barclays Bank',
    'Deutsche Bank',
    'Deutsche Bank AG',
    'Credit Suisse',
    'Credit Suisse Group',
    'UBS',
    'Union Bank of Switzerland',
    'BlackRock',
    'BlackRock Inc',
    'Vanguard',
    'The Vanguard Group',
    'Berkshire Hathaway',
    'Berkshire Hathaway Inc',
    'Harvard University',
    'Harvard College',
    'Stanford University',
    'Leland Stanford Junior University',
    'MIT',
    'Massachusetts Institute of Technology',
    'Oxford University',
    'University of Oxford',
    'Cambridge University',
    'University of Cambridge',
    'Yale University',
    'Yale College',
    'Princeton University',
    'College of New Jersey',
    'Columbia University',
    'Columbia College',
    'New York Times',
    'The New York Times',
    'Washington Post',
    'The Washington Post',
    'Wall Street Journal',
    'The Wall Street Journal',
    'Financial Times',
    'The Financial Times',
    'BBC',
    'British Broadcasting Corporation',
    'CNN',
    'Cable News Network',
    'Fox News',
    'Fox News Channel',
    'MSNBC',
    'Microsoft National Broadcasting Company',
    'CNBC',
    'Consumer News and Business Channel',
    'Reuters',
    'Reuters Ltd',
    'Associated Press',
    'The Associated Press',
    'Bloomberg',
    'Bloomberg L.P',
    'Forbes',
    'Forbes Media',
    'Fortune',
    'Fortune Magazine',
  ];

  /**
   * Check if a name is a valid person name
   */
  static isValidPersonName(name: string): boolean {
    const trimmed = name.trim();

    // Empty or too short
    if (!trimmed || trimmed.length < 3) {
      return false;
    }

    const words = trimmed.split(/\s+/);
    const lowerWords = words.map((w) => w.toLowerCase());
    const firstWord = lowerWords[0];
    const lastWord = lowerWords[lowerWords.length - 1];

    // Check if starts with common verb (sentence fragment)
    if (this.COMMON_VERBS.has(firstWord)) {
      return false;
    }

    // Check if starts with pronoun (e.g., "Who Was", "You Don")
    if (this.PRONOUNS.has(firstWord)) {
      return false;
    }

    // Check if starts with preposition (sentence fragment)
    if (this.PREPOSITIONS.has(firstWord)) {
      return false;
    }

    // Check if starts with past tense verb (e.g., "Watched Bret", "Praised Him")
    if (this.PAST_TENSE_VERBS.has(firstWord)) {
      return false;
    }

    // Check if starts with generic noun (e.g., "International Jet", "Federal Court")
    if (this.GENERIC_NOUNS.has(firstWord)) {
      return false;
    }

    // Check if ANY word (not just first) is a generic noun followed by another generic noun
    // This catches patterns like "Mail To", "Client Privileged", etc.
    for (let i = 0; i < lowerWords.length - 1; i++) {
      if (this.GENERIC_NOUNS.has(lowerWords[i]) && this.GENERIC_NOUNS.has(lowerWords[i + 1])) {
        return false;
      }
    }

    // Check if starts with conjunction (e.g., "And Bill Clinton")
    if (this.CONJUNCTIONS.has(firstWord)) {
      return false;
    }

    // Check if ends with preposition, conjunction, verb, or adverb (incomplete name)
    if (
      this.PREPOSITIONS.has(lastWord) ||
      this.CONJUNCTIONS.has(lastWord) ||
      this.COMMON_VERBS.has(lastWord) ||
      this.ADVERBS.has(lastWord)
    ) {
      return false;
    }

    // Check if starts with adverb (e.g., "Typically Preferred")
    if (this.ADVERBS.has(firstWord)) {
      return false;
    }

    // Reject names containing "with" (likely relationship descriptions)
    if (lowerWords.includes('with')) {
      return false;
    }

    // Reject names that are just "New" + location
    if (words.length === 2 && firstWord === 'new') {
      return false;
    }

    // Reject names starting with articles
    if (['the', 'a', 'an'].includes(firstWord)) {
      return false;
    }

    // Reject common polite phrases
    const commonPhrases = [
      'thank you',
      'if you',
      'please',
      'sorry',
      'excuse me',
      'hello',
      'goodbye',
      'yes sir',
      'no sir',
      'dear sir',
    ];
    if (commonPhrases.includes(trimmed.toLowerCase())) {
      return false;
    }

    // Reject names ending with reporting/communication verbs
    const reportingVerbs = new Set([
      'expressed',
      'stated',
      'said',
      'told',
      'asked',
      'replied',
      'responded',
      'answered',
      'explained',
      'described',
      'mentioned',
      'noted',
      'observed',
      'remarked',
      'commented',
      'testified',
    ]);
    if (reportingVerbs.has(lastWord)) {
      return false;
    }

    // Check for modal verb + infinitive pattern (e.g., "May Choose", "Will Offer")
    if (words.length >= 2) {
      for (let i = 0; i < words.length - 1; i++) {
        if (this.MODAL_VERBS.has(lowerWords[i]) && this.INFINITIVE_VERBS.has(lowerWords[i + 1])) {
          return false;
        }
      }
    }

    // Check for title + non-name pattern (e.g., "President Of Mexico", "Professor Who Once")
    if (this.TITLES.has(firstWord)) {
      if (words.length < 3) {
        // Title alone or title + one word is not enough
        return false;
      }
      const secondWord = lowerWords[1];
      const thirdWord = lowerWords.length > 2 ? lowerWords[2] : '';

      // Title + preposition/conjunction = invalid
      if (this.PREPOSITIONS.has(secondWord) || this.CONJUNCTIONS.has(secondWord)) {
        return false;
      }

      // Title + pronoun = invalid (e.g., "Professor Who Once")
      if (this.PRONOUNS.has(secondWord)) {
        return false;
      }

      // Title + past tense verb = invalid (e.g., "President Watched Bret")
      if (this.PAST_TENSE_VERBS.has(secondWord)) {
        return false;
      }

      // Title + generic noun = invalid (e.g., "President International Jet")
      if (this.GENERIC_NOUNS.has(secondWord)) {
        return false;
      }

      // Title + common verb = invalid (e.g., "President Going Outside")
      if (this.COMMON_VERBS.has(secondWord)) {
        return false;
      }

      // Title + infinitive verb = invalid (e.g., "President To Function")
      if (secondWord === 'to' && this.INFINITIVE_VERBS.has(thirdWord)) {
        return false;
      }
    }

    // Check for multiple conjunctions (sentence fragment)
    const conjunctionCount = lowerWords.filter((w) => this.CONJUNCTIONS.has(w)).length;
    if (conjunctionCount > 1) {
      return false;
    }

    // Check for preposition + article pattern (e.g., "of the", "from the")
    for (let i = 0; i < lowerWords.length - 1; i++) {
      if (this.PREPOSITIONS.has(lowerWords[i])) {
        const nextWord = lowerWords[i + 1];
        if (
          [
            'the',
            'a',
            'an',
            'this',
            'that',
            'these',
            'those',
            'his',
            'her',
            'their',
            'our',
            'my',
            'your',
            'its',
          ].includes(nextWord)
        ) {
          return false;
        }
      }
    }

    // Must have at least two words (first and last name)
    if (words.length < 2) {
      return false;
    }

    // Reject if more than 5 words (likely a phrase, not a name)
    if (words.length > 5) {
      return false;
    }

    // For 3+ word names, apply stricter validation
    if (words.length >= 3) {
      // Check if it looks like a sentence/phrase rather than a name
      // Count how many words are in our "bad word" sets
      let badWordCount = 0;
      for (const word of lowerWords) {
        if (
          this.GENERIC_NOUNS.has(word) ||
          this.COMMON_VERBS.has(word) ||
          this.PREPOSITIONS.has(word) ||
          this.ADVERBS.has(word)
        ) {
          badWordCount++;
        }
      }
      // If more than 1 bad word in a 3+ word name, reject it
      if (badWordCount > 1) {
        return false;
      }
    }

    // Each word should start with a capital letter (allow for Jr., Sr., III, etc.)
    for (const word of words) {
      // Allow common suffixes
      if (/^(Jr\.?|Sr\.?|II|III|IV|V)$/i.test(word)) {
        continue;
      }
      // Allow lowercase particles (de, van, von, etc.)
      if (/^(de|van|von|der|den|del|della|di|da|le|la|el|al)$/i.test(word)) {
        continue;
      }
      // Must start with capital and contain only letters (and possibly hyphens/apostrophes)
      if (!/^[A-Z][a-zA-Z'-]*$/.test(word)) {
        return false;
      }
    }

    // Name should not be too long
    if (trimmed.length > 50) {
      return false;
    }

    return true;
  }

  /**
   * Check if a name is a valid organization name
   */
  static isValidOrganizationName(name: string): boolean {
    // Only accept EXACT matches or very close variants (not substring matches)
    const nameLower = name.toLowerCase().trim();
    return this.ORGANIZATION_NAMES.some((org) => {
      const orgLower = org.toLowerCase();
      // Exact match
      if (nameLower === orgLower) return true;
      // Allow "The X" variants for orgs that don't start with "The"
      if (nameLower === `the ${orgLower}` || orgLower === `the ${nameLower}`) return true;
      return false;
    });
  }

  /**
   * Check if a name is a valid entity (person or organization)
   */
  static isValidEntity(name: string): boolean {
    return this.isValidPersonName(name) || this.isValidOrganizationName(name);
  }

  /**
   * Consolidate person name variants to a canonical name
   */
  static consolidatePersonName(name: string): string {
    // Normalize the name
    const normalizedName = name.trim();

    // Check if this name is a variant of a known person
    for (const [canonicalName, variants] of Object.entries(this.NAME_VARIANTS)) {
      if (
        variants.some(
          (variant) =>
            variant.toLowerCase() === normalizedName.toLowerCase() ||
            normalizedName.toLowerCase().includes(variant.toLowerCase()),
        )
      ) {
        return canonicalName;
      }
    }

    return normalizedName;
  }

  /**
   * Get all canonical names from a list of entity names
   */
  static getCanonicalNames(names: string[]): string[] {
    const canonicalNames = new Set<string>();

    for (const name of names) {
      if (this.isValidEntity(name)) {
        const canonical = this.consolidatePersonName(name);
        canonicalNames.add(canonical);
      }
    }

    return Array.from(canonicalNames);
  }

  /**
   * Filter and consolidate a list of entities
   */
  static filterAndConsolidateEntities(entities: Entity[]): Entity[] {
    const validEntities: Entity[] = [];
    const seenNames = new Set<string>();

    for (const entity of entities) {
      if (!this.isValidEntity(entity.name)) {
        continue;
      }

      const canonicalName = this.consolidatePersonName(entity.name);

      if (seenNames.has(canonicalName.toLowerCase())) {
        continue;
      }

      seenNames.add(canonicalName.toLowerCase());
      validEntities.push({
        ...entity,
        name: canonicalName,
      });
    }

    return validEntities;
  }
}
