export async function waitForAll<const T extends readonly unknown[]>(
  promises: T,
): Promise<{ -readonly [K in keyof T]: Awaited<T[K]> }> {
  const results = await Promise.allSettled(promises);
  return results.map((result) => {
    if (result.status === 'rejected') throw result.reason;
    return result.value;
  }) as { -readonly [K in keyof T]: Awaited<T[K]> };
}

export async function runConcurrent<const T extends readonly (() => Promise<unknown>)[]>(
  tasks: T,
  limit: number,
): Promise<{ -readonly [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError('Concurrency must be a positive integer.');
  }
  const results: unknown[] = new Array(tasks.length);
  let next = 0;
  let failed = false;
  let failure: unknown;
  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, async () => {
      while (!failed && next < tasks.length) {
        const index = next++;
        try {
          results[index] = await tasks[index]();
        } catch (error) {
          if (!failed) failure = error;
          failed = true;
        }
      }
    }),
  );
  if (failed) throw failure;
  return results as { -readonly [K in keyof T]: Awaited<ReturnType<T[K]>> };
}
