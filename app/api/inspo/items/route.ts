import { NextResponse } from "next/server";
import { fail } from "@/lib/inspo/http";
import { readItemRequest } from "@/lib/inspo/payload";
import { getStore } from "@/lib/inspo/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getStore().load());
  } catch (error) {
    return fail(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    const { input, image } = await readItemRequest(request);
    const item = await getStore().create(input, image);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
