import { createGoogleGenerativeAI } from "@ai-sdk/google"
import type { LanguageModelUsage } from "ai"

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

// Dollars per million tokens for the model above. The gateway bills the
// provider's list price; it publishes no cheaper rate for cached input.
const pricing = { input: 1.25, output: 10 }

// What a call to the chat model cost, in millionths of a dollar
export function chatModelCost(usage: LanguageModelUsage) {
  // Dollars per million tokens is millionths of a dollar per token
  return Math.ceil(
    (usage.inputTokens ?? 0) * pricing.input +
      (usage.outputTokens ?? 0) * pricing.output
  )
}
