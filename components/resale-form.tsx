"use client"

import { useRef, useState, type MouseEvent } from "react"
import { ArrowRight } from "lucide-react"
import { whatsappNumber } from "@/lib/catalog"

const establishmentTypes = [
  "Mercadinho ou supermercado",
  "Padaria ou cafeteria",
  "Empório ou loja de conveniência",
  "Outro estabelecimento",
]

const fields = [
  { id: "establishment", label: "Nome do estabelecimento", maxLength: 150 },
  { id: "responsible", label: "Nome do responsável", maxLength: 150 },
  { id: "type", label: "Tipo de estabelecimento", maxLength: 100 },
  { id: "city", label: "Cidade", maxLength: 100 },
  { id: "neighborhood", label: "Bairro", maxLength: 100 },
  { id: "phone", label: "WhatsApp comercial com DDD", maxLength: 25 },
  { id: "notes", label: "Observações", maxLength: 1500 },
] as const

type FieldId = typeof fields[number]["id"]
type Values = Record<FieldId, string>
type Errors = Partial<Record<FieldId, string>>
const initialValues: Values = { establishment: "", responsible: "", type: "", city: "", neighborhood: "", phone: "", notes: "" }
const clean = (value: string) => value.trim().replace(/\s+/g, " ")

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "")
  return digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits
}

function validateField(id: FieldId, value: string): string | undefined {
  const field = fields.find((item) => item.id === id)!
  if (id !== "notes" && !clean(value)) return `Preencha o campo ${field.label.toLowerCase()}.`
  if (value.length > field.maxLength) return `Use no máximo ${field.maxLength} caracteres.`
  if (id === "type" && !establishmentTypes.includes(value)) return "Selecione um dos tipos de estabelecimento disponíveis."
  if (id === "phone" && (!/^(?:\+55)?\d+$/.test(value.replace(/[\s().-]/g, "")) || !/^[1-9]{2}(?:[2-5]\d{7}|9\d{8})$/.test(normalizePhone(value)))) return "Informe um telefone brasileiro válido com DDD, com ou sem +55."
}

function buildResaleUrl(values: Values) {
  const message = [
    "Olá! Conheci a Onne Chips pelo site e tenho interesse em revender os produtos.",
    "",
    `Estabelecimento: ${clean(values.establishment)}`,
    `Responsável: ${clean(values.responsible)}`,
    `Tipo: ${clean(values.type)}`,
    `Cidade: ${clean(values.city)}`,
    `Bairro: ${clean(values.neighborhood)}`,
    `WhatsApp comercial: +55${normalizePhone(values.phone)}`,
    ...(clean(values.notes) ? [`Observações: ${clean(values.notes)}`] : []),
    "",
    "Gostaria de conhecer as condições para revenda.",
  ].join("\n")
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
}

export function ResaleForm() {
  const [values, setValues] = useState<Values>(initialValues)
  const [errors, setErrors] = useState<Errors>({})
  const formRef = useRef<HTMLFormElement>(null)
  const linkRef = useRef<HTMLAnchorElement>(null)

  function validateNavigation(event: MouseEvent<HTMLAnchorElement>) {
    const nextErrors: Errors = {}
    for (const field of fields) {
      const error = validateField(field.id, values[field.id])
      if (error) nextErrors[field.id] = error
    }
    setErrors(nextErrors)
    const firstInvalid = fields.find((field) => nextErrors[field.id])
    if (firstInvalid) {
      event.preventDefault()
      formRef.current?.querySelector<HTMLElement>(`#resale-${firstInvalid.id}`)?.focus()
      return
    }
    setValues((current) => Object.fromEntries(fields.map(({ id }) => [id, id === "phone" ? `+55${normalizePhone(current.phone)}` : clean(current[id])])) as Values)
  }

  const inputClass = "mt-2 min-h-12 w-full rounded-xl border border-white/30 bg-white/5 px-4 py-3 text-base text-white outline-none focus:border-lime focus:ring-2 focus:ring-lime/50"

  return <form ref={formRef} aria-label="Interesse em revender Onne Chips" aria-describedby="resale-guidance" noValidate autoComplete="off" onSubmit={(event) => {
    event.preventDefault()
    linkRef.current?.click()
  }} onKeyDown={(event) => {
    if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
      event.preventDefault()
      linkRef.current?.click()
    }
  }}>
    <p className="mb-6 text-xs leading-5 text-white/75">Os campos marcados com * são obrigatórios.</p>
    <div className="grid gap-5 sm:grid-cols-2">
      {fields.map((field) => {
        const required = field.id !== "notes"
        const error = errors[field.id]
        const props = {
          id: `resale-${field.id}`,
          value: values[field.id],
          required,
          "aria-invalid": Boolean(error),
          "aria-describedby": error ? `resale-${field.id}-error` : undefined,
          className: inputClass,
          onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
            const value = event.target.value
            setValues((current) => ({ ...current, [field.id]: value }))
            if (error) setErrors((current) => ({ ...current, [field.id]: validateField(field.id, value) }))
          },
        }
        return <div key={field.id} className={`min-w-0 ${field.id === "notes" || field.id === "type" ? "sm:col-span-2" : ""}`}>
          <label htmlFor={props.id} className="text-sm font-semibold text-white">{field.label}{required ? <span aria-hidden="true" className="text-lime"> *</span> : <span className="font-normal text-white/75"> (opcional)</span>}</label>
          {field.id === "type" ? <select {...props}><option className="bg-ink text-white" value="">Selecione uma opção</option>{establishmentTypes.map((type) => <option className="bg-ink text-white" key={type} value={type}>{type}</option>)}</select> : field.id === "notes" ? <textarea {...props} rows={4} maxLength={field.maxLength} className={`${inputClass} resize-y`} /> : <input {...props} type={field.id === "phone" ? "tel" : "text"} inputMode={field.id === "phone" ? "tel" : "text"} maxLength={field.maxLength} />}
          {error && <p id={`resale-${field.id}-error`} role="alert" className="mt-2 text-sm leading-5 text-lime">{error}</p>}
        </div>
      })}
    </div>
    <a ref={linkRef} href={fields.every(({ id }) => !validateField(id, values[id])) ? buildResaleUrl(values) : "#revenda"} target="_blank" rel="noopener noreferrer" onClick={validateNavigation} aria-describedby="resale-guidance" className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-lime px-5 py-3 text-center text-sm font-semibold text-leaf-dark transition-transform hover:-translate-y-0.5 hover:bg-lime focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime sm:w-auto">Enviar interesse pelo WhatsApp<ArrowRight size={16} className="shrink-0" aria-hidden="true" /></a>
    <p id="resale-guidance" className="mt-4 text-xs leading-6 text-white/75">Você será direcionado ao WhatsApp. Envie a mensagem para conversar com a Onne Chips sobre as condições de revenda.</p>
  </form>
}
