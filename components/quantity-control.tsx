"use client"

import { Minus, Plus } from "lucide-react"

export function QuantityControl({ quantity, onChange, label }: { quantity: number; onChange: (quantity: number) => void; label: string }) {
  return <div className="inline-flex items-center gap-2 rounded-full border border-ink/15 p-1" aria-label={label}><button type="button" onClick={() => onChange(quantity - 1)} disabled={quantity <= 1} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition hover:bg-kraft/30 disabled:cursor-not-allowed disabled:opacity-35" aria-label={`Diminuir quantidade de ${label}`}><Minus size={14} /></button><span className="min-w-5 text-center text-sm font-semibold tabular-nums">{quantity}</span><button type="button" onClick={() => onChange(quantity + 1)} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition hover:bg-kraft/30" aria-label={`Aumentar quantidade de ${label}`}><Plus size={14} /></button></div>
}
