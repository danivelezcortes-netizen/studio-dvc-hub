export type Sql = {
  query<T extends Record<string, unknown> = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  transaction<T>(fn: (tx: Sql) => Promise<T>): Promise<T>;
};
