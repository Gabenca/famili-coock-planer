import { NextResponse } from "next/server";

import { demoShoppingList } from "@/data/demo";

export async function GET() {
  return NextResponse.json({ items: demoShoppingList });
}
