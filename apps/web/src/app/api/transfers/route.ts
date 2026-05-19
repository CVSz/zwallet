import { NextResponse } from "next/server";

import { errorResponse, fetchRuntimeOverview } from "@/app/api/_lib/admin-wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const overview = await fetchRuntimeOverview(request);
    return NextResponse.json(overview.transfers, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
