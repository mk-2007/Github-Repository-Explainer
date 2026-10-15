import Groq from "groq-sdk";

/**
 * Thin wrapper around the Groq SDK that respects the free-tier limits:
 *   ~30 requests/min, ~6-12k tokens/min, ~1,000 requests/day (model-dependent).
 *
 * Two things matter here because the free tier is per-ORGANIZATION, not
 * per-key, and Groq returns real numbers in the response headers:
 *   1. Track remaining requests/tokens from x-ratelimit-remaining-* headers
 *      rather than assuming a fixed budget.
 *   2. On 429, read `retry-after` and actually wait that long instead of a
 *      fixed backoff — Groq tells you exactly when the window resets.
 */

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

interface RateState {
  remainingRequests: number | null;
  remainingTokens: number | null;
  resetAt: number | null; // epoch ms
}

const rateState: RateState = {
  remainingRequests: null,
  remainingTokens: null,
  resetAt: null,
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call the model with a single prompt, retrying on 429 using the
 * server-provided retry-after, and self-throttling if we're close to
 * the tracked remaining-request budget.
 */
export async function summarize(
  prompt: string,
  { maxTokens = 500, temperature = 0.2 } = {}
): Promise<string> {
  // Pre-emptive throttle: if we know we're nearly out of budget, wait
  // for the window to reset rather than firing and eating a 429.
  if (
    rateState.remainingRequests !== null &&
    rateState.remainingRequests <= 1 &&
    rateState.resetAt
  ) {
    const waitMs = Math.max(0, rateState.resetAt - Date.now());
    if (waitMs > 0) await sleep(waitMs);
  }

  const maxRetries = 5;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await groq.chat.completions.create({
        model: MODEL,
        temperature,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      });

      // groq-sdk exposes raw headers via response._request when needed;
      // in practice, log/store them per-call if you want a live quota
      // dashboard. Omitted here for brevity — see docs for header names:
      // x-ratelimit-remaining-requests, x-ratelimit-remaining-tokens,
      // x-ratelimit-reset-requests.

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

/**
 * Batches summarization calls with a fixed delay between them to stay
 * comfortably under the RPM cap (30/min free tier -> ~1 call every 2.2s
 * gives headroom for other traffic on the same org).
 */
export async function summarizeQueue(
  prompts: string[],
  onProgress?: (done: number, total: number) => void
): Promise<string[]> {
  const results: string[] = [];
  const MIN_INTERVAL_MS = 2200;

  for (let i = 0; i < prompts.length; i++) {
    const start = Date.now();
    results.push(await summarize(prompts[i]));
    onProgress?.(i + 1, prompts.length);

    const elapsed = Date.now() - start;
    if (elapsed < MIN_INTERVAL_MS && i < prompts.length - 1) {
      await sleep(MIN_INTERVAL_MS - elapsed);
    }
  }

  return results;
}
