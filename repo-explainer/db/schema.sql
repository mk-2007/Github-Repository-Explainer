-- github-repo-explainer schema
-- Design principle: every repo is analyzed once per commit SHA, then served
-- from cache forever after. This is the single biggest lever for staying
-- inside a free-tier LLM quota.

CREATE TABLE IF NOT EXISTS repos (
  id            SERIAL PRIMARY KEY,
  owner         TEXT NOT NULL,
  name          TEXT NOT NULL,
  default_branch TEXT NOT NULL DEFAULT 'main',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner, name)
);

-- One row per (repo, commit_sha). This is the cache key.
CREATE TABLE IF NOT EXISTS analysis_runs (
  id            SERIAL PRIMARY KEY,
  repo_id       INTEGER NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  commit_sha    TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','fetching','parsing','summarizing','synthesizing','done','failed')),
  progress_current INTEGER NOT NULL DEFAULT 0,
  progress_total    INTEGER NOT NULL DEFAULT 0,
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  UNIQUE (repo_id, commit_sha)
);

-- Raw fetched file content, persisted between the ingestion step and the
-- (Phase 3) parsing step. Needed because these are separate API
-- calls/serverless invocations, not one long-lived process — nothing can
-- be held in memory across the boundary.
CREATE TABLE IF NOT EXISTS raw_files (
  id            SERIAL PRIMARY KEY,
  run_id        INTEGER NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
  path          TEXT NOT NULL,
  content       TEXT NOT NULL,
  size          INTEGER,
  UNIQUE (run_id, path)
);

-- Parsed file/module metadata from the tree-sitter static analysis pass.
-- Populated BEFORE any LLM call — deterministic, zero token cost.
CREATE TABLE IF NOT EXISTS modules (
  id            SERIAL PRIMARY KEY,
  run_id        INTEGER NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
  path          TEXT NOT NULL,
  language      TEXT,
  imports       JSONB NOT NULL DEFAULT '[]',   -- resolved import paths
  exports       JSONB NOT NULL DEFAULT '[]',
  loc           INTEGER,
  topo_order    INTEGER,                        -- position in dependency-graph topological sort
  llm_summary   TEXT,                           -- filled in during the LLM pass, null until then
  token_count_estimate INTEGER,
  UNIQUE (run_id, path)
);

-- Mermaid diagram sources generated from the dependency graph + LLM synthesis.
CREATE TABLE IF NOT EXISTS diagrams (
  id            SERIAL PRIMARY KEY,
  run_id        INTEGER NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('architecture','sequence','module')),
  mermaid_src   TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guides (
  id            SERIAL PRIMARY KEY,
  run_id        INTEGER NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
  narrative_md  TEXT NOT NULL,   -- the top-level "how this system works" synthesis
  onboarding_md TEXT NOT NULL,  -- the onboarding guide
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_raw_files_run_id ON raw_files(run_id);
CREATE INDEX IF NOT EXISTS idx_modules_run_id ON modules(run_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_run_id ON diagrams(run_id);
