export function isAbortLikeError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return err.name === 'AbortError' || msg.includes('aborted') || msg.includes('timeout');
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((err: unknown) => {
        clearTimeout(timeoutId);
        if (isAbortLikeError(err)) {
          reject(new Error(timeoutMessage));
          return;
        }
        reject(err);
      });
  });
}
