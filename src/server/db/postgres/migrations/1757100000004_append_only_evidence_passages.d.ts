export function up(pgm: { sql: (statement: string) => unknown }): Promise<void> | void;
export function down(pgm: { sql: (statement: string) => unknown }): Promise<void> | void;
