import "server-only"
import { createHmac } from "node:crypto"

type Environment = Record<string, string | undefined>
export type RedisCommand = (command: (string | number)[]) => Promise<unknown>

// Each script is atomic at the Redis primary. No form values are sent to Redis.
export const RATE_SCRIPT = `
local client = tonumber(redis.call('GET', KEYS[1]) or '0')
local total = tonumber(redis.call('GET', KEYS[2]) or '0')
if client >= 5 or total >= 100 then return 0 end
for i = 1, 2 do
  if redis.call('INCR', KEYS[i]) == 1 then redis.call('EXPIRE', KEYS[i], 900) end
end
return 1`

export const CLAIM_SCRIPT = `
local old = redis.call('GET', KEYS[1])
if old then
  if string.sub(old, 1, 64) ~= ARGV[1] then return 'conflict' end
  if old == ARGV[1] .. ':done' then return 'done' end
  return 'pending'
end
redis.call('SET', KEYS[1], ARGV[1] .. ':pending', 'EX', 86400)
return 'claimed'`

export const FINISH_SCRIPT = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] .. ':pending' then return 0 end
redis.call('SET', KEYS[1], ARGV[1] .. ':done', 'EX', 86400)
return 1`

export function redisConfiguration(env: Environment) {
  const raw = env.UPSTASH_REDIS_REST_URL?.trim()
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim()
  const secret = env.RATE_LIMIT_SECRET
  if (!raw || !token || /\s/.test(token) || !secret || secret.length < 32) throw new Error("Protection unavailable")
  const url = new URL(raw)
  if (url.protocol !== "https:" || !url.hostname.endsWith(".upstash.io") || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error("Protection unavailable")
  return { url: url.origin, token, secret }
}

export function redisCommand(env: Environment, fetcher: typeof fetch = fetch): RedisCommand {
  const config = redisConfiguration(env)
  return async (command) => {
    try {
      const response = await fetcher(config.url, {
        method: "POST", headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(command), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(4000),
      })
      if (!response.ok) throw new Error("Protection unavailable")
      const body = await response.json()
      if (!body || body.error || !("result" in body)) throw new Error("Protection unavailable")
      return body.result
    } catch { throw new Error("Protection unavailable") }
  }
}

export function createFormProtection(env: Environment, injectedCommand?: RedisCommand) {
  const { secret } = redisConfiguration(env)
  const environment = env.VERCEL_ENV ?? (env.VERCEL === "1" ? "" : "development")
  if (!["production", "preview", "development"].includes(environment)) throw new Error("Protection unavailable")
  const command = injectedCommand ?? redisCommand(env)
  const hash = (purpose: string, value: string) => createHmac("sha256", secret).update(`${purpose}:${value}`).digest("hex")
  const prefix = `onne:forms:v2:${environment}:${hash("namespace", "forms").slice(0, 16)}`
  return {
    async allow(kind: string, ip: string) {
      const result = await command(["EVAL", RATE_SCRIPT, 2, `${prefix}:${kind}:client:${hash("ip", ip)}`, `${prefix}:${kind}:total`])
      if (result !== 0 && result !== 1) throw new Error("Protection unavailable")
      return result === 1
    },
    async claim(kind: string, ip: string, id: string, values: object) {
      const key = `${prefix}:${kind}:submission:${hash("request", `${ip}:${id}`)}`
      const fingerprint = hash("payload", JSON.stringify(values))
      const result = await command(["EVAL", CLAIM_SCRIPT, 1, key, fingerprint])
      if (!["claimed", "done", "pending", "conflict"].includes(String(result))) throw new Error("Protection unavailable")
      return { result, async finish() {
        if (await command(["EVAL", FINISH_SCRIPT, 1, key, fingerprint]) !== 1) throw new Error("Protection unavailable")
      } }
    },
  }
}
