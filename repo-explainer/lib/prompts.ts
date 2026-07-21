/**
 * Prompt construction for the per-module LLM pass. Kept deliberately
 * terse: every token here competes with the free-tier TPM budget, and a
 * verbose system prompt on top of source content is how people blow
 * through 6-12k TPM in two calls.
 */

// Rough token estimate (chars/4) — good enough for budgeting, not exact.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Free tier TPM is model-dependent (~6k-12k). Budget conservatively per
// call so one oversized file can't eat the whole per-minute window.
const MAX_CONTENT_CHARS = 6000; // ~1500 tokens of source, leaves room for prompt + response

export function buildModuleSummaryPrompt(params: {
  path: string;
  language: string | null;
  resolvedImports: string[];
  content: string;
}): { prompt: string; truncated: boolean } {
  const { path, language, resolvedImports, content } = params;
  const truncated = content.length > MAX_CONTENT_CHARS;
  const body = truncated ? content.slice(0, MAX_CONTENT_CHARS) : content;

  const depLine =
    resolvedImports.length > 0
      ? `Depends on: ${resolvedImports.join(", ")}`
      : "No internal dependencies detected.";

  const prompt = `Explain this ${language ?? "source"} file for an onboarding engineer.
File: ${path}
${depLine}
Respond in 3-5 sentences: what this module does, its role in the system, and anything a
newcomer would find non-obvious. No preamble, no markdown headers.

\`\`\`
${body}${truncated ? "\n... (truncated, file continues)" : ""}
\`\`\``;

  return { prompt, truncated };
}

export function buildSynthesisPrompt(params: {
  repoName: string;
  moduleSummaries: { path: string; summary: string; topoOrder: number | null }[];
}): string {
  const { repoName, moduleSummaries } = params;
  const ordered = [...moduleSummaries].sort(
    (a, b) => (a.topoOrder ?? Infinity) - (b.topoOrder ?? Infinity)
  );
  const listing = ordered.map((m) => `- ${m.path}: ${m.summary}`).join("\n");

  return `Here are module summaries for the repository "${repoName}", listed in dependency
order (foundational modules first, dependents after):

${listing}

Write a concise architectural narrative (4-6 short paragraphs) explaining how this system
is structured and how the pieces fit together, following the dependency order given. Then
on a new line write "---ONBOARDING---" followed by a short onboarding guide (bullet points)
for a new engineer: where to start reading, key entry points, and anything that would trip
someone up.`;
}
