"use client"

import { useRef, useState } from "react"

export function useContactSubmission(endpoint: "/api/ouvidoria" | "/api/avaliacoes") {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle")
  const [error, setError] = useState("")
  const busy = useRef(false)
  const submission = useRef<{ body: string; id: string } | null>(null)

  function reset() { if (!busy.current) { setStatus("idle"); setError("") } }

  async function send(values: object): Promise<Record<string, string> | undefined> {
    if (busy.current) return
    busy.current = true
    setStatus("sending")
    setError("")
    try {
      const body = JSON.stringify(values)
      if (submission.current?.body !== body) submission.current = { body, id: crypto.randomUUID() }
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": submission.current!.id },
        body, signal: AbortSignal.timeout(35000),
      })
      const result = await response.json()
      if (response.ok && result.ok === true) { setStatus("success"); return }
      setStatus("error")
      setError(response.status === 429 ? "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente." : "Não foi possível enviar agora. Seus dados foram preservados. Tente novamente mais tarde.")
      if (response.status === 422 && result.errors && typeof result.errors === "object") return result.errors
    } catch {
      setStatus("error")
      setError("Não foi possível confirmar o envio. Seus dados foram preservados. Confira sua conexão e tente novamente mais tarde.")
    } finally { busy.current = false }
  }

  return { status, error, send, reset }
}
