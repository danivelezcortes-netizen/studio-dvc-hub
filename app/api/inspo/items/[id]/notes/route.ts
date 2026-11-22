import { NextResponse } from "next/server";
import { fail } from "@/lib/inspo/http";
import { getStore } from "@/lib/inspo/store";
import { assertRecordId, parseNoteText } from "@/lib/inspo/validate";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    assertRecordId(id);
    const text = parseNoteText(await request.json());
    return NextResponse.json(await getStore().addNote(id, text), { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
