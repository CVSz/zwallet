const DEFAULT_TIMEOUT_MS = 12_000;

export class ApiClientError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(message: string, status = 500, details: unknown = undefined) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.details = details;
  }
}

function buildApiUrl(pathname: string): string {
  const configuredBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!configuredBase) {
    return pathname;
  }

  const normalizedBase = configuredBase.endsWith("/")
    ? configuredBase.slice(0, -1)
    : configuredBase;

  return `${normalizedBase}${pathname}`;
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

interface RequestJsonOptions extends Omit<RequestInit, "body"> {
  body?: string;
  timeoutMs?: number;
}

export async function requestJson<T>(
  pathname: string,
  parser: (value: unknown) => T,
  options: RequestJsonOptions = {}
): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers = new Headers(options.headers);
  if (!headers.has("content-type") && options.body) {
    headers.set("content-type", "application/json");
  }

  try {
    const response = await fetch(buildApiUrl(pathname), {
      method: options.method ?? "GET",
      cache: "no-store",
      ...options,
      headers,
      signal: controller.signal,
    });

    const payload = await parseJsonSafely(response);

    if (!response.ok) {
      const message =
        typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof payload.error === "string"
          ? payload.error
          : `Request failed (${response.status})`;

      throw new ApiClientError(message, response.status, payload);
    }

    return parser(payload);
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiClientError("Request timed out", 408);
    }

    throw new ApiClientError(
      error instanceof Error ? error.message : "Unknown API client error"
    );
  } finally {
    clearTimeout(timer);
  }
}
