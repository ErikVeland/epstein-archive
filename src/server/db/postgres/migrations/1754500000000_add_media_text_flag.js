export const up = (pgm) => {
  pgm.addColumn('media_items', {
    has_text: { type: 'boolean' },
  });
};

export const down = (pgm) => {
  pgm.dropColumn('media_items', 'has_text');
};
