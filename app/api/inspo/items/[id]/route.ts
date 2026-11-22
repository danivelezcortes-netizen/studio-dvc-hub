import { fail } from "@/lib/inspo/http";
import { readItemRequest } from "@/lib/inspo/payload";
import { getStore } from "@/lib/inspo/store";
import { assertRecordId } from "@/lib/inspo/validate";
import { NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    assertRecordId(id);
    const { input, image, removeImage } = await readItemRequest(request);
    const item = await getStore().update(id, input, image, removeImage);
    return NextResponse.json(item);
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    assertRecordId(id);
    await getStore().remove(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
