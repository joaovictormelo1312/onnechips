"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { useContactSubmission } from "@/components/use-contact-submission"

const fields = [
  { id: "fullName", label: "Nome completo", required: true, type: "text", maxLength: 150 },
  { id: "email", label: "E-mail para resposta", required: true, type: "email", maxLength: 254 },
  { id: "phone", label: "Telefone/WhatsApp com DDD", type: "tel", maxLength: 25 },
  { id: "orderNumber", label: "Número do pedido", type: "text", maxLength: 100 },
  { id: "batch", label: "Lote do produto", type: "text", maxLength: 100 },
  { id: "kind", label: "Tipo de manifestação", required: true, type: "select" },
  { id: "description", label: "Descreva sua manifestação", required: true, type: "textarea", maxLength: 5000 },
  { id: "expectation", label: "Qual solução ou retorno você espera?", type: "textarea", maxLength: 3000 },
] as const

type FieldId = typeof fields[number]["id"]
type FormValues = Record<FieldId, string>
type FormErrors = Partial<Record<FieldId, string>>

const initialValues: FormValues = { fullName: "", email: "", phone: "", orderNumber: "", batch: "", kind: "", description: "", expectation: "" }
const kinds = ["Reclamação", "Sugestão", "Elogio", "Outros"]

function validateField(id: FieldId, value: string): string | undefined {
  const field = fields.find((item) => item.id === id)!
  if ("required" in field && field.required && !value.trim()) return id === "kind" ? "Selecione o tipo de manifestação." : `Preencha o campo ${field.label.toLowerCase()}.`
  if (id === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Informe um e-mail válido para resposta."
  if (id === "phone" && value.trim()) {
    const digits = value.replace(/\D/g, "")
    const nationalNumber = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits
    if (!/^[1-9]{2}(?:[2-5]\d{7}|9\d{8})$/.test(nationalNumber)) return "Informe um telefone válido com DDD ou deixe o campo vazio."
  }
  if (id === "kind" && !kinds.includes(value)) return "Selecione uma das opções disponíveis."
}

export function OmbudsmanForm({ onSubmittingChange }: { onSubmittingChange?: (sending: boolean) => void }) {
  const [values, setValues] = useState<FormValues>(initialValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const formRef = useRef<HTMLFormElement>(null)
  const pendingErrorFocus = useRef(false)
  const submission = useContactSubmission("/api/ouvidoria")
  const inputClass = "mt-2 min-h-12 w-full rounded-xl border border-ink/25 bg-white px-4 py-3 text-base text-ink outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/30"

  useEffect(() => {
    if (!pendingErrorFocus.current || submission.status === "sending") return
    pendingErrorFocus.current = false
    const first = fields.find(({ id }) => errors[id])
    if (first) formRef.current?.querySelector<HTMLElement>(`#ombudsman-${first.id}`)?.focus()
  }, [errors, submission.status])

  function focusError(nextErrors: FormErrors) {
    const first = fields.find(({ id }) => nextErrors[id])
    if (first) formRef.current?.querySelector<HTMLElement>(`#ombudsman-${first.id}`)?.focus()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submission.status === "sending" || submission.status === "success") return
    const nextErrors: FormErrors = {}
    for (const { id } of fields) { const error = validateField(id, values[id]); if (error) nextErrors[id] = error }
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) { focusError(nextErrors); return }
    onSubmittingChange?.(true)
    try {
      const serverErrors = await submission.send(values)
      if (serverErrors) { pendingErrorFocus.current = true; setErrors(serverErrors) }
    } finally { onSubmittingChange?.(false) }
  }

  return <form ref={formRef} aria-label="Formulário de ouvidoria" aria-busy={submission.status === "sending"} aria-describedby="ombudsman-status ombudsman-guidance" autoComplete="off" noValidate onSubmit={submit}>
    <p id="ombudsman-status" role="note" className="mb-5 text-sm leading-6 text-ink-muted">Os dados informados serão enviados à Onne Chips e utilizados para analisar e responder sua manifestação. Para dúvidas ou solicitações sobre seus dados, escreva para onnechip@gmail.com.</p>
    <p id="ombudsman-guidance" className="mb-7 max-w-[680px] text-sm leading-6 text-ink-muted">Informe apenas os dados necessários para explicar sua manifestação. Não inclua senhas ou dados de cartão.</p>
    <p className="mb-6 text-xs text-ink-muted">Os campos marcados com * são obrigatórios. A validação é feita ao sair de cada campo.</p>
    <fieldset disabled={submission.status === "sending"} className="grid gap-6 sm:grid-cols-2">
      {fields.map((field) => {
        const required = "required" in field && field.required
        const error = errors[field.id]
        const props = {
          id: `ombudsman-${field.id}`,
          value: values[field.id],
          required,
          "aria-invalid": Boolean(error),
          "aria-describedby": error ? `ombudsman-${field.id}-error` : undefined,
          className: inputClass,
          onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
            const value = event.target.value
            submission.reset()
            setValues((current) => ({ ...current, [field.id]: value }))
            if (error) setErrors((current) => ({ ...current, [field.id]: validateField(field.id, value) }))
          },
          onBlur: () => setErrors((current) => ({ ...current, [field.id]: validateField(field.id, values[field.id]) })),
        }
        return <div key={field.id} className={field.type === "textarea" ? "sm:col-span-2" : "min-w-0"}>
          <label htmlFor={props.id} className="text-sm font-semibold text-ink">{field.label}{required ? <span aria-hidden="true" className="text-leaf"> *</span> : <span className="font-normal text-ink-muted"> (opcional)</span>}</label>
          {field.type === "select" ? <select {...props}><option value="">Selecione uma opção</option>{kinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select> : field.type === "textarea" ? <textarea {...props} rows={field.id === "description" ? 6 : 4} maxLength={field.maxLength} className={`${inputClass} resize-y`} /> : <input {...props} type={field.type} maxLength={field.maxLength} inputMode={field.type === "tel" ? "tel" : field.type === "email" ? "email" : "text"} />}
          {error && <p id={`ombudsman-${field.id}-error`} role="alert" className="mt-2 text-sm leading-5 text-red-800">{error}</p>}
        </div>
      })}
    </fieldset>
    {submission.error && <p role="alert" className="mt-6 text-sm leading-6 text-red-800">{submission.error}</p>}
    {submission.status === "success" && <p role="status" className="mt-6 text-sm font-semibold leading-6 text-leaf">Sua manifestação foi encaminhada ao e-mail da loja.</p>}
    <button type="submit" disabled={submission.status === "sending" || submission.status === "success"} aria-describedby="ombudsman-status" className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-leaf px-6 py-4 text-sm font-semibold text-white hover:bg-leaf-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-leaf disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">{submission.status === "sending" ? "Enviando…" : "Enviar manifestação"}</button>
  </form>
}
