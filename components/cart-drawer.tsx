"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ShoppingBag, Trash2, X } from "lucide-react"
import { QuantityControl } from "@/components/quantity-control"
import { useCart } from "@/components/cart-provider"
import { formatCurrency, getProduct } from "@/lib/catalog"

export function CartDrawer() {
  const { items, total, isOpen, closeCart, setQuantity, removeItem, whatsappUrl } = useCart()
  const drawerRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!isOpen) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const drawer = drawerRef.current
    drawer?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true })
    const keepFocusInside = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !drawer) return
      const controls = Array.from(drawer.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]'))
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) {
        event.preventDefault()
        first?.focus()
      }
    }
    window.addEventListener("keydown", keepFocusInside)
    return () => {
      window.removeEventListener("keydown", keepFocusInside)
      previousFocus?.focus({ preventScroll: true })
    }
  }, [isOpen])
  return <AnimatePresence>{isOpen && <motion.div className="fixed inset-0 z-[60] bg-ink/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeCart}><motion.aside ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="cart-title" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 260 }} className="ml-auto flex h-full w-[min(100%,440px)] flex-col bg-cream p-5 text-ink shadow-2xl sm:p-7" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b border-ink/10 pb-5"><div><p className="eyebrow text-leaf">seu pedido</p><h2 id="cart-title" className="mt-1 font-display text-3xl tracking-[-.05em]">Carrinho</h2></div><button type="button" onClick={closeCart} className="rounded-full p-2 text-ink-muted hover:bg-kraft/25 hover:text-ink" aria-label="Fechar carrinho"><X /></button></div>{items.length === 0 ? <div className="flex flex-1 flex-col items-center justify-center text-center"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-kraft/25 text-leaf"><ShoppingBag size={26} /></div><h3 className="mt-6 font-display text-2xl">Seu carrinho está vazio</h3><p className="mt-2 max-w-[250px] text-sm leading-6 text-ink-muted">Escolha sua crocância e adicione os produtos ao pedido.</p><button type="button" onClick={closeCart} className="mt-7 rounded-full border border-leaf px-5 py-3 text-sm font-semibold text-leaf hover:bg-leaf hover:text-white">Continuar comprando</button></div> : <><div className="min-h-0 flex-1 space-y-5 overflow-y-auto py-6">{items.map((item) => { const product = getProduct(item.productId); if (!product) return null; return <div key={item.productId} className="flex gap-4 border-b border-ink/10 pb-5"><div className="relative h-24 w-20 shrink-0 overflow-hidden bg-kraft/30"><Image src={product.image} alt={product.alt} fill sizes="80px" className="object-cover" /></div><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><h3 className="font-display text-xl leading-none tracking-[-.04em]">{product.name}</h3><button type="button" onClick={() => removeItem(item.productId)} className="shrink-0 text-ink-muted hover:text-red-800" aria-label={`Remover ${product.name}`}><Trash2 size={16} /></button></div><p className="mt-2 text-xs text-ink-muted">{formatCurrency(product.price)} por unidade</p><div className="mt-3 flex items-center justify-between"><QuantityControl quantity={item.quantity} onChange={(quantity) => setQuantity(item.productId, quantity)} label={product.name} /><span className="text-sm font-semibold tabular-nums">{formatCurrency(product.price * item.quantity)}</span></div></div></div> })}</div><div className="border-t border-ink/15 pt-5"><div className="flex items-center justify-between"><span className="text-sm text-ink-muted">Total</span><strong className="font-display text-3xl tracking-[-.05em]">{formatCurrency(total)}</strong></div><p className="mt-2 text-xs leading-5 text-ink-muted">Pagamento e entrega serão combinados diretamente pelo WhatsApp. O total exibido corresponde apenas aos produtos; eventuais custos de entrega serão informados no atendimento.</p><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={closeCart} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-leaf px-5 py-4 text-sm font-semibold text-white hover:bg-leaf-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf">Finalizar pedido pelo WhatsApp <span aria-hidden="true">→</span></a><button type="button" onClick={closeCart} className="mt-3 w-full rounded-full py-2 text-sm font-semibold text-leaf hover:bg-kraft/20">Continuar comprando</button></div></>}</motion.aside></motion.div>}</AnimatePresence>
}
