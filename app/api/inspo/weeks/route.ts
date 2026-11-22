import { NextResponse } from "next/server";
import { fail } from "@/lib/inspo/http";
import { getStore } from "@/lib/inspo/store";
import { parseWeekAction } from "@/lib/inspo/validate";

export async function POST(request: Request) {
  try {
    const body = parseWeekAction(await request.json());
    const store = getStore();
    if (body.action === "rollover") return NextResponse.json(await store.rollover(body.weekKey));
    return NextResponse.json(await store.clearWeek(body.weekKey));
  } catch (error) {
    return fail(error);
  }
}
