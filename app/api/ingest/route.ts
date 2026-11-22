import { NextResponse } from "next/server";
import { authorizeIngest } from "@/lib/inspo/ingest-auth";
import { fail } from "@/lib/inspo/http";
import { readItemRequest } from "@/lib/inspo/payload";
import { getStore } from "@/lib/inspo/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = authorizeIngest(request.headers.get("authorization"));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const { input, image } = await readItemRequest(request);
    const item = await getStore().create(input, image);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
