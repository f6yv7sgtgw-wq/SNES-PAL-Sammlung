export class ParserRequestError extends Error {
  retryable: boolean;
  status: number | null;

  constructor(message: string, options: { retryable: boolean; status?: number | null }) {
    super(message);
    this.name = "ParserRequestError";
    this.retryable = options.retryable;
    this.status = options.status ?? null;
  }
}

export function isTransientParserFailure(error: unknown) {
  if (error instanceof ParserRequestError) return error.retryable;
  if (!error || typeof error !== "object") return false;

  const candidate = error as { name?: unknown; message?: unknown };
  const name = typeof candidate.name === "string" ? candidate.name : "";
  const message = typeof candidate.message === "string" ? candidate.message : "";
  return (
    name === "AbortError" ||
    name === "TypeError" ||
    /load failed|failed to fetch|networkerror|network request failed|fetch.*failed/i.test(message)
  );
}

export async function withTransientParserRetries<T>(
  operation: (attempt: number) => Promise<T>,
  options: {
    delays?: number[];
    onRetry?: (retryNumber: number, totalAttempts: number, error: unknown) => void;
    sleep?: (milliseconds: number) => Promise<void>;
  } = {},
) {
  const delays = options.delays ?? [1_500, 4_000];
  const sleep =
    options.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds)));
  const totalAttempts = delays.length + 1;

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (!isTransientParserFailure(error) || attempt >= delays.length) throw error;
      options.onRetry?.(attempt + 1, totalAttempts, error);
      await sleep(delays[attempt]);
    }
  }
}

export function isRetryableHttpStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}
