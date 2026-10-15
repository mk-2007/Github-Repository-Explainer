/**
 * Diagram generation is deterministic — the dependency graph from Phase 3
 * already has everything needed. No LLM call, no token cost.
 */

interface DiagramModule {
  path: string;
  resolvedImports: string[]; // stored as `imports` in the modules table (already resolved, see Phase 3)
  topoOrder: number | null;
}

// Mermaid node IDs can't contain slashes/dots/etc, so map each path to a
// short safe id rather than trying to sanitize the path string itself.
function buildNodeIds(modules: DiagramModule[]): Map<string, string> {
  const ids = new Map<string, string>();
  modules.forEach((m, i) => ids.set(m.path, `n${i}`));
  return ids;
}

// Edge case: large repos produce unreadably dense graphs. Cap to the most
// connected modules (in-degree + out-degree) rather than truncating
// arbitrarily by file order, so the diagram still shows the parts of the
// system that actually matter architecturally.
const MAX_DIAGRAM_NODES = 40;

function selectMostConnected(modules: DiagramModule[]): DiagramModule[] {
  if (modules.length <= MAX_DIAGRAM_NODES) return modules;

  const degree = new Map<string, number>();
  for (const m of modules) {
    degree.set(m.path, (degree.get(m.path) ?? 0) + m.resolvedImports.length);
    for (const dep of m.resolvedImports) {
      degree.set(dep, (degree.get(dep) ?? 0) + 1);
    }
  }

  return [...modules]
    .sort((a, b) => (degree.get(b.path) ?? 0) - (degree.get(a.path) ?? 0))
    .slice(0, MAX_DIAGRAM_NODES);
}

export function buildArchitectureMermaid(modules: DiagramModule[]): {
  mermaid: string;
  omittedCount: number;
} {
  const selected = selectMostConnected(modules);
  const omittedCount = modules.length - selected.length;
  const selectedPaths = new Set(selected.map((m) => m.path));
  const ids = buildNodeIds(selected);

  const lines = ["graph TD"];
  for (const m of selected) {
    const label = m.path.split("/").slice(-2).join("/"); // trim long paths for readability
    lines.push(`  ${ids.get(m.path)}["${label}"]`);
  }
  for (const m of selected) {
    for (const dep of m.resolvedImports) {
      if (selectedPaths.has(dep)) {
        lines.push(`  ${ids.get(m.path)} --> ${ids.get(dep)}`);
      }
    }
  }

  if (omittedCount > 0) {
    lines.push(`  note["+ ${omittedCount} more modules (showing most-connected ${MAX_DIAGRAM_NODES})"]`);
  }

  return { mermaid: lines.join("\n"), omittedCount };
}

export function buildSequenceMermaid(modules: DiagramModule[]): string {
  const ordered = [...modules]
    .filter((m) => m.topoOrder !== null)
    .sort((a, b) => (a.topoOrder ?? 0) - (b.topoOrder ?? 0))
    .slice(0, MAX_DIAGRAM_NODES); // same density guard as the architecture diagram

  const lines = ["flowchart LR"];
  ordered.forEach((m, i) => {
    const label = m.path.split("/").slice(-2).join("/");
    lines.push(`  s${i}["${label}"]`);
    if (i > 0) lines.push(`  s${i - 1} --> s${i}`);
  });

  return lines.join("\n");
}
