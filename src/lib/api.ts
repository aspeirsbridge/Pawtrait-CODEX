export type ApiErrorCode =
  | "TIMEOUT"
  | "NETWORK"
  | "RATE_LIMITED"
  | "AUTH"
  | "PERMISSION"
  | "STORAGE"
  | "SERVER"
  | "VALIDATION"
  | "UNKNOWN";

export class ApiClientError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;
  readonly retryable: boolean;
  readonly operation: string;

  constructor(params: {
    message: string;
    code: ApiErrorCode;
    operation: string;
    status?: number;
    retryable?: boolean;
  }) {
    super(params.message);
    this.name = "ApiClientError";
    this.code = params.code;
    this.operation = params.operation;
    this.status = params.status;
    this.retryable = Boolean(params.retryable);
  }
}

type ApiRunOptions = {
  operation: string;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
};

const DEFAULT_TIMEOUT_MS = 25_000;
const DEFAULT_RETRY_DELAY_MS = 700;

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parseStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const maybeStatus = (error as { status?: unknown }).status;
  if (typeof maybeStatus === "number") return maybeStatus;
  const maybeStatusCode = (error as { statusCode?: unknown }).statusCode;
  if (typeof maybeStatusCode === "number") return maybeStatusCode;
  return undefined;
}

function parseMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const msg = (error as { message?: unknown; error_description?: unknown }).message
      ?? (error as { error_description?: unknown }).error_description;
    if (typeof msg === "string") return msg;
  }
  return "Unexpected error";
}

function mapCode(message: string, status?: number): ApiErrorCode {
  const m = message.toLowerCase();

  if (m.includes("timeout") || m.includes("timed out")) return "TIMEOUT";
  if (m.includes("failed to fetch") || m.includes("network")) return "NETWORK";
  if (status === 429 || m.includes("rate limit") || m.includes("too many requests")) {
    return "RATE_LIMITED";
  }
  if (
    m.includes("invalid login") ||
    m.includes("email not confirmed") ||
    m.includes("auth") ||
    status === 401
  ) {
    return "AUTH";
  }
  if (m.includes("row-level security") || status === 403 || m.includes("permission")) {
    return "PERMISSION";
  }
  if (m.includes("storage") || m.includes("bucket") || m.includes("object")) {
    return "STORAGE";
  }
  if (status && status >= 500) return "SERVER";
  if (status === 400 || m.includes("invalid") || m.includes("required")) return "VALIDATION";
  return "UNKNOWN";
}

function isRetryable(code: ApiErrorCode, status?: number): boolean {
  if (code === "NETWORK" || code === "TIMEOUT" || code === "RATE_LIMITED") return true;
  if (typeof status === "number" && RETRYABLE_STATUS.has(status)) return true;
  return false;
}

function toApiError(error: unknown, operation: string): ApiClientError {
  const message = parseMessage(error);
  const status = parseStatus(error);
  const code = mapCode(message, status);

  return new ApiClientError({
    message,
    code,
    status,
    operation,
    retryable: isRetryable(code, status),
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new ApiClientError({
        message: `${operation} timed out after ${timeoutMs}ms`,
        code: "TIMEOUT",
        operation,
        retryable: true,
      }));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function runApi<T>(fn: () => Promise<T>, options: ApiRunOptions): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? 0;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

  let lastError: ApiClientError | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await withTimeout(fn(), timeoutMs, options.operation);
    } catch (error) {
      const apiError = error instanceof ApiClientError ? error : toApiError(error, options.operation);
      lastError = apiError;

      const shouldRetry = apiError.retryable && attempt < retries;
      if (!shouldRetry) {
        throw apiError;
      }

      await sleep(retryDelayMs * (attempt + 1));
    }
  }

  throw lastError ??
    new ApiClientError({
      message: `${options.operation} failed`,
      code: "UNKNOWN",
      operation: options.operation,
    });
}

export function getUserFriendlyErrorMessage(error: unknown): string {
  const apiError = error instanceof ApiClientError ? error : toApiError(error, "operation");

  switch (apiError.code) {
    case "AUTH":
      return "Authentication failed. Check your login details and try again.";
    case "RATE_LIMITED":
      return "Too many requests right now. Please wait a moment and retry.";
    case "STORAGE":
      return "Image storage failed. Please try again.";
    case "PERMISSION":
      return "You do not have permission for this action.";
    case "TIMEOUT":
      return "The request took too long. Please try again.";
    case "NETWORK":
      return "Network error. Check your connection and try again.";
    case "VALIDATION":
      return apiError.message || "Some required data is invalid.";
    case "SERVER":
      return "Server error. Please try again shortly.";
    default:
      return apiError.message || "Something went wrong. Please try again.";
  }
}
