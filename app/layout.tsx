import type { Metadata } from "next"
import { DM_Sans, Playfair_Display, Space_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { CartProvider } from "@/components/cart-provider"
import { CartDrawer } from "@/components/cart-drawer"
import { siteUrl } from "@/lib/site"

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" })
const display = Playfair_Display({ subsets: ["latin"], variable: "--font-display" })
const mono = Space_Mono({ weight: "400", subsets: ["latin"], variable: "--font-mono" })

const title = "Onne Chips | Chips artesanais de banana e macaxeira"
const description = "Chips artesanais de banana e macaxeira, feitos com ingredientes simples, sem conservantes e com crocância real. Peça pelo WhatsApp."
const logo = "/onne/logo/onne-logo-mark.jpg"
const socialImage = {
  url: "/onne/produtos/linha-banana-macaxeira.jpg",
  width: 1600,
  height: 1305,
  alt: "Embalagens Onne Chips de banana e macaxeira",
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  alternates: { canonical: siteUrl },
  icons: { apple: logo },
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: "Onne Chips",
    locale: "pt_BR",
    type: "website",
    images: [socialImage],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [socialImage],
  },
}

const organizationId = `${siteUrl}#organization`
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}#website`,
      name: "Onne Chips",
      url: siteUrl,
      description,
      inLanguage: "pt-BR",
      publisher: { "@id": organizationId },
    },
    {
      "@type": "Organization",
      "@id": organizationId,
      name: "Onne Chips",
      url: siteUrl,
      logo: new URL(logo, siteUrl).href,
      sameAs: ["https://instagram.com/onnechips"],
    },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
        <ThemeProvider><CartProvider>{children}<CartDrawer /></CartProvider></ThemeProvider>
      </body>
    </html>
  )
}
