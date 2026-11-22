import { NextResponse } from "next/server";
import { fail } from "@/lib/inspo/http";
import { getStore } from "@/lib/inspo/store";
import { assertRecordId, parseNoteText } from "@/lib/inspo/validate";

type Context = { params: Promise<{ id: string; noteId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { id, noteId } = await context.params;
    assertRecordId(id);
    assertRecordId(noteId);
    const text = parseNoteText(await request.json());
    return NextResponse.json(await getStore().updateNote(id, noteId, text));
  } catch (error) {
    return fail(error);
  }
}
