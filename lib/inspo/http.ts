import { NextResponse } from "next/server";
import { StorageError } from "./errors";

export function fail(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "No se pudo completar.";
  if (error instanceof StorageError) status = error.status;
  else if (message === "No está en el tablero." || message === "Esa nota no está.") status = 404;
  return NextResponse.json({ error: message }, { status });
}
