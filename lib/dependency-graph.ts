import path from "path";
import type { ParsedModule } from "./parser";

export interface GraphModule extends ParsedModule {
  resolvedImports: string[]; // subset of `imports` that resolved to an actual file in this repo
  topoOrder: number | null; // null if part of an unresolvable cycle
  isEntryPoint?: boolean;
}

/**
 * Resolves a raw import specifier against known file paths.
 * Supports:
 * 1. Relative imports (`./utils`, `../lib/db`)
 * 2. Monorepo workspace package aliases (e.g. `@org/core` -> `packages/core/src/index.ts`)
 */
function resolveImport(
  fromPath: string,
  specifier: string,
  allPaths: Set<string>,
  workspacePackages: Map<string, string>
): string | null {
  // Check if this specifier matches an internal monorepo workspace package
  if (workspacePackages.has(specifier)) {
    const pkgDir = workspacePackages.get(specifier)!;
    const candidates = [
      `${pkgDir}/index.ts`,
      `${pkgDir}/index.js`,
      `${pkgDir}/src/index.ts`,
      `${pkgDir}/src/index.js`,
      `${pkgDir}/src/main.ts`,
      `${pkgDir}/package.json`,
    ];
    for (const c of candidates) {
      if (allPaths.has(c)) return c;
    }
  }

  // Relative imports
  if (!specifier.startsWith(".")) return null;

  const fromDir = path.dirname(fromPath);
  const base = path.normalize(path.join(fromDir, specifier)).replace(/\\/g, "/");

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mjs`,
    `${base}.cjs`,
    `${base}.py`,
    `${base}/index.ts`,
    `${base}/index.js`,
    `${base}/src/index.ts`,
    `${base}/__init__.py`,
  ];

  for (const candidate of candidates) {
    if (allPaths.has(candidate)) return candidate;
  }
  return null;
}

export function buildGraph(modules: ParsedModule[]): GraphModule[] {
  const allPaths = new Set(modules.map((m) => m.path.replace(/\\/g, "/")));

  // Discover internal monorepo workspace packages
  const workspacePackages = new Map<string, string>();
  for (const m of modules) {
    if (m.path.endsWith("package.json") && m.exports) {
      for (const exp of m.exports) {
        if (exp.startsWith("pkg:")) {
          const pkgName = exp.replace("pkg:", "").trim();
          const pkgDir = path.dirname(m.path).replace(/\\/g, "/");
          workspacePackages.set(pkgName, pkgDir);
        }
      }
    }
  }

  const resolved: GraphModule[] = modules.map((m) => ({
    ...m,
    path: m.path.replace(/\\/g, "/"),
    resolvedImports: m.imports
      .map((spec) => resolveImport(m.path, spec, allPaths, workspacePackages))
      .filter((p): p is string => p !== null),
    topoOrder: null,
  }));

  assignTopologicalOrder(resolved);
  return resolved;
}

/**
 * Kahn's algorithm for topological sort. Real repos frequently have
 * import cycles (two modules importing each other, or a barrel file cycle).
 * Peels off modules with 0 unresolved dependencies each round.
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

  let order = 0;
  let progressed = true;

  while (remaining.size > 0 && progressed) {
    progressed = false;
    const ready = [...remaining].filter((p) => {
      const m = byPath.get(p)!;
      return m.resolvedImports.every((dep) => !remaining.has(dep));
    });

    if (ready.length === 0) break;

    ready.sort();
    for (const p of ready) {
      byPath.get(p)!.topoOrder = order++;
      remaining.delete(p);
      progressed = true;
    }
  }

  // For cycles, assign stable order
  for (const p of [...remaining].sort()) {
    byPath.get(p)!.topoOrder = order++;
  }
}
