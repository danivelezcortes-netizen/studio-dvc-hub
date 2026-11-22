import type { Sql } from "./sql";

const STATEMENTS = [
  `create table if not exists inspo_items (
    id text primary key,
    external_id text not null unique,
    title text not null,
    type text not null,
    tags text[] not null default '{}',
    pillar text not null default '',
    status text not null default '',
    source text not null,
    source_url text not null default '',
    account text not null default '',
    origin text not null default '',
    added_by text not null,
    saved_at date not null,
    image_path text,
    image_url text not null default '',
    drive_url text not null default '',
    notion_url text not null default '',
    notion_page_id text,
    how_to_use text not null default '',
    sound text not null default '',
    frame text,
    week_key text,
    used boolean not null default false,
    used_at timestamptz,
    created_at timestamptz not null,
    updated_at timestamptz not null
  )`,
  `create table if not exists inspo_notes (
    id text primary key,
    item_id text not null references inspo_items(id) on delete cascade,
    text text not null,
    created_at timestamptz not null,
    updated_at timestamptz not null
  )`,
  `create index if not exists inspo_notes_item on inspo_notes (item_id, created_at)`,
  `create table if not exists inspo_week_history (
    item_id text not null references inspo_items(id) on delete cascade,
    week_key text not null,
    used boolean not null,
    used_at timestamptz,
    primary key (item_id, week_key)
  )`,
  `create table if not exists inspo_notion_outbox (
    id text primary key,
    item_id text not null,
    op text not null,
    notion_page_id text,
    attempts integer not null default 0,
    last_error text,
    created_at timestamptz not null default now(),
    synced_at timestamptz
  )`,
  `create index if not exists inspo_notion_outbox_pending on inspo_notion_outbox (created_at) where synced_at is null`,
  `create table if not exists login_attempts (
    id bigserial primary key,
    key_hash text not null,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists login_attempts_key_time on login_attempts (key_hash, created_at)`,
];

const ready = new WeakMap<Sql, Promise<void>>();

export function ensureSchema(sql: Sql): Promise<void> {
  const existing = ready.get(sql);
  if (existing) return existing;
  const pending = migrate(sql).catch((error: unknown) => {
    ready.delete(sql);
    throw error;
  });
  ready.set(sql, pending);
  return pending;
}

async function migrate(sql: Sql): Promise<void> {
  for (const statement of STATEMENTS) {
    await sql.query(statement);
  }
}
