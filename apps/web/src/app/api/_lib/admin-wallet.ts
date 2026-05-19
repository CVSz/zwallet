import { NextResponse } from "next/server";

import { parseWalletOverview, type WalletOverview } from "@/lib/api/types";

const DEFAULT_ADMIN_WALLET_ORIGIN = "http://127.0.0.1:8081";

function getAdminWalletOrigin(): string {
  return (
    process.env.ADMIN_WALLET_API_BASE_URL ??
    process.env.NEXT_PUBLIC_ADMIN_WALLET_API_BASE_URL ??
    DEFAULT_ADMIN_WALLET_ORIGIN
  );
}

function getForwardHeaders(request: Request): Headers {
  const headers = new Headers();

  const authorization = request.headers.get("authorization");
  if (authorization) {
    headers.set("authorization", authorization);
  }

  headers.set("accept", "application/json");

  return headers;
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export async function fetchRuntimeOverview(request: Request): Promise<WalletOverview> {
  const response = await fetch(`${getAdminWalletOrigin()}/api/overview`, {
    method: "GET",
    headers: getForwardHeaders(request),
    cache: "no-store",
  });

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `Admin API request failed (${response.status})`;

    throw new Error(message);
  }

  return parseWalletOverview(payload);
}

export function errorResponse(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : "Failed to fetch admin overview";

  return NextResponse.json(
    {
      error: message,
    },
    { status: 502 }
  );
}
