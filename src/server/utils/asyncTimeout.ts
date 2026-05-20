type TimeoutFallbackOptions = {
  timeoutMs: number;
  onTimeout?: () => void;
};

type TimeoutRejectOptions = {
  timeoutMs: number;
  timeoutMessage: string;
  onTimeout?: () => void | Promise<void>;
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

export const withTimeoutReject = async <T>(
  promise: Promise<T>,
  options: TimeoutRejectOptions,
): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => {
          void (async () => {
            try {
              await options.onTimeout?.();
            } finally {
              reject(new Error(options.timeoutMessage));
            }
          })();
        }, options.timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};
