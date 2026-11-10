import { Quote } from "lucide-react"
import { ReviewDialog } from "@/components/review-dialog"

const testimonials = [
  "[…] fazendo a alegria da Van à caminho pro Diálogos pelo Piauí - Etapa Território Tabuleiros do Alto Parnaíba - Uruçuí",
  "Gente, isso não é normal de bom […] Eu gosto de colocar junto à comida, mas serve pra todo momento.",
]

export function TestimonialsSection() {
  return <section id="depoimentos" aria-labelledby="depoimentos-title" className="scroll-mt-24 bg-cream px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
    <div className="mx-auto max-w-[1240px]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="depoimentos-title" className="font-display text-5xl leading-tight tracking-[-.04em] text-leaf sm:text-7xl">Quem prova, conta</h2>
        <ReviewDialog />
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:gap-10">
        {testimonials.map((text) => <figure key={text} className="flex flex-col rounded-xl border border-leaf/20 bg-kraft/15 p-6 sm:p-8">
          <Quote size={24} strokeWidth={1.5} aria-hidden="true" className="mb-5 text-leaf" />
          <blockquote className="flex-1 text-lg leading-8 text-leaf-dark sm:text-xl sm:leading-9"><p>{text}</p></blockquote>
          <figcaption className="mt-6 text-xs leading-5 text-ink-muted">Trecho de publicação no Instagram</figcaption>
        </figure>)}
      </div>
    </div>
  </section>
}
