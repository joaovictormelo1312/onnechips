import test from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import net from "node:net"
import nodemailer from "nodemailer"
import { registerHooks } from "node:module"

// Match the extensionless TypeScript resolution used by Next.js, in Node tests.
registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier === "./form-protection" ? "./form-protection.ts" : specifier, context)
} })
const { createContactHandler: realHandler } = await import("../lib/server/form-mail.ts")
import { RATE_SCRIPT, CLAIM_SCRIPT, FINISH_SCRIPT, redisCommand, createFormProtection } from "../lib/server/form-protection.ts"

// These tests never load .env.local and cannot connect to SMTP, even by mistake.
const originalConnect = net.Socket.prototype.connect
net.Socket.prototype.connect = function () { throw new Error("Network access forbidden in mail tests") }
test.after(() => { net.Socket.prototype.connect = originalConnect })

const env = { UPSTASH_REDIS_REST_URL: "https://test.upstash.io", UPSTASH_REDIS_REST_TOKEN: "dummy-token", RATE_LIMIT_SECRET: "x".repeat(64), SMTP_HOST: "smtp.gmail.com", SMTP_PORT: "465", SMTP_SECURE: "true", SMTP_USER: "sender@example.com", SMTP_PASS: "fake-test-only", CONTACT_EMAIL_TO: "shop@example.com" }
// Deterministic Redis simulation; independent handlers share this command store.
function fakeRedis(now = () => Date.now()) {
  const entries = new Map(), calls = []
  const get = key => {
    const entry = entries.get(key)
    if (entry && entry.expires <= now()) entries.delete(key)
    return entries.get(key)?.value
  }
  const command = async args => {
    calls.push(args)
    const [, script, count, ...rest] = args
    const keys = rest.slice(0, count), argv = rest.slice(count)
    if (script === RATE_SCRIPT) {
      if (Number(get(keys[0]) || 0) >= 5 || Number(get(keys[1]) || 0) >= 100) return 0
      for (const key of keys) {
        const n = Number(get(key) || 0)
        entries.set(key, { value: n + 1, expires: n ? entries.get(key).expires : now() + 900000 })
      }
      return 1
    }
    const old = get(keys[0]), fingerprint = argv[0]
    if (script === CLAIM_SCRIPT) {
      if (old) return !old.startsWith(fingerprint + ":") ? "conflict" : old.endsWith(":done") ? "done" : "pending"
      entries.set(keys[0], { value: fingerprint + ":pending", expires: now() + 86400000 })
      return "claimed"
    }
    if (script === FINISH_SCRIPT) {
      if (old !== fingerprint + ":pending") return 0
      entries.set(keys[0], { value: fingerprint + ":done", expires: now() + 86400000 })
      return 1
    }
    throw new Error("Unexpected Redis command")
  }
  return { command, calls }
}
const createContactHandler = options => realHandler({ command: fakeRedis().command, ...options })

const review = { name: "Maria Teste", rating: "5", product: "Ambos", comment: "Gostei da crocância dos dois sabores.", publicationConsent: false }
const ombudsman = { fullName: "João Teste", email: "visitor@example.com", phone: "+55 (86) 99999-1234", orderNumber: "123", batch: "L1", kind: "Sugestão", description: "Gostaria de sugerir uma embalagem diferente.\nObrigado!", expectation: "Gostaria de um retorno." }
const request = (data, id = randomUUID(), headers = {}) => new Request("http://localhost:1312/api/forms", { method: "POST", headers: { Origin: "http://localhost:1312", "Content-Type": "application/json", "Idempotency-Key": id, ...headers }, body: JSON.stringify(data) })

test("both forms: fixed recipient/sender, distinct subjects, Reply-To and consent", async () => {
  const sent = []
  const handler = createContactHandler({ env, send: async mail => { sent.push(mail); return true } })
  assert.equal((await handler(request(ombudsman), "ombudsman")).status, 200)
  assert.equal((await handler(request(review), "review")).status, 200)
  assert.equal((await handler(request({ ...review, publicationConsent: true }), "review")).status, 200)
  for (const mail of sent) { assert.equal(mail.from, env.SMTP_USER); assert.equal(mail.to, env.CONTACT_EMAIL_TO); assert.equal(mail.html, undefined) }
  assert.equal(sent[0].replyTo, ombudsman.email)
  assert.equal(sent[1].replyTo, undefined)
  assert.notEqual(sent[0].subject, sent[1].subject)
  assert.match(sent[0].text, /diferente\.\nObrigado!/)
  assert.match(sent[1].text, /primeiro nome: Não/)
  assert.match(sent[2].text, /primeiro nome: Sim/)
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, disableFileAccess: true, disableUrlAccess: true })
  const info = await transport.sendMail(sent[0])
  const raw = info.message.toString()
  assert.match(raw, /Reply-To: visitor@example.com/)
  assert.match(raw, /From: sender@example.com/)
  assert.match(raw, /To: shop@example.com/)
})

