# GitHub Repository Explainer

Paste a GitHub repo URL, get back an architecture diagram, a module-by-module
code explanation ordered by actual dependency sequence (not alphabetically),
and an onboarding guide — generated from a mix of deterministic static
analysis and a free-tier LLM.

## Why this architecture

The core design constraint is the Groq free tier: ~30 requests/min, ~6-12k
tokens/min, ~1,000 requests/day (org-wide, not per-key). A repo has far more
tokens than that budget allows, so the pipeline is built to minimize what
actually reaches the LLM:

1. **Ingestion** (`lib/github-fetch.ts`) — pulls files via GitHub's REST API,
   filtered to skip binaries, lockfiles, and vendored/generated code.
2. **Static analysis** (`lib/parser.ts`, `lib/dependency-graph.ts`) — tree-sitter
   parses imports/exports per file with zero LLM calls, building the
   dependency graph that determines both the diagram structure and the
   topological "explain this in the right order" sequence.
3. **LLM pass** (`lib/groq-client.ts`) — only now do tokens get spent, one
   module at a time, queued with rate-limit-aware backoff that reads Groq's
   actual response headers rather than guessing.
4. **Cache** (`db/schema.sql`) — every analysis is keyed by `(repo, commit
   sha)`. Re-submitting an already-processed repo at the same commit costs
   zero tokens.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in your own Groq + GitHub tokens
npm run db:migrate
npm run dev
```

Both API keys are free, no-credit-card signups — Groq at console.groq.com,
GitHub PAT at github.com/settings/tokens.

## Roadmap

- [x] Phase 1 — project skeleton, schema, rate-limit-aware Groq client
- [x] Phase 2 — `POST /api/analyze` resolves the default branch + latest
      commit, checks the cache (returns immediately if this commit was
      already analyzed or is in progress), otherwise ingests files and
      persists them to `raw_files` for Phase 3 to pick up. `GET
      /api/status/[id]` polls run progress.
- [x] Phase 3 — `lib/parser.ts` extracts imports/exports/LOC per file via
      tree-sitter (JS/TS/Python grammars); `lib/dependency-graph.ts`
      resolves relative imports to actual files and topologically sorts
      them (Kahn's algorithm, with graceful cycle handling — real repos
      have import cycles). `POST /api/parse/[runId]` wires it to storage.
      Zero LLM calls in this entire phase.
- [ ] Phase 4 — chunked LLM summarization pipeline with progress tracking
- [ ] Phase 5 — synthesis: narrative, Mermaid diagrams, topological ordering
- [ ] Phase 6 — frontend (maximalist UI, live progress, diagram + guide views)

## Known edge cases to handle (tracked, not yet all implemented)

- Monorepos with multiple independent package.json/pyproject.toml roots
- Repos with no clear entry point (libraries vs. applications)
- Mixed-language repos (tree-sitter grammar selected per file extension)
- Very large repos that exceed daily request quota — needs a "partial
  analysis, prioritize entry points + most-imported modules first" fallback
- Private repos (needs OAuth flow, not just a static PAT) — out of scope
  for v1, public repos only
