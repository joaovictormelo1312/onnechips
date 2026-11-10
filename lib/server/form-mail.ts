import "server-only"
import { createFormProtection, type RedisCommand } from "./form-protection"
import nodemailer from "nodemailer"

type Kind = "ombudsman" | "review"
type Environment = Record<string, string | undefined>
type Message = { from: string; to: string; replyTo?: string; subject: string; text: string }
type Outcome = { status: number; body: { ok?: boolean; errors?: Record<string, string>; error?: string } }
type Options = { env?: Environment; send?: (message: Message) => Promise<boolean>; command?: RedisCommand }

const MAX_BODY = 64 * 1024
const unavailable = "Não foi possível enviar agora. Tente novamente mais tarde."
const emailPattern = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/
const isEmail = (value: string) => value.length <= 254 && value.split("@")[0].length <= 64 && emailPattern.test(value) && !value.startsWith(".") && !value.includes("..") && !value.includes(".@")
function configuration(env: Environment) {
  const host = env.SMTP_HOST?.trim()
  const port = Number(env.SMTP_PORT)
  const secure = env.SMTP_SECURE === "true"
  const user = env.SMTP_USER?.trim()
  const pass = env.SMTP_PASS?.replace(/\s/g, "")
  const to = env.CONTACT_EMAIL_TO?.trim()
  if (host !== "smtp.gmail.com" || !((port === 465 && secure) || (port === 587 && env.SMTP_SECURE === "false")) || !user || !isEmail(user) || !pass || !to || !isEmail(to)) return null
  return { host, port, secure, user, pass, to }
}

function validate(kind: Kind, input: unknown) {
  const errors: Record<string, string> = {}
  const values: Record<string, string> = {}
  if (!input || typeof input !== "object" || Array.isArray(input)) return { errors: { form: "Dados inválidos." }, values }
  const data = input as Record<string, unknown>
  const limits = kind === "ombudsman"
    ? { fullName: 150, email: 254, phone: 25, orderNumber: 100, batch: 100, kind: 30, description: 5000, expectation: 3000 }
    : { name: 100, rating: 1, product: 20, comment: 1500 }
  const allowed: string[] = [...Object.keys(limits), ...(kind === "review" ? ["publicationConsent"] : [])]
  if (Object.keys(data).some((key) => !allowed.includes(key))) errors.form = "Há campos não permitidos na solicitação."
  for (const [field, limit] of Object.entries(limits)) {
    const raw = data[field]
    const optional = kind === "ombudsman" && ["phone", "orderNumber", "batch", "expectation"].includes(field)
    if ((raw === undefined || raw === "") && optional) { values[field] = ""; continue }
    if (typeof raw !== "string") { errors[field] = "Informe um valor válido."; continue }
    const multiline = ["description", "expectation", "comment"].includes(field)
    if (raw.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(raw) || (!multiline && /[\r\n]/.test(raw))) errors[field] = `Use até ${limit} caracteres válidos.`
    const value = raw.trim().normalize("NFC")
    values[field] = multiline ? value.replace(/\r\n?/g, "\n") : value.replace(/\s+/g, " ")
    if (!optional && !value) errors[field] = "Preencha este campo."
  }
  if (kind === "ombudsman") {
    if (!isEmail(values.email ?? "")) errors.email = "Informe um e-mail válido para resposta."
    if (!["Reclamação", "Sugestão", "Elogio", "Outros"].includes(values.kind)) errors.kind = "Selecione um tipo de manifestação válido."
    if (values.phone) {
      const digits = values.phone.replace(/\D/g, "")
      const national = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits
      if (!/^(?:\+55)?\d+$/.test(values.phone.replace(/[\s().-]/g, "")) || !/^[1-9]{2}(?:[2-5]\d{7}|9\d{8})$/.test(national)) errors.phone = "Informe um telefone válido com DDD."
      else values.phone = `+55${national}`
    }
  } else {
    if (!/^[1-5]$/.test(values.rating ?? "")) errors.rating = "Selecione uma nota de 1 a 5."
    if (!["Banana", "Macaxeira", "Ambos"].includes(values.product)) errors.product = "Selecione um produto válido."
    if ((values.comment?.length ?? 0) < 10) errors.comment = "Escreva um comentário entre 10 e 1.500 caracteres."
    if (typeof data.publicationConsent !== "boolean") errors.publicationConsent = "Informe sua opção de autorização."
    values.publicationConsent = data.publicationConsent === true ? "Sim" : "Não"
  }
  return { errors, values }
}