test("server validation: mandatory fields, enum, bounds, booleans and header injection", async () => {
  const invalid = [
    ["review", { ...review, name: " " }], ["review", { ...review, rating: "6" }],
    ["review", { ...review, product: "Outro" }], ["review", { ...review, comment: "curto" }],
    ["review", { ...review, comment: "x".repeat(1501) }], ["review", { ...review, name: "x".repeat(101) }],
    ["review", { ...review, publicationConsent: "false" }], ["review", { ...review, to: "attacker@example.com" }],
    ["ombudsman", { ...ombudsman, email: "visitor@example.com\r\nBcc: attacker@example.com" }],
    ["ombudsman", { ...ombudsman, email: "a..b@example.com" }], ["ombudsman", { ...ombudsman, email: "a@example..com" }],
    ["ombudsman", { ...ombudsman, fullName: "Test\nBcc" }], ["ombudsman", { ...ombudsman, phone: "invalid" }],
    ["ombudsman", { ...ombudsman, kind: "Anything" }], ["ombudsman", { ...ombudsman, description: "x".repeat(5001) }],
    ["ombudsman", { ...ombudsman, description: " " }], ["review", []],
  ]
  for (const [kind, data] of invalid) {
    const handler = createContactHandler({ env, send: async () => { assert.fail("invalid data must not send") } })
    assert.equal((await handler(request(data), kind)).status, 422)
  }
})

test("missing settings and SMTP failure are safe and never simulate success", async () => {
  for (const key of Object.keys(env)) {
    const handler = createContactHandler({ env: { ...env, [key]: "" }, send: async () => { assert.fail("missing config must not send") } })
    const response = await handler(request(review), "review")
    assert.equal(response.status, 503)
    assert.equal((await response.json()).ok, undefined)
  }
  const handler = createContactHandler({ env, send: async () => { throw new Error("PRIVATE_SMTP_ERROR_FAKE_PASSWORD") } })
  const response = await handler(request(review), "review")
  assert.equal(response.status, 502)
  assert.doesNotMatch(await response.text(), /PRIVATE_SMTP|PASSWORD|fake-test-only/)
  const rejected = createContactHandler({ env, send: async () => false })
  assert.equal((await rejected(request(review), "review")).status, 502)
})

test("origin, malformed JSON, unknown headers and actual streamed byte limit", async () => {
  const handler = createContactHandler({ env, send: async () => { assert.fail("blocked request must not send") } })
  assert.equal((await handler(request(review, randomUUID(), { Origin: "https://other.example" }), "review")).status, 403)
  assert.equal((await handler(request(review, randomUUID(), { "Content-Type": "text/plain" }), "review")).status, 415)
  assert.equal((await handler(request(review, "invalid-key"), "review")).status, 400)
  const malformed = new Request("http://localhost:1312/api/forms", { method: "POST", headers: { Origin: "http://localhost:1312", "Content-Type": "application/json" }, body: "{" })
  assert.equal((await handler(malformed, "review")).status, 400)
  const large = request({ ...review, comment: "x".repeat(65537) })
  assert.equal((await handler(large, "review")).status, 413)
})

test("separate limits, shared across instances, expiration and global cap", async () => {
  let time = 0
  const redis = fakeRedis(() => time)
  const options = { env, command: redis.command, send: async () => true }
  const a = createContactHandler(options), b = createContactHandler(options)
  for (let i = 0; i < 5; i++) assert.equal((await (i % 2 ? a : b)(request(review), "review")).status, 200)
  const limited = await b(request(review), "review")
  assert.equal(limited.status, 429)
  assert.equal(limited.headers.get("Retry-After"), "900")
  assert.equal((await b(request(ombudsman), "ombudsman")).status, 200)
  time += 900001
  assert.equal((await a(request(review), "review")).status, 200)
  const capRedis = fakeRedis()
  const cap = createContactHandler({ ...options, env: { ...env, VERCEL: "1", VERCEL_ENV: "production" }, command: capRedis.command })
  for (let i = 0; i < 100; i++) assert.equal((await cap(request(review, randomUUID(), { "x-forwarded-for": `192.0.2.${i}` }), "review")).status, 200)
  assert.equal((await cap(request(review, randomUUID(), { "x-forwarded-for": "192.0.2.200" }), "review")).status, 429)
})

test("concurrent instances claim once; replay, conflict and 24h expiry", async () => {
  let count = 0, release, time = 0
  const gate = new Promise(resolve => { release = resolve })
  const redis = fakeRedis(() => time)
  const options = { env, command: redis.command, send: async () => { count++; await gate; return true } }
  const a = createContactHandler(options), b = createContactHandler(options), id = randomUUID()
  const first = a(request(review, id), "review")
  await new Promise(resolve => setImmediate(resolve))
  assert.equal((await b(request(review, id), "review")).status, 409)
  release()
  assert.equal((await first).status, 200)
  assert.equal((await b(request(review, id), "review")).status, 200)
  assert.equal(count, 1)
  assert.equal((await b(request({ ...review, name: "Outra pessoa" }, id), "review")).status, 409)
  assert.doesNotMatch(JSON.stringify(redis.calls), /Maria|crocância|example.com|192\.0\.2/)
  time += 86400001
  assert.equal((await b(request(review, id), "review")).status, 200)
  assert.equal(count, 2)
})

