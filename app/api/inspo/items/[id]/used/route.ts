import { NextResponse } from "next/server";
import { fail } from "@/lib/inspo/http";
import { getStore } from "@/lib/inspo/store";
import { assertRecordId, parseUsed } from "@/lib/inspo/validate";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    assertRecordId(id);
    const body = parseUsed(await request.json());
    return NextResponse.json(await getStore().markUsed(id, body.weekKey, body.used));
  } catch (error) {
    return fail(error);
  }
}
