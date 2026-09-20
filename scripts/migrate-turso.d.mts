import type { Client } from "@libsql/client";

export const DEFAULT_MIGRATIONS_DIR: string;
export const TRACKING_TABLE: string;

export type Migration = { name: string; sql: string; checksum: string };

export function listMigrations(dir?: string): Promise<Migration[]>;

export function planMigrations(
  migrations: Migration[],
  applied: Map<string, string>,
): { pending: Migration[]; errors: string[]; unknown: string[] };

export function migrate(
  client: Client,
  options?: { dir?: string; dryRun?: boolean; log?: (message: string) => void },
): Promise<{ applied: string[] }>;

export function backfillFamilies(client: Client, log?: (message: string) => void): Promise<number>;
