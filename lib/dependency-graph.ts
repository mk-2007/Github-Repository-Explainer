import path from "path";
import type { ParsedModule } from "./parser";

export interface GraphModule extends ParsedModule {
  resolvedImports: string[]; // subset of `imports` that resolved to an actual file in this repo
  topoOrder: number | null; // null if part of an unresolvable cycle
}

/**
 * Resolves a raw import specifier (e.g. "./utils", "../lib/db", "lodash")
 * against the known set of file paths in the repo. External package
 * imports (no leading dot) intentionally resolve to null — they're not
 * part of this repo's internal architecture.
 */
function resolveImport(fromPath: string, specifier: string, allPaths: Set<string>): string | null {
  if (!specifier.startsWith(".")) return null; // external package, not part of the internal graph

  const fromDir = path.dirname(fromPath);
  const base = path.normalize(path.join(fromDir, specifier));

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.py`,
    `${base}/index.ts`,
    `${base}/index.js`,
    `${base}/__init__.py`,
  ];

  for (const candidate of candidates) {
    if (allPaths.has(candidate)) return candidate;
  }
  return null; // edge case: import points somewhere we didn't fetch (filtered out, or genuinely missing)
}

export function buildGraph(modules: ParsedModule[]): GraphModule[] {
  const allPaths = new Set(modules.map((m) => m.path));

  const resolved: GraphModule[] = modules.map((m) => ({
    ...m,
    resolvedImports: m.imports
      .map((spec) => resolveImport(m.path, spec, allPaths))
      .filter((p): p is string => p !== null),
    topoOrder: null,
  }));

  assignTopologicalOrder(resolved);
  return resolved;
}

/**
 * Kahn's algorithm for topological sort. Real repos frequently have
 * import cycles (two modules importing each other, or a barrel file
 * cycle) — rather than throwing, we peel off whatever has no remaining
 * unresolved dependencies each round, and anything left in a genuine
 * cycle gets appended in file-path order with a shared order tier so the
 * walkthrough still terminates and stays roughly sensible.
 */
function assignTopologicalOrder(modules: GraphModule[]): void {
  const byPath = new Map(modules.map((m) => [m.path, m]));
  const remaining = new Set(modules.map((m) => m.path));
  const inDegree = new Map<string, number>();

  for (const m of modules) inDegree.set(m.path, 0);
  for (const m of modules) {
    for (const dep of m.resolvedImports) {
      inDegree.set(m.path, (inDegree.get(m.path) ?? 0) + 1);
    }
  }
  // in-degree here counts "depends on N unresolved things"; we peel off
  // modules with 0 unresolved deps (i.e. leaves of the dependency chain
  // from the entry point's perspective — everything they need is already
  // placed), which naturally puts foundational modules first.

  let order = 0;
  let progressed = true;

  while (remaining.size > 0 && progressed) {
    progressed = false;
    const ready = [...remaining].filter((p) => {
      const m = byPath.get(p)!;
      return m.resolvedImports.every((dep) => !remaining.has(dep));
    });

    if (ready.length === 0) break; // genuine cycle among everything left

    ready.sort(); // deterministic ordering within a tier
    for (const p of ready) {
      byPath.get(p)!.topoOrder = order++;
      remaining.delete(p);
      progressed = true;
    }
  }

  // Whatever's left is in a cycle. Assign remaining order values in a
  // stable, deterministic order rather than leaving them unordered —
  // the walkthrough still needs a sequence even if the "true" order is
  // ambiguous.
  for (const p of [...remaining].sort()) {
    byPath.get(p)!.topoOrder = order++;
  }
}
