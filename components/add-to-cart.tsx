"use client"

import { Check, ShoppingBag } from "lucide-react"
import { useEffect, useState } from "react"
import { ProductId } from "@/lib/catalog"
import { useCart } from "@/components/cart-provider"

export function AddToCartButton({ productId }: { productId: ProductId }) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  useEffect(() => { if (!added) return; const timeout = window.setTimeout(() => setAdded(false), 1800); return () => window.clearTimeout(timeout) }, [added])
  return <button type="button" onClick={() => { addItem(productId); setAdded(true) }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-leaf px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-leaf-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf" aria-live="polite">{added ? <><Check size={16} /> Adicionado</> : <><ShoppingBag size={16} /> Adicionar ao carrinho</>}</button>
}
