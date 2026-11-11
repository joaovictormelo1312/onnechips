"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Star, X } from "lucide-react"
import { useContactSubmission } from "@/components/use-contact-submission"

type Field = "name" | "rating" | "product" | "comment"
type Values = { name: string; rating: string; product: string; comment: string; publicationConsent: boolean }
const products = ["Banana", "Macaxeira", "Ambos"]

function validate(field: Field, value: string): string | undefined {
  const trimmed = value.trim()
  if (field === "name" && (!trimmed || value.length > 100)) return "Informe seu nome, com até 100 caracteres."
  if (field === "rating" && !/^[1-5]$/.test(value)) return "Selecione uma nota de 1 a 5 estrelas."
  if (field === "product" && !products.includes(value)) return "Selecione o produto experimentado."
  if (field === "comment" && (trimmed.length < 10 || value.length > 1500)) return "Escreva um comentário entre 10 e 1.500 caracteres."
}

export function ReviewDialog() {
  // Draft stays in memory; only explicit submission sends it to the server.
  const [values, setValues] = useState<Values>({ name: "", rating: "", product: "", comment: "", publicationConsent: false })
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const formRef = useRef<HTMLFormElement>(null)
  const pendingErrorFocus = useRef(false)
  const submission = useContactSubmission("/api/avaliacoes")
  const inputClass = "mt-2 min-h-12 w-full rounded-xl border border-ink/25 bg-white px-4 py-3 text-base text-ink outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/30"

  useEffect(() => {
    if (!pendingErrorFocus.current || submission.status === "sending") return
    pendingErrorFocus.current = false
    const field = (["name", "rating", "product", "comment"] as const).find((key) => errors[key])
    if (field) formRef.current?.querySelector<HTMLElement>(field === "rating" ? 'input[type="radio"]' : `#review-${field}`)?.focus()
  }, [errors, submission.status])

  function change(field: Field, value: string) {
    submission.reset()
    setValues((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: validate(field, value) }))
  }

  function blur(field: Field) {
    setErrors((current) => ({ ...current, [field]: validate(field, values[field]) }))
  }

  function focusError(nextErrors: Partial<Record<Field, string>>) {
    const field = (["name", "rating", "product", "comment"] as const).find((key) => nextErrors[key])
    if (field) formRef.current?.querySelector<HTMLElement>(field === "rating" ? 'input[type="radio"]' : `#review-${field}`)?.focus()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submission.status === "sending" || submission.status === "success") return
    const nextErrors: Partial<Record<Field, string>> = {}
    for (const field of ["name", "rating", "product", "comment"] as const) { const error = validate(field, values[field]); if (error) nextErrors[field] = error }
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) { focusError(nextErrors); return }
    const serverErrors = await submission.send(values)
    if (serverErrors) { pendingErrorFocus.current = true; setErrors(serverErrors) }
  }

  return <Dialog.Root>
    <Dialog.Trigger type="button" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-leaf bg-leaf px-5 py-2 text-sm font-semibold text-white transition-colors hover:border-leaf-dark hover:bg-leaf-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-leaf">Conte sua experiência</Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-[70] bg-ink/50" />
      <Dialog.Popup onKeyDown={(event) => {
        if (event.key !== "Tab") return
        const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href]')
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }} className="fixed left-1/2 top-1/2 z-[71] flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-cream text-ink shadow-xl outline-none">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-ink/15 p-5 sm:px-7">
          <div className="min-w-0">
            <Dialog.Title className="font-display text-2xl leading-tight tracking-[-.04em] text-leaf sm:text-3xl">Conte sua experiência</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-ink-muted">Sua opinião ajuda a Onne Chips a melhorar.</Dialog.Description>
          </div>
          <Dialog.Close type="button" aria-label="Fechar formulário de avaliação" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-leaf hover:bg-kraft/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"><X size={21} aria-hidden="true" /></Dialog.Close>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-7">
          <form ref={formRef} aria-label="Formulário de avaliação" aria-busy={submission.status === "sending"} autoComplete="off" noValidate onSubmit={submit}>
            <fieldset disabled={submission.status === "sending"} className="space-y-6">
              <div>
                <label htmlFor="review-name" className="text-sm font-semibold">Nome <span aria-hidden="true">*</span></label>
                <input id="review-name" type="text" required maxLength={100} value={values.name} onChange={(event) => change("name", event.target.value)} onBlur={() => blur("name")} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "review-name-error" : undefined} className={inputClass} />
                {errors.name && <p id="review-name-error" role="alert" className="mt-2 text-sm leading-5 text-red-800">{errors.name}</p>}
              </div>
              <fieldset aria-describedby={`review-rating-help${errors.rating ? " review-rating-error" : ""}`} aria-invalid={Boolean(errors.rating)} onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) blur("rating")
              }}>
                <legend className="text-sm font-semibold">Nota <span aria-hidden="true">*</span></legend>
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4, 5].map((rating) => <label key={rating} className="relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">
                    <input type="radio" name="review-rating" value={rating} required checked={values.rating === String(rating)} onChange={(event) => change("rating", event.target.value)} aria-label={`${rating} ${rating === 1 ? "estrela" : "estrelas"}`} className="peer sr-only" />
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-transparent text-leaf peer-checked:border-leaf peer-checked:bg-kraft/25 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-leaf"><Star size={23} fill={rating <= Number(values.rating) ? "currentColor" : "none"} aria-hidden="true" /></span>
                  </label>)}
                </div>
                <p id="review-rating-help" aria-live="polite" className="mt-2 text-xs leading-5 text-ink-muted">{values.rating ? `${values.rating} de 5 estrelas selecionadas.` : "Selecione de 1 a 5 estrelas."}</p>
                {errors.rating && <p id="review-rating-error" role="alert" className="mt-2 text-sm leading-5 text-red-800">{errors.rating}</p>}
              </fieldset>
              <div>
                <label htmlFor="review-product" className="text-sm font-semibold">Produto experimentado <span aria-hidden="true">*</span></label>
                <select id="review-product" required value={values.product} onChange={(event) => change("product", event.target.value)} onBlur={() => blur("product")} aria-invalid={Boolean(errors.product)} aria-describedby={errors.product ? "review-product-error" : undefined} className={inputClass}><option value="">Selecione uma opção</option>{products.map((product) => <option key={product} value={product}>{product}</option>)}</select>
                {errors.product && <p id="review-product-error" role="alert" className="mt-2 text-sm leading-5 text-red-800">{errors.product}</p>}
              </div>
              <div>
                <label htmlFor="review-comment" className="text-sm font-semibold">Comentário <span aria-hidden="true">*</span></label>
                <textarea id="review-comment" required minLength={10} maxLength={1500} rows={4} value={values.comment} onChange={(event) => change("comment", event.target.value)} onBlur={() => blur("comment")} aria-invalid={Boolean(errors.comment)} aria-describedby={`review-comment-help${errors.comment ? " review-comment-error" : ""}`} className={`${inputClass} resize-y`} />
                <p id="review-comment-help" className="mt-2 text-xs leading-5 text-ink-muted">De 10 a 1.500 caracteres.</p>
                {errors.comment && <p id="review-comment-error" role="alert" className="mt-2 text-sm leading-5 text-red-800">{errors.comment}</p>}
              </div>
              <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6"><input type="checkbox" checked={values.publicationConsent} onChange={(event) => { submission.reset(); setValues((current) => ({ ...current, publicationConsent: event.target.checked })) }} className="mt-1 h-4 w-4 shrink-0 accent-leaf focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf" /><span>Autorizo a publicação do meu comentário e primeiro nome no site da Onne Chips.</span></label>
            </fieldset>
            {submission.error && <p role="alert" className="mt-5 text-sm leading-6 text-red-800">{submission.error}</p>}
            {submission.status === "success" && <p role="status" className="mt-5 text-sm font-semibold leading-6 text-leaf">Sua avaliação foi encaminhada ao e-mail da loja. Ela não será publicada automaticamente.</p>}
            <button type="submit" disabled={submission.status === "sending" || submission.status === "success"} className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-leaf px-6 py-4 text-sm font-semibold text-white hover:bg-leaf-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-leaf disabled:cursor-not-allowed disabled:opacity-60">{submission.status === "sending" ? "Enviando…" : "Enviar avaliação"}</button>
          </form>
        </div>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>
}
