import { NextRequest, NextResponse } from "next/server";
import { getSearchSuggestions } from "@/services/products/search.service";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const suggestions = await getSearchSuggestions(q);
  return NextResponse.json({ suggestions });
}
