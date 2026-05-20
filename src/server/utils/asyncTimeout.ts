type TimeoutFallbackOptions = {
  timeoutMs: number;
  onTimeout?: () => void;
};

export const withTimeoutFallback = async <T>(
  promise: Promise<T>,
  fallback: T,
  options: TimeoutFallbackOptions,
): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeout = setTimeout(() => {
          options.onTimeout?.();
          resolve(fallback);
        }, options.timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};
