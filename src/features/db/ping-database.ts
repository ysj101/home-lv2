import { env } from 'cloudflare:workers'
import { createServerFn } from '@tanstack/react-start'

/**
 * D1 バインディングへの疎通確認。
 * Server Function から `env.DB` に到達できることを担保する。
 */
export const pingDatabase = createServerFn().handler(async () => {
  const { results } = await env.DB.prepare('SELECT 1 AS ok').all<{
    ok: number
  }>()

  return { ok: results[0]?.ok === 1 }
})
