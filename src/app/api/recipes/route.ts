import { NextResponse } from "next/server";

import { demoRecipes } from "@/data/demo";

export async function GET() {
  return NextResponse.json({ recipes: demoRecipes });
}
