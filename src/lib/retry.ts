export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 2000,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      if (attempt === maxAttempts || !isRetryable(error)) throw error;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.log(`Retryable error, attempt ${attempt}/${maxAttempts}. Retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("unreachable");
}

function isRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const status =
    "status" in error ? (error as { status: number }).status : 0;
  if (status === 429 || status === 503) return true;
  const msg = error.message;
  return msg.includes("UNAVAILABLE") || msg.includes("overloaded");
}