function message(kind: Kind, values: Record<string, string>, config: NonNullable<ReturnType<typeof configuration>>): Message {
  if (kind === "review") return {
    from: config.user, to: config.to, subject: "Onne Chips — Nova avaliação pelo site",
    text: ["AVALIAÇÃO RECEBIDA PELO SITE", "", `Nome: ${values.name}`, `Nota: ${values.rating} de 5 estrelas`, `Produto experimentado: ${values.product}`, "", "Comentário:", values.comment, "", `Autoriza publicação do comentário e primeiro nome: ${values.publicationConsent}`, "Nenhuma publicação automática foi realizada."].join("\n"),
  }
  return {
    from: config.user, to: config.to, replyTo: values.email, subject: "Onne Chips — Nova manifestação na Ouvidoria",
    text: ["OUVIDORIA — MANIFESTAÇÃO RECEBIDA PELO SITE", "", `Nome completo: ${values.fullName}`, `E-mail para resposta: ${values.email}`, `Telefone/WhatsApp: ${values.phone || "Não informado"}`, `Número do pedido: ${values.orderNumber || "Não informado"}`, `Lote do produto: ${values.batch || "Não informado"}`, `Tipo de manifestação: ${values.kind}`, "", "Manifestação:", values.description, "", "Solução ou retorno esperado:", values.expectation || "Não informado"].join("\n"),
  }
}

async function readBody(request: Request) {
  if (Number(request.headers.get("content-length")) > MAX_BODY) throw new Error("size")
  const reader = request.body?.getReader()
  if (!reader) throw new Error("json")
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > MAX_BODY) { await reader.cancel(); throw new Error("size") }
      chunks.push(value)
    }
    const buffer = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer)) as unknown
  } finally { reader.releaseLock() }
}

// Shared Redis protection is mandatory, including in local development.
export function createContactHandler(options: Options = {}) {
  const respond = (outcome: Outcome, retry = false) => Response.json(outcome.body, { status: outcome.status, headers: { "Cache-Control": "no-store", ...(retry ? { "Retry-After": "900" } : {}) } })
  return async (request: Request, kind: Kind) => {
    const env = options.env ?? process.env
    const origin = request.headers.get("origin")
    if (!origin || origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return respond({ status: 403, body: { error: "Origem não permitida." } })
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return respond({ status: 415, body: { error: "Formato de solicitação inválido." } })
    const ip = env.VERCEL === "1" ? request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown" : "local"
    let protection: ReturnType<typeof createFormProtection>
    try {
      protection = createFormProtection(env, options.command)
      if (!await protection.allow(kind, ip)) return respond({ status: 429, body: { error: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente." } }, true)
    } catch { return respond({ status: 503, body: { error: unavailable } }) }
    let input: unknown
    try { input = await readBody(request) } catch (error) { return respond({ status: error instanceof Error && error.message === "size" ? 413 : 400, body: { error: "Solicitação inválida ou muito grande." } }) }
    const { errors, values } = validate(kind, input)
    if (Object.keys(errors).length) return respond({ status: 422, body: { errors } })
    const config = configuration(env)
    if (!config) return respond({ status: 503, body: { error: unavailable } })
    const requestId = request.headers.get("idempotency-key") ?? ""
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) return respond({ status: 400, body: { error: "Identificador de solicitação inválido." } })
    let claim: Awaited<ReturnType<typeof protection.claim>>
    try {
      claim = await protection.claim(kind, ip, requestId, values)
      if (claim.result === "conflict") return respond({ status: 409, body: { error: "Solicitação já utilizada. Atualize os dados e tente novamente." } })
      if (claim.result === "pending") return respond({ status: 409, body: { error: "Solicitação em processamento ou com resultado ainda não confirmado. Aguarde antes de tentar novamente." } })
      if (claim.result === "done") return respond({ status: 200, body: { ok: true } })
    } catch { return respond({ status: 503, body: { error: unavailable } }) }
    const result = (async (): Promise<Outcome> => {
      try {
        const mail = message(kind, values, config)
        if (options.send) {
          if (!await options.send(mail)) throw new Error("rejected")
        } else {
          // Creating a transporter is lazy: it never verifies or connects at build time.
          const transport = nodemailer.createTransport({
            host: config.host, port: config.port, secure: config.secure,
            requireTLS: !config.secure, auth: { user: config.user, pass: config.pass },
            logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true,
            connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000,
            tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
          })
          try {
            const info = await transport.sendMail({ ...mail, envelope: { from: config.user, to: [config.to] } })
            if (!info.accepted.length || info.rejected.length) throw new Error("rejected")
          } finally { transport.close() }
        }
        return { status: 200, body: { ok: true } }
      } catch {
        // Never include SMTP errors, credentials, recipient addresses or form data in responses/logs.
        return { status: 502, body: { error: unavailable } }
      }
    })()
    const outcome = await result
    // Keep uncertain SMTP outcomes reserved: Gmail may have accepted the message
    // before a timeout. Never automatically repeat that operation with this key.
    if (outcome.status === 200) {
      try { await claim.finish() }
      catch { return respond({ status: 503, body: { error: unavailable } }) }
    }
    return respond(outcome)
  }
}

export const handleContactRequest = createContactHandler()
