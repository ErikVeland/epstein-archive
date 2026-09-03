// Reference portraits identify a candidate profile. They are not Black Book evidence.
export const blackBookPortraits: Record<string, { path: string; source: string; credit: string }> =
  {
    'Donald Trump': {
      path: '/reference-portraits/donald-trump.jpg',
      source:
        'https://commons.wikimedia.org/wiki/File:Official_Presidential_Portrait_of_President_Donald_J._Trump_(2025).jpg',
      credit: 'Daniel Torok / White House, 2025. Public domain.',
    },
    'Ghislaine Maxwell': {
      path: '/reference-portraits/ghislaine-maxwell.jpg',
      source:
        'https://commons.wikimedia.org/wiki/File:Ghislaine_Maxwell_2020_mug_shot_(cropped).jpg',
      credit: 'Federal Bureau of Prisons. Date unconfirmed. Public domain.',
    },
    'Richard Branson': {
      path: '/reference-portraits/richard-branson.jpg',
      source:
        'https://commons.wikimedia.org/wiki/File:Richard_Branson_Addresses_the_Our_Ocean_Conference_2015_in_Valparaíso_(21783214958)_(cropped).jpg',
      credit: 'U.S. Department of State, 2015. Public domain.',
    },
  };
