"use client"

import { useRef, useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { ArrowUpRight, X } from "lucide-react"
import { OmbudsmanForm } from "@/components/ombudsman-form"
import { whatsappNumber } from "@/lib/catalog"

export function OmbudsmanSection() {
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const sendingRef = useRef(false)

  function onSubmittingChange(next: boolean) {
    sendingRef.current = next
    setSending(next)
  }

  return <section id="ouvidoria" aria-labelledby="ouvidoria-title" tabIndex={-1} className="scroll-mt-24 bg-cream px-5 py-12 text-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-leaf sm:px-8 sm:py-16 lg:px-10">
    <Dialog.Root open={open} onOpenChange={(nextOpen, details) => {
      if (!nextOpen && sendingRef.current) { details.cancel(); return }
      setOpen(nextOpen)
    }}>
      <div className="mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h2 id="ouvidoria-title" className="font-display text-3xl leading-tight tracking-[-.04em] text-leaf sm:text-4xl">Ouvidoria — Fale com a Onne</h2>
          <p className="mt-3 max-w-[540px] text-sm leading-6 text-ink-muted">Um espaço para ouvir suas reclamações, sugestões e elogios.</p>
        </div>
        <Dialog.Trigger type="button" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-leaf bg-leaf px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:border-leaf-dark hover:bg-leaf-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-leaf">Registrar uma manifestação</Dialog.Trigger>
      </div>
      <Dialog.Portal keepMounted>
        <Dialog.Backdrop style={{ display: open ? undefined : "none" }} className="fixed inset-0 z-[70] bg-ink/50" />
        <Dialog.Popup style={{ display: open ? undefined : "none" }} className="fixed left-1/2 top-1/2 z-[71] flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[760px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-cream text-ink shadow-xl outline-none">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-ink/15 p-5 sm:px-7">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-2xl leading-tight tracking-[-.04em] text-leaf sm:text-3xl">Ouvidoria — Fale com a Onne</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-6 text-ink-muted">Um espaço para ouvir suas reclamações, sugestões e elogios.</Dialog.Description>
            </div>
            <Dialog.Close type="button" disabled={sending} aria-label="Fechar formulário de ouvidoria" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-leaf hover:bg-kraft/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:cursor-wait disabled:opacity-50"><X size={21} aria-hidden="true" /></Dialog.Close>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-7">
            <OmbudsmanForm onSubmittingChange={onSubmittingChange} />
            <div className="mt-10 border-t border-ink/15 pt-7">
              <p className="max-w-[640px] text-sm leading-6 text-ink-muted">Você também pode conversar com a Onne Chips pelo WhatsApp. Os dados preenchidos aqui não são transferidos para essa conversa.</p>
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-leaf underline underline-offset-4 hover:text-leaf-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-leaf">Falar com a Onne Chips pelo WhatsApp<ArrowUpRight size={16} className="shrink-0" aria-hidden="true" /></a>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  </section>
}
