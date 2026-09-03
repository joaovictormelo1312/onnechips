"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { buildWhatsAppMessage, CartItem, getProduct, ProductId, whatsappNumber } from "@/lib/catalog"

type CartContextValue = {
  items: CartItem[]
  itemCount: number
  total: number
  isOpen: boolean
  addItem: (productId: ProductId) => void
  setQuantity: (productId: ProductId, quantity: number) => void
  removeItem: (productId: ProductId) => void
  openCart: () => void
  closeCart: () => void
  whatsappUrl: string
}

const CartContext = createContext<CartContextValue | null>(null)
const storageKey = "onnechips-cart"

function isCartItem(item: unknown): item is CartItem {
  if (typeof item !== "object" || item === null || !("productId" in item) || !("quantity" in item)) return false
  const candidate = item as { productId?: unknown; quantity?: unknown }
  return typeof candidate.productId === "string" && Number.isInteger(candidate.quantity) && Number(candidate.quantity) > 0 && !!getProduct(candidate.productId as ProductId)
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const restore = () => {
      try {
        const stored = window.localStorage.getItem(storageKey)
        if (stored) {
          const parsed: unknown = JSON.parse(stored)
          if (Array.isArray(parsed)) setItems(parsed.filter(isCartItem))
        }
      } catch {
        window.localStorage.removeItem(storageKey)
      } finally {
        setHydrated(true)
      }
    }
    const timeout = window.setTimeout(restore, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (hydrated) {
      try { window.localStorage.setItem(storageKey, JSON.stringify(items)) } catch { /* Storage unavailable; the in-memory cart remains usable. */ }
    }
  }, [hydrated, items])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setIsOpen(false) }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown) }
  }, [isOpen])

  const value = useMemo(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
    const total = items.reduce((sum, item) => { const product = getProduct(item.productId); return sum + (product ? product.price * item.quantity : 0) }, 0)
    const message = items.length ? buildWhatsAppMessage(items) : ""
    return { items, itemCount, total, isOpen, addItem: (productId: ProductId) => { setItems((current) => { const found = current.find((item) => item.productId === productId); return found ? current.map((item) => item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { productId, quantity: 1 }] }); setIsOpen(true) }, setQuantity: (productId: ProductId, quantity: number) => setItems((current) => Number.isInteger(quantity) && quantity > 0 ? current.map((item) => item.productId === productId ? { ...item, quantity } : item) : current.filter((item) => item.productId !== productId)), removeItem: (productId: ProductId) => setItems((current) => current.filter((item) => item.productId !== productId)), openCart: () => setIsOpen(true), closeCart: () => setIsOpen(false), whatsappUrl: message ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}` : "" }
  }, [isOpen, items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCart must be used inside CartProvider")
  return context
}
