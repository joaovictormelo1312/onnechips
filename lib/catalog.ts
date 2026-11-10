export type ProductId = "banana" | "macaxeira"

export type Product = {
  id: ProductId
  name: string
  price: number
  image: string
  alt: string
}

export type CartItem = {
  productId: ProductId
  quantity: number
}

export const whatsappNumber = "5586995331002"

export const products: Product[] = [
  { id: "banana", name: "Chips de Banana", price: 12, image: "/onne/produtos/chips-banana.jpg", alt: "Embalagem de chips de banana Onne Chips" },
  { id: "macaxeira", name: "Chips de Macaxeira", price: 12, image: "/onne/produtos/chips-macaxeira.jpg", alt: "Embalagem de chips de macaxeira Onne Chips" },
]

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

export function getProduct(productId: ProductId) {
  return products.find((product) => product.id === productId)
}

export function buildWhatsAppMessage(items: CartItem[]) {
  const lines = items.flatMap((item) => {
    const product = getProduct(item.productId)
    if (!product || item.quantity < 1) return []
    return [`${item.quantity}x ${product.name}`, `Valor unitário: ${formatCurrency(product.price)}`, `Subtotal: ${formatCurrency(product.price * item.quantity)}`, ""]
  })
  const total = items.reduce((sum, item) => {
    const product = getProduct(item.productId)
    return sum + (product ? product.price * item.quantity : 0)
  }, 0)
  return ["Olá! Quero fazer um pedido da Onne Chips:", "", "🛒 RESUMO DO PEDIDO", "", ...lines, `TOTAL: ${formatCurrency(total)}`, "", "Gostaria de combinar a forma de pagamento e a entrega. A entrega poderá ser realizada pela loja ou por Uber/99 Entrega, conforme combinarmos."].join("\n")
}
