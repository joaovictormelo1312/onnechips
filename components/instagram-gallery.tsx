"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { ArrowLeft, ArrowRight, Play, X } from "lucide-react"

function InstagramMark() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".6" fill="currentColor" stroke="none" /></svg>
}

const media = [
  { type: "photo", src: "/onne/instagram/pacotes.webp", cover: "/onne/instagram/pacotes.webp", title: "Pacotes de Banana e Macaxeira Onne Chips em destaque", width: 1200, height: 1600, position: "center 55%" },
  { type: "video", src: "/onne/instagram/video-1.mp4", cover: "/onne/instagram/video-1-capa.jpg", title: "Embalagens Onne Chips com banana e macaxeira", width: 720, height: 1280, position: "center 45%", duration: "0:32" },
  { type: "photo", src: "/onne/instagram/dois-sabores.webp", cover: "/onne/instagram/dois-sabores.webp", title: "Pessoa segurando os dois sabores da Onne Chips", width: 1200, height: 1600, position: "center 35%" },
  { type: "video", src: "/onne/instagram/video-2.mp4", cover: "/onne/instagram/video-2-capa.jpg", title: "Chips de banana Onne Chips com mel em primeiro plano", width: 576, height: 1024, position: "center 55%", duration: "0:22" },
] as const

export function InstagramGallery() {
  const trackRef = useRef<HTMLUListElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [selected, setSelected] = useState(0)
  const [open, setOpen] = useState(false)
  const [edges, setEdges] = useState({ start: true, end: false })
  const current = media[selected]

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const update = () => setEdges({ start: track.scrollLeft <= 2, end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 2 })
    const observer = new ResizeObserver(update)
    observer.observe(track)
    track.addEventListener("scroll", update, { passive: true })
    return () => { observer.disconnect(); track.removeEventListener("scroll", update) }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    return () => { video?.pause() }
  }, [open, selected])

  function move(direction: number, focus = false) {
    const track = trackRef.current
    if (!track) return
    const step = (track.firstElementChild?.getBoundingClientRect().width ?? 0) + 16
    const index = Math.max(0, Math.min(media.length - 1, Math.round(track.scrollLeft / step) + direction))
    track.scrollTo({ left: index * step, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })
    if (focus) track.children[index]?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true })
  }

  return <section id="instagram" aria-labelledby="instagram-title" className="bg-lime px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
    <div className="mx-auto max-w-[1240px]">
      <div className="flex flex-col items-start justify-between gap-7 sm:flex-row sm:items-end">
        <div><p className="eyebrow text-leaf">07 / acompanhe</p><h2 id="instagram-title" className="mt-5 font-display text-5xl leading-[.9] tracking-[-.06em] sm:text-7xl">Mais crocância<br /><em className="text-leaf">no seu feed.</em></h2></div>
        <a href="https://instagram.com/onnechips" target="_blank" rel="noopener noreferrer" aria-label="Seguir @onnechips no Instagram" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-leaf/40 px-5 py-3 text-sm font-semibold text-leaf-dark transition-colors hover:bg-leaf hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-leaf"><InstagramMark />Siga @onnechips<ArrowRight size={16} className="-rotate-45" aria-hidden="true" /></a>
      </div>
      <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) videoRef.current?.pause(); setOpen(nextOpen) }}>
        <div role="region" aria-label="Galeria de fotos e vídeos da Onne Chips" aria-roledescription="carrossel" className="mx-auto mt-8 max-w-[1000px]">
          <ul ref={trackRef} id="instagram-media" onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1, true) }
          }} className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain py-2 [scrollbar-width:thin] [scrollbar-color:#315c43_transparent]">
            {media.map((item, index) => <li key={item.src} className="min-w-0 shrink-0 basis-[calc(100%-2rem)] snap-start sm:basis-[calc((100%-2.5rem)/2)] lg:basis-[calc((100%-2rem)/3)]">
              <Dialog.Trigger type="button" onClick={() => setSelected(index)} aria-label={`${item.type === "video" ? "Reproduzir vídeo" : "Ampliar foto"}: ${item.title}`} className="group relative block aspect-[3/4] w-full overflow-hidden rounded-xl bg-leaf-dark text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf">
                <Image src={item.cover} alt={item.title} fill loading="lazy" sizes="(min-width: 1024px) 323px, (min-width: 640px) 460px, 85vw" className="object-cover" style={{ objectPosition: item.position }} />
                {item.type === "video" && <><span className="absolute inset-0 flex items-center justify-center bg-black/10"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-leaf-dark/90 transition-colors group-hover:bg-leaf"><Play size={24} fill="currentColor" aria-hidden="true" /></span></span><span className="absolute bottom-3 right-3 rounded-full bg-leaf-dark/95 px-3 py-1 font-mono text-xs">{item.duration}</span></>}
              </Dialog.Trigger>
            </li>)}
          </ul>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" aria-label="Mostrar mídia anterior" aria-controls="instagram-media" disabled={edges.start} onClick={() => move(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-leaf/40 text-leaf-dark hover:bg-leaf hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft size={18} aria-hidden="true" /></button>
            <button type="button" aria-label="Mostrar próxima mídia" aria-controls="instagram-media" disabled={edges.end} onClick={() => move(1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-leaf/40 text-leaf-dark hover:bg-leaf hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:cursor-not-allowed disabled:opacity-40"><ArrowRight size={18} aria-hidden="true" /></button>
          </div>
        </div>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-[70] bg-ink/70" />
          <Dialog.Popup onKeyDown={(event) => {
            if (event.key !== "Tab") return
            const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), video, [href]')
            const first = controls[0], last = controls[controls.length - 1]
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
          }} className="fixed left-1/2 top-1/2 z-[71] flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[960px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-cream text-ink shadow-xl outline-none">
            <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-2">
              <Dialog.Title className="text-sm font-semibold leading-5 text-leaf">{current.title}</Dialog.Title>
              <Dialog.Close type="button" aria-label="Fechar mídia" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-leaf hover:bg-kraft/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"><X size={21} aria-hidden="true" /></Dialog.Close>
            </div>
            <div className="flex min-h-0 items-center justify-center overflow-auto bg-ink p-2">
              {open && (current.type === "photo" ? <Image key={current.src} src={current.src} alt={current.title} width={current.width} height={current.height} sizes="(min-width: 1024px) 900px, 95vw" className="max-h-[calc(100dvh-8rem)] w-auto max-w-full object-contain" /> : <video key={current.src} ref={videoRef} src={current.src} poster={current.cover} width={current.width} height={current.height} controls playsInline preload="metadata" onLoadedMetadata={(event) => { void event.currentTarget.play().catch(() => { /* Native controls remain available when playback is blocked. */ }) }} aria-label={current.title} className="max-h-[calc(100dvh-8rem)] w-auto max-w-full object-contain outline-none focus-visible:outline-2 focus-visible:outline-lime" />)}
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  </section>
}
