export function extractPgCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code?: unknown }).code || '');
  }
  return '';
}

export function isPgTimeout(error: unknown): boolean {
  const code = extractPgCode(error);
  const message = error instanceof Error ? error.message : String(error);
  return code === '57014' || /statement timeout|query read timeout|timeout/i.test(message);
}

export function isPgConnectionFailure(error: unknown): boolean {
  const code = extractPgCode(error);
  const message = error instanceof Error ? error.message : String(error);
  return (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    code === '57P01' ||
    /database connection failed|connect ECONNREFUSED|Connection terminated unexpectedly|Client has encountered a connection error/i.test(
      message,
    )
  );
}
