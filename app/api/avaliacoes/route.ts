import { handleContactRequest } from "@/lib/server/form-mail"

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(request: Request) {
  return handleContactRequest(request, "review")
}