test("Redis missing, permission denied, timeout, malformed response and outage fail closed", async () => {
  for (const command of [async () => { throw new Error("private-token") }, async () => "unexpected"]) {
    const handler = createContactHandler({ env, command, send: async () => assert.fail("must not send") })
    const res = await handler(request(review), "review")
    assert.equal(res.status, 503)
    assert.doesNotMatch(await res.text(), /private-token|ok/)
  }
  for (const response of [new Response("unauthorized", { status: 401 }), new Response(JSON.stringify({ error: "permission" })), new Response("not-json")]) {
    const command = redisCommand(env, async () => response)
    await assert.rejects(command(["PING"]), /Protection unavailable/)
  }
  await assert.rejects(redisCommand(env, async () => { throw new Error("timeout") })(["PING"]), /Protection unavailable/)
})

test("uncertain SMTP outcome and failed completion never repeat the send", async () => {
  for (const failFinish of [false, true]) {
    const redis = fakeRedis(), id = randomUUID()
    let count = 0
    const handler = createContactHandler({ env, command: async args => {
      if (failFinish && args[1] === FINISH_SCRIPT) throw new Error("outage")
      return redis.command(args)
    }, send: async () => { count++; if (!failFinish) throw new Error("SMTP uncertain"); return true } })
    assert.equal((await handler(request(review, id), "review")).status, failFinish ? 503 : 502)
    assert.equal((await handler(request(review, id), "review")).status, 409)
    assert.equal(count, 1)
  }
})

test("production, preview and development isolate counters and idempotency in the same Redis", async () => {
  const redis = fakeRedis(), sent = []
  const environments = ["production", "preview", "development"]
  const handlers = environments.map(environment => createContactHandler({
    env: { ...env, VERCEL: "1", VERCEL_ENV: environment }, command: redis.command,
    send: async () => { sent.push(environment); return true },
  }))
  for (const [kind, data] of [["review", review], ["ombudsman", ombudsman]]) {
    const id = randomUUID()
    for (const handler of handlers) {
      const input = () => request(data, id, { "x-forwarded-for": "192.0.2.1" })
      assert.equal((await handler(input(), kind)).status, 200)
      assert.equal((await handler(input(), kind)).status, 200)
      for (let n = 0; n < 3; n++) assert.equal((await handler(request(data, randomUUID(), { "x-forwarded-for": "192.0.2.1" }), kind)).status, 200)
      assert.equal((await handler(request(data, randomUUID(), { "x-forwarded-for": "192.0.2.1" }), kind)).status, 429)
    }
  }
  assert.deepEqual(environments.map(e => sent.filter(x => x === e).length), [8, 8, 8])
  for (const environment of environments) assert.ok(redis.calls.some(args => String(args[3]).startsWith(`onne:forms:v2:${environment}:`)))
})

test("environment isolates total cap, pending claims, conflicts and expiry", async () => {
  let time = 0
  const redis = fakeRedis(() => time)
  const protection = environment => createFormProtection({ ...env, VERCEL_ENV: environment }, redis.command)
  const production = protection("production"), preview = protection("preview"), development = protection("development")
  for (let n = 0; n < 100; n++) assert.equal(await production.allow("review", `192.0.2.${n}`), true)
  assert.equal(await production.allow("review", "new-client"), false)
  assert.equal(await preview.allow("review", "new-client"), true)
  assert.equal(await development.allow("review", "new-client"), true)
  const id = randomUUID()
  for (const kind of ["review", "ombudsman"]) {
    const pending = await production.claim(kind, "same-client", id, { test: "first" })
    assert.equal(pending.result, "claimed")
    assert.equal((await production.claim(kind, "same-client", id, { test: "first" })).result, "pending")
    assert.equal((await production.claim(kind, "same-client", id, { test: "changed" })).result, "conflict")
    for (const other of [preview, development]) {
      const claim = await other.claim(kind, "same-client", id, { test: "changed" })
      assert.equal(claim.result, "claimed")
      await claim.finish()
      assert.equal((await other.claim(kind, "same-client", id, { test: "changed" })).result, "done")
    }
  }
  time += 900001
  assert.equal(await production.allow("review", "new-client"), true)
  time += 86400000
  for (const p of [production, preview, development]) assert.equal((await p.claim("review", "same-client", id, { test: "new" })).result, "claimed")
})

test("local defaults to development; missing or unexpected Vercel environment fails closed", async () => {
  const redis = fakeRedis()
  await createFormProtection(env, redis.command).allow("review", "local")
  assert.ok(String(redis.calls[0][3]).startsWith("onne:forms:v2:development:"))
  for (const settings of [{ VERCEL: "1" }, { VERCEL: "1", VERCEL_ENV: "custom" }, { VERCEL_ENV: "" }]) {
    const handler = createContactHandler({ env: { ...env, ...settings }, command: redis.command, send: async () => assert.fail("must not send") })
    assert.equal((await handler(request(review), "review")).status, 503)
  }
})
