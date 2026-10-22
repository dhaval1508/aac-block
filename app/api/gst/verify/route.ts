import { NextRequest, NextResponse } from "next/server";
import { verifyGstNumber } from "@/lib/gst";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const gstin = String(body.gstin ?? "").trim();

    if (!gstin) {
      return NextResponse.json(
        { valid: false, error: "GST Number is required." },
        { status: 400 }
      );
    }

    const result = await verifyGstNumber(gstin);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, error: error?.message || "Failed to verify GST number." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gstin = searchParams.get("gstin") || "";

  if (!gstin) {
    return NextResponse.json(
      { valid: false, error: "GST Number parameter is required." },
      { status: 400 }
    );
  }

  const result = await verifyGstNumber(gstin);
  return NextResponse.json(result);
}
