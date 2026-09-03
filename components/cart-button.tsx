"use client"

import { ShoppingBag } from "lucide-react"
import { useCart } from "@/components/cart-provider"

export function CartButton({ mobile = false }: { mobile?: boolean }) {
  const { itemCount, openCart } = useCart()
  return <button type="button" onClick={openCart} className={`relative inline-flex items-center justify-center gap-2 rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime ${mobile ? "h-14 w-14 bg-leaf text-white shadow-xl" : "px-4 py-2.5 text-sm font-semibold"}`} aria-label={`Abrir carrinho${itemCount ? `, ${itemCount} ${itemCount === 1 ? "item" : "itens"}` : " vazio"}`}><ShoppingBag size={mobile ? 22 : 17} />{!mobile && <span>Carrinho</span>}{itemCount > 0 && <span className={`absolute flex items-center justify-center rounded-full bg-lime font-mono text-[10px] text-ink ${mobile ? "-right-1 -top-1 h-5 w-5" : "right-1 top-0 h-4 min-w-4 px-1"}`}>{itemCount}</span>}</button>
}
