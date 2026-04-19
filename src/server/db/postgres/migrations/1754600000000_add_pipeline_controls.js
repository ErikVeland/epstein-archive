export const up = (pgm) => {
  pgm.addColumn('pipeline_runs', {
    control_signal: { type: 'text', default: null },
  });
};

export const down = (pgm) => {
  pgm.dropColumn('pipeline_runs', 'control_signal');
};
