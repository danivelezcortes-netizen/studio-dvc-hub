import "server-only";

import postgres from "postgres";
import { databaseUrl } from "./config";
import { StorageError } from "./errors";
import type { Sql } from "./sql";

let client: ReturnType<typeof postgres> | null = null;

export function getSql(): Sql {
  const url = databaseUrl();
  if (!url) throw new StorageError("Falta DATABASE_URL.", 503);
  if (!client) {
    client = postgres(url, {
      max: 1,
      prepare: false,
      ssl: "require",
      idle_timeout: 20,
      connect_timeout: 15,
    });
  }
  return adapt(client);
}

function adapt(sql: postgres.Sql | postgres.TransactionSql): Sql {
  return {
    async query<T extends Record<string, unknown>>(text: string, params: unknown[] = []) {
      const rows = await sql.unsafe(text, params as never[]);
      return rows as unknown as T[];
    },
    transaction<T>(fn: (tx: Sql) => Promise<T>) {
      if (!("begin" in sql)) throw new StorageError("Esta conexión no abre transacciones.", 500);
      return sql.begin((tx) => fn(adapt(tx)));
    },
  };
}

export function databaseMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "No pude usar la base de datos.";
  return message.replace(/postgres(?:ql)?:\/\/\S+/gi, "postgresql://•••");
}
