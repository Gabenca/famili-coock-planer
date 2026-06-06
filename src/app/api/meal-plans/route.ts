import { NextResponse } from "next/server";

import { demoPlan } from "@/data/demo";

export async function GET() {
  return NextResponse.json({ plan: demoPlan });
}
