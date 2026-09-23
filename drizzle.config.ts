import { defineConfig } from 'drizzle-kit'

/**
 * drizzle-kit が担当するのはマイグレーション SQL の生成のみ。
 * D1 への適用は wrangler（`pnpm db:migrate:local` / `pnpm db:migrate:remote`）が行うため、
 * 接続用の driver / dbCredentials は持たない。
 * `out` は wrangler.jsonc の `migrations_dir` と一致させること。
 */
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
})
