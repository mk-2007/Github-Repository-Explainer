# GitHub Repository Explainer

Paste a GitHub repo URL, get back an architecture diagram, a module-by-module
code explanation ordered by actual dependency sequence (not alphabetically),
and an onboarding guide — generated from a mix of deterministic static
analysis and free-tier LLMs (Google Gemini & Groq).

## Architecture Highlights

1. **High-Speed Ingestion** (`lib/github-fetch.ts`) — pulls repository trees and file contents concurrently using a 10-worker pool over GitHub's REST API.
2. **Deterministic Static Analysis** (`lib/parser.ts`, `lib/dependency-graph.ts`) — tree-sitter parses imports/exports per file with zero LLM calls, building the dependency graph that determines both the diagram structure and the topological "explain this in the right order" sequence.
3. **Dual LLM Provider Engine** (`lib/llm-client.ts`) — supports both **Google Gemini** (`gemini-2.5-flash`, 1M context window) and **Groq** (`llama-3.3-70b-versatile`), switchable via `LLM_PROVIDER=gemini` or `LLM_PROVIDER=groq`.
4. **Persistent Cache** (`db/schema.sql`) — every analysis is keyed by `(repo, commit_sha)`. Re-submitting an already-processed repo at the same commit costs zero tokens.
5. **Interactive Dashboard** (`app/run/[id]/page.tsx`) — live multi-phase pipeline progress indicator, zoomable Mermaid diagrams with raw code copy, module search with language filters, and single-click Markdown export.

## Setup & Running

### Option A — Docker Compose (Recommended)
```bash
cp .env.example .env    # fill in GEMINI_API_KEY (or GROQ_API_KEY) and GITHUB_TOKEN
docker compose up --build
```
In a second terminal, apply the database schema on first run:
```bash
docker compose exec app npm run db:migrate
```
Then open [http://localhost:3000](http://localhost:3000).

### Option B — Local Node.js + Postgres
```bash
npm install --legacy-peer-deps
cp .env.example .env.local   # fill in API tokens + DATABASE_URL
npm run db:migrate
npm run dev
```

## Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `LLM_PROVIDER` | `gemini` or `groq` | `gemini` |
| `GEMINI_API_KEY` | Free API key from [Google AI Studio](https://aistudio.google.com) | — |
| `GEMINI_MODEL` | Gemini model identifier | `gemini-2.5-flash` |
| `GROQ_API_KEY` | Free API key from [Groq Console](https://console.groq.com) | — |
| `GROQ_MODEL` | Groq model identifier | `llama-3.3-70b-versatile` |
| `GITHUB_TOKEN` | GitHub Personal Access Token (classic, public repo scope) | — |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |

## Contributing & Development Workflow

This repository uses structured GitHub milestones, issue templates, and pull requests:
- **Feature Branches**: Create branches named `feat/<feature-name>` or `fix/<bug-name>`.
- **Atomic Commits**: Keep commits modular and descriptive following conventional commits (`feat(ui): ...`, `fix(api): ...`, `perf(ingest): ...`).
- **Pull Requests**: Use `.github/pull_request_template.md` to document changes and verification steps.
