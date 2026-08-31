import type { Metadata } from "next"
import { DM_Sans, Playfair_Display, Space_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" })
const display = Playfair_Display({ subsets: ["latin"], variable: "--font-display" })
const mono = Space_Mono({ weight: "400", subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "Onne Chips — Um sabor natural. Crocância real.",
  description: "Chips artesanais de banana e macaxeira, sem conservantes. Peça Onne Chips pelo WhatsApp em Teresina e região.",
  openGraph: { title: "Onne Chips — Um sabor natural. Crocância real.", description: "Chips artesanais de banana e macaxeira, sem conservantes.", type: "website" },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" suppressHydrationWarning className={`${sans.variable} ${display.variable} ${mono.variable}`}><body><ThemeProvider>{children}</ThemeProvider></body></html>
}
