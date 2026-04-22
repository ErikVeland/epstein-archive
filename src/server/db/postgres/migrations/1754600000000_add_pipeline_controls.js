export const up = (pgm) => {
  pgm.sql(
    'ALTER TABLE "pipeline_runs" ADD COLUMN IF NOT EXISTS "control_signal" text DEFAULT NULL',
  );
};

export const down = (pgm) => {
  pgm.dropColumn('pipeline_runs', 'control_signal');
};
