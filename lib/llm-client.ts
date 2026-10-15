import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";

export type LLMProvider = "gemini" | "groq";

function resolveProvider(): LLMProvider {
  if (process.env.LLM_PROVIDER === "gemini" || process.env.LLM_PROVIDER === "groq") {
    return process.env.LLM_PROVIDER;
  }
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "groq";
}

// ---------------- Groq Client ----------------
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

// ---------------- Gemini Client ----------------
const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "dummy",
});
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGroq(
  prompt: string,
  { maxTokens = 500, temperature = 0.2 } = {}
): Promise<string> {
  const maxRetries = 5;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await groq.chat.completions.create({
        model: GROQ_MODEL,
        temperature,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      });
      return response.choices[0]?.message?.content ?? "";
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 429) {
        const retryAfter = Number(
          err?.headers?.["retry-after"] ?? err?.response?.headers?.get?.("retry-after") ?? 5
        );
        await sleep((retryAfter + 1) * 1000);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Groq rate limit exceeded max retries");
}

async function callGemini(
  prompt: string,
  { maxTokens = 1000, temperature = 0.2 } = {}
): Promise<string> {
  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  });
  return response.text || "";
}

/**
 * Universal summarize function dispatching to either Gemini or Groq
 */
export async function summarize(
  prompt: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const provider = resolveProvider();
  if (provider === "gemini") {
    return callGemini(prompt, options);
  }
  return callGroq(prompt, options);
}

export function getCurrentProvider(): LLMProvider {
  return resolveProvider();
}
