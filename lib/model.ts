import { createGoogleGenerativeAI } from "@ai-sdk/google"
const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
})

type Model = ReturnType<typeof google>

// The model the chat agent talks to
export function chatModel(): Model {
  const model = google(process.env.GEMINI_MODEL ?? "gemini-3.8-flash")

  return {
    specificationVersion: model.specificationVersion,
    provider: model.provider,
    modelId: model.modelId,
    supportedUrls: model.supportedUrls,
    doGenerate: (options) => model.doGenerate(options),
    doStream: (options) => model.doStream(options),
  }
}
