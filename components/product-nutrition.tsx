"use client"

import { Dialog } from "@base-ui/react/dialog"
import { Info, X } from "lucide-react"
import { type ProductId, getProduct } from "@/lib/catalog"

const nutrition = {
  banana: {
    ingredients: "banana, sal e óleo de algodão.",
    rows: [
      ["Valor energético", "290 kcal"],
      ["Carboidratos", "38 g"],
      ["Proteínas", "2 g"],
      ["Gorduras totais", "14 g"],
      ["Gorduras saturadas", "2 g"],
      ["Fibra alimentar", "3 g"],
      ["Sódio", "80 mg"],
    ],
  },
  macaxeira: {
    ingredients: "macaxeira, sal e óleo de algodão.",
    rows: [
      ["Valor energético", "270 kcal"],
      ["Carboidratos", "35 g"],
      ["Proteínas", "1,5 g"],
      ["Gorduras totais", "13 g"],
      ["Gorduras saturadas", "2 g"],
      ["Fibra alimentar", "2 g"],
      ["Sódio", "85 mg"],
    ],
  },
} as const

export function ProductNutrition({ productId }: { productId: ProductId }) {
  const product = getProduct(productId)
  if (!product) return null
  const data = nutrition[productId]

  return <Dialog.Root>
    <Dialog.Trigger type="button" aria-label={`Informação nutricional de ${product.name}`} className="inline-flex min-h-11 items-center gap-1.5 text-xs font-medium text-leaf underline-offset-4 hover:text-leaf-dark hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf">
      <Info size={15} className="shrink-0" aria-hidden="true" />Informação nutricional
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-[70] bg-ink/50" />
      <Dialog.Popup onKeyDown={(event) => {
        if (event.key !== "Tab") return
        const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex="0"]')
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
            <Dialog.Title className="font-display text-3xl leading-tight tracking-[-.04em] text-leaf">{product.name}</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-ink-muted">Informação nutricional · Peso líquido: 60 g</Dialog.Description>
          </div>
          <Dialog.Close type="button" aria-label="Fechar informação nutricional" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-leaf hover:bg-kraft/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"><X size={21} aria-hidden="true" /></Dialog.Close>
        </div>
        <div tabIndex={0} role="region" aria-label={`Dados nutricionais de ${product.name}`} className="min-h-0 overflow-y-auto overscroll-contain p-5 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-leaf sm:p-7">
          <p className="text-sm leading-6"><strong>Ingredientes:</strong> {data.ingredients}</p>
          <table className="mt-6 w-full table-fixed border-collapse text-sm">
            <caption className="pb-3 text-left font-semibold text-leaf">Informação nutricional — porção de 60 g</caption>
            <thead className="bg-kraft/25"><tr><th scope="col" className="w-1/2 border-y border-ink/20 px-3 py-3 text-left align-top">Informação</th><th scope="col" className="border-y border-ink/20 px-3 py-3 text-right align-top">Quantidade por porção de 60 g</th></tr></thead>
            <tbody>{data.rows.map(([label, value]) => <tr key={label}><th scope="row" className="border-b border-ink/15 px-3 py-3 text-left font-normal">{label}</th><td className="border-b border-ink/15 px-3 py-3 text-right tabular-nums">{value}</td></tr>)}</tbody>
          </table>
          <p className="mt-6 text-sm font-semibold leading-7 text-leaf">Não contém glúten<br />Sem conservantes</p>
        </div>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>
}
