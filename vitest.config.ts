import { defineConfig } from 'vitest/config'

/**
 * ユニットテストは Cloudflare Workers ランタイムを必要としない純粋関数が対象のため、
 * vite.config.ts（Workers / TanStack Start / Tailwind プラグイン入り）とは分けている。
 * パスエイリアスは tsconfig.json の `paths` を唯一の定義元とする。
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
