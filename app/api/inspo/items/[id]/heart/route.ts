import { NextResponse } from "next/server";
import { fail } from "@/lib/inspo/http";
import { getStore } from "@/lib/inspo/store";
import { assertRecordId } from "@/lib/inspo/validate";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    assertRecordId(id);
    return NextResponse.json(await getStore().heart(id));
  } catch (error) {
    return fail(error);
  }
}
