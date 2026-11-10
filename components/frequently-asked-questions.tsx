"use client"

import { Accordion } from "@base-ui/react/accordion"
import { ChevronDown } from "lucide-react"

const linkClassName = "rounded-sm text-leaf underline underline-offset-4 hover:text-leaf-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"

const questions = [
  {
    question: "Como faço meu pedido?",
    answer: <>Escolha seu sabor, adicione os produtos ao carrinho e ajuste as quantidades. Depois, clique em ‘Finalizar pedido pelo WhatsApp’ para abrir a conversa com o resumo do pedido. Envie a mensagem para iniciar o atendimento.</>,
    link: { href: "#produtos", text: "Escolha seu sabor na loja" },
  },
  {
    question: "Como funciona o pagamento?",
    answer: <>O pagamento é combinado diretamente com a Onne Chips pelo WhatsApp. Não há pagamento dentro do site.</>,
  },
  {
    question: "Como funciona a entrega?",
    answer: <>A forma de entrega e os eventuais custos são combinados pelo WhatsApp. A loja e você definem a melhor opção disponível, incluindo entrega organizada pela loja ou por serviços como Uber/99.</>,
  },
  {
    question: "O total do carrinho inclui a entrega?",
    answer: <>Não. O total exibido corresponde apenas aos produtos. Eventuais custos de entrega são informados durante o atendimento pelo WhatsApp.</>,
  },
  {
    question: "Meu pedido está confirmado quando abro o WhatsApp?",
    answer: <>Não. É necessário enviar a mensagem e aguardar a confirmação da Onne Chips sobre disponibilidade, pagamento e entrega.</>,
  },
  {
    question: "Onde encontro os produtos?",
    answer: <>Consulte a seção <a href="#onde-encontrar" className={linkClassName}>‘Onde encontrar’</a> para conhecer os estabelecimentos parceiros. Use os links de localização disponíveis para abrir o Google Maps e confirme a disponibilidade dos produtos com o estabelecimento.</>,
  },
  {
    question: "Como posso revender Onne Chips?",
    answer: <>Preencha o formulário na seção <a href="#revenda" className={linkClassName}>‘Seja revendedor’</a> e clique em ‘Enviar interesse pelo WhatsApp’. Envie a mensagem para conversar com a Onne Chips e conhecer as condições comerciais.</>,
  },
]

export function FrequentlyAskedQuestions() {
  return <section id="perguntas-frequentes" aria-labelledby="perguntas-frequentes-title" tabIndex={-1} className="scroll-mt-24 bg-cream-dark px-5 py-24 focus:outline-none sm:px-8 lg:px-10 lg:py-32">
    <div className="mx-auto max-w-[1240px]">
      <h2 id="perguntas-frequentes-title" className="font-display text-5xl leading-tight tracking-[-.04em] text-leaf sm:text-7xl">Perguntas frequentes</h2>
      <Accordion.Root multiple className="mt-12 border-t border-leaf/25">
        {questions.map(({ question, answer, link }) => <Accordion.Item key={question} value={question} className="border-b border-leaf/25">
          <Accordion.Header>
            <Accordion.Trigger className="group flex min-h-14 w-full items-center justify-between gap-4 py-5 text-left text-base font-semibold text-leaf hover:text-leaf-dark focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf sm:text-lg">
              <span>{question}</span><ChevronDown size={20} aria-hidden="true" className="shrink-0 transition-transform duration-200 group-data-[panel-open]:rotate-180 motion-reduce:transition-none" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel>
            <div className="max-w-[70ch] pb-6 text-sm leading-7 text-ink-muted">
              <p>{answer}</p>
              {link && <a href={link.href} className={`mt-2 inline-flex min-h-11 items-center ${linkClassName}`}>{link.text}</a>}
            </div>
          </Accordion.Panel>
        </Accordion.Item>)}
      </Accordion.Root>
    </div>
  </section>
}
