import { defineConfig } from 'drizzle-kit'

/**
 * マイグレーションの生成のみを drizzle-kit が担当する。
 * D1 への適用は wrangler（`pnpm db:migrate:local` / `pnpm db:migrate:remote`）で行う。
 */
export default defineConfig({
  dialect: 'sqlite',
  driver: 'd1-http',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
})
