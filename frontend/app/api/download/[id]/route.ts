import { NextRequest, NextResponse } from "next/server";
import { runApprovedDeliveryGate, type ApprovedDeliveryGateResult } from "@/lib/approved-delivery-gate";

export const dynamic = "force-dynamic";

function approvedDeliveryGateResponse(result: ApprovedDeliveryGateResult) {
  if (result.kind === "image") {
    return new NextResponse(result.body, { status: result.status, headers: result.headers });
  }
  return NextResponse.json(result.body, { status: result.status });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return approvedDeliveryGateResponse(
    await runApprovedDeliveryGate({
      request,
      assetId: (await params).id,
      intent: "deliver-copy"
    })
  );
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return approvedDeliveryGateResponse(
    await runApprovedDeliveryGate({
      request,
      assetId: (await params).id,
      intent: "request-ticket"
    })
  );
}
